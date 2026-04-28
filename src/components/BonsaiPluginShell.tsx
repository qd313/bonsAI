import React from "react";

import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";

export type BonsaiPluginShellProps = {
  scopeRef: React.RefObject<HTMLDivElement | null>;
  scopeStyle: React.CSSProperties;
  children: React.ReactNode;
};

/** Root layout wrapper: scoped Deck/QAM stylesheet + plugin subtree. */
export const BonsaiPluginShell: React.FC<BonsaiPluginShellProps> = ({ scopeRef, scopeStyle, children }) => (
  <div ref={scopeRef} className="bonsai-scope" style={scopeStyle}>
    <style>{buildBonsaiScopeStylesheet()}</style>
    {children}
  </div>
);
