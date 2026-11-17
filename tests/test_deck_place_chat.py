"""Title: Deck chat placer (the shapes it writes, what it sends, what it takes back)

Purpose: Test scripts/deck_place_chat.py without a Deck. Every recipe's chat is run through the plugin's own
    cleaning (sanitize_slot) and must come out unchanged, so a placed file is drawn as written; its row in the
    chat list must be the row the plugin itself writes. A pretend Deck (a dictionary of files that understands
    only the script's own commands) catches every command, so the test proves the exact list sent, the refusal
    at ten chats, that taking a chat back restores the chat list byte for byte, and that a chat the script did
    not place is never touched.
Used for: the hand-written chat rows of the Deck checks (plan 105, lane T2).
Solves: A script that writes into the Deck's chat folder and deletes there must be proven narrow on the PC first.
Does not: Send a real command or open a real connection. Check how the screen draws a recipe: the screen's own
    tests do that (src/features/spoilers/boldSpoilerHeading.test.tsx for the bold shapes).
"""

import base64
import importlib.util
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

from backend.chats.chat_slot_service import MAX_CHAT_SLOTS, _upsert_index_row, load_index, sanitize_slot

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("deck_place_chat", ROOT / "scripts" / "deck_place_chat.py")
placer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(placer)

HOST = "deck@192.168.0.5"
NOW = 1_800_000_000
D = placer.DECK_DIR


def an_index(count, start=100):
    """A chat list in the plugin's own format with `count` rows (newest first)."""
    rows = [
        {"id": f"c{i}", "label": f"Chat {i}", "created_at": start + i, "updated_at": start + i, "origin_app_id": "",
         "origin_app_name": "", "turn_count": 2}
        for i in range(count)
    ]
    rows.sort(key=lambda r: r["updated_at"], reverse=True)
    return json.dumps({"version": 1, "slots": rows}, indent=2, sort_keys=True).encode("utf-8")


class FakeDeck:
    """A folder of files that answers only the script's own commands; any other command fails the test."""

    def __init__(self, files=None, fail_write=None):
        self.files = dict(files or {})
        self.sent = []  # (command, stdin bytes or None)
        self.fail_write = fail_write

    def __call__(self, command, data=None):
        self.sent.append((command, data))
        if command == placer.cmd_read_index():
            return (0, self.files["index.json"]) if "index.json" in self.files else (0, b"@@NOINDEX\n")
        if command.startswith(f"test ! -e {D}/"):
            return (1 if command[len(f"test ! -e {D}/"):] in self.files else 0), b""
        if command.startswith(f"mkdir -p {D} && cat > {D}/"):
            name = command.split(f"cat > {D}/")[1].split(".tmp")[0]
            self.assert_command(command, placer.cmd_write(name))
            if name == self.fail_write:
                return 1, b""
            self.files[name] = data
            return 0, b""
        if command.startswith(f"rm -f -- {D}/"):
            name = command[len(f"rm -f -- {D}/"):]
            self.files.pop(name, None)
            return 0, b""
        raise AssertionError(f"a command the script should not send: {command!r}")

    @staticmethod
    def assert_command(sent, expected):
        assert sent == expected, f"{sent!r} != {expected!r}"


class WithFolder(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="bonsai-chat-")
        self.addCleanup(shutil.rmtree, self.dir, ignore_errors=True)

    def chat(self, recipe="two-covers", token="aaaa1111"):
        return placer.chat_from_recipe(recipe, NOW, token)


class RecipeShapeTests(WithFolder):
    def test_every_recipe_survives_the_plugins_own_cleaning_unchanged(self):
        for name in placer.RECIPES:
            chat = self.chat(name)
            self.assertEqual(sanitize_slot(json.loads(json.dumps(chat))), chat, name)

    def test_the_chat_list_row_is_the_row_the_plugin_writes(self):
        for name in placer.RECIPES:
            chat = self.chat(name)
            written = _upsert_index_row({"version": 1, "slots": []}, sanitize_slot(chat))["slots"][0]
            self.assertEqual(placer.index_row(chat), written, name)

    def test_the_new_chat_list_reads_back_through_the_plugins_loader_with_the_old_rows(self):
        original = an_index(3)
        chat = self.chat()
        new = placer.dump_json(placer.index_with_row(placer.parse_index(original), placer.index_row(chat)))
        folder = os.path.join(self.dir, "chat_slots")
        os.makedirs(folder)
        Path(folder, "index.json").write_bytes(new)
        rows = load_index(self.dir)["slots"]
        self.assertEqual(len(rows), 4)
        self.assertEqual(rows[0]["id"], chat["id"])
        self.assertEqual({r["id"] for r in rows[1:]}, {"c0", "c1", "c2"})

    def test_every_chat_is_named_so_it_is_known_as_placed(self):
        for name in placer.RECIPES:
            chat = self.chat(name)
            self.assertTrue(chat["label"].startswith("Placed: "), name)
            self.assertTrue(chat["id"].startswith("placed-"), name)
            self.assertTrue(placer.ID_RE.match(chat["id"]), name)

    def test_the_hidden_line_recipe_holds_a_heading_a_bullet_and_a_plain_line_with_a_block_inside_bold(self):
        text = self.chat("hidden-in-bold")["turns"][1]["text"]
        lines = [ln for ln in text.splitlines() if "bonsai-spoiler" in ln]
        self.assertEqual(len(lines), 3)
        heading, bullet, plain = lines
        fence = "`" * 3 + "bonsai-spoiler "
        self.assertTrue(heading.startswith("## **") and fence in heading and heading.endswith("**"))
        self.assertTrue(bullet.startswith("- **") and fence in bullet and bullet.endswith("**"))
        self.assertTrue(plain.startswith("**") and fence in plain and plain.endswith("**"))
        for line in lines:  # the whole block is on the one line, inside an opened bold
            self.assertEqual(line.count("`" * 3), 2)
            self.assertLess(line.index("**"), line.index("`" * 3))

    def test_two_covers_holds_two_answers_each_with_its_own_block(self):
        turns = self.chat("two-covers")["turns"]
        answers = [t["text"] for t in turns if t["role"] == "assistant"]
        self.assertEqual(len(answers), 2)
        for answer in answers:
            self.assertEqual(answer.count("`" * 3 + "bonsai-spoiler\n"), 1)

    def test_the_step_list_is_a_numbered_list_of_at_least_five_steps(self):
        text = self.chat("step-list")["turns"][1]["text"]
        numbered = [ln for ln in text.splitlines() if ln[:3] in {f"{i}. " for i in range(1, 10)}]
        self.assertGreaterEqual(len(numbered), 5)

    def test_the_notes_line_answer_carries_one_note_and_a_chip_so_the_plugin_keeps_it(self):
        turn = self.chat("notes-line")["turns"][1]
        snapshot = sanitize_slot({"id": "x", "turns": [turn]})["turns"][0]["transparency"]
        self.assertEqual(len(snapshot["kb_attached_notes"]), 1)
        self.assertEqual(snapshot["kb_attached_notes"][0]["name"], "Placed test note")
        self.assertEqual(snapshot["context_chips"][0]["id"], "kb")
        self.assertIsNone(self.chat("notes-line")["turns"][0]["transparency"])

    def test_the_long_chat_has_45_questions_and_45_answers_all_short_and_all_unique(self):
        turns = self.chat("long-chat")["turns"]
        self.assertEqual(len(turns), 90)
        self.assertEqual([t["role"] for t in turns[:4]], ["user", "assistant", "user", "assistant"])
        self.assertEqual(len({t["id"] for t in turns}), 90)
        self.assertLessEqual(max(len(t["text"]) for t in turns), 40)
        self.assertLessEqual(len(turns), placer.MAX_TURNS)

    def test_turns_are_in_time_order_and_never_in_the_future(self):
        for name in placer.RECIPES:
            stamps = [t["created_at"] for t in self.chat(name)["turns"]]
            self.assertEqual(stamps, sorted(stamps), name)
            self.assertLess(stamps[-1], NOW, name)


class ChatFileTests(WithFolder):
    def write(self, obj):
        path = os.path.join(self.dir, "mine.json")
        Path(path).write_text(json.dumps(obj), encoding="utf-8")
        return path

    def test_a_chat_file_becomes_a_chat_the_plugin_keeps_unchanged_with_a_new_id(self):
        path = self.write({"label": "My shape", "id": None, "turns": [{"role": "user", "text": "Hi"}]})
        with self.assertRaises(placer.Refusal):  # an id of its own is not accepted: the script makes the id
            placer.chat_from_file(path, NOW, "bbbb2222")
        path = self.write({"label": "My shape", "turns": [{"role": "user", "text": "Hi"}, {"role": "assistant", "text": "Hello", "spoiler_consent": True}]})
        chat = placer.chat_from_file(path, NOW, "bbbb2222")
        self.assertEqual(chat["id"], "placed-mine-bbbb2222")
        self.assertEqual(chat["label"], "Placed: My shape")
        self.assertEqual(sanitize_slot(json.loads(json.dumps(chat))), chat)
        self.assertTrue(chat["turns"][1]["spoiler_consent"])

    def test_a_chat_file_with_a_stray_key_a_bad_role_or_no_text_is_refused(self):
        bad = [
            {"turns": [{"role": "user", "text": "x"}], "color": "red"},
            {"turns": [{"role": "user", "text": "x", "mood": 1}]},
            {"turns": [{"role": "system", "text": "x"}]},
            {"turns": [{"role": "user", "text": "  "}]},
            {"turns": []},
            {"turns": "no"},
        ]
        for obj in bad:
            with self.assertRaises(placer.Refusal, msg=obj):
                placer.chat_from_file(self.write(obj), NOW)

    def test_a_name_that_is_neither_a_recipe_nor_a_json_file_is_refused(self):
        with self.assertRaises(placer.Refusal):
            placer.build_chat("hidden-in-bolt", NOW)


class PlaceTests(WithFolder):
    def test_it_sends_exactly_these_commands_in_this_order_and_the_chat_file_comes_before_its_row(self):
        deck = FakeDeck({"index.json": an_index(2)})
        chat = self.chat()
        placer.place(HOST, chat, deck, self.dir, NOW)
        cid = chat["id"]
        self.assertEqual(
            [c for c, _ in deck.sent],
            [placer.cmd_read_index(), f"test ! -e {D}/{cid}.json", placer.cmd_write(f"{cid}.json"), placer.cmd_write("index.json")],
        )
        self.assertEqual(json.loads(deck.files[f"{cid}.json"]), chat)
        rows = json.loads(deck.files["index.json"])["slots"]
        self.assertEqual([r["id"] for r in rows], [cid, "c1", "c0"])

    def test_the_command_texts_are_the_documented_ones(self):
        cid = "placed-x-1"
        self.assertEqual(placer.cmd_read_index(), f"if [ -f {D}/index.json ]; then cat {D}/index.json; else echo @@NOINDEX; fi")
        self.assertEqual(placer.cmd_write(f"{cid}.json"), f"mkdir -p {D} && cat > {D}/{cid}.json.tmp && mv {D}/{cid}.json.tmp {D}/{cid}.json")
        self.assertEqual(placer.cmd_remove_chat(cid), f"rm -f -- {D}/{cid}.json")
        self.assertEqual(placer.cmd_remove_index(), f"rm -f -- {D}/index.json")
        self.assertEqual(len(placer.show_commands()), 6)

    def test_it_refuses_at_ten_chats_and_sends_nothing_that_writes(self):
        deck = FakeDeck({"index.json": an_index(MAX_CHAT_SLOTS)})
        with self.assertRaisesRegex(placer.Refusal, "10 chats"):
            placer.place(HOST, self.chat(), deck, self.dir, NOW)
        self.assertEqual([c for c, _ in deck.sent], [placer.cmd_read_index()])
        self.assertEqual(os.listdir(self.dir), [])

    def test_it_places_at_nine_chats_giving_exactly_ten(self):
        deck = FakeDeck({"index.json": an_index(MAX_CHAT_SLOTS - 1)})
        placer.place(HOST, self.chat(), deck, self.dir, NOW)
        self.assertEqual(len(json.loads(deck.files["index.json"])["slots"]), MAX_CHAT_SLOTS)

    def test_it_refuses_a_chat_list_it_cannot_read_and_changes_nothing(self):
        for broken in (b"{not json", b'["a list"]', b'{"slots": 5}'):
            deck = FakeDeck({"index.json": broken})
            with self.assertRaises(placer.Refusal):
                placer.place(HOST, self.chat(), deck, self.dir, NOW)
            self.assertEqual(deck.files, {"index.json": broken})

    def test_it_refuses_a_name_that_is_taken_and_a_malformed_host(self):
        chat = self.chat()
        deck = FakeDeck({f"{chat['id']}.json": b"{}"})
        with self.assertRaisesRegex(placer.Refusal, "already on the Deck"):
            placer.place(HOST, chat, deck, self.dir, NOW)
        for host in ("192.168.0.5", "deck@host;rm -rf ~", "root@192.168.0.5", "deck@192.168.0.5\n", "-oProxyCommand=x deck@1.2.3.4"):
            with self.assertRaises(placer.Refusal, msg=host):
                placer.place(host, chat, FakeDeck(), self.dir, NOW)

    def test_a_deck_with_no_chat_list_gets_one_holding_only_the_placed_chat(self):
        deck = FakeDeck()
        chat = self.chat()
        placer.place(HOST, chat, deck, self.dir, NOW)
        self.assertEqual([r["id"] for r in json.loads(deck.files["index.json"])["slots"]], [chat["id"]])

    def test_a_failed_write_of_either_file_leaves_the_deck_as_it_was_and_no_record(self):
        original = an_index(2)
        for failing in ("index.json", self.chat()["id"] + ".json"):
            with self.subTest(failing=failing):
                deck = FakeDeck({"index.json": original}, fail_write=failing)
                with self.assertRaises(placer.Refusal):
                    placer.place(HOST, self.chat(), deck, self.dir, NOW)
                self.assertEqual(deck.files, {"index.json": original})
                self.assertEqual(os.listdir(self.dir), [])


class TakeBackTests(WithFolder):
    def placed(self, files):
        deck = FakeDeck(files)
        chat = self.chat()
        placer.place(HOST, chat, deck, self.dir, NOW)
        return deck, chat["id"]

    def test_taking_back_restores_the_chat_list_byte_for_byte_and_removes_the_chat(self):
        for original in (an_index(3), an_index(0), an_index(9), b'{"slots":[{"id":"odd"}], "version": 1}  \n'):
            deck, cid = self.placed({"index.json": original})
            self.assertNotEqual(deck.files["index.json"], original)
            said = placer.take_back(HOST, cid, deck, self.dir)
            self.assertEqual(deck.files, {"index.json": original})
            self.assertIn("byte for byte", said[0])
            self.assertEqual(os.listdir(self.dir), [])

    def test_a_deck_that_had_no_chat_list_has_none_again(self):
        deck, cid = self.placed({})
        placer.take_back(HOST, cid, deck, self.dir)
        self.assertEqual(deck.files, {})

    def test_a_chat_list_the_plugin_changed_meanwhile_loses_only_the_placed_row(self):
        deck, cid = self.placed({"index.json": an_index(2)})
        rows = json.loads(deck.files["index.json"])
        rows["slots"].append({"id": "made-later", "label": "Later", "created_at": 1, "updated_at": 1, "origin_app_id": "", "origin_app_name": "", "turn_count": 0})
        deck.files["index.json"] = placer.dump_json(rows)
        said = placer.take_back(HOST, cid, deck, self.dir)
        self.assertEqual({r["id"] for r in json.loads(deck.files["index.json"])["slots"]}, {"c0", "c1", "made-later"})
        self.assertIn("not byte for byte", said[0])
        self.assertNotIn(f"{cid}.json", deck.files)

    def test_a_chat_list_already_as_before_is_left_alone(self):
        original = an_index(2)
        deck, cid = self.placed({"index.json": original})
        deck.files["index.json"] = original  # the person (or a wipe-and-restore) put it back
        sent_before = len(deck.sent)
        placer.take_back(HOST, cid, deck, self.dir)
        written = [c for c, _ in deck.sent[sent_before:] if c.startswith("mkdir")]
        self.assertEqual(written, [])
        self.assertEqual(deck.files, {"index.json": original})

    def test_it_never_touches_a_chat_it_did_not_place(self):
        original = an_index(2)
        deck = FakeDeck({"index.json": original, "c0.json": b"{}", "placed-someone-elses-12345678.json": b"{}"})
        for chat_id in ("c0", "placed-someone-elses-12345678", "../../etc/passwd", "placed-x; rm -rf ~", ""):
            with self.assertRaises(placer.Refusal, msg=chat_id):
                placer.take_back(HOST, chat_id, deck, self.dir)
        self.assertEqual(deck.sent, [])
        self.assertEqual(set(deck.files), {"index.json", "c0.json", "placed-someone-elses-12345678.json"})

    def test_a_record_made_for_another_deck_is_not_used(self):
        deck, cid = self.placed({"index.json": an_index(1)})
        with self.assertRaisesRegex(placer.Refusal, "must match"):
            placer.take_back("deck@10.0.0.9", cid, deck, self.dir)
        self.assertIn(f"{cid}.json", deck.files)

    def test_the_record_holds_the_old_list_whole_and_the_checks_taking_back_uses(self):
        original = an_index(2)
        deck, cid = self.placed({"index.json": original})
        record = json.loads(Path(placer.record_path(self.dir, cid)).read_text(encoding="utf-8"))
        self.assertEqual(base64.b64decode(record["original_index_b64"]), original)
        self.assertEqual(record["host"], HOST)
        self.assertEqual(record["new_index_sha256"], placer.sha(deck.files["index.json"]))

    def test_a_chat_list_that_cannot_be_read_when_taking_back_changes_nothing(self):
        deck, cid = self.placed({"index.json": an_index(1)})
        deck.files["index.json"] = b"{broken"
        with self.assertRaises(placer.Refusal):
            placer.take_back(HOST, cid, deck, self.dir)
        self.assertIn(f"{cid}.json", deck.files)
        self.assertTrue(os.path.isfile(placer.record_path(self.dir, cid)))


class CommandLineTests(WithFolder):
    def test_the_whole_command_places_prints_only_the_id_and_removes(self):
        deck = FakeDeck({"index.json": an_index(1)})
        run_for = lambda host: deck  # noqa: E731
        import contextlib
        import io

        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            self.assertEqual(placer.main(["--host", HOST, "--record-dir", self.dir, "step-list"], run_for), 0)
        cid = out.getvalue().strip()
        self.assertTrue(placer.ID_RE.match(cid))
        self.assertIn("take it back with --remove", err.getvalue())
        out2 = io.StringIO()
        with contextlib.redirect_stdout(out2), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(placer.main(["--host", HOST, "--record-dir", self.dir, "--remove", cid], run_for), 0)
        self.assertEqual(deck.files, {"index.json": an_index(1)})

    def test_a_refusal_prints_one_plain_sentence_and_returns_2(self):
        import contextlib
        import io

        err = io.StringIO()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(err):
            code = placer.main(["--host", HOST, "--record-dir", self.dir, "two-covers"], lambda host: FakeDeck({"index.json": an_index(10)}))
        self.assertEqual(code, 2)
        self.assertIn("deck_place_chat:", err.getvalue())

    def test_the_commands_are_sent_as_ssh_the_address_the_command_and_nothing_between(self):
        seen = {}

        class Done:
            returncode, stdout, stderr = 0, b"", b""

        def fake_run(argv, **kwargs):
            seen["argv"], seen["kwargs"] = argv, kwargs
            return Done()

        real = placer.subprocess.run
        placer.subprocess.run = fake_run
        try:
            placer.ssh_run(HOST, placer.cmd_read_index())
            self.assertEqual(seen["argv"], ["ssh", HOST, placer.cmd_read_index()])
            placer.ssh_run(HOST, placer.cmd_write("index.json"), b"data")
            self.assertEqual(seen["argv"], ["ssh", HOST, placer.cmd_write("index.json")])
            self.assertEqual(seen["kwargs"]["input"], b"data")
        finally:
            placer.subprocess.run = real


if __name__ == "__main__":
    unittest.main()
