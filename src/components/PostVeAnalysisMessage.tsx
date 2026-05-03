/**
 * Ask SingleStore thread after landing on Visual Explain — full analysis
 * narrative (prototype copy aligned with Query Tuner flows).
 */
export function PostVeAnalysisMessage() {
  return (
    <div
      className="flex flex-col text-sm text-text-primary gap-0"
      style={{ fontFamily: 'Roboto, sans-serif' }}
    >
      <div className="pb-4 border-b border-border-default">
        <p className="leading-relaxed mb-2 text-text-primary">
          Now let me run bottleneck detection and look up relevant guidance in
          parallel.
        </p>
        <p className="leading-relaxed text-text-secondary">
          Here is the full analysis of your profile:
        </p>
      </div>

      <div className="py-4 border-b border-border-default">
        <p
          className="text-[18px] font-medium text-text-primary mb-3"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          Query Overview
        </p>
        <p className="leading-relaxed text-text-primary">
          This query does a full scan of{' '}
          <code className="rounded-sm border border-border-default bg-surface-2 px-1.5 py-0.5 font-mono text-[13px]">
            information_schema.MV_CLOUD_BRANCHES
          </code>{' '}
          — an internal SingleStore system view that tracks branch metadata
          (database name, region, workspace group, storage, compute IDs,
          attach/detach/drop status) — and wraps each column in{' '}
          <code className="rounded-sm border border-border-default bg-surface-2 px-1.5 py-0.5 font-mono text-[13px]">
            IFNULL()
          </code>{' '}
          to substitute defaults for{' '}
          <code className="rounded-sm border border-border-default bg-surface-2 px-1.5 py-0.5 font-mono text-[13px]">
            NULL
          </code>{' '}
          values. It returns <span className="font-medium">1 row.</span>
        </p>
      </div>

      <div className="py-4 border-b border-border-default">
        <p
          className="text-[18px] font-medium text-text-primary mb-3"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          Performance Issues Found
        </p>

        <p className="font-medium leading-snug mb-2 text-text-primary">
          1. 🟡 Query Queuing / Late Start (Medium Severity)
        </p>
        <ul className="list-disc pl-5 text-text-primary leading-relaxed space-y-2 mb-4">
          <li>
            <span className="font-medium">Issue:</span> The Project operator (the
            top-level node) didn&apos;t start until ~1,969 ms into the
            query&apos;s total runtime of ~1,971 ms. This means the actual
            computation took only ~2 ms, but the query spent ~99.9% of its time
            waiting before execution began.
          </li>
          <li>
            <span className="font-medium">Impact:</span> Total runtime: 1,971 ms;
            TableScan exec time: 1,969 ms (all of it is wait/network); Network
            time: 1,937 ms out of total; CPU time: only 5 ms.
          </li>
          <li>
            <span className="font-medium">Root cause:</span> This is a distributed
            system overhead issue.{' '}
            <code className="rounded-sm border border-border-default bg-surface-2 px-1 py-0.5 font-mono text-[12px]">
              information_schema.MV_CLOUD_BRANCHES
            </code>{' '}
            is a sharded_rowstore internal system view that must be queried
            across all leaf nodes. The high{' '}
            <code className="rounded-sm border border-border-default bg-surface-2 px-1 py-0.5 font-mono text-[12px]">
              total_task_network_time_ms
            </code>{' '}
            (1,937 ms) indicates most time was spent gathering results from leaf
            nodes — classic fan-out latency for a system catalog view.
          </li>
          <li>
            <span className="font-medium">Recommendation:</span> This is largely
            inherent to querying information_schema distributed views. You can
            mitigate by caching results application-side if this query is called
            frequently (the data changes rarely); reducing call frequency — avoid
            polling this view in tight loops; and checking cluster health: 1.9s
            network time on a 2-leaf cluster is abnormally high — verify leaf node
            responsiveness with{' '}
            <code className="rounded-sm border border-border-default bg-surface-2 px-1 py-0.5 font-mono text-[12px]">
              SHOW LEAVES
            </code>{' '}
            or{' '}
            <code className="rounded-sm border border-border-default bg-surface-2 px-1 py-0.5 font-mono text-[12px]">
              mv_processlist
            </code>
            .
          </li>
        </ul>

        <p className="font-medium leading-snug mb-2 text-text-primary">
          2. ℹ️ No Schema Optimization Possible
        </p>
        <ul className="list-disc pl-5 text-text-primary leading-relaxed space-y-2">
          <li>
            <span className="font-medium">Issue:</span>{' '}
            <code className="rounded-sm border border-border-default bg-surface-2 px-1 py-0.5 font-mono text-[12px]">
              information_schema.MV_CLOUD_BRANCHES
            </code>{' '}
            is a system-managed internal view — you cannot alter its shard key,
            sort key, or add indexes.
          </li>
          <li>
            <span className="font-medium">Impact:</span> N/A
          </li>
          <li>
            <span className="font-medium">Recommendation:</span> No DDL changes are
            applicable here.
          </li>
        </ul>
      </div>

      <div className="py-4 border-b border-border-default">
        <p
          className="text-[18px] font-medium text-text-primary mb-2"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          Recommended DDL Changes
        </p>
        <p className="leading-relaxed text-text-primary">
          No DDL changes are applicable — this query targets a system
          information_schema view that cannot be modified.
        </p>
      </div>

      <div className="pt-4">
        <p
          className="text-[18px] font-medium text-text-primary mb-3"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          Summary — Prioritized Actions
        </p>
        <div className="overflow-x-auto rounded-md border border-border-subtle">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-border-subtle">
                <th className="px-3 py-2 font-medium text-text-secondary w-16">
                  Priority
                </th>
                <th className="px-3 py-2 font-medium text-text-secondary">
                  Action
                </th>
                <th className="px-3 py-2 font-medium text-text-secondary">
                  Expected impact
                </th>
              </tr>
            </thead>
            <tbody className="text-text-primary">
              <tr className="border-b border-border-subtle">
                <td className="px-3 py-2 font-medium">1</td>
                <td className="px-3 py-2">
                  Cache results application-side — this view rarely changes
                </td>
                <td className="px-3 py-2">Eliminates repeated ~2s latency</td>
              </tr>
              <tr className="border-b border-border-subtle">
                <td className="px-3 py-2 font-medium">2</td>
                <td className="px-3 py-2">
                  Check leaf node health — run SHOW LEAVES to confirm all leaves
                  are responsive
                </td>
                <td className="px-3 py-2">
                  Rules out a slow/degraded leaf causing high network time
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">3</td>
                <td className="px-3 py-2">
                  Avoid frequent polling — if called in a loop or health check,
                  add a TTL-based cache
                </td>
                <td className="px-3 py-2">Reduces cluster load</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 leading-relaxed text-text-secondary text-xs">
          Note: The query itself is structurally simple and correct. The ~2 second
          runtime is driven entirely by distributed information_schema fan-out
          latency, not by the query logic.
        </p>
      </div>
    </div>
  );
}
