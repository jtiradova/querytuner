import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useEditorWorkspace } from '../contexts/EditorWorkspaceContext';

const SQL_KW = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'ORDER',
  'BY',
  'GROUP',
  'HAVING',
  'LIMIT',
  'AS',
  'NOT',
  'NULL',
  'IN',
  'SHOW',
  'LIKE',
  'DESC',
  'ASC',
  'ON',
  'JOIN',
  'COUNT',
  'AVG',
  'MAX',
  'REPLACE',
  'KILL',
  'QUERY',
]);

function highlightSql(sql: string) {
  const lines = sql.split('\n');
  return lines.map((line, li) => {
    const parts = line.split(/(\s+|[(),;<>])/);
    return (
      <span key={li}>
        {parts.map((part, pi) => {
          if (part === '') return null;
          const up = part.trim().toUpperCase();
          const kw = SQL_KW.has(up);
          return (
            <span key={pi} className={kw ? 'text-brand-9' : 'text-text-primary'}>
              {part}
            </span>
          );
        })}
        {li < lines.length - 1 ? '\n' : null}
      </span>
    );
  });
}

type Step = { title: string; code: string; note?: string };

const STEPS: Step[] = [
  {
    title: "Step 1 — Check What's Currently Running/Queued",
    code: `SELECT 
    ID, 
    USER, 
    HOST, 
    DB, 
    COMMAND, 
    TIME, 
    STATUS, 
    INFO 
FROM information_schema.mv_processlist 
WHERE STATUS != 'Sleep' 
ORDER BY TIME DESC;`,
    note: 'Look for long-running queries that are hogging resources.',
  },
  {
    title: 'Step 2 — Identify Top Resource-Consuming Queries',
    code: `SELECT 
    query_text,
    cpu_time_ms,
    elapsed_time_ms,
    rows_affected
FROM information_schema.mv_query_activities
ORDER BY cpu_time_ms DESC
LIMIT 10;`,
    note: 'Find the heaviest queries competing with yours.',
  },
  {
    title: 'Step 3 — Check Resource Manager Settings',
    code: `SHOW VARIABLES LIKE '%resource%';`,
    note: 'See current concurrency and memory limits.',
  },
  {
    title: 'Step 4 — Kill Any Blocking/Long-Running Query',
    code: `-- Replace <ID> with the process ID from Step 1
KILL QUERY <ID>;`,
    note: 'Frees up resources immediately for your query.',
  },
  {
    title: 'Step 5 — Check Cluster Load Over Time',
    code: `SELECT 
    activity_name,
    AVG(cpu_time_ms) AS avg_cpu_ms,
    MAX(elapsed_time_ms) AS max_elapsed_ms,
    COUNT(*) AS query_count
FROM information_schema.mv_query_activities
GROUP BY activity_name
ORDER BY avg_cpu_ms DESC
LIMIT 10;`,
    note: 'Identify which workloads are consistently heavy.',
  },
];

function SqlStepBlock({ step }: { step: Step }) {
  const navigate = useNavigate();
  const workspace = useEditorWorkspace();

  const openInEditor = useCallback(() => {
    // Flush so the new SQL tab exists before navigation; otherwise Query Tuner
    // can run `startSqlSession()` and wipe tabs on a frame where `hasSqlTab`
    // is still false.
    flushSync(() => {
      workspace.addSqlTabWithSql(step.code);
    });
    navigate('/editor/query', { replace: true, state: {} });
  }, [navigate, step.code, workspace]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(step.code);
    } catch {
      /* ignore */
    }
  }, [step.code]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <h4
        className="text-sm font-bold text-text-primary m-0"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        {step.title}
      </h4>
      <div className="rounded-md border border-border-default bg-neutral-2 overflow-hidden">
        <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-b border-border-subtle bg-neutral-3/40">
          <div className="relative group/copy">
            <button
              type="button"
              className="btn-icon h-7 w-7 text-text-mid hover:text-text-primary"
              aria-label="Copy SQL"
              title="Copy"
              onClick={() => void copy()}
            >
              <Icon name="copy" className="text-[14px]" />
            </button>
          </div>
          <div className="relative group/sql">
            <button
              type="button"
              className="btn-icon h-7 w-7 text-text-mid hover:text-text-primary"
              aria-label="Open in SQL Editor"
              onClick={openInEditor}
            >
              <Icon name="code" className="text-[14px]" />
            </button>
            <span
              className="pointer-events-none absolute right-0 bottom-full mb-1 z-20 whitespace-nowrap rounded-sm bg-[#1b1a21] px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/sql:opacity-100"
              style={{ fontFamily: 'Roboto, sans-serif' }}
              role="tooltip"
            >
              Open in SQL Editor
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={openInEditor}
          title="Open in SQL Editor"
          className="m-0 w-full cursor-pointer border-0 bg-transparent p-0 text-left hover:bg-neutral-3/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-8"
        >
          <pre
            className="m-0 p-3 text-[13px] leading-relaxed overflow-x-auto whitespace-pre font-mono bg-neutral-2"
            style={{ fontFamily: 'Inconsolata, monospace' }}
          >
            {highlightSql(step.code)}
          </pre>
        </button>
      </div>
      {step.note ? (
        <p
          className="text-sm text-text-secondary m-0 leading-relaxed"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          {step.note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Visual Explain chat: guided SQL for investigating queuing (prototype copy).
 */
export function VeSqlGuidanceMessage() {
  return (
    <div
      className="flex flex-col gap-5 w-full text-sm text-text-primary"
      style={{ fontFamily: 'Roboto, sans-serif' }}
    >
      <p className="leading-relaxed m-0">
        Here are the SQL actions you can take to investigate and reduce the queuing
        issue:
      </p>

      {STEPS.map((step) => (
        <SqlStepBlock key={step.title} step={step} />
      ))}

      <div className="flex flex-col gap-2 pt-1">
        <p className="font-bold text-text-primary m-0">Recommended Order of Action:</p>
        <ul className="list-disc pl-5 m-0 space-y-1.5 text-text-primary leading-relaxed">
          <li>Run Step 1 → See if anything is currently blocking</li>
          <li>Run Step 2 &amp; 5 → Find the heavy queries</li>
          <li>Run Step 4 → Kill any problematic queries</li>
          <li>
            Re-run your original query → It should now execute faster without the
            queuing delay
          </li>
        </ul>
      </div>

      <p className="leading-relaxed m-0 text-text-primary">
        Would you like help interpreting the results from any of these queries? 😊
      </p>

      <p className="text-xs text-text-secondary leading-relaxed m-0 pt-1 border-t border-border-subtle">
        ⚠️ AI can make mistakes. Validate recommendations in a non-production
        environment before putting them in production.
      </p>
    </div>
  );
}
