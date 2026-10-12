/**
 * Title: What the Search tab has to search
 *
 * Purpose: Loads the lists the tab searches and keeps them fresh: every question from the saved chats
 * (contract C6) and every note the person kept (C3), read when the tab opens and again each time an answer
 * finishes (a new question has been saved, and a chat may have made a note). It also owns the switch on a
 * note: pressing A flips it at once and asks the back end to save it; a refusal flips it back and tells the
 * person why in the back end's own words.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: Keeps the loading, the refresh rule and the optimistic switch out of the drawing code.
 *
 * Does not: Search anything (searchModel.ts) or draw (the tab's components).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toaster } from "@decky/api";

import { listChatSlotQuestions, listUserNotes, saveUserNote } from "./searchApi";
import { flattenQuestions } from "./searchModel";
import type { SearchQuestion, UserNote } from "./searchTypes";

export type SearchIndex = {
  questions: SearchQuestion[];
  notes: UserNote[];
  /** False until the first read of the chats has come back. */
  chatsLoaded: boolean;
  /** Flip a note's switch, saving it; the switch shows the new state at once and goes back if the save is refused. */
  toggleNote: (id: string) => void;
};

/**
 * In: whether the tab is the one showing (loads on becoming so), and whether an answer is being written
 * (loads again when that ends).
 * Out: the flattened questions, the notes, and the note switch.
 * Can go wrong: a failed read leaves the last list in place rather than blanking the tab.
 */
export function useSearchIndex({ active, isAsking }: { active: boolean; isAsking: boolean }): SearchIndex {
  const [questions, setQuestions] = useState<SearchQuestion[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const alive = useRef(true);
  const notesRef = useRef<UserNote[]>([]);
  notesRef.current = notes;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const [chats, kept] = await Promise.all([listChatSlotQuestions(), listUserNotes()]);
    if (!alive.current) return;
    setQuestions(flattenQuestions(chats));
    setNotes(kept);
    setChatsLoaded(true);
  }, []);

  const wasAsking = useRef(isAsking);
  useEffect(() => {
    const finished = wasAsking.current && !isAsking;
    wasAsking.current = isAsking;
    if (active && finished) void load();
  }, [active, isAsking, load]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const toggleNote = useCallback((id: string) => {
    const current = notesRef.current.find((n) => n.id === id);
    if (!current) return;
    const next = !current.on;
    const set = (on: boolean) => setNotes((all) => all.map((n) => (n.id === id ? { ...n, on } : n)));
    set(next);
    void saveUserNote({ id, on: next }).then((res) => {
      if (!alive.current) return;
      if (res.ok) {
        setNotes((all) => all.map((n) => (n.id === id ? res.note : n)));
        return;
      }
      set(!next);
      toaster.toast({ title: "Notes", body: res.error, duration: 3000 });
    });
  }, []);

  return { questions, notes, chatsLoaded, toggleNote };
}
