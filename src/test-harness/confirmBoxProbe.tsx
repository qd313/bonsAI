/**
 * Title: Test helper: draw a two-button confirm box and press its buttons
 *
 * Purpose: The plugin's "are you sure?" boxes are the shared TwoButtonConfirmModal (Cancel first, the
 * action beside it). A test about one of them opens it the way the plugin does, catches the element the
 * plugin hands to showModal, and gives it to this helper, which draws it and reads the buttons off the
 * page, so a test checks what a person sees (which buttons, in which order) rather than what props were
 * passed. The test must have @decky/ui replaced by the fake in fakeDeckyUi.tsx so the box's Button,
 * Focusable and ModalRoot are drawn.
 *
 * Used for: the tests of the boxes the Settings tab, the download notice, the knowledge base section and
 * the AI models screen open.
 *
 * Does not: open a real Steam box, or model where the ring lands (the box's own test and the Deck row do).
 * B is pressed through the element's own onCancel, which the box hands to ModalRoot unchanged.
 */
import type { ReactElement } from "react";
import { fireEvent, render } from "@testing-library/react";

export type DrawnConfirmBox = {
  /** The button labels in the order Steam would walk them; Steam puts the ring on the first. */
  labels: string[];
  /** The title the box was given. */
  title: string;
  /** Everything the box shows as text (title, words, buttons). */
  text: string;
  /** A on the first button (Cancel). */
  pressCancel: () => void;
  /** A on the second button (the action). */
  pressAction: () => void;
  /** B. */
  pressB: () => void;
  unmount: () => void;
};

/** In: the element the plugin passed to showModal. Out: the drawn box. */
export function drawConfirmBox(element: unknown): DrawnConfirmBox {
  const el = element as ReactElement<{ title: string; onCancel: () => void }>;
  const view = render(el);
  const buttons = Array.from(view.container.querySelectorAll("button"));
  return {
    labels: buttons.map((b) => b.textContent ?? ""),
    title: el.props.title,
    text: view.container.textContent ?? "",
    pressCancel: () => void fireEvent.click(buttons[0]!),
    pressAction: () => void fireEvent.click(buttons[1]!),
    pressB: () => el.props.onCancel(),
    unmount: view.unmount,
  };
}
