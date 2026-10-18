import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ReplyCopyButton } from "./ReplyCopyButton";
import { writeClipboardText } from "./clipboardWrite";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));
vi.mock("./clipboardWrite", () => ({
  writeClipboardText: vi.fn(),
}));

describe("ReplyCopyButton", () => {
  it("copies the text getCopyText returns and shows Copied on success", async () => {
    vi.mocked(writeClipboardText).mockResolvedValue(undefined);
    const getCopyText = vi.fn().mockReturnValue("the visible answer");
    render(<ReplyCopyButton getCopyText={getCopyText} />);

    fireEvent.click(screen.getByText("Copy"));

    expect(writeClipboardText).toHaveBeenCalledWith("the visible answer");
    await waitFor(() => expect(screen.getByText("Copied")).toBeTruthy());
  });

  it("shows Copy failed when the clipboard write rejects", async () => {
    vi.mocked(writeClipboardText).mockRejectedValue(new Error("nope"));
    const getCopyText = vi.fn().mockReturnValue("some text");
    render(<ReplyCopyButton getCopyText={getCopyText} />);

    fireEvent.click(screen.getByText("Copy"));

    await waitFor(() => expect(screen.getByText("Copy failed")).toBeTruthy());
  });

  it("shows Copy failed without calling the clipboard when there is no text to copy", async () => {
    const getCopyText = vi.fn().mockReturnValue("   ");
    render(<ReplyCopyButton getCopyText={getCopyText} />);

    fireEvent.click(screen.getByText("Copy"));

    await waitFor(() => expect(screen.getByText("Copy failed")).toBeTruthy());
    expect(writeClipboardText).not.toHaveBeenCalled();
  });

  it("reads copy text fresh at press time rather than a stale prop snapshot", () => {
    vi.mocked(writeClipboardText).mockResolvedValue(undefined);
    let current = "first";
    const getCopyText = vi.fn(() => current);
    render(<ReplyCopyButton getCopyText={getCopyText} />);

    current = "second";
    fireEvent.click(screen.getByText("Copy"));

    expect(writeClipboardText).toHaveBeenCalledWith("second");
  });
});
