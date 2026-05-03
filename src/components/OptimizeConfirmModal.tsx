import { useEffect } from 'react';
import type { OptimizeConfirmRequest } from '../contexts/ChatContext';
import { Icon } from './Icon';

type OptimizeConfirmModalProps = {
  open: boolean;
  payload: OptimizeConfirmRequest | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmation before profiling / opening Visual Explain (Query Tuner).
 */
export function OptimizeConfirmModal({
  open,
  payload,
  onConfirm,
  onCancel,
}: OptimizeConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || !payload) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="optimize-confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1b1a21]/50 cursor-default"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-[480px] rounded-sm border border-border-default bg-white shadow-[0px_2px_2px_rgba(27,26,33,0.25)]"
        style={{ boxShadow: '0px 2px 2px rgba(27,26,33,0.25)' }}
      >
        <div className="px-6 pt-6 pb-5">
          <h2
            id="optimize-confirm-title"
            className="flex items-center gap-2 text-base font-medium text-text-primary"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            <Icon
              name="wand-magic-sparkles"
              className="text-[18px] text-brand-9 shrink-0"
              aria-hidden
            />
            <span>Optimize query</span>
          </h2>
          <div
            className="mt-4 space-y-3 text-sm text-text-secondary leading-relaxed"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            <p>
              A query profile must be generated to show optimization opportunities
              in Visual Explain. This takes about 30 seconds and may cause a brief
              spike in query execution.
            </p>
            <p className="font-bold text-text-primary">
              Confirm to generate this profile and continue to Visual Explain.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-subtle">
          <button
            type="button"
            className="btn btn-secondary h-9 px-4 text-sm"
            style={{ fontFamily: 'Roboto, sans-serif' }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary h-9 px-4 text-sm"
            style={{ fontFamily: 'Roboto, sans-serif' }}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
