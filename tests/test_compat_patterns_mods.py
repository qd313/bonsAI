"""
Title: The mods tips
Purpose: Pin the troubleshooting tips about mods (topic "mods", tips 168 onward): that they exist,
         say what they were written to say, stay short, are marked as unconfirmed, never tell a
         person to delete a prefix or a save before a backup step, and are what the Ask actually
         attaches for the Deck check sentence.
Used for: data/kb/compat_patterns.json, plan 103 lane G1; the router words are pinned beside the
          router, in tests/test_compat_topic_router.py (class ModsRoutingTests).
Solves: The tip sheet had 167 tips and none about mods, so "how do I set up mods for Skyrim on my
        Deck" got nothing from it.
Does not: Test routing or ranking against the whole library, and does not need Ollama: the Ask test
          builds a word-search library from the real tips file alone, no meaning-search vectors.
"""

import json
import re
import shutil
import tempfile
import unittest
from pathlib import Path

from backend.knowledge.knowledge_base_service import (
    close_connection,
    resolve_corpus_db_path,
    retrieve_knowledge_context,
    should_retrieve_knowledge,
)
from build_rag_db_loader import load_build_rag_db

REPO_ROOT = Path(__file__).resolve().parents[1]
TIPS_FILE = REPO_ROOT / "data" / "kb" / "compat_patterns.json"
TIPS = json.loads(TIPS_FILE.read_text(encoding="utf-8"))
BY_ID = {int(t["pattern_id"]): t for t in TIPS}

# The first number this lane used: the tips file held 167 tips (ids 1 to 167) when it started.
FIRST_MODS_TIP = 168
MODS_TIPS = [t for t in TIPS if t["topic"] == "mods"]
MODS_TEXT = "\n".join(t["card"] for t in MODS_TIPS).lower()

DECK_CHECK = "how do I set up mods for Skyrim on my Deck"

# A step that destroys a prefix or a save. Matches "delete the prefix", "wipe your saves",
# "remove compatdata", "erase the save folder" and the like.
_DESTROYS = re.compile(
    r"\b(delete|wipe|erase|remove|reset|clear)\b[^.;]{0,40}\b(prefix|compatdata|saves?|save folder)\b",
    re.I,
)
_BACKUP = re.compile(r"\b(copy|back up|backup)\b", re.I)


def destroys_before_backing_up(text: str) -> bool:
    """True when the text tells a person to delete a prefix or a save with no backup step before it.

    A sentence that forbids it ("Never delete a prefix ...") is not such a step.
    """
    for sentence in re.finditer(r"[^.;]+", text):
        step = _DESTROYS.search(sentence.group(0))
        if not step or re.search(r"\b(never|don't|do not|not)\b", sentence.group(0), re.I):
            continue
        before = _BACKUP.search(text)
        if before is None or before.start() > sentence.start() + step.start():
            return True
    return False


class ModsTipsFileTests(unittest.TestCase):
    def test_the_mods_tips_are_numbered_straight_on_from_167(self):
        self.assertEqual([t["pattern_id"] for t in MODS_TIPS], list(range(FIRST_MODS_TIP, FIRST_MODS_TIP + len(MODS_TIPS))))
        self.assertGreaterEqual(len(MODS_TIPS), 15)
        self.assertLessEqual(len(MODS_TIPS), 20)
        # Nothing before 168 was touched by this lane, and no other tip uses the topic.
        self.assertEqual(sorted(BY_ID)[: FIRST_MODS_TIP - 1], list(range(1, FIRST_MODS_TIP)))

    def test_every_mods_tip_is_marked_unconfirmed_short_and_the_maintainers_own_words(self):
        for tip in MODS_TIPS:
            with self.subTest(tip=tip["pattern_id"]):
                self.assertTrue(tip["card"].startswith("Researched, unconfirmed: "))
                self.assertLessEqual(len(tip["card"]), 200)
                self.assertEqual(tip["source_license"], "bonsAI-maintainer")
                self.assertEqual(tip["source_url"], "")
                self.assertNotIn("app_id", tip, "a shared tip, not one game's own")
                self.assertTrue(set(tip["platforms"]) <= {"deck", "linux", "windows"})

    def test_the_tips_name_every_tool_and_place_the_brief_lists(self):
        for needle in (
            "vortex",
            "mod organizer 2",
            "r2modman",
            "workshop",
            "bepinex",
            "smapi",
            "skse",
            "f4se",
            "script extender",
            "cyber engine tweaks",
            "redmod",
            "red4ext",
            "load order",
            "compatdata",
            "appdata",
            "heroic",
            "lutris",
            "anti-cheat",
            "battleye",
            "bonsai cannot see",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, MODS_TEXT)

    def test_where_each_manager_puts_things_is_said_both_ways(self):
        """A manager keeps mods outside the game folder (Mod Organizer 2, r2modman) or inside it (Vortex)."""
        vortex = next(t["card"] for t in MODS_TIPS if t["card"].lower().find("vortex links") >= 0)
        self.assertIn("into the game folder", vortex)
        self.assertIn("Mod Organizer 2's virtual file system", vortex)
        self.assertIn("out of the game folder", vortex)
        r2 = next(t["card"] for t in MODS_TIPS if "r2modman keeps" in t["card"])
        self.assertIn("Start modded", r2)

    def test_the_prefix_and_the_windows_app_data_are_both_named(self):
        card = next(t["card"] for t in MODS_TIPS if "compatdata/<appid>/pfx" in t["card"])
        for needle in ("AppData", "Documents", "steamuser", "On Windows"):
            self.assertIn(needle, card)

    def test_no_tip_deletes_a_prefix_or_a_save_before_a_backup_step(self):
        for tip in MODS_TIPS:
            with self.subTest(tip=tip["pattern_id"]):
                self.assertFalse(destroys_before_backing_up(tip["card"]), tip["card"])

    def test_the_backup_guard_itself_catches_a_delete_first_step(self):
        """Prove the guard by breaking it: these are the shapes it exists to refuse."""
        self.assertTrue(destroys_before_backing_up("If it fails, delete the prefix and try again."))
        self.assertTrue(destroys_before_backing_up("Wipe your saves, then copy them back."))
        self.assertTrue(destroys_before_backing_up("Remove the compatdata folder to reset the game."))
        self.assertFalse(destroys_before_backing_up("Copy the saves somewhere safe, then delete the prefix."))
        self.assertFalse(destroys_before_backing_up("Never delete a prefix or a save as a first step."))

    def test_one_tip_tells_the_person_to_back_up_before_changing_mods(self):
        card = next(t["card"] for t in MODS_TIPS if t["card"].lower().find("before changing mods") >= 0)
        self.assertIn("copy the game's saves", card)
        self.assertIn("compatdata/<appid>", card)

    def test_the_anti_cheat_tip_points_at_the_games_own_rules_and_gives_no_workaround(self):
        card = next(t["card"] for t in MODS_TIPS if "anti-cheat" in t["card"].lower()).lower()
        for needle in ("single-player", "own mod support", "kick you in multiplayer", "battleye", "won't help"):
            self.assertIn(needle, card)
        for word in ("bypass", "disable the anti", "workaround", "banned", "ban "):
            self.assertNotIn(word, card)

    def test_the_anti_cheat_tip_says_a_person_can_be_kicked_in_online_play(self):
        card = next(t["card"] for t in MODS_TIPS if "anti-cheat" in t["card"].lower())
        self.assertIn("kick you in multiplayer", card)
        self.assertIn("block altered files", card)

    def test_the_cyberpunk_script_mods_folder_is_the_mods_folder_under_cyber_engine_tweaks(self):
        card = next(t["card"] for t in MODS_TIPS if ".reds in r6/scripts" in t["card"])
        self.assertIn("bin/x64/plugins/cyber_engine_tweaks/mods", card)

    def test_the_crash_tip_keeps_the_frameworks_on_and_moves_files_instead_of_deleting_them(self):
        card = next(t["card"] for t in MODS_TIPS if "halve again" in t["card"])
        self.assertIn("keep core frameworks", card)
        self.assertIn("Move files aside, don't delete them", card)
        self.assertNotIn("every mod off", card)

    def test_the_script_extender_tip_names_the_extenders_own_site(self):
        card = next(t["card"] for t in MODS_TIPS if "script extender" in t["card"] and "must match" in t["card"])
        self.assertIn("skse.silverlock.org", card)
        self.assertIn("its own site", card)

    def test_the_creations_tip_says_some_items_cost_money(self):
        card = next(t["card"] for t in MODS_TIPS if "Creations screen" in t["card"])
        self.assertIn("some cost Creation Credits", card)

    def test_bonsai_says_it_cannot_see_mods_a_manager_has_not_deployed(self):
        card = next(t["card"] for t in MODS_TIPS if "bonsAI cannot see" in t["card"])
        self.assertIn("deployed", card)
        self.assertIn("Tell it which mods", card)

    def test_the_heroic_and_lutris_caveat_says_their_prefix_is_not_in_steams_compatdata(self):
        card = next(t["card"] for t in MODS_TIPS if "Heroic" in t["card"])
        self.assertIn("not in Steam's compatdata", card)
        self.assertIn("Lutris", card)


class TheAskAttachesAModsTipTests(unittest.TestCase):
    """The Deck's level: the sentence typed, the tip the reply carries.

    P103-MODS-TIPS-01, nothing running: "how do I set up mods for Skyrim on my Deck" attaches a tip
    from the new topic. The library is built from the real tips file with no notes and no
    meaning-search vectors, so the test needs no Ollama; the router decides the topic, the search
    reads the tips.
    """

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        root = Path(cls._tmp.name)
        data_dir = root / "kb_data"
        data_dir.mkdir()
        (data_dir / "strategy_seed.json").write_text(
            json.dumps({"games": [], "aliases": [], "sections": [], "genre_patterns": []}), encoding="utf-8"
        )
        shutil.copy(TIPS_FILE, data_dir / "compat_patterns.json")
        builder = load_build_rag_db()
        builder.KB_DATA_DIR = data_dir
        builder._list_installed_ollama_tags = lambda *args, **kwargs: []  # never reach Ollama
        builder.build_corpus(root / "out", seed=True, allow_missing_embeddings=True)
        cls.settings = {
            "use_local_knowledge_base": True,
            "rag_hybrid_retrieval_enabled": False,
            "rag_corpus_path": str(root / "out"),
        }

    @classmethod
    def tearDownClass(cls):
        close_connection(resolve_corpus_db_path(cls.settings))
        cls._tmp.cleanup()

    def attached_topics(self, question: str, ask_mode: str = "speed") -> list[str]:
        should_run, domain = should_retrieve_knowledge(
            use_local_knowledge_base=True, ask_mode=ask_mode, question=question, app_id="", app_name=""
        )
        self.assertTrue(should_run, question)
        self.assertEqual(domain, "compat")
        result = retrieve_knowledge_context(
            self.settings,
            ask_mode=ask_mode,
            question=question,
            app_id="",
            app_name="",
            text_resolved_title="",
            domain=domain,
            pc_ip="",
        )
        return re.findall(r"\[Tip: ([a-z_]+)\]", result.text_block or "")

    def test_the_deck_check_sentence_attaches_a_mods_tip(self):
        self.assertEqual(self.attached_topics(DECK_CHECK), ["mods"])

    def test_other_plain_mod_questions_attach_a_mods_tip_first(self):
        for question in (
            "which mod manager should I use on the Deck",
            "my game crashes since I added a mod",
            "where do Stardew Valley mods go",
            "how do I use r2modman on the Deck",
            "can I use mods in a game with anti-cheat",
        ):
            with self.subTest(question=question):
                self.assertEqual(self.attached_topics(question)[:1], ["mods"])

    def test_a_proton_crash_question_still_gets_the_crash_tip_first(self):
        """The mods tips must not move an older answer. Tips 175 and 185 once both said "crash",
        which made the word "crash" a little less rare across the sheet; BM25 then put tip 5 ("On
        Windows Steam, Proton is not used...") ahead of tip 127 (force another Proton version) for
        this question, and a Deck in Speed mode would have shown the Windows tip. Only the word-search
        order is at stake, so the check lives where that order is built, and it names no tip number."""
        self.assertEqual(self.attached_topics("why is my game crashing proton issue")[:1], ["crash"])
        self.assertEqual(self.attached_topics("why is my game crashing proton issue", ask_mode="expert")[:1], ["crash"])

    def test_a_longer_answer_gets_several_mods_tips(self):
        self.assertGreaterEqual(self.attached_topics(DECK_CHECK, ask_mode="expert").count("mods"), 3)


if __name__ == "__main__":
    unittest.main()
