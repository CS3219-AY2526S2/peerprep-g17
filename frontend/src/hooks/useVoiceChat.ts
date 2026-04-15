import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceCallState =
  | "idle"
  | "calling"
  | "incoming"
  | "connecting"
  | "connected"
  | "error";

type VoiceSignalType =
  | "voice_call_request"
  | "voice_call_accept"
  | "voice_call_reject"
  | "voice_call_end"
  | "voice_offer"
  | "voice_answer"
  | "voice_ice_candidate";

interface VoiceSignalMessage {
  type: VoiceSignalType;
  payload?: Record<string, unknown>;
}

interface UseVoiceChatParams {
  sendSignal: (message: VoiceSignalMessage) => boolean;
  currentUserId: string | undefined;
  partnerUserId: string | null;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
}

interface UseVoiceChatReturn {
  callState: VoiceCallState;
  micEnabled: boolean;
  errorMessage: string | null;
  incomingFromUsername: string | null;
  callDurationSeconds: number;
  cooldownActive: boolean;
  startCall: () => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  handleSignalingMessage: (data: { type: string; payload?: Record<string, unknown> }) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const RING_TIMEOUT_MS = 30_000;
const CALL_COOLDOWN_MS = 8_000;

export function useVoiceChat({
  sendSignal,
  currentUserId,
  partnerUserId,
  remoteAudioRef,
}: UseVoiceChatParams): UseVoiceChatReturn {
  const [callState, setCallState] = useState<VoiceCallState>("idle");
  const [micEnabled, setMicEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [incomingFromUsername, setIncomingFromUsername] = useState<string | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [cooldownActive, setCooldownActive] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSetRef = useRef(false);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callStateRef = useRef<VoiceCallState>("idle");

  const setCallStateSafe = useCallback((next: VoiceCallState) => {
    callStateRef.current = next;
    setCallState(next);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const stopRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const startCooldown = useCallback(() => {
    setCooldownActive(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setCooldownActive(false);
      cooldownTimerRef.current = null;
    }, CALL_COOLDOWN_MS);
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    setCallDurationSeconds(0);
    durationTimerRef.current = setInterval(() => {
      setCallDurationSeconds((current) => current + 1);
    }, 1000);
  }, [stopDurationTimer]);

  const cleanupMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.close();
      } catch {
        // ignore
      }
      peerConnectionRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    pendingCandidatesRef.current = [];
    remoteDescriptionSetRef.current = false;
  }, [remoteAudioRef]);

  const resetToIdle = useCallback(() => {
    cleanupMedia();
    stopDurationTimer();
    stopRingTimeout();
    setCallDurationSeconds(0);
    setIncomingFromUsername(null);
    setMicEnabled(true);
    setCallStateSafe("idle");
  }, [cleanupMedia, setCallStateSafe, stopDurationTimer, stopRingTimeout]);

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "voice_ice_candidate",
          payload: { candidate: event.candidate.toJSON() },
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteAudioRef.current && remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {
          // Autoplay may be blocked until user interaction; the call button click counts as user gesture.
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === "connected") {
        if (callStateRef.current !== "connected") {
          setCallStateSafe("connected");
          startDurationTimer();
        }
      } else if (state === "failed" || state === "disconnected" || state === "closed") {
        if (callStateRef.current === "connected" || callStateRef.current === "connecting") {
          setErrorMessage(
            state === "failed"
              ? "Call failed \u2014 could not establish a connection."
              : "Call disconnected.",
          );
          resetToIdle();
        }
      }
    };

    return peerConnection;
  }, [remoteAudioRef, resetToIdle, sendSignal, setCallStateSafe, startDurationTimer]);

  const acquireLocalStream = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    localStreamRef.current = stream;
    setMicEnabled(true);
    return stream;
  }, []);

  const attachLocalTracks = useCallback(
    (peerConnection: RTCPeerConnection, stream: MediaStream) => {
      stream.getAudioTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
    },
    [],
  );

  const flushPendingCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection || !remoteDescriptionSetRef.current) return;
    const queue = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of queue) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (err) {
        console.warn("[VoiceChat] Failed to add queued ICE candidate", err);
      }
    }
  }, []);

  const startCall = useCallback(async () => {
    if (callStateRef.current !== "idle" || !partnerUserId || cooldownActive) return;
    setErrorMessage(null);
    try {
      const stream = await acquireLocalStream();
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;
      attachLocalTracks(peerConnection, stream);

      setCallStateSafe("calling");
      sendSignal({ type: "voice_call_request", payload: {} });

      ringTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === "calling") {
          setErrorMessage("No answer \u2014 call timed out.");
          sendSignal({ type: "voice_call_end", payload: {} });
          resetToIdle();
          startCooldown();
        }
      }, RING_TIMEOUT_MS);
    } catch (err) {
      console.error("[VoiceChat] startCall failed", err);
      setErrorMessage(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied."
          : "Could not start the call.",
      );
      resetToIdle();
      setCallStateSafe("error");
    }
  }, [
    acquireLocalStream,
    attachLocalTracks,
    createPeerConnection,
    partnerUserId,
    resetToIdle,
    sendSignal,
    setCallStateSafe,
  ]);

  const acceptCall = useCallback(async () => {
    if (callStateRef.current !== "incoming") return;
    setErrorMessage(null);
    try {
      const stream = await acquireLocalStream();
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;
      attachLocalTracks(peerConnection, stream);

      setCallStateSafe("connecting");
      sendSignal({ type: "voice_call_accept", payload: {} });
    } catch (err) {
      console.error("[VoiceChat] acceptCall failed", err);
      setErrorMessage(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied."
          : "Could not accept the call.",
      );
      sendSignal({ type: "voice_call_reject", payload: { reason: "mic_error" } });
      resetToIdle();
      setCallStateSafe("error");
    }
  }, [
    acquireLocalStream,
    attachLocalTracks,
    createPeerConnection,
    resetToIdle,
    sendSignal,
    setCallStateSafe,
  ]);

  const rejectCall = useCallback(() => {
    if (callStateRef.current !== "incoming") return;
    sendSignal({ type: "voice_call_reject", payload: {} });
    resetToIdle();
  }, [resetToIdle, sendSignal]);

  const endCall = useCallback(() => {
    if (callStateRef.current === "idle") return;
    sendSignal({ type: "voice_call_end", payload: {} });
    resetToIdle();
  }, [resetToIdle, sendSignal]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !stream.getAudioTracks().every((track) => track.enabled);
    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setMicEnabled(enabled);
  }, []);

  const handleSignalingMessage = useCallback(
    async (data: { type: string; payload?: Record<string, unknown> }) => {
      const payload = data.payload || {};
      const fromUserId = typeof payload.fromUserId === "string" ? payload.fromUserId : null;
      if (!fromUserId || fromUserId === currentUserId) return;

      if (data.type === "voice_call_request") {
        if (callStateRef.current !== "idle") {
          sendSignal({ type: "voice_call_reject", payload: { reason: "busy" } });
          return;
        }
        setIncomingFromUsername(
          typeof payload.fromUsername === "string" ? payload.fromUsername : "Partner",
        );
        setErrorMessage(null);
        setCallStateSafe("incoming");

        ringTimeoutRef.current = setTimeout(() => {
          if (callStateRef.current === "incoming") {
            sendSignal({ type: "voice_call_reject", payload: { reason: "timeout" } });
            resetToIdle();
          }
        }, RING_TIMEOUT_MS);
        return;
      }

      if (data.type === "voice_call_accept") {
        if (callStateRef.current !== "calling") return;
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) return;
        try {
          setCallStateSafe("connecting");
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          sendSignal({ type: "voice_offer", payload: { sdp: offer } });
        } catch (err) {
          console.error("[VoiceChat] offer creation failed", err);
          setErrorMessage("Failed to establish call.");
          endCall();
        }
        return;
      }

      if (data.type === "voice_call_reject") {
        if (callStateRef.current === "calling") {
          const reason = typeof payload.reason === "string" ? payload.reason : null;
          setErrorMessage(
            reason === "busy"
              ? "Partner is busy."
              : reason === "timeout"
                ? "No answer \u2014 call timed out."
                : "Partner declined the call.",
          );
          resetToIdle();
          startCooldown();
        }
        return;
      }

      if (data.type === "voice_call_end") {
        if (callStateRef.current !== "idle") {
          resetToIdle();
        }
        return;
      }

      if (data.type === "voice_offer") {
        const peerConnection = peerConnectionRef.current;
        const sdp = payload.sdp as RTCSessionDescriptionInit | undefined;
        if (!peerConnection || !sdp) return;
        try {
          await peerConnection.setRemoteDescription(sdp);
          remoteDescriptionSetRef.current = true;
          await flushPendingCandidates();
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          sendSignal({ type: "voice_answer", payload: { sdp: answer } });
        } catch (err) {
          console.error("[VoiceChat] offer handling failed", err);
          setErrorMessage("Failed to connect call.");
          endCall();
        }
        return;
      }

      if (data.type === "voice_answer") {
        const peerConnection = peerConnectionRef.current;
        const sdp = payload.sdp as RTCSessionDescriptionInit | undefined;
        if (!peerConnection || !sdp) return;
        try {
          await peerConnection.setRemoteDescription(sdp);
          remoteDescriptionSetRef.current = true;
          await flushPendingCandidates();
        } catch (err) {
          console.error("[VoiceChat] answer handling failed", err);
          setErrorMessage("Failed to connect call.");
          endCall();
        }
        return;
      }

      if (data.type === "voice_ice_candidate") {
        const candidate = payload.candidate as RTCIceCandidateInit | undefined;
        if (!candidate) return;
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) return;
        if (!remoteDescriptionSetRef.current) {
          pendingCandidatesRef.current.push(candidate);
          return;
        }
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (err) {
          console.warn("[VoiceChat] addIceCandidate failed", err);
        }
      }
    },
    [currentUserId, endCall, flushPendingCandidates, resetToIdle, sendSignal, setCallStateSafe],
  );

  useEffect(() => {
    return () => {
      if (callStateRef.current !== "idle") {
        try {
          sendSignal({ type: "voice_call_end", payload: {} });
        } catch {
          // ignore
        }
      }
      cleanupMedia();
      stopDurationTimer();
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cleanupMedia, sendSignal, stopDurationTimer]);

  return {
    callState,
    micEnabled,
    errorMessage,
    incomingFromUsername,
    callDurationSeconds,
    cooldownActive,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    handleSignalingMessage,
  };
}
