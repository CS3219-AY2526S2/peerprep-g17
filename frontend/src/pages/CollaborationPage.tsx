/*
AI Assistance Disclosure:
Tool: ChatGPT, date: 2026-04-12
Scope: Generated and edited collaboration page updates to show partner profile detail. Also used it for creating the boilerplate frontend.
Author review: I checked page behavior manually.
*/
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  CHAT_WS_URL,
  COLLABORATION_API_URL,
  MATCHING_API_URL,
  QUESTION_API_URL,
} from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import type {
  CollaborationSessionRecord,
  ExecutionResult,
  QuestionRecord,
} from "@/types";
import {
  isFunctionCase,
  toPrettyJson,
} from "@/lib/collaboration/executionFormatters";
import type {
  AiStyle,
  AiVerbosity,
  ChatMessage,
  ChatStatus,
  CustomExecutionPayload,
  EditorStatus,
  QuestionHelpMode,
  ResultTab,
} from "@/lib/collaboration/types";
import CodeEditor from "./CollaborationEditor";
import type { CodeEditorHandle } from "./CollaborationEditor";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LeftWorkspaceTabs } from "@/components/collaboration/LeftWorkspaceTabs";
import { ChatPanel } from "@/components/collaboration/ChatPanel";
import { ResultsWorkspace } from "@/components/collaboration/ResultsWorkspace";
import { SessionHeader } from "@/components/collaboration/SessionHeader";
import { SharedEditorCard } from "@/components/collaboration/SharedEditorCard";
import { AiResponsePanel } from "@/components/collaboration/shared";

const ACTIVE_SESSION_STORAGE_KEY = "active_collaboration_session";
const CHAT_RECONNECT_DELAY_MS = 2000;
const CHAT_MAX_RECONNECT_ATTEMPTS = 10;
const SESSION_RETRY_DELAY_MS = 3000;

export default function CollaborationPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // Session + question state
  const [session, setSession] = useState<CollaborationSessionRecord | null>(null);
  const [question, setQuestion] = useState<QuestionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [terminated, setTerminated] = useState(false);
  const [sessionUnavailable, setSessionUnavailable] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"leave" | "submit" | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [chatStatus, setChatStatus] = useState<ChatStatus>(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "connecting",
  );
  const [peerOnline, setPeerOnline] = useState(false);

  // Editor state
  const [editorStatus, setEditorStatus] = useState<EditorStatus>("connecting");

  // Inactivity / countdown
  const [warningActive, setWarningActive] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Execution state
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(
    null,
  );
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [customTestError, setCustomTestError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [runningMode, setRunningMode] = useState<"run" | "submit" | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>("result");

  // Custom test inputs
  const [customFunctionArgsText, setCustomFunctionArgsText] = useState("[]");
  const [customClassOperationsText, setCustomClassOperationsText] = useState("[]");
  const [customClassArgumentsText, setCustomClassArgumentsText] = useState("[]");

  // AI explanation state
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // AI question helper state
  const [questionHelp, setQuestionHelp] = useState<string | null>(null);
  const [questionHelpLoading, setQuestionHelpLoading] = useState(false);
  const [questionHelpError, setQuestionHelpError] = useState<string | null>(null);
  const [questionHelpPrompt, setQuestionHelpPrompt] = useState("");
  const [questionHelpMode, setQuestionHelpMode] =
    useState<QuestionHelpMode>("rephrase");
  const [aiVerbosity, setAiVerbosity] = useState<AiVerbosity>("quick");
  const [aiStyle, setAiStyle] = useState<AiStyle>("concise_coach");

  // Refs
  const editorRef = useRef<CodeEditorHandle>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const voiceSignalingHandlerRef = useRef<
    (data: { type: string; payload?: Record<string, unknown> }) => void
  >(() => {});
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatCleanupRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminatedRef = useRef(false);
  const isRedirecting = useRef(false);
  const executionStartedAtRef = useRef<string | null>(null);
  const lastInitializedQuestionIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIndicatorsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const quickReplies = useMemo(
    () => [
      "Try the edge case with an empty input.",
      "I think the bug is in the visited check.",
      "Can you explain your approach first?",
      "Let's submit after one more run.",
    ],
    [],
  );

  const partnerUserId = useMemo(() => {
    if (!session || !user?.id) return null;
    return session.userAId === user.id ? session.userBId : session.userAId;
  }, [session, user?.id]);

  const { profile: partnerProfile, photoPreview: partnerPhotoPreview } =
    usePublicProfile(partnerUserId, token, { enabled: Boolean(partnerUserId) });

  const latestExecutionLabel = useMemo(() => {
    if (!executionResult) return "";
    return executionResult.initiatedByUserId === user?.id ? "You" : "Your partner";
  }, [executionResult, user?.id]);

  // ── Helpers ───────────────────────────────────────────────────────────

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearSessionRetryTimer = useCallback(() => {
    if (sessionRetryTimerRef.current) {
      clearTimeout(sessionRetryTimerRef.current);
      sessionRetryTimerRef.current = null;
    }
  }, []);

  const sendKeepAlive = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "keep_alive", payload: {} }));
    }
  }, []);

  const sendActivity = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "activity", payload: {} }));
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setWarningActive(false);
    setCountdown(0);
  }, []);

  const startCountdown = useCallback(
    (seconds: number) => {
      cancelCountdown();
      setCountdown(seconds);
      setWarningActive(true);

      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            window.location.href = "/match";
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [cancelCountdown],
  );

  const handleKeepAlive = useCallback(() => {
    cancelCountdown();
    sendKeepAlive();
  }, [cancelCountdown, sendKeepAlive]);

  const applyExecutionResult = useCallback((result: ExecutionResult | null) => {
    setExecutionResult(result);
    setRunningMode(null);
    setExecutionError(null);
    if (result) {
      executionStartedAtRef.current = result.initiatedAt;
      setSession((previous) =>
        previous
          ? {
              ...previous,
              lastExecutionResult: result,
              lastExecutionAt: result.initiatedAt,
              lastSubmittedAt:
                result.mode === "submit"
                  ? result.initiatedAt
                  : previous.lastSubmittedAt,
            }
          : previous,
      );
    }
  }, []);

  const syncQuestionChange = useCallback(
    (nextQuestionId: string, nextTopic?: string, nextDifficulty?: string) => {
      setSession((previous) =>
        previous
          ? {
              ...previous,
              questionId: nextQuestionId,
              topic: nextTopic || previous.topic,
              difficulty: nextDifficulty || previous.difficulty,
              lastExecutionResult: null,
              lastExecutionAt: undefined,
              lastSubmittedAt: undefined,
            }
          : previous,
      );
      setQuestion(null);
      setExecutionResult(null);
      setExecutionError(null);
      setExplainError(null);
      setExplanation(null);
      setQuestionHelp(null);
      setQuestionHelpError(null);
      setQuestionHelpPrompt("");
      setQuestionHelpMode("rephrase");
      setAiVerbosity("quick");
      setAiStyle("concise_coach");
      setResultTab("result");
    },
    [],
  );

  // ── Session completion / leave ─────────────────────────────────────

  const completeSession = useCallback(
    async (shouldSave: boolean = true) => {
      if (!token || !sessionId || isRedirecting.current) return;

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "explicit_leave",
            payload: {
              reason: shouldSave ? "submitted the solution" : "left the session",
            },
          }),
        );
      }

      isRedirecting.current = true;
      terminatedRef.current = true;

      try {
        setCompleting(true);
        const collabUrl = shouldSave
          ? `${COLLABORATION_API_URL}/sessions/${sessionId}/complete`
          : `${COLLABORATION_API_URL}/sessions/${sessionId}`;
        const code = editorRef.current?.getCode() ?? "";

        const collabRes = await fetch(collabUrl, {
          method: shouldSave ? "POST" : "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });
        if (!collabRes.ok) {
          const json = await collabRes.json().catch(() => ({}));
          throw new Error(json.error || "Failed to complete session.");
        }

        const matchingRes = await fetch(`${MATCHING_API_URL}/requests/me/session`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!matchingRes.ok) {
          const json = await matchingRes.json().catch(() => ({}));
          throw new Error(json.error || "Failed to clear match state.");
        }
      } catch (err) {
        console.error("Cleanup failed:", err);
        setError(err instanceof Error ? err.message : "Failed to end session.");
        isRedirecting.current = false;
        terminatedRef.current = false;
      } finally {
        setCompleting(false);
        if (isRedirecting.current) {
          localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          window.location.href = "/match";
        }
      }
    },
    [sessionId, token],
  );

  const handleActionConfirm = useCallback(async () => {
    const mode = confirmMode;
    setConfirmMode(null);
    if (mode === "submit") await completeSession(true);
    else if (mode === "leave") await completeSession(false);
  }, [completeSession, confirmMode]);

  const redirectAfterSharedCompletion = useCallback(
    (outcome: "submitted" | "ended") => {
      if (isRedirecting.current) return;

      isRedirecting.current = true;
      terminatedRef.current = true;
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      editorRef.current?.disconnect();
      setSessionUnavailable(false);
      setTerminated(true);
      setError(
        outcome === "submitted"
          ? "The collaboration session was completed and submitted."
          : "The collaboration session was ended.",
      );
      setTimeout(() => navigate("/match"), 1500);
    },
    [navigate],
  );

  // ── Chat socket ───────────────────────────────────────────────────

  const connectChatSocket = useCallback(() => {
    if (
      !token ||
      !sessionId ||
      terminatedRef.current ||
      isRedirecting.current ||
      chatCleanupRef.current
    ) {
      return;
    }

    const currentSocket = socketRef.current;
    if (
      currentSocket &&
      (currentSocket.readyState === WebSocket.OPEN ||
        currentSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const ws = new WebSocket(
      `${CHAT_WS_URL}/${sessionId}?token=${token}&username=${encodeURIComponent(
        user?.username || "Guest",
      )}`,
    );
    socketRef.current = ws;
    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      clearReconnectTimer();
      setPeerOnline(false);
      setChatStatus("connected");
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "session_warning") {
          if (data.payload.cancelled) {
            cancelCountdown();
          } else {
            startCountdown(data.payload.countdownSeconds);
          }
        } else if (data.type === "chat_message") {
          setMessages((prev) => [...prev, data.payload as ChatMessage]);
          if (
            data.payload?.fromUserId &&
            data.payload.fromUserId !== user?.id &&
            !chatOpen
          ) {
            setUnreadChatCount((current) => current + 1);
          }
        } else if (data.type === "chat_history") {
          setMessages((data.payload ?? []) as ChatMessage[]);
        } else if (data.type === "chat_reaction_update") {
          setMessages((prev) =>
            prev.map((message) =>
              message.messageId === data.payload?.messageId
                ? {
                    ...message,
                    reactions: Array.isArray(data.payload?.reactions)
                      ? data.payload.reactions
                      : [],
                  }
                : message,
            ),
          );
        } else if (data.type === "chat_typing") {
          if (data.payload?.userId && data.payload.userId !== user?.id) {
            const typingUserId = String(data.payload.userId);
            const typingUsername = String(data.payload.username || "Partner");

            if (typingIndicatorsRef.current[typingUserId]) {
              clearTimeout(typingIndicatorsRef.current[typingUserId]);
            }

            if (data.payload?.isTyping) {
              setTypingUsers((current) => ({
                ...current,
                [typingUserId]: typingUsername,
              }));
              typingIndicatorsRef.current[typingUserId] = setTimeout(() => {
                setTypingUsers((current) => {
                  const next = { ...current };
                  delete next[typingUserId];
                  return next;
                });
              }, 1800);
            } else {
              setTypingUsers((current) => {
                const next = { ...current };
                delete next[typingUserId];
                return next;
              });
            }
          }
        } else if (data.type === "peer_status_snapshot") {
          const onlineUserIds: string[] = data.payload?.onlineUserIds ?? [];
          setPeerOnline(
            onlineUserIds.some((onlineUserId) => onlineUserId !== user?.id),
          );
        } else if (data.type === "peer_status_change") {
          if (data.payload.userId !== user?.id) {
            setPeerOnline(data.payload.isConnected);
          }
        } else if (data.type === "session_completed") {
          redirectAfterSharedCompletion(data.payload?.outcome || "ended");
        } else if (data.type === "session_terminated") {
          if (isRedirecting.current) return;
          isRedirecting.current = true;
          localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          editorRef.current?.disconnect();
          setSessionUnavailable(false);
          setTerminated(true);
          setTimeout(() => navigate("/match"), 3000);
        } else if (data.type === "execution_started") {
          executionStartedAtRef.current = data.payload?.initiatedAt || null;
          setRunningMode(data.payload?.mode || "run");
          setExecutionResult(null);
          setExecutionError(null);
          setResultTab("result");
        } else if (data.type === "execution_result") {
          applyExecutionResult(data.payload);
          setResultTab("result");
        } else if (data.type === "question_switched") {
          syncQuestionChange(
            data.payload?.questionId,
            data.payload?.topic,
            data.payload?.difficulty,
          );
        } else if (
          data.type === "voice_call_request" ||
          data.type === "voice_call_accept" ||
          data.type === "voice_call_reject" ||
          data.type === "voice_call_end" ||
          data.type === "voice_offer" ||
          data.type === "voice_answer" ||
          data.type === "voice_ice_candidate"
        ) {
          voiceSignalingHandlerRef.current(data);
        }
      } catch {
        // Ignore non-JSON noise.
      }
    };

    ws.onclose = () => {
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
      setPeerOnline(false);
      if (!navigator.onLine) {
        setChatStatus("offline");
      } else {
        setChatStatus("reconnecting");
      }
      if (terminatedRef.current && !isRedirecting.current) {
        isRedirecting.current = true;
        navigate("/match");
        return;
      }

      if (
        chatCleanupRef.current ||
        isRedirecting.current ||
        terminatedRef.current ||
        reconnectAttemptsRef.current >= CHAT_MAX_RECONNECT_ATTEMPTS
      ) {
        return;
      }

      reconnectAttemptsRef.current += 1;
      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        connectChatSocket();
      }, CHAT_RECONNECT_DELAY_MS * reconnectAttemptsRef.current);
    };
    ws.onerror = () => {
      setPeerOnline(false);
      ws.close();
    };
  }, [
    applyExecutionResult,
    cancelCountdown,
    chatOpen,
    clearReconnectTimer,
    navigate,
    redirectAfterSharedCompletion,
    sessionId,
    startCountdown,
    syncQuestionChange,
    token,
    user?.id,
    user?.username,
  ]);

  useEffect(() => {
    if (!token || !sessionId || terminatedRef.current || isRedirecting.current) return;
    chatCleanupRef.current = false;
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
    connectChatSocket();

    const handleOnline = () => {
      reconnectAttemptsRef.current = 0;
      setChatStatus("reconnecting");
      connectChatSocket();
    };

    const handleOffline = () => {
      setChatStatus("offline");
      setPeerOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      chatCleanupRef.current = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearReconnectTimer();
      clearSessionRetryTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [clearReconnectTimer, clearSessionRetryTimer, connectChatSocket, sessionId, token]);

  // ── Session loading ────────────────────────────────────────────────

  const loadSession = useCallback(async () => {
    if (!token || !sessionId || isRedirecting.current) return;

    try {
      setLoading(true);
      setSessionUnavailable(false);
      setError("");
      const res = await fetch(`${COLLABORATION_API_URL}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.status === "completed" && !isRedirecting.current) {
          redirectAfterSharedCompletion(
            json.data?.lastSubmittedAt ? "submitted" : "ended",
          );
          return;
        }
        setSession(json.data);
        setSessionUnavailable(false);
        clearSessionRetryTimer();
        if (json.data?.lastExecutionResult) {
          applyExecutionResult(json.data.lastExecutionResult);
        } else {
          setExecutionResult(null);
        }
        if (json.data?.messages) setMessages(json.data.messages);
      } else if (res.status === 404 && !isRedirecting.current) {
        // Session is genuinely gone (deleted, completed, or DB wiped).
        // Clear the stale auto-resume pointer so the dashboard doesn't
        // bounce the user straight back here on every login.
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        isRedirecting.current = true;
        setSession(null);
        setError("That collaboration session is no longer available.");
        navigate("/match", { replace: true });
        return;
      } else {
        setSession(null);
        setSessionUnavailable(true);
        setError("Unable to reach the collaboration service right now.");
      }
    } catch {
      setSession(null);
      setSessionUnavailable(true);
      setError("Unable to reach the collaboration service right now.");
    } finally {
      setLoading(false);
    }
  }, [
    applyExecutionResult,
    clearSessionRetryTimer,
    navigate,
    redirectAfterSharedCompletion,
    sessionId,
    token,
  ]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!sessionUnavailable || terminated || isRedirecting.current) {
      clearSessionRetryTimer();
      return;
    }

    clearSessionRetryTimer();
    sessionRetryTimerRef.current = setTimeout(() => {
      void loadSession();
    }, SESSION_RETRY_DELAY_MS);

    return () => {
      clearSessionRetryTimer();
    };
  }, [clearSessionRetryTimer, loadSession, sessionUnavailable, terminated]);

  // Poll for shared execution result
  useEffect(() => {
    if (!runningMode || !token || !sessionId || terminatedRef.current) return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `${COLLABORATION_API_URL}/sessions/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!response.ok || cancelled) return;

        const json = await response.json();
        const latestResult = json.data?.lastExecutionResult as
          | ExecutionResult
          | null
          | undefined;

        if (
          latestResult &&
          (!executionStartedAtRef.current ||
            new Date(latestResult.initiatedAt).getTime() >=
              new Date(executionStartedAtRef.current).getTime())
        ) {
          setSession(json.data);
          applyExecutionResult(latestResult);
          return;
        }

        if (attempts >= 12) {
          setRunningMode(null);
          setExecutionError(
            "Execution finished but the shared result did not sync in time. Please run again.",
          );
        }
      } catch {
        if (attempts >= 12) {
          setRunningMode(null);
        }
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, 1500);

    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [applyExecutionResult, runningMode, sessionId, token]);

  // Load question details
  useEffect(() => {
    if (!session?.questionId || !token) return;
    const questionId = session.questionId;

    async function loadQuestion() {
      try {
        setQuestion(null);
        const res = await fetch(`${QUESTION_API_URL}/${questionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setQuestion(json.data);
        }
      } catch {
        // Ignore question fetch errors here; the page already has a session shell.
      }
    }

    void loadQuestion();
  }, [session?.questionId, token]);

  // Cleanup on unmount
  useEffect(() => {
    if (terminated) {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
  }, [terminated]);

  useEffect(() => {
    if (chatOpen) setUnreadChatCount(0);
  }, [chatOpen]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      Object.values(typingIndicatorsRef.current).forEach((timer) =>
        clearTimeout(timer),
      );
    };
  }, []);

  // ── Voice chat ────────────────────────────────────────────────────

  const sendVoiceSignal = useCallback(
    (message: { type: string; payload?: Record<string, unknown> }) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify(message));
      return true;
    },
    [],
  );

  const {
    callState: voiceCallState,
    micEnabled: voiceMicEnabled,
    errorMessage: voiceErrorMessage,
    incomingFromUsername: voiceIncomingFromUsername,
    callDurationSeconds: voiceCallDurationSeconds,
    cooldownActive: voiceCooldownActive,
    startCall: startVoiceCall,
    acceptCall: acceptVoiceCall,
    rejectCall: rejectVoiceCall,
    endCall: endVoiceCall,
    toggleMic: toggleVoiceMic,
    handleSignalingMessage: handleVoiceSignalingMessage,
  } = useVoiceChat({
    sendSignal: sendVoiceSignal,
    currentUserId: user?.id,
    partnerUserId,
    remoteAudioRef,
  });

  useEffect(() => {
    voiceSignalingHandlerRef.current = handleVoiceSignalingMessage;
  }, [handleVoiceSignalingMessage]);

  useEffect(() => {
    if (!peerOnline && voiceCallState !== "idle") {
      const graceTimer = setTimeout(() => {
        endVoiceCall();
      }, 3000);
      return () => clearTimeout(graceTimer);
    }
  }, [endVoiceCall, peerOnline, voiceCallState]);

  // Seed custom test inputs when question loads
  useEffect(() => {
    if (!question || lastInitializedQuestionIdRef.current === question.id) return;

    lastInitializedQuestionIdRef.current = question.id;
    setCustomTestError(null);

    if (question.executionMode === "python_function") {
      const firstCase = question.visibleTestCases[0];
      setCustomFunctionArgsText(
        firstCase && isFunctionCase(firstCase) ? toPrettyJson(firstCase.args) : "[]",
      );
      return;
    }

    const firstCase = question.visibleTestCases[0];
    if (firstCase && !isFunctionCase(firstCase)) {
      setCustomClassOperationsText(toPrettyJson(firstCase.operations));
      setCustomClassArgumentsText(toPrettyJson(firstCase.arguments));
      return;
    }

    setCustomClassOperationsText("[]");
    setCustomClassArgumentsText("[]");
  }, [question]);

  // ── Chat actions ─────────────────────────────────────────────────

  const sendTypingSignal = useCallback((isTyping: boolean) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN || terminatedRef.current) {
      return;
    }
    socketRef.current.send(
      JSON.stringify({ type: "chat_typing", payload: { isTyping } }),
    );
  }, []);

  const sendMessage = useCallback(() => {
    if (
      socketRef.current?.readyState === WebSocket.OPEN &&
      chatInput.trim() &&
      !terminated
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: "chat_message",
          payload: { text: chatInput, username: user?.username },
        }),
      );
      setChatInput("");
      sendTypingSignal(false);
      sendActivity();
    }
  }, [chatInput, sendActivity, sendTypingSignal, terminated, user?.username]);

  const sendQuickReply = useCallback(
    (text: string) => {
      if (
        socketRef.current?.readyState === WebSocket.OPEN &&
        !terminated &&
        chatStatus === "connected"
      ) {
        socketRef.current.send(
          JSON.stringify({
            type: "chat_message",
            payload: { text, username: user?.username },
          }),
        );
        sendTypingSignal(false);
        sendActivity();
      }
    },
    [chatStatus, sendActivity, sendTypingSignal, terminated, user?.username],
  );

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (socketRef.current?.readyState !== WebSocket.OPEN || terminated) return;
      socketRef.current.send(
        JSON.stringify({
          type: "chat_reaction",
          payload: { messageId, emoji },
        }),
      );
    },
    [terminated],
  );

  const handleChatInputChange = useCallback(
    (value: string) => {
      setChatInput(value);
      sendTypingSignal(value.trim().length > 0);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingSignal(false);
      }, 1200);
    },
    [sendTypingSignal],
  );

  const insertCodeSnippetTemplate = useCallback(() => {
    const snippet = "```python\n# Share a code idea here\n```";
    setChatInput((current) => (current.trim() ? `${current}\n${snippet}` : snippet));
  }, []);

  // ── Code execution / AI ─────────────────────────────────────────

  const explainCode = useCallback(async () => {
    const code = editorRef.current?.getCode();
    if (!code?.trim()) {
      setExplainError("No code to explain.");
      return;
    }

    try {
      setExplaining(true);
      setExplanation(null);
      setExplainError(null);
      const response = await fetch(`${COLLABORATION_API_URL}/sessions/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          verbosity: aiVerbosity,
          style: aiStyle,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setExplainError(result?.error || "Explanation failed.");
        return;
      }

      setExplanation(result?.data?.explanation || "");
    } catch (err) {
      setExplainError(
        err instanceof Error ? err.message : "Explanation failed.",
      );
    } finally {
      setExplaining(false);
    }
  }, [aiStyle, aiVerbosity, token]);

  const requestQuestionHelp = useCallback(
    async (mode: QuestionHelpMode = questionHelpMode) => {
      if (!question || !token) return;

      if (mode === "brainstorm" && !questionHelpPrompt.trim()) {
        setQuestionHelpError("Ask a question for the AI helper first.");
        return;
      }

      try {
        setQuestionHelpLoading(true);
        setQuestionHelpError(null);
        setQuestionHelp(null);

        const response = await fetch(
          `${COLLABORATION_API_URL}/sessions/assistant/question`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              questionTitle: question.title,
              questionDescription: question.description,
              difficulty: question.difficulty,
              topics: question.categories,
              language: session?.language || "Python",
              code: editorRef.current?.getCode() || "",
              mode,
              verbosity: aiVerbosity,
              style: aiStyle,
              userPrompt: questionHelpPrompt,
            }),
          },
        );

        const json = await response.json().catch(() => null);
        if (!response.ok) {
          setQuestionHelpError(json?.error || "AI helper request failed.");
          return;
        }

        setQuestionHelp(json?.data?.response || "");
      } catch (err) {
        setQuestionHelpError(
          err instanceof Error ? err.message : "AI helper request failed.",
        );
      } finally {
        setQuestionHelpLoading(false);
      }
    },
    [
      aiStyle,
      aiVerbosity,
      question,
      questionHelpMode,
      questionHelpPrompt,
      session?.language,
      token,
    ],
  );

  const executeWithOptions = useCallback(
    async (mode: "run" | "submit", customTestCase?: CustomExecutionPayload) => {
      const code = editorRef.current?.getCode();
      if (!code?.trim() || !token || !sessionId) {
        setExecutionError("No code to execute.");
        setResultTab("result");
        return;
      }

      try {
        setExecutionError(null);
        setRunningMode(mode);
        setResultTab("result");

        const response = await fetch(
          `${COLLABORATION_API_URL}/sessions/${sessionId}/${mode}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ code, customTestCase }),
          },
        );

        const json = await response.json();
        if (!response.ok) {
          setExecutionError(json.error || `Failed to ${mode} code.`);
          return;
        }

        applyExecutionResult(json.data);
      } catch (err) {
        setExecutionError(
          err instanceof Error ? err.message : `Failed to ${mode} code.`,
        );
      } finally {
        setRunningMode(null);
      }
    },
    [applyExecutionResult, sessionId, token],
  );

  const execute = useCallback(
    (mode: "run" | "submit") => {
      void executeWithOptions(mode);
    },
    [executeWithOptions],
  );

  const copyEditorCode = useCallback(async () => {
    const code = editorRef.current?.getCode();
    if (!code?.trim()) return;

    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1200);
    } catch {
      setCodeCopied(false);
    }
  }, []);

  const parseCustomFunctionArgs = useCallback((): CustomExecutionPayload => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(customFunctionArgsText);
    } catch {
      throw new Error("Custom arguments must be valid JSON.");
    }
    if (!Array.isArray(parsed)) {
      throw new Error("Custom arguments must be a JSON array.");
    }
    return { args: parsed };
  }, [customFunctionArgsText]);

  const parseCustomClassPayload = useCallback((): CustomExecutionPayload => {
    let parsedOperations: unknown;
    let parsedArguments: unknown;

    try {
      parsedOperations = JSON.parse(customClassOperationsText);
    } catch {
      throw new Error("Operations must be valid JSON.");
    }

    try {
      parsedArguments = JSON.parse(customClassArgumentsText);
    } catch {
      throw new Error("Arguments must be valid JSON.");
    }

    if (
      !Array.isArray(parsedOperations) ||
      !parsedOperations.every((value) => typeof value === "string")
    ) {
      throw new Error("Operations must be a JSON array of strings.");
    }

    if (
      !Array.isArray(parsedArguments) ||
      !parsedArguments.every((value) => Array.isArray(value))
    ) {
      throw new Error("Arguments must be a JSON array of arrays.");
    }

    if (parsedOperations.length !== parsedArguments.length) {
      throw new Error(
        "Operations and arguments must have the same number of entries.",
      );
    }

    return {
      operations: parsedOperations,
      arguments: parsedArguments as unknown[][],
    };
  }, [customClassArgumentsText, customClassOperationsText]);

  const runCustomTest = useCallback(async () => {
    if (!question) return;

    try {
      setCustomTestError(null);
      const payload =
        question.executionMode === "python_function"
          ? parseCustomFunctionArgs()
          : parseCustomClassPayload();

      await executeWithOptions("run", payload);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Custom testcase is invalid.";
      setCustomTestError(message);
      setExecutionError(message);
      setResultTab("result");
    }
  }, [executeWithOptions, parseCustomClassPayload, parseCustomFunctionArgs, question]);

  const handleCustomFunctionArgsChange = useCallback((value: string) => {
    setCustomFunctionArgsText(value);
    setCustomTestError(null);
  }, []);

  const handleCustomClassOperationsChange = useCallback((value: string) => {
    setCustomClassOperationsText(value);
    setCustomTestError(null);
  }, []);

  const handleCustomClassArgumentsChange = useCallback((value: string) => {
    setCustomClassArgumentsText(value);
    setCustomTestError(null);
  }, []);

  const handleCloseQuestionHelp = useCallback(() => {
    setQuestionHelp(null);
    setQuestionHelpError(null);
  }, []);

  const handleCloseExplanation = useCallback(() => {
    setExplanation(null);
    setExplainError(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────

  const renderWorkspace = () => {
    if (!terminated && session) {
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Left: tabbed question / tests / AI */}
          <div className="min-h-[600px] xl:min-h-0">
            <LeftWorkspaceTabs
              question={question}
              runningMode={runningMode}
              customTestError={customTestError}
              customFunctionArgsText={customFunctionArgsText}
              customClassOperationsText={customClassOperationsText}
              customClassArgumentsText={customClassArgumentsText}
              onCustomFunctionArgsChange={handleCustomFunctionArgsChange}
              onCustomClassOperationsChange={handleCustomClassOperationsChange}
              onCustomClassArgumentsChange={handleCustomClassArgumentsChange}
              onRunCustomTest={runCustomTest}
              aiVerbosity={aiVerbosity}
              aiStyle={aiStyle}
              questionHelpMode={questionHelpMode}
              questionHelpPrompt={questionHelpPrompt}
              questionHelp={questionHelp}
              questionHelpError={questionHelpError}
              questionHelpLoading={questionHelpLoading}
              explaining={explaining}
              onAiVerbosityChange={setAiVerbosity}
              onAiStyleChange={setAiStyle}
              onQuestionHelpModeChange={setQuestionHelpMode}
              onQuestionHelpPromptChange={setQuestionHelpPrompt}
              onRequestQuestionHelp={requestQuestionHelp}
              onCloseQuestionHelp={handleCloseQuestionHelp}
            />
          </div>

          {/* Right: editor + results stacked */}
          <div className="flex min-h-0 flex-col gap-4">
            <div className="min-h-[420px] xl:flex-[3] xl:min-h-0">
              <SharedEditorCard
                editorStatus={editorStatus}
                questionLoaded={Boolean(question)}
                runningMode={runningMode}
                explaining={explaining}
                codeCopied={codeCopied}
                onRun={() => execute("run")}
                onSubmit={() => execute("submit")}
                onCopy={copyEditorCode}
                onExplain={explainCode}
                editorSlot={
                  question && (
                    <CodeEditor
                      key={`${session.sessionId}:${question.id}`}
                      ref={editorRef}
                      sessionId={session.sessionId}
                      username={user?.username || "Guest"}
                      token={token || ""}
                      initialCode={question.starterCode?.python ?? ""}
                      sharedCode={session.sharedCode ?? ""}
                      sharedYjsState={session.sharedYjsState ?? null}
                      onActivity={sendActivity}
                      onConnectionStatusChange={setEditorStatus}
                    />
                  )
                }
              />
            </div>

            <div className="min-h-[360px] xl:flex-[2] xl:min-h-0">
              <ResultsWorkspace
                resultTab={resultTab}
                onResultTabChange={setResultTab}
                runningMode={runningMode}
                executionError={executionError}
                executionResult={executionResult}
                latestExecutionLabel={latestExecutionLabel}
              />
            </div>

            {(explanation || explainError || explaining) && (
              <div className="space-y-3">
                {explaining && (
                  <div className="rounded-xl border border-sky-200/80 bg-white/80 px-4 py-3 text-sm text-sky-700 dark:border-sky-900/60 dark:bg-slate-900/70 dark:text-sky-300">
                    AI is summarizing the code...
                  </div>
                )}
                {explainError && (
                  <p className="rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                    {explainError}
                  </p>
                )}
                {explanation && (
                  <AiResponsePanel
                    title="AI Explanation"
                    tone="sky"
                    content={explanation}
                    onClose={handleCloseExplanation}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (!terminated && (loading || sessionUnavailable)) {
      return (
        <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/80 bg-white/70 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-xl font-black uppercase text-zinc-500">
            {loading ? "Reconnecting" : "Connection Lost"}
          </p>
          <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
            {loading
              ? "Trying to restore the collaboration session..."
              : "The collaboration service is unavailable right now. This session has not been confirmed as ended."}
          </p>
          {!loading && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry Connection
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/80 bg-white/70 dark:border-slate-700 dark:bg-slate-900/50">
        <p className="text-xl font-black uppercase text-zinc-500">Session Ended</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/match")}
        >
          Return to Match Page
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      {warningActive && countdown > 0 && (
        <div className="fixed top-20 left-1/2 z-[9999] w-full max-w-md -translate-x-1/2 px-4 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/40 bg-amber-950/90 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
            <div>
              <p className="text-sm font-bold uppercase tracking-tight text-amber-500">
                Inactivity Warning
              </p>
              <p className="mt-0.5 text-xs text-amber-200/80">
                Terminating in{" "}
                <span className="font-mono font-bold text-amber-400">
                  {countdown >= 60
                    ? `${Math.floor(countdown / 60)}m ${(countdown % 60).toString().padStart(2, "0")}s`
                    : `${countdown}s`}
                </span>
              </p>
            </div>
            <button
              className="rounded border border-amber-500/40 px-3 py-1 text-sm text-amber-500 hover:bg-amber-500/30"
              onClick={handleKeepAlive}
            >
              Stay Connected
            </button>
          </div>
        </div>
      )}

      <main className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1700px] flex-col gap-4 px-6 pb-6 pt-20 lg:px-8">
        <div className="pointer-events-none absolute inset-x-6 top-16 -z-10 h-[20rem] rounded-[3rem] bg-gradient-to-br from-sky-100/70 via-white to-amber-50/70 blur-3xl dark:from-sky-950/20 dark:via-transparent dark:to-slate-950/20" />

        <SessionHeader
          question={question}
          partnerProfile={partnerProfile}
          partnerPhotoPreview={partnerPhotoPreview}
          peerOnline={peerOnline}
          terminated={terminated}
          completing={completing}
          sessionReady={Boolean(session)}
          onLeaveSession={() => setConfirmMode("leave")}
          onSubmitSession={() => setConfirmMode("submit")}
          voiceCallState={voiceCallState}
          voiceMicEnabled={voiceMicEnabled}
          voiceErrorMessage={voiceErrorMessage}
          voiceIncomingFromUsername={voiceIncomingFromUsername}
          voiceCallDurationSeconds={voiceCallDurationSeconds}
          voiceCooldownActive={voiceCooldownActive}
          chatOpen={chatOpen}
          unreadChatCount={unreadChatCount}
          onStartVoiceCall={startVoiceCall}
          onAcceptVoiceCall={acceptVoiceCall}
          onRejectVoiceCall={rejectVoiceCall}
          onEndVoiceCall={endVoiceCall}
          onToggleVoiceMic={toggleVoiceMic}
          onOpenChat={() => setChatOpen((current) => !current)}
        />

        {loading && !terminated && !session && (
          <p className="animate-pulse text-sm text-muted-foreground">
            Syncing workspace...
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}

        {renderWorkspace()}

        <ChatPanel
          open={chatOpen}
          messages={messages}
          chatInput={chatInput}
          chatStatus={chatStatus}
          peerOnline={peerOnline}
          terminated={terminated}
          currentUserId={user?.id}
          currentUsername={user?.username}
          typingUsers={typingUsers}
          quickReplies={quickReplies}
          onClose={() => setChatOpen(false)}
          onChatInputChange={handleChatInputChange}
          onSendMessage={sendMessage}
          onSendQuickReply={sendQuickReply}
          onToggleReaction={toggleReaction}
          onInsertCodeSnippet={insertCodeSnippetTemplate}
        />

        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      </main>

      {confirmMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle>
                {confirmMode === "submit" ? "Submit & Save?" : "Leave Session?"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This will end the collaboration session.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmMode(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmMode === "submit" ? "default" : "destructive"}
                onClick={handleActionConfirm}
              >
                Confirm
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
