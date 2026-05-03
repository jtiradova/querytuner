/**
 * Flow 1C — Optimize with an empty SQL editor (Figma 1016-87077).
 * Static text only; no buttons.
 */
export function QueryTunerEmptyIntroMessage() {
  return (
    <div
      className="flex flex-col gap-4 self-stretch w-full max-w-full items-start"
      style={{ fontFamily: 'Roboto, sans-serif' }}
    >
      <p className="text-sm font-normal text-text-primary leading-normal tracking-wide m-0">
        I can help you analyze and optimize your SingleStore queries.
      </p>

      <div className="flex flex-col gap-2 w-full items-start">
        <p className="text-sm font-medium text-text-primary leading-normal tracking-wide m-0">
          To get started, either:
        </p>
        <ol className="list-decimal pl-5 text-sm text-text-primary leading-normal tracking-wide space-y-2 m-0 w-full">
          <li>
            <span className="font-medium">Paste a SQL query </span>
            <span className="font-normal text-text-secondary">
              to profile and tune
            </span>
          </li>
          <li className="font-medium">Paste / upload a Query Debug Profile</li>
        </ol>
        <p className="text-sm font-normal text-text-primary leading-normal tracking-wide m-0 mt-1">
          What would you like to optimize today?
        </p>
      </div>
    </div>
  );
}
