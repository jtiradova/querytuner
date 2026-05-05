import { Icon } from './Icon';

/**
 * Code icon + SQL tab label (+ optional dismiss). Paired with a brand accent bar
 * in the Query Tuner toolbar and Visual Explain chat composer (Figma 1058-135462).
 */
export function SqlTabContextChipRow({
  label,
  onDismiss,
}: {
  label: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="inline-flex max-w-full min-w-0 items-center gap-1 rounded border border-border-default bg-neutral-3 py-1 pl-1 pr-0.5">
      <div className="flex min-w-0 items-center gap-2 px-1.5 py-0.5">
        <Icon name="code" className="shrink-0 text-[12px] text-text-mid" aria-hidden />
        <span
          className="truncate text-sm font-normal tracking-wide text-text-primary"
          style={{ fontFamily: 'Roboto, sans-serif' }}
          title={label}
        >
          {label}
        </span>
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="btn-icon h-6 w-6 shrink-0 text-text-mid hover:text-text-primary"
          aria-label="Hide SQL tab context"
          title="Dismiss"
          onClick={onDismiss}
        >
          <Icon name="xmark" className="text-[12px]" />
        </button>
      ) : null}
    </div>
  );
}

export function SqlTabContextAccentBar({
  minHeightClass = 'min-h-[22px]',
}: {
  minHeightClass?: string;
}) {
  return (
    <div
      className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full bg-brand-9 ${minHeightClass}`}
      aria-hidden
    />
  );
}
