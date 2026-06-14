import { useEffect, useRef, type RefObject } from "react";
import { findTabContentsScroll } from "../utils/chatPanelScroll";

/**
 * While tokens stream in, preserve QAM scrollTop when the user has scrolled up to read.
 * When pinned near the bottom, allow natural tail follow.
 */
export function useStreamScrollPin(
  anchorRef: RefObject<HTMLElement | null>,
  streamText: string,
  enabled: boolean
): void {
  const pinnedTopRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      pinnedTopRef.current = null;
      return;
    }
    const anchor = anchorRef.current;
    const scroll = findTabContentsScroll(anchor);
    if (!scroll) return;

    const onScroll = () => {
      const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      if (scroll.scrollTop >= max - 48) {
        pinnedTopRef.current = null;
      } else {
        pinnedTopRef.current = scroll.scrollTop;
      }
    };

    scroll.addEventListener("scroll", onScroll, { passive: true });
    return () => scroll.removeEventListener("scroll", onScroll);
  }, [anchorRef, enabled]);

  useEffect(() => {
    if (!enabled || pinnedTopRef.current == null) return;
    const anchor = anchorRef.current;
    const scroll = findTabContentsScroll(anchor);
    if (!scroll) return;
    scroll.scrollTop = pinnedTopRef.current;
  }, [anchorRef, enabled, streamText]);
}
