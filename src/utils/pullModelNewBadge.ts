/**
 * Title: Pull models "New" badge history
 *
 * Purpose: Computes and answers questions about the client-side record of when each installed
 * model tag was first seen, which the Pull Models screen uses to badge a recently-pulled model
 * "New" for 30 days.
 *
 * Used for: PullModelsModal, which owns the actual localStorage read/write and calls
 * computeUpdatedPullRecord() after every connection-test refresh and isRecentPullModelTag() while
 * rendering each row.
 *
 * Solves: nothing on the back end ever records when a model was pulled, so this keeps that one
 * small piece of history client-side instead of teaching the back end a new history file, and
 * keeps the "first run must not badge everything New" rule in one place with the record math it
 * protects.
 *
 * Does not: touch localStorage itself, or know the storage key — PullModelsModal.tsx does both;
 * this file only computes the updated record and answers "is this tag recent."
 *
 * Gotchas:
 * - A fresh install must not badge every already-installed model "New": the first time this ever
 *   runs in a browser every currently installed tag is seeded as already-old rather than "just
 *   pulled". Only a tag that appears installed on a *later* run, with no prior record, is genuinely
 *   new.
 *
 *   **An empty record counts as that first run, and that is not a nicety.** Measured on the Deck
 *   2026-09-05 (PULL-NEW-BADGE-01): all four already-installed models were stamped with today's
 *   date and would have worn a "New" label for a month. The modal renders once before the
 *   connection test answers, so the first pass has an *empty* installed set and persisted `{}`.
 *   The second pass — the one that actually has the tags — then read a non-null record, concluded
 *   it was not a first run, and stamped every pre-existing model as just pulled. Testing only
 *   `storedRecord === null` cannot see that, because by then the key exists.
 *
 *   The accepted consequence, on a Deck with **no** models at all: the very first model pulled is
 *   not badged New, because a flat tag-to-timestamp record cannot tell "never looked" from "looked
 *   and there was nothing". A missing badge once on an empty Deck is a far better failure than
 *   every model on a full one wearing it for thirty days.
 */
export type PullModelPullRecord = Record<string, number>;
export const PULL_MODEL_NEW_BADGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function computeUpdatedPullRecord(
  installedTags: ReadonlySet<string>,
  storedRecord: PullModelPullRecord | null,
  now: number
): PullModelPullRecord {
  const next: PullModelPullRecord = { ...(storedRecord ?? {}) };
  const isFirstRunEver = storedRecord === null || Object.keys(storedRecord).length === 0;
  for (const tag of installedTags) {
    if (tag in next) continue;
    next[tag] = isFirstRunEver ? now - PULL_MODEL_NEW_BADGE_WINDOW_MS - 1 : now;
  }
  return next;
}

export function isRecentPullModelTag(record: PullModelPullRecord, tag: string, now: number): boolean {
  const seenAt = record[tag];
  if (typeof seenAt !== "number" || !Number.isFinite(seenAt)) return false;
  const age = now - seenAt;
  return age >= 0 && age <= PULL_MODEL_NEW_BADGE_WINDOW_MS;
}
