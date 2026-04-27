import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useChat, AGENTS } from '../contexts/ChatContext';
import type {
  AgentId,
  ChatMessage,
  EmptyEditorOptimizePhase,
} from '../contexts/ChatContext';

const DEFAULT_OPTIMIZE_QUERY = `WHERE customer_id IN (
    SELECT id FROM customers
    WHERE email LIKE '%gmail.com'
    AND status = 'active'
)`;

/**
 * Ask SingleStore / Query Tuner right-side chat panel.
 *
 * Fixed width column (360px) mounted to the right of the main page content
 * when `chat.isOpen`. Shows agent + user messages and a bottom composer.
 */
export function ChatPanel() {
  const chat = useChat();
  const navigate = useNavigate();
  const [composerValue, setComposerValue] = useState('');
  const [fileDragOver, setFileDragOver] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const flow = chat.emptyEditorOptimize;
  const inEmptyOptimizeSql =
    flow && (flow.phase === 'greeting' || flow.phase === 'awaiting-drop' || flow.phase === 'file-ready');
  const canSendPastedOrComposer =
    inEmptyOptimizeSql &&
    (Boolean(flow?.file) || composerValue.trim().length > 0);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chat.messages.length, flow?.phase]);

  if (!chat.isOpen) return null;

  const onProfileFile = (f: File | undefined) => {
    if (f) chat.stageJsonProfileFile(f);
  };

  return (
    <aside
      className={`bg-white border-l border-border-subtle flex flex-col min-h-0 relative ${
        chat.expanded ? 'flex-1 min-w-0' : 'w-[360px] shrink-0'
      }`}
      aria-label="Ask SingleStore"
      onDragOver={(e) => {
        if (flow?.phase !== 'awaiting-drop' && flow?.phase !== 'greeting') {
          return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!fileDragOver) setFileDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setFileDragOver(false);
      }}
      onDrop={(e) => {
        if (flow?.phase !== 'awaiting-drop' && flow?.phase !== 'greeting') {
          return;
        }
        e.preventDefault();
        setFileDragOver(false);
        const f = e.dataTransfer.files[0];
        onProfileFile(f);
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between h-12 px-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Icon name="wand-magic-sparkles" className="text-[14px] text-brand-9" />
          <span
            className="text-sm font-medium text-text-primary"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Ask SingleStore
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="btn-icon"
            aria-label="New chat"
            onClick={chat.clear}
            title="New chat"
          >
            <Icon name="plus" className="text-[12px]" />
          </button>
          <button
            type="button"
            className={`btn-icon ${chat.view === 'history' ? 'bg-brand-2 text-brand-9' : ''}`}
            aria-label="History"
            title="History"
            onClick={() =>
              chat.setView(chat.view === 'history' ? 'thread' : 'history')
            }
          >
            <Icon name="history" className="text-[12px]" />
          </button>
          <button
            type="button"
            className="btn-icon"
            aria-label={chat.expanded ? 'Minimize' : 'Expand'}
            title={chat.expanded ? 'Minimize' : 'Expand'}
            onClick={chat.toggleExpanded}
          >
            <Icon
              name={chat.expanded ? 'compress' : 'expand'}
              className="text-[12px]"
            />
          </button>
          <button
            type="button"
            className="btn-icon"
            aria-label="Close"
            title="Close"
            onClick={chat.close}
          >
            <Icon name="xmark" className="text-[12px]" />
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          onProfileFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {fileDragOver && flow && (
        <div
          className="absolute inset-0 z-10 m-2 rounded-lg border-2 border-dashed border-brand-8 bg-brand-1/90 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <p
            className="text-sm font-medium text-brand-9 px-4 text-center"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Drop your file here to add to chat
          </p>
        </div>
      )}

      {/* Messages or History */}
      {chat.view === 'history' ? (
        <HistoryPanel
          onPickChat={() => chat.setView('thread')}
          onClose={() => chat.setView('thread')}
        />
      ) : (
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto min-h-0"
        >
          <div
            className={`flex flex-col gap-4 px-3 py-4 ${
              chat.expanded ? 'max-w-[680px] w-full mx-auto' : ''
            }`}
          >
            {chat.messages.length === 0 ? (
              <EmptyState />
            ) : (
              chat.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onOpenLink={(href, messageId) => {
                    if (messageId) chat.markResultViewed(messageId);
                    navigate(href);
                  }}
                  onYesRun={() => chat.confirmRun('/editor/visual-explain')}
                  onApplyQuery={(messageId, applyQuery) => {
                    chat.applyRewriteInEditor(messageId, applyQuery);
                  }}
                  emptyOptimizePhase={
                    m.kind === 'empty-optimize-greeting' ? flow?.phase : undefined
                  }
                  onSimulateFileSelect={() => chat.simulateJsonProfileFile()}
                  onPickWelcomeOption={(label) =>
                    chat.selectQueryTunerOption(label)
                  }
                />
              ))
            )}

            {flow?.filePickError && (
              <p
                className="text-xs text-danger-9 px-0.5"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {flow.filePickError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Composer (hidden when viewing chat history) */}
      {chat.view !== 'history' && (
      <div className="border-t border-border-subtle p-3">
        <div
          className={`rounded-md border border-border-default bg-white focus-within:border-brand-8 flex flex-col ${
            chat.expanded ? 'max-w-[680px] w-full mx-auto' : ''
          }`}
        >
          {flow?.file && (
            <div className="flex items-center gap-2 px-2 pt-2 pb-1 border-b border-border-subtle/80">
              <div className="inline-flex items-center gap-1.5 h-7 px-2 rounded-sm border border-border-default bg-surface-2 text-xs text-text-primary max-w-full">
                <Icon name="file-code" className="text-[12px] shrink-0" />
                <span
                  className="truncate"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                  title={flow.file.name}
                >
                  {flow.file.name}
                </span>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="Remove file"
                  title="Remove file"
                  onClick={() => chat.clearStagedProfileFile()}
                >
                  <Icon name="xmark" className="text-[12px]" />
                </button>
              </div>
            </div>
          )}
          <textarea
            value={composerValue}
            onChange={(e) => setComposerValue(e.target.value)}
            placeholder="Paste your SQL query or describe your issue..."
            rows={2}
            className="resize-none bg-transparent outline-none text-sm text-text-primary placeholder:text-text-low px-3 pt-2 pb-1 leading-relaxed w-full"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          />
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="btn-icon"
                aria-label="Attach .json file"
                title="Attach .json file"
                onClick={() => fileInputRef.current?.click()}
                disabled={!inEmptyOptimizeSql}
              >
                <Icon name="paperclip" className="text-[12px]" />
              </button>
              <AgentDropdown
                value={chat.agentId}
                onChange={(id) => chat.setAgent(id)}
              />
            </div>
            <button
              type="button"
              className="flex items-center justify-center size-7 rounded-sm bg-brand-9 text-white hover:bg-brand-10 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!canSendPastedOrComposer}
              onClick={() => {
                if (flow?.file) {
                  // Flow 2: skip the "Yes, run the query" step. The agent
                  // already has a debug profile so it goes straight into
                  // analysis (running -> thoughts -> View in Visual Explain).
                  chat.sendStagedProfileFile('/editor/visual-explain');
                  setComposerValue('');
                  return;
                }
                // Flow 1 fallback: user pasted a query into the bottom
                // composer instead of uploading a file.
                const q = composerValue.trim() || DEFAULT_OPTIMIZE_QUERY;
                chat.startOptimize({ query: q });
                setComposerValue('');
              }}
              aria-label="Send"
            >
              <Icon name="send" className="text-[12px]" />
            </button>
          </div>
        </div>
      </div>
      )}
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center gap-3 px-6 py-10">
      <div className="size-12 rounded-full bg-brand-2 flex items-center justify-center">
        <Icon name="wand-magic-sparkles" className="text-[20px] text-brand-9" />
      </div>
      <p
        className="text-sm text-text-secondary"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        Ask about a query, paste SQL, or click{' '}
        <span className="text-brand-9 font-medium">Optimize</span> to tune the
        current query.
      </p>
    </div>
  );
}

type MessageBubbleProps = {
  message: ChatMessage;
  onOpenLink: (href: string, messageId?: string) => void;
  onApplyQuery: (messageId: string, applyQuery: string) => void;
  /** Only set when this bubble is the empty-optimize assistant greeting. */
  emptyOptimizePhase?: EmptyEditorOptimizePhase;
  onSimulateFileSelect: () => void;
  /** Flow 1: user accepts running the query for profiling. */
  onYesRun: () => void;
  /** Flow 3: user picked a Query Tuner welcome-screen option. */
  onPickWelcomeOption: (label: string) => void;
};

function MessageBubble({
  message,
  onOpenLink,
  onApplyQuery,
  emptyOptimizePhase,
  onSimulateFileSelect,
  onYesRun,
  onPickWelcomeOption,
}: MessageBubbleProps) {
  switch (message.kind) {
    case 'query-tuner-welcome':
      return <QueryTunerWelcomeMessage onPick={onPickWelcomeOption} />;
    case 'empty-optimize-greeting':
      return (
        <EmptyOptimizeGreetingMessage
          phase={emptyOptimizePhase}
          onSimulateFileSelect={onSimulateFileSelect}
        />
      );
    case 'debug-thoughts':
      return (
        <div className="flex flex-col gap-2">
          <p
            className="text-sm text-text-primary leading-relaxed"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            <span className="text-text-secondary">Thoughts</span>
            <span className="text-text-low"> &gt;</span>
          </p>
          <div className="rounded-md border border-border-subtle bg-surface-2 p-3">
            <p
              className="text-sm text-text-primary leading-relaxed"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Found {message.bullets.length} performance issues in your query plan:
            </p>
            <ul
              className="mt-2 list-disc pl-5 text-sm text-text-primary leading-relaxed"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              {message.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    case 'user-profile-file':
      return <UserProfileFileMessage message={message} />;
    case 'optimize-prompt':
      return (
        <OptimizePromptMessage message={message} onYesRun={onYesRun} />
      );
    case 'agent-query-card':
      return <QueryCardMessage message={message} />;
    case 'agent-running':
      return (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="size-4 rounded-full border-2 border-brand-4 border-t-brand-9 animate-spin" />
          <span style={{ fontFamily: 'Roboto, sans-serif' }}>{message.label}</span>
        </div>
      );
    case 'agent-result':
      return (
        <div className="flex flex-col gap-2">
          <p
            className="text-sm text-text-primary leading-relaxed"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {message.text}
          </p>
          {message.linkLabel && message.linkHref && !message.linkViewed && (
            <button
              type="button"
              onClick={() => onOpenLink(message.linkHref!, message.id)}
              className="btn btn-secondary h-8 px-3 text-sm gap-1.5 self-start"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              <span>{message.linkLabel}</span>
              <Icon name="arrow-right" className="text-[12px]" />
            </button>
          )}
        </div>
      );
    case 'agent-analysis':
      return (
        <div className="flex flex-col gap-2">
          <div className="rounded-md border border-border-subtle bg-surface-2 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Icon name="chart" className="text-[12px] text-brand-9" />
              <span
                className="text-xs font-bold text-text-primary"
                style={{ fontFamily: 'Lato, sans-serif', letterSpacing: '0.2px' }}
              >
                {message.title}
              </span>
            </div>
            <p
              className="text-sm text-text-primary leading-relaxed"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              {message.summary}
            </p>
            <ul className="flex flex-col gap-1 pt-1 border-t border-border-subtle">
              {message.bullets.map((b) => (
                <li
                  key={b.label}
                  className="flex items-center justify-between text-xs gap-3"
                >
                  <span className="text-text-secondary">{b.label}</span>
                  <span
                    className="text-text-primary font-medium text-right tabular-nums"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    {b.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {message.recommendation && (
            <p
              className="text-sm text-text-primary leading-relaxed"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              <span className="font-medium text-brand-9">Recommendation: </span>
              {message.recommendation}
            </p>
          )}
          {message.applyQuery && !message.applyApplied && (
            <button
              type="button"
              onClick={() =>
                onApplyQuery(message.id, message.applyQuery ?? '')
              }
              className="btn btn-secondary h-8 px-3 text-sm gap-1.5 self-start"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              <span>{message.applyLabel ?? 'Apply changes in editor'}</span>
              <Icon name="arrow-right" className="text-[12px]" />
            </button>
          )}
          {message.applyQuery && message.applyApplied && (
            <ApplyQuerySnippet query={message.applyQuery} />
          )}
        </div>
      );
    case 'agent-text':
      return (
        <p
          className="text-sm text-text-primary leading-relaxed"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          {message.text}
        </p>
      );
    case 'user-text':
      return (
        <div className="self-end max-w-[85%] rounded-md bg-brand-2 px-3 py-2 text-sm text-text-primary">
          {message.text}
        </div>
      );
  }
}

function EmptyOptimizeGreetingMessage({
  phase,
  onSimulateFileSelect,
}: {
  phase?: EmptyEditorOptimizePhase;
  onSimulateFileSelect: () => void;
}) {
  const showEditor =
    phase === 'greeting' || phase === 'awaiting-drop';

  return (
    <div
      className="flex flex-col gap-3 self-stretch w-full max-w-full"
      style={{ fontFamily: 'Roboto, sans-serif' }}
    >
      <p className="text-sm text-text-primary leading-relaxed">
        Sure! To get started, do you have a query ready, or would you like to
        upload a debug file from the query profiler?
      </p>

      {showEditor && (
        <p className="text-sm text-text-secondary leading-relaxed">
          Paste my query / Upload a debug JSON file
        </p>
      )}

      {showEditor && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSimulateFileSelect();
          }}
          className="group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-5 bg-neutral-2 py-7 px-4 text-center transition-colors hover:border-brand-6 hover:bg-brand-1/50"
        >
          <Icon
            name="file-import"
            className="text-[28px] text-brand-9 group-hover:text-brand-10"
            size={28}
          />
          <span className="text-sm text-text-secondary max-w-[240px] leading-snug">
            Drop a .json file here, or click to choose — we&apos;ll start
            reading it right away
          </span>
        </button>
      )}
    </div>
  );
}

const WELCOME_OPTIONS = [
  'Optimize query',
  'Explain execution plan',
  'Suggest missing index',
  'Debug a query file',
];

function QueryTunerWelcomeMessage({
  onPick,
}: {
  onPick: (label: string) => void;
}) {
  return (
    <div
      className="flex flex-col gap-8 self-stretch w-full max-w-full py-6"
      style={{ fontFamily: 'Roboto, sans-serif' }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-3">
          <Icon name="code" className="text-[18px] text-text-primary" />
          <span
            className="text-[20px] font-medium text-text-primary leading-tight"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Query Tuner
          </span>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          I can help you optimize queries, analyze execution plans, and improve
          database performance.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {WELCOME_OPTIONS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => onPick(label)}
            className="flex h-9 items-center px-3.5 rounded-sm border border-dashed border-border-hover text-sm font-bold text-text-mid hover:bg-neutral-2 hover:border-brand-9 hover:text-brand-9 transition-colors"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

type UserProfileMsg = Extract<ChatMessage, { kind: 'user-profile-file' }>;

function UserProfileFileMessage({ message }: { message: UserProfileMsg }) {
  return (
    <div className="self-stretch w-full max-w-full rounded-md border border-border-subtle bg-white overflow-hidden">
      <div
        className="px-3 py-2 bg-surface-2 border-b border-border-subtle text-xs font-medium text-text-secondary flex items-center justify-between gap-2"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon name="file-code" className="text-[12px] shrink-0" />
          <span className="truncate">{message.fileName}</span>
        </span>
        <span className="shrink-0 text-text-mid text-[11px]">{message.sizeLabel}</span>
      </div>
      <pre
        className="px-3 py-2 text-[12px] overflow-x-auto max-h-56 overflow-y-auto text-text-primary"
        style={{ fontFamily: 'Inconsolata, monospace', lineHeight: '18px' }}
      >
        {message.preview}
      </pre>
    </div>
  );
}

/**
 * Copy-able code block rendered after the user clicks "Apply rewrite in
 * editor". We don't auto-insert anything into the SQL editor — the user
 * selects & pastes the rewrite themselves.
 */
function ApplyQuerySnippet({ query }: { query: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (http, perms) — silently no-op; text is
      // already selectable in the <pre>.
    }
  };

  const lines = query.split('\n');

  return (
    <div className="rounded-md border border-border-subtle bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-surface-2 border-b border-border-subtle">
        <span
          className="text-xs font-medium text-text-secondary"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          Paste this into the editor
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 h-6 px-1.5 rounded-xs text-xs text-text-mid hover:bg-neutral-3"
          style={{ fontFamily: 'Roboto, sans-serif' }}
          aria-label="Copy rewrite to clipboard"
        >
          <Icon name={copied ? 'check' : 'copy'} className="text-[12px]" />
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        className="px-3 py-2 text-[13px] overflow-x-auto select-text"
        style={{ fontFamily: 'Inconsolata, monospace', lineHeight: '20px' }}
      >
        {lines.map((raw, i) => (
          <div key={i} className="whitespace-pre">
            {highlightSql(raw)}
          </div>
        ))}
      </pre>
    </div>
  );
}

type QueryCardMsg = Extract<ChatMessage, { kind: 'agent-query-card' }>;

function QueryCardMessage({ message }: { message: QueryCardMsg }) {
  const lines = message.query.split('\n');
  const highlight = new Set(message.highlightLines ?? []);
  return (
    <div className="rounded-md border border-border-subtle bg-white overflow-hidden">
      <div
        className="px-3 py-2 bg-surface-2 border-b border-border-subtle text-xs font-medium text-text-secondary"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        {message.title}
      </div>
      <pre
        className="px-3 py-2 text-[13px] overflow-x-auto"
        style={{ fontFamily: 'Inconsolata, monospace', lineHeight: '20px' }}
      >
        {lines.map((raw, i) => {
          const idx = i + 1;
          const selected = highlight.has(idx);
          return (
            <div
              key={i}
              className={`whitespace-pre ${selected ? 'bg-brand-2 -mx-3 px-3' : ''}`}
            >
              {highlightSql(raw)}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

type OptimizeMsg = Extract<ChatMessage, { kind: 'optimize-prompt' }>;

function OptimizePromptMessage({
  message,
  onYesRun,
}: {
  message: OptimizeMsg;
  onYesRun: () => void;
}) {
  const lines = message.query.split('\n');
  const highlight = new Set(message.highlightLines ?? []);
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-border-subtle bg-white overflow-hidden">
        <div
          className="px-3 py-2 bg-surface-2 border-b border-border-subtle text-xs font-medium text-text-secondary"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          {message.title}
        </div>
        <pre
          className="px-3 py-2 text-[13px] overflow-x-auto"
          style={{ fontFamily: 'Inconsolata, monospace', lineHeight: '20px' }}
        >
          {lines.map((raw, i) => {
            const idx = i + 1;
            const selected = highlight.has(idx);
            return (
              <div
                key={i}
                className={`whitespace-pre ${selected ? 'bg-brand-2 -mx-3 px-3' : ''}`}
              >
                {highlightSql(raw)}
              </div>
            );
          })}
        </pre>
      </div>

      <p
        className="text-sm text-text-primary leading-relaxed"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        {message.question}
      </p>

      {!message.resolved && (
        <button
          type="button"
          className="btn btn-secondary h-8 px-3 text-sm self-start"
          onClick={onYesRun}
        >
          Yes, run the query
        </button>
      )}
    </div>
  );
}

const KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'IN',
  'LIKE',
  'ORDER',
  'BY',
  'DESC',
  'ASC',
  'GROUP',
  'HAVING',
  'JOIN',
  'ON',
  'AS',
  'LIMIT',
  'NOT',
  'IS',
  'NULL',
]);

/**
 * Tiny SQL keyword colourizer: splits a line on whitespace / punctuation and
 * renders keywords in brand purple, preserving original spacing.
 */
function highlightSql(line: string) {
  const parts = line.split(/(\s+|[(),;])/);
  return parts.map((p, i) => {
    const upper = p.trim().toUpperCase();
    if (KEYWORDS.has(upper)) {
      return (
        <span key={i} className="text-brand-9">
          {p}
        </span>
      );
    }
    return (
      <span key={i} className="text-text-primary">
        {p}
      </span>
    );
  });
}

/* -------------------------------------------------------------------------- */
/*                              Agent dropdown                                */
/* -------------------------------------------------------------------------- */

/**
 * Composer pill that lets the user switch between AI agents (Query Tuner /
 * Data Migration / SQLr Assistant). Opens upward as a small floating panel.
 * Each row shows a check (for the selected agent) and a tooltip on hover.
 *
 * Figma node: 940-47097 (dropdown), 940-47111/47112/47113 (tooltips).
 */
function AgentDropdown({
  value,
  onChange,
}: {
  value: AgentId;
  onChange: (id: AgentId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoverId, setHoverId] = useState<AgentId | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = AGENTS.find((a) => a.id === value) ?? AGENTS[2];

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-7 px-2 rounded-sm text-xs text-text-mid hover:bg-neutral-3"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon name={selected.icon} className="text-[12px]" />
        <span>{selected.label}</span>
        <Icon name="chevron-down" variant="solid" className="text-[10px]" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 mb-2 z-30 w-[180px] bg-white rounded-sm border border-border-default flex flex-col py-1"
          style={{ boxShadow: '0px 2px 2px rgba(39,43,51,0.25)' }}
        >
          {AGENTS.map((agent) => {
            const isSelected = agent.id === value;
            const isHovered = hoverId === agent.id;
            return (
              <div
                key={agent.id}
                className="relative"
                onMouseEnter={() => setHoverId(agent.id)}
                onMouseLeave={() =>
                  setHoverId((cur) => (cur === agent.id ? null : cur))
                }
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(agent.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-sm text-text-primary hover:bg-neutral-2"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  <span className="size-4 flex items-center justify-center text-brand-9 text-[10px]">
                    {isSelected ? <Icon name="check" /> : null}
                  </span>
                  <Icon
                    name={agent.icon}
                    className="text-[14px] text-text-mid"
                  />
                  <span className="truncate">{agent.label}</span>
                </button>

                {isHovered && (
                  <div
                    className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-40 pointer-events-none"
                    role="tooltip"
                  >
                    <div
                      className="rounded-sm bg-neutral-12 text-white text-xs px-3 py-2 whitespace-pre leading-snug"
                      style={{
                        fontFamily: 'Roboto, sans-serif',
                        boxShadow: '0px 2px 2px rgba(0,0,0,0.15)',
                      }}
                    >
                      {agent.tooltip}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              History panel                                 */
/* -------------------------------------------------------------------------- */

type HistoryChat = {
  id: string;
  name: string;
  /** Used to pick the row icon (mirrors the agent it was created with). */
  agent: AgentId;
};

const SAMPLE_HISTORY: { today: HistoryChat[]; previous: HistoryChat[] } = {
  today: [
    { id: 'h-1', name: 'Select id from customers', agent: 'query-tuner' },
    { id: 'h-2', name: 'Chat name', agent: 'query-tuner' },
  ],
  previous: [
    { id: 'h-3', name: 'Chat name', agent: 'data-migration' },
    { id: 'h-4', name: 'Chat name', agent: 'sqlr-assistant' },
  ],
};

/**
 * Replaces the messages list when the user clicks the history button in the
 * chat header. Shows two grouped sections (Today / Previous) with a row icon,
 * hover background and a 3-dot menu (Rename / Delete) per row.
 *
 * Figma node: 940-48199 (default state), 940-48551 (hovered row + ellipsis).
 */
function HistoryPanel({
  onPickChat,
}: {
  onPickChat: (chat: HistoryChat) => void;
  onClose: () => void;
}) {
  const [chats, setChats] = useState(SAMPLE_HISTORY);

  const remove = (id: string) =>
    setChats((c) => ({
      today: c.today.filter((x) => x.id !== id),
      previous: c.previous.filter((x) => x.id !== id),
    }));

  return (
    <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 min-h-0">
      <div
        className="px-4 text-xs font-medium text-text-secondary"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        Your chats
      </div>

      <Section title="Today">
        {chats.today.map((chat) => (
          <HistoryRow
            key={chat.id}
            chat={chat}
            onPick={() => onPickChat(chat)}
            onRename={() => {
              /* prototype: no-op */
            }}
            onDelete={() => remove(chat.id)}
          />
        ))}
      </Section>

      <Section title="Previous">
        {chats.previous.map((chat) => (
          <HistoryRow
            key={chat.id}
            chat={chat}
            onPick={() => onPickChat(chat)}
            onRename={() => {
              /* prototype: no-op */
            }}
            onDelete={() => remove(chat.id)}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="px-4 text-xs text-text-secondary"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function agentIcon(agentId: AgentId) {
  return (
    AGENTS.find((a) => a.id === agentId)?.icon ?? 'code'
  );
}

function HistoryRow({
  chat,
  onPick,
  onRename,
  onDelete,
}: {
  chat: HistoryChat;
  onPick: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  // Close menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rowRef.current) return;
      if (!rowRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const showEllipsis = hovered || menuOpen;

  return (
    <div
      ref={rowRef}
      className={`relative flex items-center gap-1 px-4 py-1 cursor-pointer ${
        hovered || menuOpen ? 'bg-neutral-2' : ''
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPick}
    >
      <span className="flex items-center justify-center size-6 shrink-0 text-text-mid">
        <Icon name={agentIcon(chat.agent)} className="text-[12px]" />
      </span>
      <span
        className="flex-1 min-w-0 truncate text-sm text-text-primary"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        {chat.name}
      </span>

      {showEllipsis && (
        <button
          type="button"
          className="flex items-center justify-center size-6 rounded-sm text-text-mid hover:bg-neutral-3"
          aria-label="Chat actions"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
        >
          <Icon name="ellipsis" className="text-[12px]" />
        </button>
      )}

      {menuOpen && (
        <div
          className="absolute right-2 top-full z-30 mt-1 w-[140px] bg-white rounded-sm border border-border-default py-1"
          style={{ boxShadow: '0px 2px 2px rgba(39,43,51,0.25)' }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-text-primary hover:bg-neutral-2"
            style={{ fontFamily: 'Roboto, sans-serif' }}
            onClick={() => {
              setMenuOpen(false);
              onRename();
            }}
          >
            <Icon name="pencil" className="text-[12px] text-text-mid" />
            <span>Rename</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-danger-9 hover:bg-neutral-2"
            style={{ fontFamily: 'Roboto, sans-serif' }}
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
          >
            <Icon name="trash-can" className="text-[12px]" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
