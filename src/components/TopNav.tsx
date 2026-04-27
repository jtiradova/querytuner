import { Logo } from './Logo';
import { Icon } from './Icon';
import { useChat } from '../contexts/ChatContext';

type TopNavProps = {
  /** Text shown in the "Ask SingleStore" pill button. */
  askLabel?: string;
};

/**
 * Fusion top navigation. Spans full width. Logo left, search center, user tools right.
 * Per Figma: 48px tall, white bg, subtle bottom border.
 */
export function TopNav({ askLabel = 'Ask Singlestore' }: TopNavProps) {
  const chat = useChat();
  return (
    <header className="flex items-center justify-between h-12 px-4 py-2 bg-white border-b border-border-subtle shrink-0">
      <div className="flex items-center w-[220px]">
        <Logo />
      </div>

      <div className="flex-1 flex items-center justify-center">
        <button
          type="button"
          className="flex items-center gap-2 h-8 w-[240px] px-2 py-1 rounded-sm bg-neutral-3 text-text-low hover:bg-neutral-4 transition-colors"
        >
          <Icon name="magnifying-glass" className="text-[12px]" />
          <span className="flex-1 text-left text-sm font-normal">Search</span>
          <span className="flex items-center gap-[2px] px-[4px] py-[1px] rounded-xs border border-border-hover text-[11px] text-text-low font-medium">
            <span className="leading-none">⌘</span>
            <span>+</span>
            <span>k</span>
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1 w-[220px] justify-end">
        <button className="btn-icon" aria-label="Invite">
          <Icon name="user-plus" className="text-[14px]" />
        </button>
        <div className="h-4 w-px bg-border-subtle mx-1" />
        <button
          type="button"
          onClick={() => chat.startQueryTunerWelcome()}
          className="flex items-center gap-2 h-8 px-3 rounded-sm text-sm text-text-mid hover:bg-neutral-3 font-bold"
          style={{ fontFamily: 'Lato, sans-serif' }}
        >
          <Icon name="wand-magic-sparkles" className="text-[14px]" />
          <span>{askLabel}</span>
        </button>
        <button className="btn-icon" aria-label="Help">
          <Icon name="circle-info" className="text-[14px]" />
        </button>
      </div>
    </header>
  );
}
