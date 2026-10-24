/**
 * Title: Image import types
 *
 * Purpose: Tells TypeScript what a line like `import icon from "./icon.svg"`
 * actually hands back. Without this, TypeScript does not know what a .svg,
 * .png, or .jpg file is, and refuses to build any file that imports one.
 *
 * Used for: Every file in the plugin that imports an image directly, such
 * as an icon drawn on a button.
 *
 * Solves: TypeScript only understands code files on its own — an image
 * needs to be described explicitly as "you can import this, and what you
 * get back is a string" (the bundler turns the actual image into a URL or
 * embedded data string at build time).
 *
 * Does not: Run anything, or affect what ships. This file exists only for
 * the TypeScript checker; nothing in it executes.
 */
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}
