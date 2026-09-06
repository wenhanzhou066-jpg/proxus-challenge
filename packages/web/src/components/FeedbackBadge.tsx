import { useSettings } from "../domain/settings/hooks.ts";
import { getFeedbackPalette, type FeedbackKind } from "../domain/settings/feedback.ts";

interface Props {
  readonly kind: FeedbackKind;
  readonly children: React.ReactNode;
  readonly className?: string;
}

/**
 * Pill badge that carries color, symbol and text. Never relies on color alone.
 */
export function FeedbackBadge({ kind, children, className = "" }: Props) {
  const [{ cvd }] = useSettings();
  const palette = getFeedbackPalette(kind, cvd);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-sm ${palette.badge} ${className}`}
    >
      <span aria-hidden className="font-bold">{palette.icon}</span>
      <span>{children}</span>
    </span>
  );
}
