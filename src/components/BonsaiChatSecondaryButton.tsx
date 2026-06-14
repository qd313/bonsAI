import type { ReactNode } from "react";
import { Button } from "@decky/ui";

type BonsaiChatSecondaryButtonProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** Decky `Button` focus stop — native `<button>` inside `Focusable` is not D-pad navigable. */
export function BonsaiChatSecondaryButton(props: BonsaiChatSecondaryButtonProps) {
  const { children, onClick, disabled, className, style, ...aria } = props;
  const extra = className ? ` ${className}` : "";
  return (
    <Button
      className={`bonsai-chat-secondary-btn${extra}`}
      focusable
      disabled={disabled}
      onClick={onClick}
      style={style}
      {...aria}
    >
      {children}
    </Button>
  );
}
