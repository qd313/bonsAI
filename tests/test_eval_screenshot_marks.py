"""Title: Marks-on-a-boss-picture measurement tests (plan 103, lane P3)

Purpose: Pin scripts/kb/eval_screenshot_marks.py: the strict reader of a reply's mark lines (a line that does not
         read is counted and never repaired), the drawing's arithmetic (the mock-up board's numbers scaled to the
         picture, dashes only when a mark is not sure, the 260 by 140 preview), the words for where a mark sits,
         the library's advice for a picture's boss, and the grading sheet the grader reads without the repo.
Used for: the "can the Deck's AI mark a boss picture" decision (plan 103 call 12).
Solves: A reader that guessed at a half-written line, or a mark drawn a little off, would hand the grader a picture
        that does not show what the model said, and the decision rests on those grades.
Does not: Start Ollama, open a real game picture or read the real library: the asks are not made and the library is
          a few rows built in the test.
"""

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from script_loader import load_script

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "py_modules"))

try:
    import PIL  # noqa: F401

    HAVE_PILLOW = True
except ImportError:  # the drawing tests need it; the reader and the arithmetic do not
    HAVE_PILLOW = False


class _Case(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_script("eval_screenshot_marks", register=True)

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop("eval_screenshot_marks", None)
        sys.modules.pop("eval_screenshot_reading", None)

    def mark(self, n=1, kind="hit", x=0.5, y=0.5, words="red glowing eye", sure=True):
        return self.mod.Mark(n=n, kind=kind, x=x, y=y, words=words, sure=sure)


class ReaderTests(_Case):
    def test_a_line_in_exactly_the_asked_form_reads(self):
        got = self.mod.read_marks("hit, 0.62, 0.35, glowing red eye, sure")
        self.assertEqual(len(got.marks), 1)
        m = got.marks[0]
        self.assertEqual((m.n, m.kind, m.x, m.y, m.words, m.sure), (1, "hit", 0.62, 0.35, "glowing red eye", True))
        self.assertEqual(got.unread, [])
        self.assertTrue(got.clean)

    def test_not_sure_reads_as_not_sure_and_sure_is_not_confused_with_it(self):
        got = self.mod.read_marks("avoid, 0.1, 0.9, sharp claws, not sure\ndodge, 1, 0, fire breath, sure")
        self.assertEqual([m.sure for m in got.marks], [False, True])
        self.assertEqual([m.kind for m in got.marks], ["avoid", "dodge"])
        self.assertEqual((got.marks[1].x, got.marks[1].y), (1.0, 0.0))

    def test_a_numbered_list_mark_in_front_and_capitals_are_allowed(self):
        got = self.mod.read_marks("1. Hit, 0.4, 0.4, big claw, Sure\n2) Dodge, .7, .2, fire ball, not sure\n- avoid, 0.0, 1.0, the floor, sure")
        self.assertEqual([m.kind for m in got.marks], ["hit", "dodge", "avoid"])
        self.assertEqual(got.marks[1].x, 0.7)

    def test_two_lines_that_do_not_read_are_kept_word_for_word_and_counted(self):
        reply = "hit at the left side of the boss\nhit, 1.4, 0.5, big claw, sure"
        got = self.mod.read_marks(reply)
        self.assertEqual(got.marks, [])
        self.assertEqual(got.unread, ["hit at the left side of the boss", "hit, 1.4, 0.5, big claw, sure"])
        self.assertFalse(got.clean)

    def test_nothing_is_repaired_or_guessed(self):
        for bad in (
            "hit, 62%, 35%, red eye, sure",            # percent, not a number from 0 to 1
            "hit, 0.62, 0.35, red eye",                # no sure
            "hit, 0.62, 0.35, red eye, probably",      # not sure or not-sure
            "weakpoint, 0.62, 0.35, red eye, sure",    # a kind that was not offered
            "hit, 0.62, 0.35, one two three four five six seven, sure",  # more than six words
            "hit 0.62 0.35 red eye sure",              # no commas
            "hit, 0.62, red eye, sure",                # one number missing
            "hit, -0.1, 0.5, red eye, sure",           # below 0
            "hit, 0.62, 0.35, , sure",                 # no words
        ):
            with self.subTest(bad=bad):
                got = self.mod.read_marks(bad)
                self.assertEqual(got.marks, [])
                self.assertEqual(got.unread, [bad])

    def test_only_the_first_three_marks_are_kept_and_the_rest_are_counted(self):
        reply = "\n".join(f"hit, 0.{i}, 0.5, thing {i}, sure" for i in range(1, 6))
        got = self.mod.read_marks(reply)
        self.assertEqual([m.n for m in got.marks], [1, 2, 3])
        self.assertEqual(got.extra, 2)
        self.assertEqual(got.unread, [])

    def test_the_single_word_none_is_an_honest_empty_reply_not_an_unread_line(self):
        for reply in ("none", "None.", "- none"):
            got = self.mod.read_marks(reply)
            self.assertTrue(got.said_none, reply)
            self.assertEqual((got.marks, got.unread), ([], []))
            self.assertTrue(got.clean)

    def test_prose_around_the_marks_is_counted_unread_but_the_marks_still_read(self):
        got = self.mod.read_marks("Here are the marks:\nhit, 0.5, 0.5, red eye, sure\nHope that helps!")
        self.assertEqual(len(got.marks), 1)
        self.assertEqual(got.unread, ["Here are the marks:", "Hope that helps!"])
        self.assertEqual(got.lines, 3)
        self.assertFalse(got.clean)

    def test_a_thinking_block_is_dropped_before_reading(self):
        got = self.mod.read_marks("<think>maybe hit, 0.9, 0.9, x, sure</think>\ndodge, 0.2, 0.8, big wave, sure")
        self.assertEqual([m.kind for m in got.marks], ["dodge"])
        self.assertEqual(got.unread, [])

    def test_an_empty_reply_reads_as_nothing_and_is_not_clean(self):
        got = self.mod.read_marks("")
        self.assertEqual((got.marks, got.unread, got.lines, got.said_none), ([], [], 0, False))
        self.assertFalse(got.clean)

    def test_the_question_asks_for_the_form_the_reader_reads(self):
        q = self.mod.QUESTION
        for needle in ("up to three", "kind, x, y, three words, sure", "hit", "avoid", "dodge", "not sure", "from 0 to 1"):
            self.assertIn(needle, q)
        example = q.split("Example: ", 1)[1].split(". If you", 1)[0]
        self.assertEqual(len(self.mod.read_marks(example).marks), 1, "the example in the question must itself read")


class WordsTests(_Case):
    def test_where_in_words_goes_by_thirds(self):
        w = self.mod.where_in_words
        self.assertEqual(w(0.1, 0.1), "upper left")
        self.assertEqual(w(0.5, 0.1), "upper centre")
        self.assertEqual(w(0.9, 0.1), "upper right")
        self.assertEqual(w(0.1, 0.5), "middle left")
        self.assertEqual(w(0.5, 0.5), "centre")
        self.assertEqual(w(0.9, 0.5), "middle right")
        self.assertEqual(w(0.1, 0.9), "lower left")
        self.assertEqual(w(0.5, 0.9), "lower centre")
        self.assertEqual(w(0.9, 0.9), "lower right")

    def test_a_mark_as_words_gives_kind_both_numbers_plain_place_the_three_words_and_how_sure(self):
        text = self.mod.mark_in_words(self.mark(n=2, kind="avoid", x=0.2, y=0.8, words="sharp claws", sure=False))
        self.assertEqual(text, '2. avoid at (0.20, 0.80), lower left: "sharp claws", not sure')


class ArithmeticTests(_Case):
    def test_a_mark_on_the_boards_own_width_uses_the_boards_own_numbers(self):
        g = self.mod.mark_geometry(self.mark(x=0.5, y=0.5), 260, 140)
        self.assertEqual((g.cx, g.cy), (130, 70))
        self.assertEqual((g.r, g.stroke, g.badge_r, g.font), (18, 2, 7, 9))
        self.assertAlmostEqual(g.badge_cx, 130 + 18 * 0.72)
        self.assertAlmostEqual(g.badge_cy, 70 - 18 * 0.72)

    def test_a_wider_picture_scales_everything_by_how_much_wider_it_is(self):
        g = self.mod.mark_geometry(self.mark(x=0.25, y=0.75), 780, 440)
        self.assertEqual((g.cx, g.cy), (195, 330))
        self.assertEqual((g.r, g.stroke, g.badge_r, g.font), (54, 6, 21, 27))

    def test_a_sure_mark_is_one_whole_ring_and_an_unsure_one_is_dashes_with_gaps(self):
        g = self.mod.mark_geometry(self.mark(), 260, 140)
        self.assertEqual(self.mod.dash_spans(g, True), [(0.0, 360.0)])
        spans = self.mod.dash_spans(g, False)
        self.assertGreater(len(spans), 5)
        self.assertAlmostEqual(spans[0][1] - spans[0][0], 4 / 18 * 180 / 3.141592653589793)
        gap = spans[1][0] - spans[0][1]
        self.assertAlmostEqual(gap, 3 / 18 * 180 / 3.141592653589793)
        self.assertLessEqual(spans[-1][1], 360.0)

    def test_the_preview_fits_the_whole_picture_inside_260_by_140(self):
        self.assertEqual(self.mod.fit_box(800, 450), (249, 140, 5, 0))
        self.assertEqual(self.mod.fit_box(800, 500), (224, 140, 18, 0))
        self.assertEqual(self.mod.fit_box(1000, 400), (260, 104, 0, 18))

    def test_the_colours_are_the_boards(self):
        self.assertEqual(self.mod.COLOURS, {"hit": "#7dff9a", "avoid": "#ff8a7a", "dodge": "#ffd36b"})


@unittest.skipUnless(HAVE_PILLOW, "the drawing needs Pillow")
class DrawingTests(_Case):
    def _picture(self, w=520, h=292):
        from PIL import Image

        return Image.new("RGB", (w, h), (20, 20, 20))

    def _ring_hits(self, image, geo, colour):
        import math

        want = tuple(int(colour[i:i + 2], 16) for i in (1, 3, 5))
        hits = 0
        steps = 72
        for k in range(steps):
            a = 2 * math.pi * k / steps
            x = round(geo.cx + geo.r * math.cos(a))
            y = round(geo.cy + geo.r * math.sin(a))
            near = [image.getpixel((min(max(x + dx, 0), image.width - 1), min(max(y + dy, 0), image.height - 1)))
                    for dx in (-1, 0, 1) for dy in (-1, 0, 1)]  # a thin ring is a pixel wide: look one pixel around
            if any(all(abs(px[i] - want[i]) < 40 for i in range(3)) for px in near):
                hits += 1
        return hits, steps

    def test_a_sure_hit_is_a_whole_green_ring_on_a_copy_and_the_original_is_untouched(self):
        pic = self._picture()
        m = self.mark(kind="hit", x=0.5, y=0.5, sure=True)
        out = self.mod.draw_marks(pic, [m])
        self.assertEqual(pic.getpixel((260, 146)), (20, 20, 20))
        g = self.mod.mark_geometry(m, 520, 292)
        hits, steps = self._ring_hits(out, g, "#7dff9a")
        self.assertGreaterEqual(hits, steps - 4, "a sure mark's ring has no gaps")

    def test_an_unsure_mark_has_gaps_in_its_ring_and_a_sure_one_has_none(self):
        pic = self._picture()
        sure = self.mod.draw_marks(pic, [self.mark(kind="avoid", sure=True)])
        unsure = self.mod.draw_marks(pic, [self.mark(kind="avoid", sure=False)])
        g = self.mod.mark_geometry(self.mark(), 520, 292)
        hits_sure, steps = self._ring_hits(sure, g, "#ff8a7a")
        hits_unsure, _ = self._ring_hits(unsure, g, "#ff8a7a")
        self.assertGreater(hits_sure, hits_unsure + 10)
        self.assertGreater(hits_unsure, 10, "dashes are painted, not nothing")

    def test_each_kind_is_drawn_in_its_own_colour_and_the_badge_is_filled(self):
        pic = self._picture()
        for kind, colour in self.mod.COLOURS.items():
            m = self.mark(kind=kind, x=0.3, y=0.6)
            out = self.mod.draw_marks(pic, [m])
            g = self.mod.mark_geometry(m, 520, 292)
            want = tuple(int(colour[i:i + 2], 16) for i in (1, 3, 5))
            px = out.getpixel((round(g.badge_cx - g.badge_r * 0.8), round(g.badge_cy)))
            self.assertTrue(all(abs(px[i] - want[i]) < 40 for i in range(3)), (kind, px))

    def test_no_marks_leaves_the_picture_as_it_was(self):
        pic = self._picture()
        self.assertEqual(list(self.mod.draw_marks(pic, []).getdata()), list(pic.getdata()))

    def test_the_preview_is_exactly_260_by_140_with_the_marks_inside_it(self):
        pic = self._picture(800, 450)
        out = self.mod.make_preview(pic, [self.mark(kind="hit", x=0.5, y=0.5)])
        self.assertEqual(out.size, (260, 140))
        self.assertEqual(out.getpixel((1, 70)), (0x0b, 0x0f, 0x14), "the strip beside a 16 by 9 picture is the board's dark")
        self.assertEqual(out.getpixel((130, 6)), (20, 20, 20), "the picture itself shows through")
        g = self.mod.mark_geometry(self.mark(), 249, 140)
        hits, steps = self._ring_hits(out.crop((5, 0, 254, 140)), g, "#7dff9a")
        self.assertGreaterEqual(hits, steps - 8)


class AdviceTests(_Case):
    def _db(self, folder: Path) -> Path:
        path = folder / "corpus.db"
        con = sqlite3.connect(path)
        con.executescript(
            "create table games (game_id integer primary key, app_id text, igdb_id text, canonical_title text);"
            "create table sections (section_id integer primary key, game_id integer, section_type text, name text, card text);")
        con.executemany("insert into games values (?,?,?,?)", [
            (1, None, "x", "The Legend of Zelda: Ocarina of Time"), (2, "1010", None, "Hollow Knight")])
        con.executemany("insert into sections values (?,?,?,?,?)", [
            (1, 1, "boss", "Gohma", "Summary: a giant spider. Weak points: its glowing eye."),
            (2, 2, "boss", "False Knight", "Summary: the armoured maggot. Weak points: the exposed head."),
            (3, 2, "boss", "Gohma", "wrong game: must never be read for Zelda")])
        con.commit()
        con.close()
        return path

    def pic(self, **kw):
        base = dict(id="p", file="p.jpg", path="", game="The Legend of Zelda: Ocarina of Time", game_aliases=["OoT"],
                    boss="Gohma", boss_aliases=[], app_id="10090193", app_name="The Legend of Zelda: Ocarina of Time",
                    expect_section="", expect_section_also=[])
        base.update(kw)
        return SimpleNamespace(**base)

    def test_the_labelled_note_is_found_in_the_pictures_own_game_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = self._db(Path(tmp))
            got = self.mod.note_advice(db, self.pic(expect_section="Gohma"))
            self.assertEqual([n for n, _ in got], ["Gohma"])
            self.assertIn("glowing eye", got[0][1])

    def test_with_no_note_label_the_bosss_name_finds_the_note_and_the_game_may_match_by_app_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = self._db(Path(tmp))
            got = self.mod.note_advice(db, self.pic(game="Hollow Knight", game_aliases=[], app_id="1010", app_name="Hollow Knight",
                                                    boss="False Knight"))
            self.assertEqual([n for n, _ in got], ["False Knight"])

    def test_a_boss_the_library_has_no_note_for_gives_nothing_and_a_missing_library_does_not_stop_the_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = self._db(Path(tmp))
            self.assertEqual(self.mod.note_advice(db, self.pic(boss="Wolfos")), [])
            self.assertEqual(self.mod.note_advice(Path(tmp) / "nope.db", self.pic()), [])


class SheetTests(_Case):
    def _pic(self, **kw):
        base = dict(id="p1-boss", file="p1-boss.jpg", path="", game="Hollow Knight", boss="False Knight")
        base.update(kw)
        return SimpleNamespace(**base)

    def _try(self, sample, reply, **kw):
        return self.mod.Try(picture_id="p1-boss", sample=sample, model="m:1", reply=reply, seconds=4.2, error=kw.get("error", ""),
                            reading=self.mod.read_marks(reply), full_path=f"C:/out/m-1/p1-boss-try{sample}.png",
                            preview_path=f"C:/out/m-1/p1-boss-try{sample}-preview.png")

    def test_the_sheet_gives_file_game_boss_advice_marks_as_words_and_the_drawn_copy(self):
        tries = [self._try(1, "hit, 0.5, 0.3, exposed head, sure\nsome chatter"), self._try(2, "none"), self._try(3, "I see a knight.")]
        sheet = self.mod.format_sheet("m:1", [self._pic()], tries, {"p1-boss": [("False Knight", "Summary: jump the shockwave.")]},
                                      {"note": "Run today."})
        for needle in (
            "grading sheet for m:1", "- File: p1-boss.jpg", "- Game: Hollow Knight", "- Boss or enemy on screen: False Knight",
            "The library note's own advice (False Knight): Summary: jump the shockwave.",
            "### Try 1 (4.2s)", '1. hit at (0.50, 0.30), upper centre: "exposed head", sure',
            "Line that did not read: some chatter", "single word none", "No mark could be read from this reply.",
            "Drawn copy: C:/out/m-1/p1-boss-try1.png", "Preview (260 by 140): C:/out/m-1/p1-boss-try1-preview.png",
            "Lines that did not read: 2.",
        ):
            self.assertIn(needle, sheet)

    def test_a_picture_without_a_note_says_so_and_a_failed_ask_says_why(self):
        sheet = self.mod.format_sheet("m:1", [self._pic()], [self._try(1, "", error="TimeoutError: slow")], {}, {"note": ""})
        self.assertIn("the library holds no note for this one", sheet)
        self.assertIn("The ask failed: TimeoutError: slow", sheet)
        self.assertIn("Asks that failed: 1.", sheet)

    def test_model_folder_has_no_colon(self):
        self.assertEqual(self.mod.model_folder("gemma4:e2b-it-qat"), "gemma4-e2b-it-qat")


class PicturesTests(_Case):
    def test_only_pictures_with_a_boss_label_are_chosen(self):
        pics = [SimpleNamespace(id="a", boss="Wolfos"), SimpleNamespace(id="b", boss=""), SimpleNamespace(id="c", boss="Gohma")]
        self.assertEqual([p.id for p in self.mod.boss_pictures(pics)], ["a", "c"])

    def test_todays_labels_hold_at_least_the_wolfos_picture_with_a_boss_label(self):
        reading = sys.modules["eval_screenshot_reading"]
        labelled = self.mod.boss_pictures(reading.load_pictures(REPO_ROOT / "tests" / "fixtures" / "screenshot_eval_v1.json", None))
        self.assertIn("p1-oot-wolfos-pair", [p.id for p in labelled])


class AskTests(_Case):
    def test_a_timeout_waits_two_minutes_and_tries_again_twice_then_gives_the_error_back(self):
        waits = []
        calls = []
        real = self.mod.urllib.request.urlopen

        def boom(*a, **k):
            calls.append(1)
            raise TimeoutError("slow")

        self.mod.urllib.request.urlopen = boom
        try:
            with tempfile.TemporaryDirectory() as tmp:
                img = Path(tmp) / "x.jpg"
                img.write_bytes(b"abc")
                got = self.mod.ask_model("http://127.0.0.1:1", "m", img, sleep=waits.append)
        finally:
            self.mod.urllib.request.urlopen = real
        self.assertEqual(len(calls), 3)
        self.assertEqual(waits, [120, 120])
        self.assertIn("TimeoutError", got.error)
        self.assertEqual(got.reply, "")


if __name__ == "__main__":
    unittest.main()
