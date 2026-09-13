/**
 * Title: Remove named exports nothing references
 *
 * Purpose: Deletes whole top-level declarations from the frontend by name, using the
 * TypeScript compiler's own view of the file rather than text matching, so a
 * multi-line constant, a type, a function or one name inside an `export { ... }`
 * list all come out cleanly and nothing half-deleted is left behind.
 *
 * Used for: `node scripts/remove_dead_exports.mjs <list.json>` where the list is
 * `[{ "file": "src/...", "name": "THING" }, ...]`. Pass `--dry` to print what would
 * be removed without writing. Written for the refactor's delete phase; the list
 * comes from `scripts/phase2_map.py` after a whole-project sweep confirms the name
 * appears nowhere else.
 *
 * Solves: Deleting 40 declarations by hand is 40 chances to leave a dangling comma,
 * an orphaned comment, or half a multi-line array.
 *
 * Does not: Decide what is dead. It deletes exactly what it is handed and refuses a
 * name it cannot find, so a stale list fails loudly instead of silently doing nothing.
 * It also does not touch imports elsewhere -- there are none, which is why the name
 * was on the list.
 */

import { readFileSync } from "node:fs";
import { Project } from "ts-morph";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const listPath = args.find((a) => !a.startsWith("--"));
if (!listPath) {
  console.error("usage: node scripts/remove_dead_exports.mjs <list.json> [--dry]");
  process.exit(2);
}

const targets = JSON.parse(readFileSync(listPath, "utf8"));
const project = new Project({ tsConfigFilePath: "tsconfig.json" });

/**
 * Remove a statement without taking the file's header with it.
 *
 * ts-morph counts a leading comment block as part of the statement it sits above.
 * When that statement is the file's first import, removing it silently deletes the
 * file header too -- which is exactly what happened to chatPanelScroll.ts on the
 * first run of this script. If the statement is the first thing in the file and
 * carries a block comment, the comment is put back before it goes.
 */
function removeStatementKeepingItsHeader(statement, source) {
  const isFirst = statement.getPos() === 0 || source.getStatements()[0] === statement;
  const leading = statement.getLeadingCommentRanges().map((r) => r.getText());
  statement.remove();
  if (isFirst && leading.length) {
    source.insertText(0, leading.join("\n") + "\n");
    console.log("    (kept the file header that sat above it)");
  }
}

let removed = 0;
const missing = [];

for (const { file, name } of targets) {
  const source = project.getSourceFile(file);
  if (!source) {
    missing.push(`${file}: not in the project`);
    continue;
  }

  // A name can be exported four ways. Try each, most common first.
  const variable = source.getVariableDeclaration(name);
  const func = source.getFunction(name);
  const iface = source.getInterface(name);
  const alias = source.getTypeAlias(name);
  const enumDecl = source.getEnum(name);
  const classDecl = source.getClass(name);

  let done = false;
  if (variable) {
    // Remove the whole `const X = ...` statement when X is the only name on it.
    const statement = variable.getVariableStatement();
    if (statement && statement.getDeclarations().length === 1) {
      statement.remove();
    } else {
      variable.remove();
    }
    done = true;
  } else if (func) {
    func.remove();
    done = true;
  } else if (iface) {
    iface.remove();
    done = true;
  } else if (alias) {
    alias.remove();
    done = true;
  } else if (enumDecl) {
    enumDecl.remove();
    done = true;
  } else if (classDecl) {
    classDecl.remove();
    done = true;
  } else {
    // The name is only re-exported in an `export { A, B }` list.
    for (const decl of source.getExportDeclarations()) {
      const spec = decl.getNamedExports().find((s) => s.getName() === name);
      if (spec) {
        spec.remove();
        if (decl.getNamedExports().length === 0) decl.remove();
        done = true;
        break;
      }
    }
    // Or it is an import that only the removed code used. Dropping the last name
    // from an import means dropping the whole statement, or the file keeps a
    // side-effect import it never had.
    if (!done) {
      for (const decl of source.getImportDeclarations()) {
        const spec = decl.getNamedImports().find((s) => s.getName() === name);
        const isDefault = decl.getDefaultImport()?.getText() === name;
        if (!spec && !isDefault) continue;

        const lastNamed = decl.getNamedImports().length <= 1 && !decl.getNamespaceImport();
        const removingWholeStatement = spec
          ? lastNamed && !decl.getDefaultImport()
          : lastNamed && decl.getNamedImports().length === 0;

        if (removingWholeStatement) {
          removeStatementKeepingItsHeader(decl, source);
        } else if (spec) {
          spec.remove();
        } else {
          decl.removeDefaultImport();
        }
        done = true;
        break;
      }
    }
  }

  if (done) {
    removed += 1;
    console.log(`  removed ${name} from ${file}`);
  } else {
    missing.push(`${file}: no declaration named ${name}`);
  }
}

if (missing.length) {
  console.error(`\nRefusing to save. ${missing.length} name(s) could not be found:`);
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}

if (dry) {
  console.log(`\n${removed} declaration(s) would be removed. Nothing written (--dry).`);
} else {
  await project.save();
  console.log(`\n${removed} declaration(s) removed and saved.`);
}
