"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatChannel } from "@etheria/shared";
import { useChatMessages, useSendChatMessage, useBlocks, useBlockUser, useUnblockUser } from "@/hooks/useCity";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";

const MAX_LENGTH = 280;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Stable per-player name color (readable on dark)
function nameColor(name: string): string {
  const hues = [28, 95, 160, 200, 260, 320];
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return `hsl(${hues[hash % hues.length]}, 70%, 70%)`;
}

export function ChatPanel({
  fullscreen = false,
  onClose,
}: {
  fullscreen?: boolean;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const auth = useMatecitoAuth();
  const [channel, setChannel] = useState<ChatChannel>("GLOBAL");
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const { data: blocksData } = useBlocks();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const blockedIds = new Set((blocksData?.blocks ?? []).map((b: any) => b.blockedUserId));

  const { data: messages, error: loadError } = useChatMessages(channel, true);
  const sendMessage = useSendChatMessage();

  // Autoscroll only while the user is already at the bottom
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const handleSend = () => {
    const message = draft.trim();
    if (!message || sendMessage.isPending) return;
    setSendError(null);
    sendMessage.mutate(
      { channel, message },
      {
        onSuccess: () => setDraft(""),
        onError: (e) => setSendError(e.message),
      }
    );
  };

  const needsAlliance =
    channel === "ALLIANCE" && loadError?.message?.toLowerCase().includes("alliance");

  const tabs: { id: ChatChannel; label: string }[] = [
    { id: "GLOBAL", label: t("play.chat.global") },
    { id: "ALLIANCE", label: t("play.chat.alliance") },
  ];

  return (
    <div
      className={`pointer-events-auto flex flex-col overflow-hidden border border-white/10 bg-[#0b0f0e]/92 backdrop-blur-xl ${
        fullscreen ? "fixed inset-0 z-[70]" : "h-full w-full rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
      }`}
      style={fullscreen ? { paddingTop: "env(safe-area-inset-top, 0px)" } : undefined}
    >
      {/* Header: tabs + close */}
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setChannel(tab.id)}
            className={`rounded-lg px-3 py-1 text-[12px] font-semibold transition-colors ${
              channel === tab.id
                ? "bg-amber-400/15 text-amber-300"
                : "text-white/55 hover:bg-white/8 hover:text-white/85"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {blocksData && blocksData.blocks.length > 0 && (
          <button
            onClick={() => setShowBlocked((v) => !v)}
            className="ml-auto rounded-lg px-2 py-1 text-[10px] text-stone-500 hover:text-rose-300 hover:bg-white/5"
            title="Jugadores bloqueados"
          >
            🚫 {blocksData.blocks.length}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label={t("play.chat.close")}
            className={`${blocksData?.blocks.length ? "" : "ml-auto"} grid h-7 w-7 place-items-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white`}
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
        {needsAlliance ? (
          <p className="px-2 py-6 text-center text-[12px] leading-relaxed text-white/45">
            {t("play.chat.needAlliance")}
          </p>
        ) : !messages || messages.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-white/40">{t("play.chat.empty")}</p>
        ) : (
          messages.map((m) => {
            const own = m.senderUserId === auth.token;
            return (
              <div key={m.id} className="group text-[12.5px] leading-snug flex items-start gap-1">
                <div className="flex-1">
                  <span className="mr-1.5 font-mono text-[10px] text-white/30">{formatTime(m.createdAt)}</span>
                  <span
                    className="mr-1 font-semibold"
                    style={{ color: own ? "#fcd34d" : nameColor(m.senderName) }}
                  >
                    {m.senderName}:
                  </span>
                  <span className="break-words text-white/85">{m.message}</span>
                </div>
                {!own && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {confirmBlock === m.senderUserId ? (
                      <button
                        onClick={() => { blockUser.mutate(m.senderUserId); setConfirmBlock(null); }}
                        className="rounded px-1.5 py-0.5 text-[9px] bg-rose-700 text-white font-bold"
                      >¿Bloquear?</button>
                    ) : (
                      <button
                        onClick={() => setConfirmBlock(m.senderUserId)}
                        className="rounded px-1.5 py-0.5 text-[9px] text-white/30 hover:text-rose-300"
                        title="Bloquear jugador"
                      >🚫</button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Blocked users list */}
      {showBlocked && (
        <div className="border-t border-white/10 bg-black/30 p-3 space-y-1.5 max-h-40 overflow-y-auto">
          <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-2">Bloqueados</p>
          {(blocksData?.blocks ?? []).map((b: any) => (
            <div key={b.blockedUserId} className="flex items-center justify-between text-xs">
              <span className="text-stone-400">{b.blockedName ?? b.blockedUserId}</span>
              <button
                onClick={() => unblockUser.mutate(b.blockedUserId)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300"
              >Desbloquear</button>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      {!needsAlliance && (
        <div
          className="border-t border-white/10 p-2"
          style={fullscreen ? { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" } : undefined}
        >
          {sendError && <p className="mb-1 px-1 text-[11px] text-rose-300">{sendError}</p>}
          <div className="flex items-center gap-1.5">
            <input
              value={draft}
              maxLength={MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
                e.stopPropagation();
              }}
              placeholder={t("play.chat.placeholder")}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-amber-400/50"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sendMessage.isPending}
              className="shrink-0 rounded-xl bg-amber-500 px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-amber-400 disabled:opacity-40"
            >
              {t("play.chat.send")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
