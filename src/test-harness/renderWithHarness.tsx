import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

export function renderWithHarness(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, options);
}
