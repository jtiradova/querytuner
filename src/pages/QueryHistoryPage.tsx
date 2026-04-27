import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AppShell } from '../components/AppShell';

/* -------------------------------------------------------------------------- */
/*                                    Data                                    */
/* -------------------------------------------------------------------------- */

export type QueryHistoryRow = {
  id: string;
  /** Short label shown in the table. */
  started: string;
  /** Long form (used on the detail page). */
  startedLong: string;
  activityName: string;
  fullActivityName: string;
  queryText: string;
  fullQuery: string;
  elapsedLabel: string;
  /** 0–1 — width of the duration bar relative to its column. */
  elapsedPct: number;
  elapsedColor: string;
  status: 'Success' | 'Text';
  database: string;
  user: string;
  resourcesPool: string;
};

const SAMPLE_QUERY = `SELECT * FROM orders
WHERE customer_id IN (
    SELECT id FROM customers
    WHERE email LIKE '%gmail.com'
    AND status = 'active'
)
AND created_at > '2024-01-01'
ORDER BY created_at DESC;`;

export const QUERY_HISTORY: QueryHistoryRow[] = [
  {
    id: '6a8f765bf44da1fc',
    started: 'Nov 27, 2024 - 4:13',
    startedLong: 'Nov 28, 2024 - 6:26:46 PM GMT+00:00',
    activityName: 'SELECT_MV_PERMISS...',
    fullActivityName: 'Select_MV_CLOUD_DUPLICATION_STATUS_6a8f765bf44da1fc',
    queryText: 'SELECT IFNULL(DAT...',
    fullQuery: SAMPLE_QUERY,
    elapsedLabel: '9.33s',
    elapsedPct: 0.78,
    elapsedColor: '#e0a206',
    status: 'Success',
    database: 'information...',
    user: 'eb7f568b-3870-',
    resourcesPool: 'default_pool',
  },
  {
    id: '7c2d9a0a4e5f1b22',
    started: 'Nov 27, 2024 - 4:13:24...',
    startedLong: 'Nov 27, 2024 - 4:13:24 PM GMT+00:00',
    activityName: 'SELECT_MV_PERMISS...',
    fullActivityName: 'Select_MV_PERMISSIONS_BY_ROLE_7c2d9a0a4e5f1b22',
    queryText: 'SELECT IFNULL(DAT...',
    fullQuery: SAMPLE_QUERY,
    elapsedLabel: '6.233s',
    elapsedPct: 0.51,
    elapsedColor: '#e0a206',
    status: 'Text',
    database: 'information...',
    user: 'root',
    resourcesPool: 'default_pool',
  },
  {
    id: '9e1b338c0fa67d44',
    started: 'Nov 27, 2024 - 4:13:24...',
    startedLong: 'Nov 27, 2024 - 4:13:24 PM GMT+00:00',
    activityName: 'SELECT_MV_PERMISS......',
    fullActivityName: 'Select_MV_PERMISSIONS_INDEX_9e1b338c0fa67d44',
    queryText: 'SELECT IFNULL(DAT...',
    fullQuery: SAMPLE_QUERY,
    elapsedLabel: '1.233s',
    elapsedPct: 0.12,
    elapsedColor: '#b969fc',
    status: 'Text',
    database: 'information...',
    user: 'root',
    resourcesPool: 'default_pool',
  },
];

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export function QueryHistoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = QUERY_HISTORY.filter((row) =>
    search.trim()
      ? row.fullActivityName.toLowerCase().includes(search.toLowerCase()) ||
        row.queryText.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <AppShell askLabel="Ask Singlestore">
      <div className="flex flex-col h-full overflow-auto bg-white">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 flex flex-col gap-2">
          <h1
            className="text-[20px] font-bold text-text-primary"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            Query History
          </h1>
          <p
            className="text-sm text-text-mid"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Only queries longer than 1000ms will be shown.Check{' '}
            <a
              href="https://docs.singlestore.com/cloud/reference/sql-reference/show-commands/show-statements/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-9 hover:underline"
            >
              Query History
              <Icon name="arrow-up-right-from-square" className="text-[10px]" />
            </a>{' '}
            for updates and more info.
          </p>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 h-8 px-2 w-[220px] rounded-sm border border-border-default bg-white">
              <Icon
                name="magnifying-glass"
                className="text-[12px] text-text-low"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 min-w-0 outline-none text-sm text-text-primary placeholder:text-text-low bg-transparent"
              />
            </div>
            <FilterButton icon="folder" label="All" />
            <FilterButton icon="cube" label="Workspace 1" />
            <FilterButton icon="circle" label="Last 30 minutes" />
            <button
              type="button"
              className="btn-icon"
              aria-label="Refresh"
              title="Refresh"
            >
              <Icon name="rotate" className="text-[14px]" />
            </button>
            <FilterButton label="Databases: All" />
            <FilterButton label="Activity Name" />
            <button
              type="button"
              className="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-transparent text-sm text-text-mid hover:bg-neutral-3"
            >
              <Icon name="filter" className="text-[12px]" />
              <span>More filters</span>
            </button>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-border-default bg-white text-sm text-text-mid hover:bg-neutral-2"
          >
            <Icon name="table-columns" className="text-[12px]" />
            <span>Columns</span>
          </button>
        </div>

        {/* Table */}
        <div className="px-6 flex-1 min-h-0">
          <div className="border border-border-subtle rounded-sm overflow-hidden bg-white">
            <table
              className="w-full text-sm"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              <thead className="bg-surface-2">
                <tr>
                  <th className="w-8 border-b-2 border-border-default" />
                  <HeaderCell>Started</HeaderCell>
                  <HeaderCell>Activity Name</HeaderCell>
                  <HeaderCell>Query Text</HeaderCell>
                  <HeaderCell>Elapsed Time</HeaderCell>
                  <HeaderCell>Status</HeaderCell>
                  <HeaderCell sortable={false}>Database</HeaderCell>
                  <HeaderCell>User</HeaderCell>
                  <HeaderCell sortable={false}>Resources Pool</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`${
                      i % 2 === 1 ? 'bg-surface-2' : 'bg-white'
                    } border-b border-border-subtle hover:bg-brand-2/40 cursor-pointer`}
                    onClick={() =>
                      navigate(`/monitoring/query-history/${row.id}`)
                    }
                  >
                    <td className="px-2 py-3 align-middle text-text-low">
                      <Icon
                        name="chevron-right"
                        variant="solid"
                        className="text-[10px]"
                      />
                    </td>
                    <td className="px-3 py-3 align-middle text-text-mid whitespace-nowrap">
                      {row.started}
                    </td>
                    <td className="px-3 py-3 align-middle text-text-mid">
                      <span className="text-brand-9 hover:underline">
                        {row.activityName}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-text-mid">
                      {row.queryText}
                    </td>
                    <td className="px-3 py-3 align-middle w-[231px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-text-mid">{row.elapsedLabel}</span>
                        <div className="bg-neutral-4 rounded-sm h-1.5 w-full max-w-[200px] overflow-hidden">
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${Math.round(row.elapsedPct * 100)}%`,
                              backgroundColor: row.elapsedColor,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="inline-flex items-center gap-2 text-text-mid">
                        <Icon
                          name="circle-check"
                          className="text-[14px]"
                          style={{ color: '#00873f' }}
                        />
                        <span>{row.status}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-text-mid">
                      {row.database}
                    </td>
                    <td className="px-3 py-3 align-middle text-text-mid whitespace-nowrap">
                      {row.user}
                    </td>
                    <td className="px-3 py-3 align-middle text-text-mid whitespace-nowrap">
                      {row.resourcesPool}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="text-xs text-text-low text-right py-3"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Showing {filtered.length} rows
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FilterButton({ icon, label }: { icon?: string; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-border-default bg-white text-sm text-text-mid hover:bg-neutral-2"
    >
      {icon && <Icon name={icon} className="text-[12px]" />}
      <span>{label}</span>
      <Icon
        name="chevron-down"
        variant="solid"
        className="text-[10px] text-text-low"
      />
    </button>
  );
}

function HeaderCell({
  children,
  sortable = true,
}: {
  children: React.ReactNode;
  sortable?: boolean;
}) {
  return (
    <th className="px-3 py-3 text-left border-b-2 border-border-default text-[13px] font-bold text-text-primary whitespace-nowrap">
      <span className="inline-flex items-center gap-2">
        {children}
        {sortable && (
          <Icon
            name="sort"
            variant="solid"
            className="text-[10px] text-text-low"
          />
        )}
      </span>
    </th>
  );
}
