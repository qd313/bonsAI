/**
 * Title: Model routing order modal
 *
 * Purpose: The full-screen list reached from the Ollama tab's "Set text
 * model try order" and "Set vision model try order" buttons. It shows every
 * installed model as a row, each with its own Up and Down buttons, so you
 * can set the order bonsAI tries them in when it needs an answer — no
 * dragging, since that does not work well with a D-pad. Rows blocked by
 * your current policy tier, or by the high-VRAM setting, stay in the list
 * greyed out rather than disappearing, so you can see why a model is being
 * skipped instead of wondering where it went.
 *
 * Used for: The Ollama tab's advanced model routing, when someone wants to
 * change which installed model gets tried first, second, and so on.
 *
 * Solves: A D-pad-friendly way to reorder a list, in a modal a person can
 * actually back out of with B.
 *
 * Does not: Download models or save the new order itself. The catalog and
 * installed list are handed in by the caller, and the caller is the one
 * that saves the order once Done is pressed.
 *
 * Gotchas:
 * - This has to be built on Steam's own ConfirmModal chrome, not a bare
 *   custom screen — that is what actually lets B back out of it. An
 *   earlier bare-content version could not be backed out of no matter how
 *   many times B was pressed.
 * - Moving a row's focus back onto it after a reorder has to be delayed
 *   slightly and done in two steps. Doing it immediately, in the same
 *   press that triggered the reorder, stole part of that very press and
 *   made it fall through to the modal's own OK instead — closing and
 *   saving the list by accident.
 * - Up and Down on the D-pad only step through the rows to read them; they
 *   were deliberately never wired to reorder anything. That used to be how
 *   reordering worked, and a person just scrolling down the list to read
 *   it would silently rewrite the order — three presses moved four models.
 *   Reordering only happens through each row's own Up/Down buttons.
 * - Every row button calls preventDefault() on click. The list lives
 *   inside Steam's modal, which renders as an HTML form, so an unprevented
 *   click submits that form and closes the whole picker instead of moving
 *   one row.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ConfirmModal, Focusable } from "@decky/ui";
import type { ModelPolicyTierId } from "../data/modelPolicy";
import type { PullModelEntry } from "../data/pullModelCatalog";
import { BonsaiModalScope } from "./BonsaiModalScope";
import { elementHasFocus } from "../utils/uiDocument";
import type { NavRefHolder } from "../utils/navFocusRegistry";
import {
  buildPickerOrder,
  DEFAULT_TEXT_ROUTING_SEED,
  DEFAULT_VISION_ROUTING_SEED,
  isHighVramTag,
  isVisionCapableTag,
  licenseClassAllowed,
  modelSizeWarning,
} from "../utils/modelRoutingOrder";

type RowMoveDirection = "up" | "down";
export type RowButtonRefs = Partial<Record<RowMoveDirection, HTMLElement | null>>;

/*
 * Device rerun 2026-09-04 (PICKER-REORDER-02, build 49241e7) found the first fix's plain `.focus()`
 * insufficient: the picker is a `ModalDialogOverlay`, rows are keyed by tag, and React relocating the
 * *focused* row's DOM node during the reorder reads to Steam's focus manager as that node going away
 * -- it fell back to a hidden Ollama tab button behind the picker rather than following the move.
 * `takeRowFocus` below is Steam's own transfer instead, the same one `PresetRowFocusRoot`
 * (MainTabPresetAnimatedChips.tsx) uses to hand the ring into the carousel from outside it.
 *
 * A same-day addendum found worse: calling that transfer synchronously, in the same effect that ran
 * right after the reorder committed, stole the release half of the very A press that triggered the
 * reorder -- Steam's own press/release bookkeeping (roughly an 80ms hold, per the working theory)
 * lost track of what it was activating and fell through to the ConfirmModal's default OK, so the
 * press that was supposed to move the highlight instead saved and closed the picker. `moveAndKeepHighlight`
 * now defers the whole transfer past that window (`REORDER_FOCUS_TRANSFER_DELAY_MS`) before calling
 * either of the two functions below, and `focusRowButton` waits one more tick after `takeRowFocus`
 * -- the same two-step `onEnterFromOutside` uses (Steam's transfer needs a tick to land before an
 * in-container `focus()` is safe on top of it).
 */
export const REORDER_FOCUS_TRANSFER_DELAY_MS = 150;

/**
 * Steam's own transfer onto the moved row's container. Needed because a plain `.focus()` on the
 * button does not hold the ring here even though both rows stay inside one list `Focusable` -- see
 * the block comment above. Swallows a throw the same way `takeNavFocus` (navFocusRegistry.ts) does;
 * `focusRowButton` still runs next either way.
 */
export function takeRowFocus(holder: NavRefHolder | undefined): void {
  try {
    holder?.current?.TakeFocus?.(true);
  } catch {
    /* best-effort; focusRowButton below still runs */
  }
}

/**
 * In-container focus on the moved row's same-direction button, called after `takeRowFocus` has put
 * Steam's ring on the row itself -- safe as a plain `.focus()` at that point because both buttons are
 * the row's direct siblings. Falls back to the row's other button when the same-direction one is now
 * disabled (the row landed at an end): a disabled button refuses DOM focus, so `elementHasFocus`
 * catches that rather than re-deriving the edge condition the `disabled` prop already encodes.
 */
export function focusRowButton(refs: RowButtonRefs | undefined, dir: RowMoveDirection): void {
  if (!refs) return;
  const primary = dir === "up" ? refs.up : refs.down;
  const secondary = dir === "up" ? refs.down : refs.up;
  primary?.focus();
  if (!elementHasFocus(primary ?? null)) secondary?.focus();
}

export type ModelRoutingOrderKind = "text" | "vision";

export type ModelRoutingOrderModalProps = {
  kind: ModelRoutingOrderKind;
  installedTags: string[];
  catalogByTag: Map<string, PullModelEntry>;
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
  savedOrder: string[];
  onSave: (order: string[]) => void | Promise<void>;
  onClose: () => void;
};

type RowMeta = {
  tag: string;
  tierBlocked: boolean;
  highVramInactive: boolean;
  /** "unknown" when the model is not on the known-heavy list and has no listed size at all --
   *  warns without excluding the row, unlike `highVramInactive`. See `modelSizeWarning`. */
  sizeUnknown: boolean;
  visionUnknown: boolean;
  sizeGb?: number;
};

/**
 * The whole modal: the instructions line, the reorderable row list, and the
 * Reset button — Done/Cancel come from ConfirmModal's own footer.
 *
 * In: which list this is (text or vision), the installed models and their
 * catalog entries, the current policy tier and VRAM settings (used only to
 * decide which rows show as blocked), the saved order to start from, and
 * callbacks to save the new order or close without saving.
 * Out: the ConfirmModal with this picker as its body.
 *
 * What can go wrong: nothing here talks to the backend — onSave is just
 * handed the reordered list of tags, and saving it is the caller's job.
 *
 * 1. Build the starting order with buildPickerOrder(), then keep it in
 *    local state (order) until Done is pressed.
 * 2. For each tag in that order, work out whether it should show as
 *    blocked — by policy tier, by the high-VRAM setting, or, for the
 *    vision list, because its vision support is not confirmed.
 * 3. move() swaps a row with its neighbour; moveAndKeepHighlight() calls it
 *    and then, after the delay described above, hands the D-pad ring back
 *    to the row that moved.
 * 4. onReset() rebuilds the order from the model's own default seed list,
 *    filtered to only the models actually installed.
 * 5. Draw the row list, each row's Up/Down buttons wired to move() through
 *    moveAndKeepHighlight(), and the Reset button below it.
 */
export function ModelRoutingOrderModal({
  kind,
  installedTags,
  catalogByTag,
  modelPolicyTier,
  modelPolicyNonFossUnlocked,
  modelAllowHighVramFallbacks,
  savedOrder,
  onSave,
  onClose,
}: ModelRoutingOrderModalProps) {
  const initial = useMemo(
    () => buildPickerOrder(kind, installedTags, savedOrder),
    [kind, installedTags, savedOrder],
  );
  const [order, setOrder] = useState<string[]>(initial);

  const rows: RowMeta[] = useMemo(
    () =>
      order.map((tag) => {
        const entry = catalogByTag.get(tag);
        const sizeGb = entry?.sizeGb;
        const tierBlocked = !licenseClassAllowed(
          entry?.licenseClass,
          modelPolicyTier,
          modelPolicyNonFossUnlocked,
        );
        const highVramInactive =
          !modelAllowHighVramFallbacks && isHighVramTag(tag, sizeGb);
        const sizeUnknown = modelSizeWarning(tag, sizeGb) === "unknown";
        const visionUnknown =
          kind === "vision" && !entry?.tags.includes("vision") && isVisionCapableTag(tag, entry);
        return { tag, tierBlocked, highVramInactive, sizeUnknown, visionUnknown, sizeGb };
      }),
    [order, catalogByTag, modelPolicyTier, modelPolicyNonFossUnlocked, modelAllowHighVramFallbacks, kind],
  );

  const move = useCallback((index: number, delta: number) => {
    setOrder((prev) => {
      const next = index + delta;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return copy;
    });
  }, []);

  // Row buttons and row nav nodes, both keyed by tag, so the ring can be put back on the moved
  // row's own button after a reorder -- see the block comment above `takeRowFocus`.
  const rowButtonRefs = useRef(new Map<string, RowButtonRefs>());
  const rowNavRefs = useRef(new Map<string, NavRefHolder>());
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setRowButtonRef = useCallback((tag: string, dir: RowMoveDirection, el: HTMLElement | null) => {
    const entry = rowButtonRefs.current.get(tag) ?? {};
    entry[dir] = el;
    rowButtonRefs.current.set(tag, entry);
  }, []);

  /** Steam populates `.current` once the row's Focusable mounts and registers as a nav node. */
  const getRowNavRefHolder = useCallback((tag: string): NavRefHolder => {
    let holder = rowNavRefs.current.get(tag);
    if (!holder) {
      holder = { current: null };
      rowNavRefs.current.set(tag, holder);
    }
    return holder;
  }, []);

  const moveAndKeepHighlight = useCallback(
    (tag: string, index: number, delta: number, dir: RowMoveDirection) => {
      move(index, delta);
      window.setTimeout(() => {
        if (!isMountedRef.current) return;
        takeRowFocus(rowNavRefs.current.get(tag));
        window.setTimeout(() => {
          if (!isMountedRef.current) return;
          focusRowButton(rowButtonRefs.current.get(tag), dir);
        }, 0);
      }, REORDER_FOCUS_TRANSFER_DELAY_MS);
    },
    [move],
  );

  const onReset = useCallback(() => {
    const seed = kind === "vision" ? DEFAULT_VISION_ROUTING_SEED : DEFAULT_TEXT_ROUTING_SEED;
    const instSet = new Set(installedTags);
    const head = seed.filter((t) => instSet.has(t));
    let tail = installedTags.filter((t) => !head.includes(t));
    if (kind === "vision") tail = tail.filter((t) => isVisionCapableTag(t, catalogByTag.get(t)));
    setOrder([...head, ...tail]);
  }, [kind, installedTags, catalogByTag]);

  const title = kind === "vision" ? "Vision model try order" : "Text model try order";

  return (
    /*
      `ConfirmModal` supplies the title bar, the Done/Cancel footer, and -- the reason this is not
      cosmetic -- B. Rendering bare content inside `BonsaiModalScope` was what made this the one
      fullscreen picker you could not back out of: measured on device 2026-08-28, three B presses
      from a row button and three more from the footer, modal still open every time. Every picker
      that does close on B goes through here: `OllamaModelsHubModal`, `PullModelsModal`,
      `CharacterPickerModal`. That same difference is why the chrome never matched them either.
    */
    <ConfirmModal
      strTitle={title}
      strOKButtonText="Done"
      strCancelButtonText="Cancel"
      onOK={() => {
        // Pressing Done without ever touching a row's Up/Down still rewrote the settings file --
        // measured on the Deck 2026-09-17 (docs/test-evidence/plan57-QA-vision-try-order-writes-
        // settings.json): the file's checksum and save time both changed with only one model
        // listed and nothing pressed but Done. onSave used to run unconditionally here; now it
        // only runs when the order actually differs from what the picker opened with.
        const changed =
          order.length !== initial.length || order.some((tag, i) => tag !== initial[i]);
        if (!changed) {
          onClose();
          return;
        }
        void Promise.resolve(onSave(order)).then(() => onClose());
      }}
      onCancel={onClose}
      strDescription={
        <BonsaiModalScope className="bonsai-model-routing-modal">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, textAlign: "left" }}>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.4 }}>
              Installed models only. Use a row's <strong>Up</strong> and <strong>Down</strong> buttons to set the try order.
              Grayed models stay in the list but are skipped at Ask time when blocked by tier or high-VRAM policy.
            </div>
            <Focusable
              className="bonsai-model-routing-list"
              flow-children="vertical"
              style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "52vh", overflowY: "auto" }}
            >
              {/*
                Rows deliberately do NOT handle onMoveUp/onMoveDown. They used to, and reordering was
                bound to them, so on a controller Down moved the *model* instead of the highlight: a
                user scrolling to read the list silently rewrote it (measured on device 2026-08-28 --
                three presses reordered four models). The handlers also called `.focus()` on the
                neighbouring row, a plain DOM focus, which is not how Steam moves its ring -- after
                each reorder nothing owned `gpfocus` at all and even B stopped closing the modal.

                Reordering belongs to each row's Up/Down buttons, which already do it on A and are
                already labelled for a screen reader. Locked as D36 option 1. If reordering ever needs
                to be faster than "move right, press A", add an explicit grab mode -- do not put it
                back on the navigation keys.
              */}
              {rows.map((row, index) => {
                const inactive = row.tierBlocked || row.highVramInactive;
                return (
                  <Focusable
                    key={row.tag}
                    className="bonsai-model-routing-row"
                    flow-children="horizontal"
                    /* `navRef` is a real Steam Focusable prop that Decky's types omit -- same gap as
                       `onMoveDown`, so it goes through the cast the repo already uses for those
                       (PresetRowFocusRoot, ChatSlotRow, TabIndicatorBar). */
                    {...({ navRef: getRowNavRefHolder(row.tag) } as Record<string, unknown>)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      opacity: inactive ? 0.55 : 1,
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 12, color: "#e2e8f0", minWidth: 0, wordBreak: "break-word" }}>
                      {row.tag}
                    </span>
                    {row.tierBlocked ? (
                      <span style={{ fontSize: 10, color: "#f0b4b4" }}>Tier blocked</span>
                    ) : null}
                    {row.highVramInactive ? (
                      <span style={{ fontSize: 10, color: "#c9b896" }}>High VRAM off</span>
                    ) : null}
                    {row.sizeUnknown ? (
                      <span style={{ fontSize: 10, color: "#c9b896" }}>Size unknown — may be too large</span>
                    ) : null}
                    {row.visionUnknown ? (
                      <span style={{ fontSize: 10, color: "#9fb7d5" }}>Vision unverified</span>
                    ) : null}
                    <Button
                      className="bonsai-chat-secondary-btn"
                      disabled={index === 0}
                      onClick={(e: MouseEvent) => {
                        // Decky's Button renders a plain <button> with no type, and this picker's
                        // content sits inside Steam's ConfirmModal, which renders a <form> -- so an
                        // un-prevented click submits it, taking the modal's own OK path. Measured on
                        // device 2026-09-04 (PICKER-REORDER-02): A on this button reordered the row
                        // and then closed the picker; A on Reset did the same, which is what pinned
                        // form submission as the cause rather than the reorder or the refocus.
                        e.preventDefault();
                        moveAndKeepHighlight(row.tag, index, -1, "up");
                      }}
                      aria-label={`Move ${row.tag} up`}
                      ref={(el: HTMLElement | null) => setRowButtonRef(row.tag, "up", el)}
                    >
                      Up
                    </Button>
                    <Button
                      className="bonsai-chat-secondary-btn"
                      disabled={index >= rows.length - 1}
                      onClick={(e: MouseEvent) => {
                        // See the Up button's comment: preventDefault stops the click from also
                        // submitting the ConfirmModal's form.
                        e.preventDefault();
                        moveAndKeepHighlight(row.tag, index, 1, "down");
                      }}
                      aria-label={`Move ${row.tag} down`}
                      ref={(el: HTMLElement | null) => setRowButtonRef(row.tag, "down", el)}
                    >
                      Down
                    </Button>
                  </Focusable>
                );
              })}
            </Focusable>
            {/* Done and Cancel now come from ConfirmModal's own footer. Reset stays here because it
                edits the list rather than closing the picker, and belongs next to what it edits. */}
            <Focusable className="bonsai-model-routing-footer" flow-children="horizontal" style={{ display: "flex", gap: 8 }}>
              <Button
                className="bonsai-chat-secondary-btn"
                onClick={(e: MouseEvent) => {
                  // Same form-submit hazard as the row buttons above -- Reset closed the picker on
                  // device too, which is what showed the cause was the form, not the reorder.
                  e.preventDefault();
                  onReset();
                }}
              >
                Reset to defaults
              </Button>
            </Focusable>
          </div>
        </BonsaiModalScope>
      }
    />
  );
}
