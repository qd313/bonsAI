import React from "react";

import { buildPullModelsStylesheet } from "../styles/bonsaiScopeStylesheet";

export type BonsaiModalScopeProps = {
  children: React.ReactNode;
  className?: string;
  shellRef?: React.RefObject<HTMLDivElement | null>;
};

/** Injects scoped Pull Models CSS for content rendered via Decky `showModal()` (outside QAM `.bonsai-scope`). */
export function BonsaiModalScope({ children, className, shellRef }: BonsaiModalScopeProps) {
  const mergedClass = ["bonsai-scope", className].filter(Boolean).join(" ");
  return (
    <div ref={shellRef} className={mergedClass}>
      <style>{buildPullModelsStylesheet()}</style>
      {children}
    </div>
  );
}
