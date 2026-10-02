/**
 * Title: Knowledge base button label
 *
 * Purpose: The small icon-then-words content inside the knowledge-base section's action buttons
 * ("Update knowledge base", "Remove"), spaced the same way on each.
 *
 * Used for: KnowledgeBaseSection, inside its Download/Update and Remove buttons.
 *
 * Solves: Both buttons were text only while the buttons around them carry an icon; one shared
 * piece keeps the icon size and the gap identical on the two.
 *
 * Does not: Handle clicks or focus; the button around it does. The words are passed in
 * unchanged, so anything that finds a button by its text still finds it.
 *
 * How it works: a row with the icon first, a 6 px gap, then the label text.
 */
import React from "react";

export const KnowledgeBaseButtonLabel: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    {icon}
    {children}
  </span>
);
