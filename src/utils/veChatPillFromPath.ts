import type { EditorWorkspaceSnapshot } from '../contexts/EditorWorkspaceContext';

/** Set while Query History detail is mounted so chat→VE links can show activity name. */
export const STORAGE_KEY_VE_QH_DETAIL_ACTIVITY = 've-chat-qh-detail-activity';

export function readQueryHistoryDetailActivityPill(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.sessionStorage
      .getItem(STORAGE_KEY_VE_QH_DETAIL_ACTIVITY)
      ?.trim();
    return v || null;
  } catch {
    return null;
  }
}

/**
 * Label for the Visual Explain composer pill when following a link from the
 * current route: SQL tab file name on `/editor/query`, query activity on
 * Query History detail, nothing on VE or unknown.
 */
export function resolveVeChatHandoffPill(
  pathname: string,
  snapshot: EditorWorkspaceSnapshot,
): string | null {
  if (pathname.includes('/editor/visual-explain')) return null;
  if (pathname.includes('/editor/query')) {
    const tid = snapshot.activeTabId;
    if (tid === 'my-files') return null;
    const tab = snapshot.tabs.find((t) => t.id === tid);
    return tab && tab.id !== 'my-files' ? tab.label : null;
  }
  if (pathname.includes('/monitoring/query-history')) {
    return readQueryHistoryDetailActivityPill();
  }
  return null;
}
