import { Icon } from './Icon';

/**
 * Code icon + SQL tab label (+ optional dismiss). Paired with a brand accent bar
 * (FlowBot / Figma 790-30683): 2px bar same height as the pill only — not full composer height.
 */
export function SqlTabContextChipRow({
  label,
  onDismiss,
}: {
  label: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md border border-border-default bg-neutral-4 min-h-5 h-5 pl-2 pr-0.5">
      <div className="flex min-w-0 items-center gap-1.5 py-0">
        <Icon name="code" className="shrink-0 text-[10px] text-text-mid" aria-hidden />
        <span
          className="truncate text-xs font-medium tracking-wide text-text-primary"
          style={{ fontFamily: 'Roboto, sans-serif' }}
          title={label}
        >
          {label}
        </span>
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="btn-icon h-5 w-5 shrink-0 text-text-mid hover:text-text-primary"
          aria-label="Hide SQL tab context"
          title="Dismiss"
          onClick={onDismiss}
        >
          <Icon name="xmark" className="text-[10px]" />
        </button>
      ) : null}
    </div>
  );
}

/** 2px brand accent; use inside a row with only the pill so `self-stretch` matches pill height. */
export function SqlTabContextAccentBar() {
  return (
    <div
      className="w-0.5 shrink-0 self-stretch rounded-full bg-brand-9"
      aria-hidden
    />
  );
}
