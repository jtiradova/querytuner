import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY_OPEN = 'chat-open';
const STORAGE_KEY_MESSAGES = 'chat-messages';
const STORAGE_KEY_AGENT = 'chat-agent';
/** Fallback when `location.state` is lost (hard refresh, router edge cases). */
export const STORAGE_KEY_PREVIEW_REWRITE = 'editor-preview-rewrite';
/** One-shot SQL from Visual Explain “Open in SQL Editor” (consumed on Query Tuner load). */
export const STORAGE_KEY_VE_CHAT_SQL_PASTE = 'editor-ve-chat-sql-paste';

export type AgentId = 'query-tuner' | 'data-migration' | 'sqlr-assistant';

export type AgentOption = {
  id: AgentId;
  label: string;
  /** Icon name registered in `Icon.tsx`. */
  icon: string;
  /** Two-line tooltip shown on hover in the agent dropdown. */
  tooltip: string;
};

export const AGENTS: AgentOption[] = [
  {
    id: 'sqlr-assistant',
    label: 'SQLr Assistant',
    icon: 'message-question',
    tooltip: 'Ask about database, SQL,\nPython, debugging.',
  },
  {
    id: 'data-migration',
    label: 'Data Migration',
    icon: 'database',
    tooltip: 'Guide your database\nmigration to SingleStore.',
  },
  {
    id: 'query-tuner',
    label: 'Performance Tuning',
    icon: 'code',
    tooltip: 'Profile queries, analyze bottlenecks,\nand tune SingleStore performance.',
  },
];

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const LEGACY_AGENT_RESULT_PROFILE_LINK = 'Confirm Profile in Visual Explain';
const LEGACY_AGENT_RESULT_PROFILE_BODY =
  'To profile this query and find optimization opportunities, I need to generate a debug profile. This might briefly affect active workloads.\n\nConfirm to generate this profile and visualize in Visual Explain to continue to next steps';

/** Normalize persisted threads after copy / CTA label changes. */
function migrateStoredChatMessages(msgs: ChatMessage[]): ChatMessage[] {
  return msgs.map((m) => {
    if (m.kind !== 'agent-result') return m;
    const linkPatch =
      m.linkLabel === LEGACY_AGENT_RESULT_PROFILE_LINK
        ? ({ linkLabel: 'Confirm' as const } satisfies Partial<ChatMessage>)
        : {};
    const bodyPatch =
      m.text === LEGACY_AGENT_RESULT_PROFILE_BODY
        ? ({
            text: 'A query profile must be generated to show optimization opportunities in Visual Explain. This takes about 30 seconds and may cause a brief spike in query execution.',
            textEmphasis:
              'Confirm to generate this profile and continue to Visual Explain.',
          } satisfies Partial<ChatMessage>)
        : {};
    if (Object.keys(linkPatch).length === 0 && Object.keys(bodyPatch).length === 0) {
      return m;
    }
    return { ...m, ...linkPatch, ...bodyPatch };
  });
}

/**
 * Chat message kinds surfaced in the right-side Ask SingleStore panel.
 * Discriminated via `kind` so the panel can render a dedicated layout
 * (confirmation prompt, running spinner, result link, free text, etc.).
 */
export type ChatMessage =
  | {
      id: string;
      kind: 'optimize-prompt';
      title: string;
      query: string;
      highlightLines?: number[];
      question: string;
      /** 'yes' = user clicked "Yes, run the query", 'no' = declined, undefined = pending. */
      resolved?: 'yes' | 'no';
    }
  | { id: string; kind: 'agent-running'; label: string }
  | {
      id: string;
      kind: 'agent-result';
      text: string;
      /** Optional second paragraph (e.g. bold call-to-action below `text`). */
      textEmphasis?: string;
      linkLabel?: string;
      linkHref?: string;
      /**
       * Set to `true` after the user has already followed `linkHref`. Used to
       * render the link as visited/disabled so the user doesn't re-navigate to
       * the page they're already on.
       */
      linkViewed?: boolean;
    }
  | {
      id: string;
      kind: 'agent-analysis';
      title: string;
      summary: string;
      bullets: Array<{ label: string; value: string }>;
      recommendation?: string;
      /**
       * If set, render an "Apply in editor" action at the bottom of the
       * analysis bubble. Clicking navigates back to the SQL editor tab and
       * swaps the rewritten query in.
       */
      applyQuery?: string;
      applyLabel?: string;
      /**
       * Set to `true` after the user has accepted the rewrite. The chat
       * panel then hides the action link and shows the rewrite as a copy-
       * able code block so the user can paste it into the editor themself.
       */
      applyApplied?: boolean;
    }
  | { id: string; kind: 'agent-text'; text: string }
  | { id: string; kind: 'user-text'; text: string }
  | {
      id: string;
      kind: 'debug-thoughts';
      bullets: string[];
    }
  /**
   * Read-only query card shown at the top of the thread. Identical visual to
   * the optimize-prompt code block but without the permission question or the
   * "Yes, run the query" action — used when the query has already been
   * executed (e.g. clicked from the Message Logs sparkle icon).
   */
  | {
      id: string;
      kind: 'agent-query-card';
      title: string;
      query: string;
      highlightLines?: number[];
    }
  /**
   * Shown when Optimize is clicked with no query in the editor. Offers
   * “paste” vs file-upload paths (see Figma Query Tuner empty optimize).
   */
  | { id: string; kind: 'empty-optimize-greeting' }
  /**
   * Shown when the user opens chat from the top-bar "Ask SingleStore" button.
   * Performance Tuning welcome copy (Figma 1016-89777) — static text only.
   */
  | { id: string; kind: 'query-tuner-welcome' }
  /**
   * Flow 1C — Optimize clicked while the SQL editor is empty: assistant intro
   * (Figma 1016-87077) before the user pastes SQL or attaches a profile JSON.
   */
  | { id: string; kind: 'query-tuner-empty-intro' }
  /**
   * After the user sends an uploaded profile JSON, we keep a copy in-thread.
   */
  | {
      id: string;
      kind: 'user-profile-file';
      fileName: string;
      /** Short byte label e.g. "48 KB" */
      sizeLabel: string;
      /** Truncated pretty JSON for the white message card */
      preview: string;
    }
  /**
   * Visual Explain chat: guided SQL steps (user asks “What to do in SQL?”).
   */
  | { id: string; kind: 've-sql-guidance' }
  /** Full chat narrative after opening Visual Explain (Figma 1016-86425). */
  | { id: string; kind: 'post-ve-analysis' };

export type EmptyEditorOptimizePhase = 'greeting' | 'awaiting-drop' | 'file-ready';

export type StagedProfileFile = {
  name: string;
  text: string;
  sizeLabel: string;
};

type EmptyEditorOptimizeFlow = {
  phase: EmptyEditorOptimizePhase;
  file?: StagedProfileFile;
  filePickError?: string;
};

function withoutEmptyOptimizeIntro(msgs: ChatMessage[]): ChatMessage[] {
  return msgs.filter((m) => {
    if (m.kind === 'empty-optimize-greeting') return false;
    if (m.kind === 'query-tuner-welcome') return false;
    if (m.kind === 'user-text') {
      // Remove the prototype "empty optimize" kickoff bubble so it doesn't
      // linger when the user later runs the regular Optimize flow.
      if (m.id.startsWith('u-opt-')) return false;
      if (m.text === 'Optimize query') return false;
      if (m.text === 'debug JSON file') return false;
    }
    return true;
  });
}

export type OptimizeConfirmRequest = {
  entry: 'editor' | 'message-log';
  query: string;
  highlightLines?: number[];
  title?: string;
  viewExplainHref?: string;
  /**
   * Page context for the Visual Explain chat composer pill (e.g. "Query History").
   * `null` or "" hides the pill after this modal confirms. Omit for no pill.
   */
  contextPill?: string | null;
};

type ChatContextValue = {
  isOpen: boolean;
  messages: ChatMessage[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  clear: () => void;
  /**
   * SQL editor / message-log path: opens the optimize confirmation modal first.
   * On confirm, runs the profiling / analysis sequence. Visual Explain Optimize
   * control should open the chat panel via `open()` instead (no modal).
   */
  requestOptimizeConfirm: (args: OptimizeConfirmRequest) => void;
  /** Pending optimize confirmation, or null when the modal is closed. */
  optimizeConfirmRequest: OptimizeConfirmRequest | null;
  cancelOptimizeConfirm: () => void;
  /**
   * Modal “Confirm” on the way to Visual Explain: keeps the current thread,
   * shows “Profiling…” for ~2s, then appends the post–VE analysis message.
   */
  /** Pass the modal payload from `OptimizeConfirmModal` so `contextPill` cannot be lost to ref/state races. */
  confirmOptimizeConfirm: (payload?: OptimizeConfirmRequest | null) => void;
  /** @deprecated Prefer requestOptimizeConfirm — still used by legacy threads. */
  startOptimize: (args: {
    query: string;
    highlightLines?: number[];
    title?: string;
  }) => void;
  /**
   * Message-log entry point after modal confirm — prefer requestOptimizeConfirm.
   */
  startMessageLogOptimize: (args: {
    query: string;
    highlightLines?: number[];
    title?: string;
    viewExplainHref?: string;
  }) => void;
  /** Resolves the most recent optimize prompt and either runs or declines. */
  confirmRun: (viewExplainHref: string) => void;
  declineRun: () => void;
  /** Append one or more messages to the end of the thread (idempotent by id). */
  pushMessages: (msgs: ChatMessage[]) => void;
  /** Flip `linkViewed` on an agent-result message. No-op if not found. */
  markResultViewed: (id: string) => void;
  /**
   * When the user follows a Visual Explain result link (e.g. “Confirm” or
   * “View profile in Visual Explain”): mark the CTA consumed, append a brief
   * “Profiling…” spinner at the end of the thread (~2s), then replace it with
   * the post–VE analysis appended after the existing messages (full context
   * preserved).
   */
  prepareChatForVisualExplain: (agentResultMessageId: string) => void;
  /** Flip `applyApplied` on an agent-analysis message. No-op if not found. */
  markApplyApplied: (id: string) => void;
  /**
   * From Visual Explain: mark the analysis as applied, persist the rewrite,
   * and navigate to the SQL editor. Runs inside the provider (survives route
   * transitions) so React Router always receives the navigation.
   */
  applyRewriteInEditor: (messageId: string, rewriteSql: string) => void;
  /**
   * Optimize clicked while the SQL placeholder is still showing (no sample query
   * revealed yet, no preview rewrite from Visual Explain).
   */
  startEmptyEditorOptimize: () => void;
  /**
   * Top-bar "Ask SingleStore" entry point. Opens chat with the Performance
   * Tuning welcome copy (Figma 1016-89777).
   */
  startQueryTunerWelcome: () => void;
  /** Stage a JSON profile file (drop / picker). */
  stageJsonProfileFile: (file: File) => void;
  /** Simulate selecting a JSON profile file (no picker). */
  simulateJsonProfileFile: () => void;
  /** Clear the staged file from the empty-editor flow. */
  clearStagedProfileFile: () => void;
  /**
   * Flow 2: send the currently-staged debug profile file. Skips the
   * "Yes, run the query" permission step and runs analysis directly.
   * No-op if no file is staged.
   */
  sendStagedProfileFile: (viewExplainHref?: string) => void;
  /**
   * Send JSON pasted into the composer (no OS file picker). Validates JSON
   * then runs the same profile analysis path as `sendStagedProfileFile`.
   */
  sendPastedJsonProfile: (jsonText: string, viewExplainHref?: string) => void;
  /** Stops the empty-editor UI state but keeps messages. */
  dismissEmptyOptimizeFlow: () => void;
  emptyEditorOptimize: EmptyEditorOptimizeFlow | null;
  /** Currently selected agent (used by the composer pill / dropdown). */
  agentId: AgentId;
  /** Switch the active agent. */
  setAgent: (id: AgentId) => void;
  /** Side-panel view: live thread vs the "Your chats" history list. */
  view: 'thread' | 'history';
  /** Toggle / set side-panel view. */
  setView: (v: 'thread' | 'history') => void;
  /**
   * Visual Explain header Optimize: opens the chat panel with the full
   * post–Visual Explain analysis (no confirmation modal).
   */
  openVisualExplainOptimizeChat: () => void;
  /**
   * Page-origin label shown in the Ask panel composer on Visual Explain (set
   * when confirming Optimize from a page, or cleared when not applicable).
   */
  visualExplainChatPill: string | null;
  setVisualExplainChatPill: (label: string | null) => void;
  /**
   * When true, the Visual Explain composer hides the context pill entirely
   * (e.g. Optimize from the VE header, or sidebar re-click on Visual Explain).
   */
  veComposerPillSuppressed: boolean;
  /** Hide VE composer pill until the user leaves Visual Explain or sets a new pill. */
  suppressVeComposerPill: () => void;
  clearVeComposerPillSuppress: () => void;
  /** When true, the chat panel takes the entire content area instead of the
   *  fixed 360px right column. */
  expanded: boolean;
  /** Flip the expanded/collapsed state. */
  toggleExpanded: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState<boolean>(() =>
    readJSON<boolean>(STORAGE_KEY_OPEN, false),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = readJSON<ChatMessage[]>(STORAGE_KEY_MESSAGES, []);
    // Drop any transient "running" spinners that would never resolve after reload.
    const filtered = stored.filter((m) => m.kind !== 'agent-running');
    return migrateStoredChatMessages(filtered);
  });
  const [emptyEditorOptimize, setEmptyEditorOptimize] =
    useState<EmptyEditorOptimizeFlow | null>(null);
  const [agentId, setAgentId] = useState<AgentId>(() =>
    readJSON<AgentId>(STORAGE_KEY_AGENT, 'query-tuner'),
  );
  const [view, setView] = useState<'thread' | 'history'>('thread');
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded((e) => !e), []);
  const [optimizeConfirmRequest, setOptimizeConfirmRequest] =
    useState<OptimizeConfirmRequest | null>(null);
  /** Latest modal payload so `confirmOptimizeConfirm` can read `contextPill` synchronously. */
  const pendingOptimizeModalRef = useRef<OptimizeConfirmRequest | null>(null);
  const [visualExplainChatPill, setVisualExplainChatPillState] = useState<
    string | null
  >(null);
  const [veComposerPillSuppressed, setVeComposerPillSuppressed] =
    useState(false);

  const setVisualExplainChatPill = useCallback((label: string | null) => {
    setVeComposerPillSuppressed(false);
    setVisualExplainChatPillState(label);
  }, []);

  const suppressVeComposerPill = useCallback(() => {
    setVeComposerPillSuppressed(true);
    setVisualExplainChatPillState(null);
  }, []);

  const clearVeComposerPillSuppress = useCallback(() => {
    setVeComposerPillSuppressed(false);
  }, []);
  const runTimers = useRef<number[]>([]);
  /** Pending Visual Explain handoff: remove profiling spinner + show analysis. */
  const veProfilingTimerRef = useRef<number | null>(null);
  /**
   * Cancel the Visual Explain profiling timeout and drop any orphaned
   * `ve-profiling-*` row so we never leave a stuck spinner if the timer was
   * cleared elsewhere (e.g. `runTimers` flush) without running the callback.
   */
  const clearVeProfilingTimer = useCallback(() => {
    const t = veProfilingTimerRef.current;
    if (t !== null) {
      window.clearTimeout(t);
      veProfilingTimerRef.current = null;
      runTimers.current = runTimers.current.filter((id) => id !== t);
    }
    setMessages((prev) =>
      prev.some((m) => m.id.startsWith('ve-profiling-'))
        ? prev.filter((m) => !m.id.startsWith('ve-profiling-'))
        : prev,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (veProfilingTimerRef.current !== null) {
        window.clearTimeout(veProfilingTimerRef.current);
        veProfilingTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY_OPEN, JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY_AGENT, JSON.stringify(agentId));
  }, [agentId]);

  const setAgent = useCallback((id: AgentId) => setAgentId(id), []);

  const clear = useCallback(() => {
    runTimers.current.forEach((t) => window.clearTimeout(t));
    runTimers.current = [];
    clearVeProfilingTimer();
    setMessages([]);
    setEmptyEditorOptimize(null);
    setOptimizeConfirmRequest(null);
    pendingOptimizeModalRef.current = null;
    setVisualExplainChatPill(null);
    setView('thread');
    setExpanded(false);
  }, [clearVeProfilingTimer]);

  const open = useCallback(() => setOpen(true), []);
  /**
   * Closing the chat resets the conversation. The next Optimize click
   * starts a brand-new thread instead of reopening the stale one.
   */
  const close = useCallback(() => {
    setOpen(false);
    runTimers.current.forEach((t) => window.clearTimeout(t));
    runTimers.current = [];
    clearVeProfilingTimer();
    setMessages([]);
    setEmptyEditorOptimize(null);
    setOptimizeConfirmRequest(null);
    pendingOptimizeModalRef.current = null;
    setVisualExplainChatPill(null);
    setView('thread');
    setExpanded(false);
  }, [clearVeProfilingTimer]);
  const toggle = useCallback(
    () =>
      setOpen((v) => {
        if (v) {
          runTimers.current.forEach((t) => window.clearTimeout(t));
          runTimers.current = [];
          clearVeProfilingTimer();
          setMessages([]);
          setEmptyEditorOptimize(null);
          setOptimizeConfirmRequest(null);
          pendingOptimizeModalRef.current = null;
          setVisualExplainChatPill(null);
          setView('thread');
          setExpanded(false);
        }
        return !v;
      }),
    [clearVeProfilingTimer],
  );

  const startEmptyEditorOptimize = useCallback(() => {
    // Start a clean thread. Persisted or prior messages often still contain the
    // "run this SQL" optimize-prompt; appending would leave that visible above
    // the new empty-editor / file-upload flow.
    runTimers.current.forEach((t) => window.clearTimeout(t));
    runTimers.current = [];
    clearVeProfilingTimer();
    setOpen(true);
    setView('thread');
    setEmptyEditorOptimize({ phase: 'greeting' });
    setMessages([
      {
        id: `qt-empty-${Date.now()}`,
        kind: 'query-tuner-empty-intro',
      },
    ]);
  }, [clearVeProfilingTimer]);

  const startQueryTunerWelcome = useCallback(() => {
    runTimers.current.forEach((t) => window.clearTimeout(t));
    runTimers.current = [];
    clearVeProfilingTimer();
    setOpen(true);
    setView('thread');
    // Do not attach the empty-editor JSON flow here — that left `inProfileComposer`
    // true and broke the Visual Explain composer (send stayed disabled after the
    // first message). Welcome is only `query-tuner-welcome` + optional chat.
    setEmptyEditorOptimize(null);
    setMessages([
      { id: `welcome-${Date.now()}`, kind: 'query-tuner-welcome' },
    ]);
  }, [clearVeProfilingTimer]);

  const dismissEmptyOptimizeFlow = useCallback(() => {
    setEmptyEditorOptimize(null);
  }, []);

  const runJsonProfileAnalysis = useCallback(
    (args: {
      fileName: string;
      text: string;
      sizeLabel: string;
      viewExplainHref: string;
    }) => {
      const { fileName, text, sizeLabel, viewExplainHref } = args;
      const maxPreview = 4000;
      const preview =
        text.length > maxPreview
          ? `${text.slice(0, maxPreview)}\n\n…`
          : text;
      const profileId = `prof-${Date.now()}`;
      const runId = `run-pro-${Date.now()}`;
      setEmptyEditorOptimize(null);
      setMessages((prev) => [
        ...withoutEmptyOptimizeIntro(prev),
        {
          id: profileId,
          kind: 'user-profile-file',
          fileName,
          sizeLabel,
          preview,
        },
        {
          id: runId,
          kind: 'agent-running',
          label: 'Reading your profile…',
        },
      ]);
      const t = window.setTimeout(() => {
        setMessages((prev) => {
          const next = prev.filter((m) => m.kind !== 'agent-running');
          const now = Date.now();
          next.push({
            id: `res-pro-${now}`,
            kind: 'agent-result',
            text:
              'A query profile must be generated to show optimization opportunities in Visual Explain. This takes about 30 seconds and may cause a brief spike in query execution.',
            textEmphasis:
              'Confirm to generate this profile and continue to Visual Explain.',
            linkLabel: 'Confirm',
            linkHref: viewExplainHref,
          });
          return next;
        });
      }, 1600);
      runTimers.current.push(t);
    },
    [],
  );

  const sendStagedProfileFile = useCallback<
    ChatContextValue['sendStagedProfileFile']
  >(
    (viewExplainHref) => {
      const file = emptyEditorOptimize?.file;
      if (!file) return;
      runJsonProfileAnalysis({
        fileName: file.name,
        text: file.text,
        sizeLabel: file.sizeLabel,
        viewExplainHref: viewExplainHref ?? '/editor/visual-explain',
      });
    },
    [emptyEditorOptimize, runJsonProfileAnalysis],
  );

  const sendPastedJsonProfile = useCallback<
    ChatContextValue['sendPastedJsonProfile']
  >((raw, viewExplainHref) => {
    const t = raw.trim();
    if (!t) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(t);
    } catch {
      return;
    }
    if (typeof parsed !== 'object' || parsed === null) return;
    const pretty = JSON.stringify(parsed, null, 2);
    const bytes = new Blob([pretty]).size;
    const kb = bytes / 1024;
    const sizeBit =
      kb < 1024
        ? `${Math.max(1, Math.round(kb))} KB`
        : `${(kb / 1024).toFixed(1)} MB`;
    runJsonProfileAnalysis({
      fileName: 'query_debag_export.json',
      text: pretty,
      sizeLabel: `${sizeBit} — debug file`,
      viewExplainHref: viewExplainHref ?? '/editor/visual-explain',
    });
  }, [runJsonProfileAnalysis]);

  const stageJsonProfileFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        if (!file.name.toLowerCase().endsWith('.json')) {
          setEmptyEditorOptimize((flow) => ({
            phase: flow?.phase ?? 'greeting',
            filePickError: 'Please choose a .json file.',
          }));
          return;
        }
        try {
          const parsed = JSON.parse(text) as unknown;
          const pretty =
            typeof parsed === 'object' && parsed !== null
              ? JSON.stringify(parsed, null, 2)
              : text;
          const kb = file.size / 1024;
          const sizeBit =
            kb < 1024
              ? `${Math.max(1, Math.round(kb))} KB`
              : `${(kb / 1024).toFixed(1)} MB`;
          setEmptyEditorOptimize({
            phase: 'file-ready',
            file: {
              name: file.name,
              text: pretty,
              sizeLabel: `${sizeBit} — debug file`,
            },
            filePickError: undefined,
          });
        } catch {
          setEmptyEditorOptimize((flow) => ({
            phase: flow?.phase ?? 'greeting',
            filePickError: 'This file is not valid JSON.',
          }));
        }
      };
      reader.onerror = () => {
        setEmptyEditorOptimize((flow) => ({
          phase: flow?.phase ?? 'greeting',
          filePickError: 'Could not read that file.',
        }));
      };
      reader.readAsText(file);
    },
    [],
  );

  const simulateJsonProfileFile = useCallback(() => {
    // Figma-driven prototype: simulate a selected file without opening the OS picker.
    const demo = {
      name: 'query_debag_export.json',
      sizeLabel: '48 KB — debug file',
      text: JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          query: 'SELECT * FROM orders WHERE customer_id IN (...)',
          operators: [
            { name: 'ColumnStoreScan', time_ms: 1660, pct: 0.721 },
            { name: 'HashJoin', time_ms: 285, pct: 0.124 },
            { name: 'Filter', time_ms: 186, pct: 0.081 },
          ],
        },
        null,
        2,
      ),
    } satisfies StagedProfileFile;

    setEmptyEditorOptimize({ phase: 'file-ready', file: demo, filePickError: undefined });
  }, []);

  const clearStagedProfileFile = useCallback(() => {
    setEmptyEditorOptimize((flow) => {
      if (!flow) return flow;
      return { phase: 'greeting', filePickError: undefined };
    });
  }, []);

  const startOptimize = useCallback<ChatContextValue['startOptimize']>(
    ({ query, highlightLines, title }) => {
      setOpen(true);
      setEmptyEditorOptimize(null);
      setMessages((prev) => [
        ...withoutEmptyOptimizeIntro(prev),
        {
          id: `opt-${Date.now()}`,
          kind: 'optimize-prompt',
          title: title ?? 'Optimize query',
          query,
          highlightLines,
          question:
            'To optimize this query I would need to generate a debug profile for this query, that requires running this query. Would it be alright to execute this query?',
        },
      ]);
    },
    [],
  );

  const beginMessageLogProfilingFlow = useCallback(
    (args: {
      query: string;
      highlightLines?: number[];
      title?: string;
      viewExplainHref?: string;
    }) => {
      const { query, highlightLines, title, viewExplainHref } = args;
      runTimers.current.forEach((t) => window.clearTimeout(t));
      runTimers.current = [];
      clearVeProfilingTimer();
      setOpen(true);
      setView('thread');
      setEmptyEditorOptimize(null);

      const now = Date.now();
      const cardId = `card-${now}`;
      const runId = `run-mlog-${now}`;
      setMessages([
        {
          id: cardId,
          kind: 'agent-query-card',
          title: title ?? 'Optimize query',
          query,
          highlightLines,
        },
        {
          id: runId,
          kind: 'agent-running',
          label: 'Analysing your query…',
        },
      ]);

      const t = window.setTimeout(() => {
        setMessages((prev) => {
          const next = prev.filter((m) => m.kind !== 'agent-running');
          const tNow = Date.now();
          next.push({
            id: `thoughts-${tNow}`,
            kind: 'debug-thoughts',
            bullets: [
              'ColumnStore Scan on "orders" — 72% of total time (12.4M rows scanned)',
              'IN-list with correlated subquery prevents shard pruning',
              'Hash join build side is materialised in full before probe',
            ],
          });
          next.push({
            id: `res-mlog-${tNow}`,
            kind: 'agent-result',
            text:
              'I analyzed the execution profile from your run. Open Visual Explain to see the plan and full recommendations.',
            linkLabel: 'View profile in Visual Explain',
            linkHref: viewExplainHref ?? '/editor/visual-explain',
          });
          return next;
        });
      }, 1600);
      runTimers.current.push(t);
    },
    [clearVeProfilingTimer],
  );

  const startMessageLogOptimize = useCallback<
    ChatContextValue['startMessageLogOptimize']
  >((args) => {
    beginMessageLogProfilingFlow(args);
  }, [beginMessageLogProfilingFlow]);

  const requestOptimizeConfirm = useCallback<
    ChatContextValue['requestOptimizeConfirm']
  >((args) => {
    pendingOptimizeModalRef.current = args;
    setOptimizeConfirmRequest(args);
  }, []);

  const cancelOptimizeConfirm = useCallback(() => {
    pendingOptimizeModalRef.current = null;
    setOptimizeConfirmRequest(null);
  }, []);

  const openVisualExplainOptimizeChat = useCallback(() => {
    runTimers.current.forEach((t) => window.clearTimeout(t));
    runTimers.current = [];
    clearVeProfilingTimer();
    setOptimizeConfirmRequest(null);
    pendingOptimizeModalRef.current = null;
    suppressVeComposerPill();
    setEmptyEditorOptimize(null);
    setView('thread');
    setExpanded(false);
    setOpen(true);
    setMessages([
      {
        id: `pve-from-ve-${Date.now()}`,
        kind: 'post-ve-analysis',
      },
    ]);
  }, [clearVeProfilingTimer, suppressVeComposerPill]);

  const confirmOptimizeConfirm = useCallback(
    (payloadFromModal?: OptimizeConfirmRequest | null) => {
    const pending =
      payloadFromModal ?? pendingOptimizeModalRef.current;
    pendingOptimizeModalRef.current = null;
    setOptimizeConfirmRequest(null);
    const raw = pending?.contextPill;
    const pill =
      raw === undefined || raw === null || String(raw).trim() === ''
        ? null
        : String(raw).trim();
    setVisualExplainChatPill(pill);
    runTimers.current.forEach((t) => window.clearTimeout(t));
    runTimers.current = [];
    clearVeProfilingTimer();
    setEmptyEditorOptimize(null);
    setView('thread');
    setExpanded(false);
    setOpen(true);

    const profilingId = `ve-profiling-${Date.now()}`;
    let scheduleProfilingCompletion = false;
    flushSync(() => {
      setMessages((prev) => {
        const scrubbed = prev.filter((m) => !m.id.startsWith('ve-profiling-'));
        if (scrubbed.some((m) => m.kind === 'post-ve-analysis')) {
          return scrubbed;
        }
        scheduleProfilingCompletion = true;
        return [
          ...scrubbed,
          {
            id: profilingId,
            kind: 'agent-running',
            label: 'Profiling…',
          },
        ];
      });
    });

    if (scheduleProfilingCompletion) {
      const profilingTimer = window.setTimeout(() => {
        veProfilingTimerRef.current = null;
        runTimers.current = runTimers.current.filter((id) => id !== profilingTimer);
        setMessages((p) => {
          if (!p.some((m) => m.id === profilingId)) return p;
          const without = p.filter((m) => m.id !== profilingId);
          if (without.some((m) => m.kind === 'post-ve-analysis')) return without;
          return [
            ...without,
            {
              id: `pve-ve-landing-${Date.now()}`,
              kind: 'post-ve-analysis',
            },
          ];
        });
      }, 2000);
      veProfilingTimerRef.current = profilingTimer;
      runTimers.current.push(profilingTimer);
    }

    navigate('/editor/visual-explain');
  },
  [clearVeProfilingTimer, navigate, setVisualExplainChatPill],
);

  const confirmRun = useCallback<ChatContextValue['confirmRun']>((viewExplainHref) => {
    // Mark last optimize-prompt as resolved, then append the running spinner.
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i -= 1) {
        const m = next[i];
        if (m.kind === 'optimize-prompt' && !m.resolved) {
          next[i] = { ...m, resolved: 'yes' };
          break;
        }
      }
      next.push({
        id: `run-${Date.now()}`,
        kind: 'agent-running',
        label: 'Executing query...',
      });
      return next;
    });

    const t = window.setTimeout(() => {
      setMessages((prev) => {
        const next = prev.filter((m) => m.kind !== 'agent-running');
        next.push({
          id: `res-${Date.now()}`,
          kind: 'agent-result',
          text:
            'Query executed in 2.3 seconds. I found a slow table scan on the "orders" table.',
          linkLabel: 'View profile in Visual Explain',
          linkHref: viewExplainHref,
        });
        return next;
      });
    }, 2000);
    runTimers.current.push(t);
  }, []);

  const pushMessages = useCallback<ChatContextValue['pushMessages']>((msgs) => {
    setMessages((prev) => {
      // Replace-or-append semantics: messages with an existing id are
      // overwritten in place (handy when we want to update a persisted
      // message to a newer schema), while fresh ids are appended at the end.
      const byId = new Map(prev.map((m) => [m.id, m] as const));
      let changed = false;
      for (const m of msgs) {
        const existing = byId.get(m.id);
        if (!existing) {
          byId.set(m.id, m);
          changed = true;
        } else if (JSON.stringify(existing) !== JSON.stringify(m)) {
          byId.set(m.id, m);
          changed = true;
        }
      }
      if (!changed) return prev;
      // Preserve original ordering for ids that existed, then any brand-new
      // ids at the end in insertion order.
      const seen = new Set<string>();
      const out: ChatMessage[] = [];
      for (const m of prev) {
        const latest = byId.get(m.id);
        if (latest) {
          out.push(latest);
          seen.add(m.id);
        }
      }
      for (const m of msgs) {
        if (!seen.has(m.id)) {
          out.push(byId.get(m.id)!);
          seen.add(m.id);
        }
      }
      return out;
    });
  }, []);

  const markResultViewed = useCallback<ChatContextValue['markResultViewed']>(
    (id) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id && m.kind === 'agent-result'
            ? { ...m, linkViewed: true }
            : m,
        ),
      );
    },
    [],
  );

  const prepareChatForVisualExplain = useCallback<
    ChatContextValue['prepareChatForVisualExplain']
  >((agentResultMessageId) => {
    clearVeProfilingTimer();
    const profilingId = `ve-profiling-${Date.now()}`;
    let scheduleProfilingCompletion = false;
    flushSync(() => {
      setMessages((prev) => {
        const scrubbed = prev.filter((m) => !m.id.startsWith('ve-profiling-'));
        const idx = scrubbed.findIndex(
          (m) => m.id === agentResultMessageId && m.kind === 'agent-result',
        );
        if (idx === -1) return scrubbed;
        const next = [...scrubbed];
        let resIdx = idx;
        if (resIdx > 0 && next[resIdx - 1]?.kind === 'debug-thoughts') {
          next.splice(resIdx - 1, 1);
          resIdx -= 1;
        }
        const hit = next[resIdx];
        if (!hit || hit.kind !== 'agent-result' || hit.id !== agentResultMessageId) {
          const j = next.findIndex(
            (m) => m.id === agentResultMessageId && m.kind === 'agent-result',
          );
          if (j === -1) return next;
          resIdx = j;
        }
        const cur = next[resIdx];
        if (!cur || cur.kind !== 'agent-result') return next;
        next[resIdx] = { ...cur, linkViewed: true };
        const alreadyHasPostVe = next
          .slice(resIdx + 1)
          .some((m) => m.kind === 'post-ve-analysis');
        if (!alreadyHasPostVe) {
          next.push({
            id: profilingId,
            kind: 'agent-running',
            label: 'Profiling…',
          });
          scheduleProfilingCompletion = true;
        }
        return next;
      });
    });

    if (scheduleProfilingCompletion) {
      const profilingTimer = window.setTimeout(() => {
        veProfilingTimerRef.current = null;
        runTimers.current = runTimers.current.filter((id) => id !== profilingTimer);
        setMessages((prev) => {
          if (!prev.some((m) => m.id === profilingId)) return prev;
          const without = prev.filter((m) => m.id !== profilingId);
          if (without.some((m) => m.kind === 'post-ve-analysis')) return without;
          return [
            ...without,
            {
              id: `pve-post-${agentResultMessageId}-${Date.now()}`,
              kind: 'post-ve-analysis',
            },
          ];
        });
      }, 2000);
      veProfilingTimerRef.current = profilingTimer;
      runTimers.current.push(profilingTimer);
    }
  }, [clearVeProfilingTimer]);

  const markApplyApplied = useCallback<ChatContextValue['markApplyApplied']>(
    (id) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id && m.kind === 'agent-analysis'
            ? { ...m, applyApplied: true }
            : m,
        ),
      );
    },
    [],
  );

  const applyRewriteInEditor = useCallback<
    ChatContextValue['applyRewriteInEditor']
  >((messageId, rewriteSql) => {
    if (typeof window === 'undefined') return;

    setMessages((prev) => {
      const next = prev.map((m) =>
        m.id === messageId && m.kind === 'agent-analysis'
          ? { ...m, applyApplied: true }
          : m,
      );
      // SPA `navigate()` from Visual Explain was often a no-op (RR7 + batched
      // updates). Persist chat + rewrite, then hard-navigate so the SQL tab
      // always loads with the copy block and preview query.
      try {
        window.sessionStorage.setItem(STORAGE_KEY_PREVIEW_REWRITE, rewriteSql);
        window.sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(next));
        window.sessionStorage.setItem(STORAGE_KEY_OPEN, JSON.stringify(true));
      } catch {
        /* ignore quota / private mode */
      }
      window.setTimeout(() => {
        window.location.assign(`${window.location.origin}/editor/query`);
      }, 0);
      return next;
    });
  }, []);

  const declineRun = useCallback(() => {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i -= 1) {
        const m = next[i];
        if (m.kind === 'optimize-prompt' && !m.resolved) {
          next[i] = { ...m, resolved: 'no' };
          break;
        }
      }
      next.push({
        id: `agent-${Date.now()}`,
        kind: 'agent-text',
        text:
          'No problem — let me know if you want to share a profile, paste the slow part of the query, or describe what you\u2019re seeing.',
      });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      messages,
      open,
      close,
      toggle,
      clear,
      requestOptimizeConfirm,
      optimizeConfirmRequest,
      cancelOptimizeConfirm,
      openVisualExplainOptimizeChat,
      visualExplainChatPill,
      setVisualExplainChatPill,
      veComposerPillSuppressed,
      suppressVeComposerPill,
      clearVeComposerPillSuppress,
      confirmOptimizeConfirm,
      startOptimize,
      startMessageLogOptimize,
      confirmRun,
      declineRun,
      pushMessages,
      markResultViewed,
      prepareChatForVisualExplain,
      markApplyApplied,
      applyRewriteInEditor,
      emptyEditorOptimize,
      startEmptyEditorOptimize,
      startQueryTunerWelcome,
      stageJsonProfileFile,
      simulateJsonProfileFile,
      clearStagedProfileFile,
      sendStagedProfileFile,
      sendPastedJsonProfile,
      dismissEmptyOptimizeFlow,
      agentId,
      setAgent,
      view,
      setView,
      expanded,
      toggleExpanded,
    }),
    [
      isOpen,
      messages,
      emptyEditorOptimize,
      agentId,
      visualExplainChatPill,
      setAgent,
      view,
      expanded,
      toggleExpanded,
      open,
      close,
      toggle,
      clear,
      requestOptimizeConfirm,
      optimizeConfirmRequest,
      cancelOptimizeConfirm,
      openVisualExplainOptimizeChat,
      setVisualExplainChatPill,
      veComposerPillSuppressed,
      suppressVeComposerPill,
      clearVeComposerPillSuppress,
      confirmOptimizeConfirm,
      startOptimize,
      startMessageLogOptimize,
      startEmptyEditorOptimize,
      startQueryTunerWelcome,
      stageJsonProfileFile,
      simulateJsonProfileFile,
      clearStagedProfileFile,
      sendStagedProfileFile,
      sendPastedJsonProfile,
      dismissEmptyOptimizeFlow,
      confirmRun,
      declineRun,
      pushMessages,
      markResultViewed,
      prepareChatForVisualExplain,
      markApplyApplied,
      applyRewriteInEditor,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
