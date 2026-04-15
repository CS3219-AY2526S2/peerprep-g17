import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import type { PublicProfile } from "@/hooks/usePublicProfile";
import type { QuestionRecord } from "@/types";
import { difficultyBadgeStyles } from "@/lib/collaboration/executionFormatters";
import { VoiceCallControls } from "./VoiceCallControls";
import type { VoiceCallState } from "@/hooks/useVoiceChat";

interface SessionHeaderProps {
  question: QuestionRecord | null;
  partnerProfile: PublicProfile | null;
  partnerPhotoPreview: string | null;
  peerOnline: boolean;
  terminated: boolean;
  completing: boolean;
  sessionReady: boolean;
  onLeaveSession: () => void;
  onSubmitSession: () => void;
  voiceCallState: VoiceCallState;
  voiceMicEnabled: boolean;
  voiceErrorMessage: string | null;
  voiceIncomingFromUsername: string | null;
  voiceCallDurationSeconds: number;
  voiceCooldownActive: boolean;
  chatOpen: boolean;
  unreadChatCount: number;
  onStartVoiceCall: () => void;
  onAcceptVoiceCall: () => void;
  onRejectVoiceCall: () => void;
  onEndVoiceCall: () => void;
  onToggleVoiceMic: () => void;
  onOpenChat: () => void;
}

export function SessionHeader({
  question,
  partnerProfile,
  partnerPhotoPreview,
  peerOnline,
  terminated,
  completing,
  sessionReady,
  onLeaveSession,
  onSubmitSession,
  voiceCallState,
  voiceMicEnabled,
  voiceErrorMessage,
  voiceIncomingFromUsername,
  voiceCallDurationSeconds,
  voiceCooldownActive,
  chatOpen,
  unreadChatCount,
  onStartVoiceCall,
  onAcceptVoiceCall,
  onRejectVoiceCall,
  onEndVoiceCall,
  onToggleVoiceMic,
  onOpenChat,
}: SessionHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex min-w-0 items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-3 py-1 text-[11px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-700 dark:bg-sky-300" />
          Live
        </div>
        {question ? (
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {question.title}
            </h1>
            <span
              className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${difficultyBadgeStyles(
                question.difficulty,
              )}`}
            >
              {question.difficulty}
            </span>
          </div>
        ) : (
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Collaboration Session
          </h1>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PartnerPill
          profile={partnerProfile}
          photoPreview={partnerPhotoPreview}
          peerOnline={peerOnline}
        />
        <VoiceCallControls
          callState={voiceCallState}
          micEnabled={voiceMicEnabled}
          errorMessage={voiceErrorMessage}
          incomingFromUsername={voiceIncomingFromUsername}
          callDurationSeconds={voiceCallDurationSeconds}
          partnerOnline={peerOnline}
          cooldownActive={voiceCooldownActive}
          onStartCall={onStartVoiceCall}
          onAcceptCall={onAcceptVoiceCall}
          onRejectCall={onRejectVoiceCall}
          onEndCall={onEndVoiceCall}
          onToggleMic={onToggleVoiceMic}
        />
        <Button
          variant={chatOpen ? "default" : "outline"}
          size="sm"
          onClick={onOpenChat}
          className="gap-2"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/20 text-[11px] font-semibold"
          >
            C
          </span>
          Chat
          {unreadChatCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unreadChatCount}
            </span>
          )}
        </Button>
        <div className="mx-1 hidden h-6 w-px bg-slate-300/70 dark:bg-slate-700 sm:block" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onLeaveSession}
          disabled={terminated}
        >
          Exit
        </Button>
        <Button
          size="sm"
          onClick={onSubmitSession}
          disabled={!sessionReady || completing || terminated}
        >
          {completing ? "Saving..." : "Submit & Complete"}
        </Button>
      </div>
    </header>
  );
}

function PartnerPill({
  profile,
  photoPreview,
  peerOnline,
}: {
  profile: PublicProfile | null;
  photoPreview: string | null;
  peerOnline: boolean;
}) {
  if (!profile) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300/80 bg-white/70 px-3 py-1.5 text-xs text-muted-foreground dark:border-slate-700 dark:bg-slate-900/70">
        Waiting for partner profile...
      </div>
    );
  }

  return (
    <Link
      to={`/users/${profile.id}`}
      className="group inline-flex items-center gap-2.5 rounded-full border border-sky-200/80 bg-white/95 px-3 py-1.5 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900/85 dark:hover:border-slate-500"
      title={profile.username}
    >
      <div className="relative">
        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt={`${profile.username} profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{profile.username[0]?.toUpperCase() || "?"}</span>
          )}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
            peerOnline ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Partner
        </span>
        <span className="text-sm font-semibold text-slate-900 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-300">
          {profile.username}
        </span>
      </div>
    </Link>
  );
}
