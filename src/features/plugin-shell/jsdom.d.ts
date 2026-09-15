/**
 * Title: Just enough types for the "jsdom" test package
 *
 * Purpose: Two tests build a second, separate web page in memory (using the
 * "jsdom" package) to reproduce a bug that only shows up when checking a
 * focused element with `instanceof` across two different documents. The
 * "jsdom" package does not ship its own type information, and this project
 * has not installed the separate types package for it either, so without
 * this file TypeScript cannot check the one piece of "jsdom" those tests
 * actually use — the `JSDOM` constructor. This file writes out just that
 * one shape.
 *
 * Used for: useHiddenTabHeaderTrap.test.tsx and TabIndicatorBar.test.tsx,
 * which both build one of these separate documents to reproduce a device
 * finding: a focus check written as `instanceof` against the browser's own
 * built-in element type quietly fails when the element came from a
 * different document than the one running the check.
 *
 * Solves: Without this file, TypeScript's own check (`tsc --noEmit`) fails
 * with "Could not find a declaration file for module 'jsdom'" wherever a
 * test imports it.
 *
 * Does not: Describe anything else the "jsdom" package can do — only the
 * one constructor these two tests use. Add to this only as more of the
 * package gets used from a test; do not widen it to accept anything, for
 * convenience, instead.
 */
declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string);
    readonly window: {
      readonly document: Document;
      close(): void;
    };
  }
}
