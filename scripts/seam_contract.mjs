/**
 * Title: Seam contract printer
 *
 * Purpose: Print the type a function currently returns, one property per line, so it can be
 *          pasted into an explicit interface and frozen.
 * Used for: Phase 4 of the round-two refactor, which freezes a contract at every seam before
 *           any lane moves code behind it.
 * Solves: A hook that hands back 52 things has no written-down shape, so a split can quietly
 *         drop or rename one of them. Writing the shape out by hand is slow and gets it wrong.
 * Does not: Write any file. It prints; a person reads it, edits it, and commits the result.
 *
 * usage: node scripts/seam_contract.mjs <file> <exportedFunctionName>
 *        node scripts/seam_contract.mjs <file> <exportedTypeName> --type
 *
 * --type prints the properties of an exported type instead of what a function returns.
 * Needed because several seams are declared as a type derived from something else
 * (React.ComponentProps<...>, Omit<...>), which documents the shape without holding it
 * still: it follows whatever the thing it is derived from does.
 */

import { Project } from "ts-morph";

const [filePath, functionName] = process.argv.slice(2);
if (!filePath || !functionName) {
  console.error("usage: node scripts/seam_contract.mjs <file> <exportedFunctionName>");
  process.exit(2);
}

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const source = project.getSourceFile(filePath);
if (!source) {
  console.error(`not in the project: ${filePath}`);
  process.exit(2);
}

const wantType = process.argv.includes("--type");

let returned;
let label;
if (wantType) {
  const alias = source.getTypeAlias(functionName) ?? source.getInterface(functionName);
  if (!alias) {
    console.error(`no exported type named ${functionName} in ${filePath}`);
    process.exit(2);
  }
  returned = alias.getType();
  label = `accepted by ${functionName}`;
} else {
  const fn = source.getFunction(functionName);
  if (!fn) {
    console.error(`no exported function named ${functionName} in ${filePath}`);
    process.exit(2);
  }
  returned = fn.getReturnType();
  label = `returned by ${functionName}`;
}

const props = returned.getProperties();
console.log(`// ${props.length} properties ${label}`);
for (const prop of props) {
  const decl = prop.getValueDeclaration() ?? prop.getDeclarations()[0];
  const type = decl ? prop.getTypeAtLocation(decl) : null;
  const text = type ? type.getText(decl) : "unknown";
  console.log(`  ${prop.getName()}: ${text};`);
}
