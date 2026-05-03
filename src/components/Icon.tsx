import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlignJustify,
  BarChart3,
  ArrowRight,
  ArrowUpFromLine,
  ArrowUpRight,
  ArrowUpDown,
  Bolt,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  Circle,
  Code,
  Cookie,
  Copy,
  Database,
  Download,
  EllipsisVertical,
  Expand,
  FileCode,
  FileUp,
  Filter,
  Folder,
  FolderOpen,
  FolderTree,
  GitMerge,
  History,
  Home,
  Info,
  LayoutDashboard,
  LineChart,
  MessageCircle,
  MessageCircleQuestion,
  MoreHorizontal,
  Pencil,
  Shrink,
  Trash2,
  Network,
  PanelLeft,
  RefreshCw,
  PanelsTopLeft,
  Paperclip,
  Play,
  Plus,
  Search,
  Send,
  Server,
  Settings,
  Sparkles,
  SquareTerminal,
  Table,
  UserPlus,
  Wand2,
  Workflow,
  Wrench,
  X,
} from 'lucide-react';

type IconMap = Record<string, LucideIcon>;

/**
 * Icon name registry. The name strings follow the Font Awesome-like vocabulary
 * used in the Figma design, each mapped to a semantically-equivalent Lucide
 * component. This keeps call-sites stable while avoiding webfont loading.
 */
const ICONS: IconMap = {
  // Navigation
  house: Home,
  home: Home,
  server: Server,
  database: Database,
  download: Download,
  terminal: SquareTerminal,
  'square-terminal': SquareTerminal,
  'rectangle-terminal': SquareTerminal,
  'layer-group': LayoutDashboard,
  'wand-magic-sparkles': Wand2,
  sparkles: Sparkles,
  cube: Box,
  'chart-line': LineChart,
  chart: LineChart,
  'bar-chart': BarChart3,
  tools: Wrench,
  gear: Settings,
  settings: Settings,

  // Controls
  plus: Plus,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevron-up': ChevronUp,
  'chevrons-left': ChevronsLeft,
  'angles-left': ChevronsLeft,
  'arrow-right': ArrowRight,
  check: Check,
  'circle-check': CheckCircle2,
  'check-circle': CheckCircle2,
  copy: Copy,
  search: Search,
  'magnifying-glass': Search,
  xmark: X,
  x: X,
  ellipsis: MoreHorizontal,
  'ellipsis-vertical': EllipsisVertical,
  expand: Expand,
  compress: Shrink,
  shrink: Shrink,
  play: Play,
  circle: Circle,
  bars: AlignJustify,
  sidebar: PanelLeft,
  'table-columns': PanelsTopLeft,
  rotate: RefreshCw,
  refresh: RefreshCw,
  sort: ArrowUpDown,
  'arrow-up-right-from-square': ArrowUpRight,
  'external-link': ArrowUpRight,

  // Files & docs
  'file-code': FileCode,
  code: Code,
  'file-import': FileUp,
  'arrow-up-from-bracket': ArrowUpFromLine,
  folder: Folder,
  folders: FolderTree,
  'folder-open': FolderOpen,
  'folder-tree': FolderTree,
  book: BookOpen,
  table: Table,

  // Misc
  'user-plus': UserPlus,
  'circle-info': Info,
  'info-circle': Info,
  bolt: Bolt,
  'comment-dots': MessageCircle,
  'message-question': MessageCircleQuestion,
  'cookie-bite': Cookie,
  'diagram-project': Workflow,
  pencil: Pencil,
  trash: Trash2,
  'trash-can': Trash2,

  // Chat / panel
  'clock-rotate-left': History,
  history: History,
  paperclip: Paperclip,
  'paper-plane': Send,
  send: Send,

  // Visual Explain plan-tree operators
  filter: Filter,
  'hash-join': GitMerge,
  'git-merge': GitMerge,
  repartition: Network,
  network: Network,
  project: Box,
};

type IconVariant = 'regular' | 'solid' | 'brands';

export type IconProps = {
  name: string;
  variant?: IconVariant;
  className?: string;
  style?: CSSProperties;
  /** Pixel size for the icon (default derives from text-* class) */
  size?: number;
  title?: string;
};

/**
 * Unified icon wrapper. Renders a Lucide SVG chosen via our Font Awesome-style
 * name registry. The `variant` prop is accepted for call-site compatibility but
 * has no visual effect (solid is the only shipped style).
 */
/**
 * Maps any `text-[Npx]` Tailwind class found in `className` to an explicit
 * pixel size so the Lucide SVG renders at that size (Lucide ignores CSS
 * font-size; it reads width/height attributes).
 */
function deriveSize(className: string, fallback: number): number {
  const m = className.match(/text-\[(\d+)px\]/);
  if (m) return Number(m[1]);
  return fallback;
}

export function Icon({
  name,
  className = '',
  style,
  size,
  title,
}: IconProps) {
  const Component = ICONS[name] ?? Plus;
  const resolvedSize = size ?? deriveSize(className, 16);
  return (
    <Component
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={`inline-block shrink-0 ${className}`}
      style={style}
      width={resolvedSize}
      height={resolvedSize}
      strokeWidth={1.75}
    />
  );
}
