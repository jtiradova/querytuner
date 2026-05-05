import { useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AppShell } from '../components/AppShell';
import { useChat } from '../contexts/ChatContext';
import { useEditorWorkspace } from '../contexts/EditorWorkspaceContext';

/**
 * Visual Explain page — plan tree + Summary / Details (Figma 1016-86425).
 * Chat content after “Go to Visual Explain” is driven from ChatContext
 * (Figma 1058-135398) without injecting extra cards here.
 */

type StatBar = {
  label: string;
  value: string;
  pct: number; // 0..1
  color: string; // hex / tailwind color string used inline
};

type PlanNode = {
  id: string;
  label: string;
  icon: 'project' | 'hash-join' | 'filter' | 'repartition' | 'database';
  stats: StatBar[];
  children?: PlanNode[];
};

/**
 * Plan tree shown in Figma 944-49871. Top-down: Repartition → Hash Join →
 * (Filter, Project). The leaf scan and projected metrics intentionally mirror
 * the design so the screenshot matches when shown to stakeholders.
 */
const PLAN: PlanNode = {
  id: 'repartition',
  label: 'Repartition',
  icon: 'repartition',
  stats: [
    { label: 'total time', value: '5.2%', pct: 0.052, color: '#e0a206' },
    { label: 'memory', value: '1.28 GB', pct: 0.62, color: '#c41337' },
    { label: 'rows', value: '3,222', pct: 0.4, color: '#33b8b3' },
    { label: 'network traffic', value: '56B', pct: 0.05, color: '#575ebd' },
  ],
  children: [
    {
      id: 'hash-join',
      label: 'Hash Join',
      icon: 'hash-join',
      stats: [
        { label: 'total time', value: '2.2%', pct: 0.022, color: '#e0a206' },
        { label: 'memory', value: '40 MB', pct: 0.3, color: '#c41337' },
        { label: 'rows', value: '3,222', pct: 0.4, color: '#33b8b3' },
        { label: 'network traffic', value: '56B', pct: 0.05, color: '#575ebd' },
      ],
      children: [
        {
          id: 'filter',
          label: 'Filter',
          icon: 'filter',
          stats: [
            { label: 'total time', value: '2.2%', pct: 0.022, color: '#e0a206' },
            { label: 'memory', value: '40 MB', pct: 0.3, color: '#c41337' },
            { label: 'rows', value: '3,222', pct: 0.4, color: '#33b8b3' },
            { label: 'network traffic', value: '56B', pct: 0.05, color: '#575ebd' },
          ],
        },
        {
          id: 'project',
          label: 'Project',
          icon: 'project',
          stats: [
            { label: 'total time', value: '2.2%', pct: 0.022, color: '#e0a206' },
            { label: 'memory', value: '40 MB', pct: 0.3, color: '#c41337' },
            { label: 'rows', value: '3,222', pct: 0.4, color: '#33b8b3' },
            { label: 'network traffic', value: '56B', pct: 0.05, color: '#575ebd' },
          ],
        },
      ],
    },
  ],
};

type OperatorRow = { name: string; time: string };
const OPERATORS: OperatorRow[] = [
  { name: 'Columnstorescan', time: '6 s' },
  { name: 'Columnstorescan', time: '2 s' },
  { name: 'Columnstorescan', time: '4 s' },
  { name: 'Project', time: '66 ms' },
  { name: 'Broadcast', time: '66 ms' },
  { name: 'Filter', time: '66 ms' },
  { name: 'Hashjoin', time: '66 ms' },
  { name: 'Columnstorescan', time: '22 ms' },
  { name: 'Hashjoin', time: '10 ms' },
  { name: 'Hashjoin', time: '5 ms' },
  { name: 'Hashjoin', time: '2 ms' },
];

export function VisualExplainPage() {
  const chat = useChat();
  const navigate = useNavigate();
  const { snapshot } = useEditorWorkspace();
  const [tab, setTab] = useState<'actual' | 'estimated'>('actual');
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);

  useLayoutEffect(() => {
    chat.open();
  }, [chat.open]);

  return (
    <AppShell askLabel="Ask Singlestore">
      <>
        {/* Header row: profile name + right-side actions. The Visual Explain
            page is its own destination (linked from the sidebar), so no editor
            tab bar is rendered here. */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-border-subtle">
          <span
            className="text-sm font-bold text-text-primary truncate"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            PROFILE: profile-sample2.json
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-brand-ghost gap-1.5"
              onClick={() => {
                // Flow 3: open Ask SingleStore with full analysis — no modal.
                chat.openVisualExplainOptimizeChat();
              }}
            >
              <Icon name="wand-magic-sparkles" className="text-[14px]" />
              <span>Optimize</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary h-9 px-3 text-sm"
              style={{ fontFamily: 'Roboto, sans-serif' }}
              onClick={() => {
                const tid = snapshot.activeTabId;
                const tab =
                  tid !== 'my-files'
                    ? snapshot.tabs.find((t) => t.id === tid)
                    : undefined;
                if (tab?.label) {
                  chat.setVisualExplainChatPill(tab.label);
                }
                navigate('/editor/query', { replace: true });
              }}
            >
              Go to SQL editor
            </button>
            <button className="btn-icon" aria-label="Settings">
              <Icon name="settings" className="text-[14px]" />
            </button>
          </div>
        </div>

        {/* Content row: plan + right panel */}
        <div className="flex-1 flex min-h-0">
          {/* Main plan area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-auto">
            {/* Tabs */}
            <div className="flex items-center gap-2 px-4 pt-4">
              <div className="inline-flex bg-neutral-3 rounded-sm p-0.5">
                {(['actual', 'estimated'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`h-7 px-3 rounded-sm text-xs font-medium capitalize transition-colors ${
                      tab === t
                        ? 'bg-white text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan tree */}
            <div className="flex-1 min-h-0 p-6 overflow-auto">
              <div className="flex items-start justify-center min-w-max">
                <PlanTree node={PLAN} />
              </div>
            </div>
          </div>

          {/* Summary / Details side column */}
          <aside className="w-[240px] shrink-0 border-l border-border-subtle bg-white flex flex-col gap-0 overflow-auto">
            <CollapsibleSection
              title="Summary"
              open={summaryOpen}
              onToggle={() => setSummaryOpen((v) => !v)}
            >
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 px-4 py-3">
                <div>
                  <div className="text-xs text-text-secondary">Execution Time</div>
                  <div className="text-base font-medium text-text-primary mt-0.5">
                    9.33s
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary">Memory Usage</div>
                  <div className="text-base font-medium text-text-primary mt-0.5">
                    128 GB
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-text-secondary">Total Operations</div>
                  <div className="text-base font-medium text-text-primary mt-0.5">
                    27
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Details"
              open={detailsOpen}
              onToggle={() => setDetailsOpen((v) => !v)}
            >
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between text-xs text-text-secondary border-b border-border-subtle py-2">
                  <span>Operator</span>
                  <span>Total Time</span>
                </div>
                <ul className="divide-y divide-border-subtle">
                  {OPERATORS.map((op, i) => (
                    <li
                      key={`${op.name}-${i}`}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="text-text-primary truncate">{op.name}</span>
                      <span className="text-text-secondary tabular-nums">
                        {op.time}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CollapsibleSection>
          </aside>
        </div>
      </>
    </AppShell>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border-subtle">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-4 py-3 hover:bg-neutral-2"
      >
        <Icon
          name={open ? 'chevron-down' : 'chevron-right'}
          className="text-[10px] text-text-secondary"
          variant="solid"
        />
        <span
          className="text-sm font-medium text-text-primary"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          {title}
        </span>
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

/**
 * Renders a vertical plan tree. Each node is a card with icon + stats; nodes
 * with >1 child fan out below with connecting lines between parent and child.
 */
function PlanTree({ node }: { node: PlanNode }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <PlanCard node={node} />
      {node.children && node.children.length > 0 && (
        <>
          <div className="w-px h-4 bg-border-default" />
          <div className="flex items-start gap-10 relative">
            {/* Horizontal bar connecting siblings */}
            {node.children.length > 1 && (
              <div className="absolute top-0 left-10 right-10 h-px bg-border-default" />
            )}
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center gap-4">
                <div className="w-px h-4 bg-border-default" />
                <PlanTree node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlanCard({ node }: { node: PlanNode }) {
  return (
    <div className="flex items-stretch rounded-md border border-border-default bg-white shadow-sm w-[320px]">
      {/* Icon + label column */}
      <div className="flex flex-col items-center justify-center gap-2 px-3 py-3 w-[84px] shrink-0 border-r border-border-subtle">
        <div className="size-9 rounded-sm bg-brand-2 flex items-center justify-center">
          <Icon name={node.icon} className="text-[16px] text-brand-9" />
        </div>
        <div
          className="text-[11px] text-text-primary text-center whitespace-pre leading-tight"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          {node.label}
        </div>
      </div>

      {/* Stats column */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 px-3 py-2">
        {node.stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[11px]">
            <span
              className="w-[52px] text-text-primary font-medium tabular-nums"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              {s.value}
            </span>
            <span className="w-[72px] text-text-secondary truncate">{s.label}</span>
            <div className="flex-1 h-[5px] rounded-full bg-neutral-3 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(3, s.pct * 100))}%`,
                  background: s.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
