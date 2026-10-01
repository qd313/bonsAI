#!/usr/bin/env bash
# Title: Land one helper branch
#
# Purpose: Bring one helper's commits onto the working branch in the shared checkout, one commit at a
# time, and prove the result is sound before the next helper lands: regenerate the generated files, then
# run the five gates and the wider quick check.
#
# Used for: every landing in a bug or feature wave (docs/agents/bug-wave-runbook.md). The one running the
# session starts it in the background after reading the helper's change, and reads the log it writes.
#
# Solves: this script was rewritten in a scratch folder every night (plans 76 and 77 used the same one,
# byte for byte). Plan 77 landed 26 changes with it, every one green on the five gates, and only at the
# end found the wider quick check red on five things the gates never run. That check is now a step here.
# The build is retried once, because it fails now and then on a version file another process holds for
# a moment.
#
# Does not: decide whether a change should land (read the diff first), resolve a real conflict (it stops
# and leaves the cherry-pick open), edit the roadmap or testing documents, deploy, or push.
#
# Usage: scripts/land_lane.sh <branch> <base-commit> <log-dir> [working-branch]
#   <branch>          the helper's branch, e.g. refactor/p78a
#   <base-commit>     the tip the helper's copy was cut from; base..branch is what lands
#   <log-dir>         where land-<branch>.log is written (the session's scratch folder)
#   [working-branch]  defaults to experimental
# Set LAND_COAUTHOR to the model running the session, e.g. "Claude Opus 5.5 <noreply@anthropic.com>".
# Exit codes: 1 a precondition failed, 2 a real conflict (cherry-pick left open), 3 a gate failed.
set -u
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BR="${1:?branch}"; BASE="${2:?base commit}"; LOGDIR="${3:?log dir}"; WORK="${4:-experimental}"
COAUTHOR="${LAND_COAUTHOR:-Claude Opus 5.5 <noreply@anthropic.com>}"
LOG="$LOGDIR/land-$(echo "$BR" | tr '/' '-').log"
cd "$REPO" || exit 1
exec > "$LOG" 2>&1
echo "== land $BR from $BASE onto $WORK at $(date)"
[ "$(git rev-parse --abbrev-ref HEAD)" = "$WORK" ] || { echo "NOT ON $WORK"; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "TREE NOT CLEAN"; git status --short; exit 1; }
git merge-base --is-ancestor "$BASE" "$BR" || { echo "BASE $BASE IS NOT AN ANCESTOR OF $BR"; exit 1; }

# Generated files clash on almost every landing. The working branch's side is taken and they are
# regenerated below, so a clash in them is never a real one.
GEN='packages/bonsai-mcp/knowledge/architecture/|docs/code-map.md|src/types/rpcMethods.ts'
for c in $(git rev-list --reverse "$BASE..$BR"); do
  echo "-- pick $(git log --oneline -1 "$c")"
  if ! git cherry-pick "$c"; then
    bad=$(git diff --name-only --diff-filter=U)
    other=$(echo "$bad" | grep -Ev "$GEN")
    if [ -n "$other" ]; then
      echo "REAL CONFLICT: $other"
      echo "The cherry-pick is left open. Resolve by hand, continue it, then run this script again."
      exit 2
    fi
    for f in $bad; do git checkout --ours -- "$f"; git add "$f"; done
    GIT_EDITOR=true git cherry-pick --continue || { echo "CONTINUE FAILED"; exit 2; }
  fi
done

echo "== regenerate generated files"
node packages/bonsai-mcp/scripts/sync-architecture-for-commit.mjs && python scripts/py_import_graph.py && python scripts/code_map.py
git add -- packages/bonsai-mcp/knowledge/architecture docs/code-map.md src/types/rpcMethods.ts
if ! git diff --cached --quiet; then
  git commit -q -m "Regenerate the architecture files after landing $BR

Co-Authored-By: $COAUTHOR" && echo "REGEN COMMITTED"
fi

echo "== gates"
npx tsc --noEmit && echo "TSC OK" || { echo "TSC FAIL"; exit 3; }
npm test 2>&1 | tail -15; [ "${PIPESTATUS[0]}" -eq 0 ] && echo "TEST OK" || { echo "TEST FAIL"; exit 3; }
npm run test:py 2>&1 | tail -8; [ "${PIPESTATUS[0]}" -eq 0 ] && echo "PY OK" || { echo "PY FAIL"; exit 3; }
build_ok=1
npm run build 2>&1 | tail -5; [ "${PIPESTATUS[0]}" -eq 0 ] || build_ok=0
if [ "$build_ok" -eq 0 ]; then
  echo "BUILD FAILED ONCE, retrying (a locked version file is the usual cause)"
  sleep 5
  npm run build 2>&1 | tail -12; [ "${PIPESTATUS[0]}" -eq 0 ] && build_ok=1
fi
[ "$build_ok" -eq 1 ] && echo "BUILD OK" || { echo "BUILD FAIL"; exit 3; }
node scripts/check-focus-patterns.mjs 2>&1 | tail -5; [ "${PIPESTATUS[0]}" -eq 0 ] && echo "FOCUS OK" || { echo "FOCUS FAIL"; exit 3; }
python scripts/verify.py --quick 2>&1 | tail -30; [ "${PIPESTATUS[0]}" -eq 0 ] && echo "QUICK OK" || { echo "QUICK FAIL"; exit 3; }
git status --short | head
echo "== LANDED $BR, tip $(git rev-parse --short HEAD) at $(date)"
