import { Mic, MicOff, Phone, PhoneOff, PhoneIncoming } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { VoiceCallState } from "@/hooks/useVoiceChat";

interface VoiceCallControlsProps {
  callState: VoiceCallState;
  micEnabled: boolean;
  errorMessage: string | null;
  incomingFromUsername: string | null;
  callDurationSeconds: number;
  partnerOnline: boolean;
  cooldownActive: boolean;
  onStartCall: () => void;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  onEndCall: () => void;
  onToggleMic: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function VoiceCallControls({
  callState,
  micEnabled,
  errorMessage,
  incomingFromUsername,
  callDurationSeconds,
  partnerOnline,
  cooldownActive,
  onStartCall,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  onToggleMic,
}: VoiceCallControlsProps) {
  if (callState === "incoming") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
        <PhoneIncoming className="size-3.5 animate-pulse text-sky-600" />
        <span className="font-medium">
          {incomingFromUsername ?? "Partner"} is calling
        </span>
        <Button
          size="xs"
          variant="default"
          onClick={onAcceptCall}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Phone className="size-3" />
          Accept
        </Button>
        <Button size="xs" variant="destructive" onClick={onRejectCall}>
          <PhoneOff className="size-3" />
          Decline
        </Button>
      </div>
    );
  }

  if (callState === "calling") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <Phone className="size-3.5 animate-pulse text-amber-600" />
        <span className="font-medium">Ringing…</span>
        <Button size="xs" variant="destructive" onClick={onEndCall}>
          Cancel
        </Button>
      </div>
    );
  }

  if (callState === "connecting") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
        <Phone className="size-3.5 text-sky-600" />
        <span className="font-medium">Connecting…</span>
        <Button size="xs" variant="destructive" onClick={onEndCall}>
          Cancel
        </Button>
      </div>
    );
  }

  if (callState === "connected") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
        <span className="relative inline-flex size-2 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-mono font-medium">{formatDuration(callDurationSeconds)}</span>
        <Button
          size="icon-xs"
          variant={micEnabled ? "outline" : "destructive"}
          onClick={onToggleMic}
          title={micEnabled ? "Mute microphone" : "Unmute microphone"}
          aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {micEnabled ? <Mic className="size-3" /> : <MicOff className="size-3" />}
        </Button>
        <Button
          size="xs"
          variant="destructive"
          onClick={onEndCall}
          title="End call"
        >
          <PhoneOff className="size-3" />
          End
        </Button>
      </div>
    );
  }

  const canStart = partnerOnline && callState !== "error" && !cooldownActive;

  return (
    <div className="flex items-center gap-2">
      {errorMessage && (
        <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
          {errorMessage}
        </span>
      )}
      {cooldownActive && !errorMessage && (
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Try again shortly…
        </span>
      )}
      <Button
        size="xs"
        variant="outline"
        onClick={onStartCall}
        disabled={!canStart}
        title={
          cooldownActive
            ? "Please wait before calling again"
            : partnerOnline
              ? "Start voice call"
              : "Partner is offline"
        }
        aria-label="Start voice call"
      >
        <Phone className="size-3" />
        Call
      </Button>
    </div>
  );
}
