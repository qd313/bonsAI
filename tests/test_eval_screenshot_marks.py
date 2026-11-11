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
        for needle in ("up to three", "five parts separated by commas", "hit, avoid or dodge", "how far across", "how far down", "three words naming the thing", "not sure", "from 0 to 1", "write the single word none"):
            self.assertIn(needle, q)
        self.assertIn("form only", q)
        self.assertIn("not an answer", q)
        example = q.split("not an answer: ", 1)[1].split(". If you", 1)[0]
        self.assertEqual(example, self.mod.EXAMPLE_LINE)
        got = self.mod.read_marks(example)
        self.assertEqual((got.marks, got.unread, len(got.copied)), ([], [], 1), "the example itself is read as a copy")

    def test_the_question_shows_no_template_with_placeholder_words_a_model_could_copy(self):
        q = self.mod.QUESTION
        for placeholder in ("kind,", "x, y", "form: kind"):
            self.assertNotIn(placeholder, q)
        # the only line that looks like a reply line is the teapot one, and it is said not to be an answer
        reply_like = [part for part in q.split(". ") if part.count(",") >= 4]
        self.assertEqual(len(reply_like), 1)
        self.assertIn("not an answer", reply_like[0])

    def test_a_line_starting_with_the_word_kind_stays_unread_and_is_also_counted_as_the_forms_wording(self):
        got = self.mod.read_marks("kind, 0.35, 0.74, red glowing sword, sure.\nKind, 0.5, 0.5, a head, not sure\nhit, 0.5, 0.5, head, sure")
        self.assertEqual(len(got.marks), 1)
        self.assertEqual(got.unread, ["kind, 0.35, 0.74, red glowing sword, sure.", "Kind, 0.5, 0.5, a head, not sure"])
        self.assertEqual(got.form_copied, got.unread)
        self.assertFalse(got.clean)

    def test_other_unread_lines_and_kinds_that_merely_start_with_kind_are_not_the_forms_wording(self):
        got = self.mod.read_marks("kindly hit the head\nhit at the head\nkind of hit, 0.5, 0.5, head, sure")
        self.assertEqual(len(got.unread), 3)
        self.assertEqual(got.form_copied, [])

    def test_the_example_is_one_no_real_picture_earns_on_merit(self):
        self.assertEqual((self.mod.EXAMPLE_X, self.mod.EXAMPLE_Y, self.mod.EXAMPLE_WORDS), (0.04, 0.96, "purple teapot"))

    def test_a_line_with_the_examples_numbers_and_words_is_counted_as_copied_not_read_as_a_mark(self):
        for line in (
            "avoid, 0.04, 0.96, purple teapot, sure",
            "hit, 0.04, 0.96, Purple Teapot, not sure",   # kind and sure changed around the copied numbers and words
            "1. dodge, .04, 0.96, purple  teapot, sure",  # a list mark, another way of writing a number
        ):
            with self.subTest(line=line):
                got = self.mod.read_marks(line)
                self.assertEqual((got.marks, got.unread, got.copied), ([], [], [line]))
                self.assertFalse(got.clean)

    def test_the_numbers_alone_or_the_words_alone_are_not_a_copy(self):
        got = self.mod.read_marks("hit, 0.04, 0.96, red eye, sure\nhit, 0.5, 0.5, purple teapot, sure")
        self.assertEqual(len(got.marks), 2)
        self.assertEqual(got.copied, [])

    def test_a_copied_line_beside_a_real_mark_leaves_the_real_mark_and_the_count_of_marks_alone(self):
        got = self.mod.read_marks("avoid, 0.04, 0.96, purple teapot, sure\nhit, 0.5, 0.4, red eye, sure")
        self.assertEqual([m.n for m in got.marks], [1])
        self.assertEqual(len(got.copied), 1)


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
            "Lines that did not read, in all: 2.",
        ):
            self.assertIn(needle, sheet)

    def test_a_picture_without_a_note_says_so_and_a_failed_ask_says_why(self):
        sheet = self.mod.format_sheet("m:1", [self._pic()], [self._try(1, "", error="TimeoutError: slow")], {}, {"note": ""})
        self.assertIn("the library holds no note for this one", sheet)
        self.assertIn("The ask failed: TimeoutError: slow", sheet)
        self.assertIn("Asks that failed: 1.", sheet)

    def test_a_copied_example_is_counted_in_the_sheet_on_its_own_line_and_in_the_top_count(self):
        copied = self.mod.EXAMPLE_LINE
        sheet = self.mod.format_sheet("m:1", [self._pic()], [self._try(1, copied), self._try(2, copied + "\nhit, 0.5, 0.5, red eye, sure")],
                                      {}, {"note": ""})
        self.assertIn("Replies that copied the question's example: 2.", sheet)
        self.assertIn(f"- Line that copied the question's example (not a mark): {copied}", sheet)
        self.assertIn("No mark: the reply only copied the question's example.", sheet)
        self.assertIn("Lines that did not read, in all: 0.", sheet)

    def test_a_line_that_copied_the_forms_wording_is_counted_in_the_top_and_shown_on_its_own_line(self):
        reply = "kind, 0.35, 0.74, red sword, sure\nhit, 0.5, 0.5, head, sure\nprose line"
        sheet = self.mod.format_sheet("m:1", [self._pic()], [self._try(1, reply), self._try(2, "hit, 0.5, 0.5, head, sure")],
                                      {}, {"note": ""})
        self.assertIn("- Replies that copied the form's wording (a line starting with the word kind): 1.", sheet)
        self.assertIn("- Line that copied the form's wording (not read as a mark): kind, 0.35, 0.74, red sword, sure", sheet)
        self.assertIn("- Line that did not read: prose line", sheet)
        self.assertIn("Lines that did not read, in all: 2.", sheet, "the form's wording is still an unread line too")

    def test_model_folder_has_no_colon(self):
        self.assertEqual(self.mod.model_folder("gemma4:e2b-it-qat"), "gemma4-e2b-it-qat")


class CountsTests(_Case):
    def _t(self, reply, seconds=4.0, error="", picture="a"):
        return self.mod.Try(picture_id=picture, sample=1, model="m", reply=reply, seconds=seconds, error=error,
                            reading=self.mod.read_marks(reply))

    def test_the_counts_that_need_no_judging(self):
        tries = [
            self._t("hit, 0.5, 0.5, red eye, sure\navoid, 0.2, 0.2, claws, not sure", seconds=3.0),
            self._t("none", seconds=5.0),
            self._t(self.mod.EXAMPLE_LINE, seconds=7.0),
            self._t("I think it is a wolf.", seconds=9.0),
            self._t("", seconds=99.0, error="TimeoutError: slow"),
            self._t("dodge, 0.9, 0.1, fire ball, not sure\nhit, 0.1, 0.1, head, sure\nhit, 0.3, 0.3, back, sure", seconds=1.0),
        ]
        c = self.mod.sheet_counts(tries)
        self.assertEqual((c["replies"], c["failed"]), (6, 1))
        self.assertEqual(c["did_not_parse"], 1, "only the prose reply: the copy, the none and the failed ask are counted apart")
        self.assertEqual((c["copied"], c["none"], c["unread_lines"]), (1, 1, 1))
        self.assertEqual((c["marks_total"], c["not_sure"]), (5, 2))
        self.assertEqual(c["by_mark_count"], [3, 0, 1, 1])
        self.assertAlmostEqual(c["marks_per_reply"], 1.0)
        self.assertEqual((c["seconds_middle"], c["seconds_slowest"]), (5.0, 9.0), "a failed ask's wait is not a reply's time")

    def test_counts_over_no_tries_do_not_divide_by_zero(self):
        c = self.mod.sheet_counts([])
        self.assertEqual((c["replies"], c["marks_per_reply"], c["seconds_slowest"]), (0, 0.0, 0.0))

    def test_the_sheets_top_gives_the_counts_and_leaves_the_extra_pictures_out_of_them(self):
        pics = [SimpleNamespace(id="a", file="a.jpg", path="", game="G", boss="B"),
                SimpleNamespace(id="x", file="x.jpg", path="", game="G", boss="E")]
        tries = [self._t("hit, 0.5, 0.5, red eye, not sure", picture="a"), self._t("none", picture="x"), self._t("none", picture="x")]
        sheet = self.mod.format_sheet("m", pics, tries, {}, {"note": "", "extra_ids": ["x"]})
        for needle in ("- Replies: 1. Asks that failed: 0.", "- Replies that were only the word none: 0.",
                       "- Marks that said not sure: 1 of 1.", "- Seconds per reply: middle 4.0, slowest 4.0.",
                       "the 1 extra picture(s) at the end are left out of them", "## x (EXTRA: not in the scored set)"):
            self.assertIn(needle, sheet)
        self.assertLess(sheet.index("## a"), sheet.index("## x"), "the extras come after the scored pictures")


class IndexTests(_Case):
    def _rows(self):
        return [
            {"model": "m2", "picture": "b", "sample": 1, "full_path": "C:/o/m2/b-try1.png", "sheet_path": "C:/o/m2/grading-sheet.md", "extra": False},
            {"model": "m1", "picture": "a", "sample": 2, "full_path": "C:/o/m1/a-try2.png", "sheet_path": "C:/o/m1/grading-sheet.md", "extra": False},
            {"model": "m1", "picture": "x", "sample": 1, "full_path": "C:/o/m1/x-try1.png", "sheet_path": "C:/o/m1/grading-sheet.md", "extra": True},
        ]

    def test_the_index_has_five_plain_lines_the_scoring_rule_word_for_word_and_one_row_per_drawn_picture(self):
        text = self.mod.format_index(self._rows())
        for n in range(1, 6):
            self.assertIn(f"\n{n}. ", text)
        self.assertIn('0 to 10: is each mark on the thing it names; is the advice right for this boss by its note; a confident '
                      'wrong mark costs more than an honest "not sure"; no marks at all on a picture with a clear boss scores low, '
                      'not zero.', text)
        self.assertIn("## Every drawn picture (2 scored, 1 extra)", text)
        self.assertIn("| m1 | a | 2 | C:/o/m1/a-try2.png | C:/o/m1/grading-sheet.md (## a, then ### Try 2) |", text)
        self.assertIn("| m1 | x (EXTRA) | 1 |", text)
        self.assertLess(text.index("| m1 | a |"), text.index("| m2 | b |"), "sorted by model, then picture")
        self.assertLess(text.index("| m2 | b |"), text.index("| m1 | x (EXTRA) |"), "the extras are listed last")

    def test_the_index_is_built_from_every_finished_model_folder_and_skips_an_unfinished_one(self):
        import json

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, finished in (("m1", True), ("m2", False)):
                (root / name).mkdir()
                (root / name / "tries.json").write_text(json.dumps([
                    {"model": name, "picture": "a", "sample": 1, "full_path": f"{tmp}/{name}/a-try1.png"}]), encoding="utf-8")
                if finished:
                    (root / name / "grading-sheet.md").write_text("sheet", encoding="utf-8")
            out = self.mod.write_index(root, {"x"})
            text = out.read_text(encoding="utf-8")
        self.assertEqual(out.name, "GRADER-INDEX.md")
        self.assertIn("1 scored, 0 extra", text)
        self.assertIn("| m1 | a | 1 |", text)
        self.assertNotIn("| m2 |", text)

    def _row(self, model, picture, sample, reply, extra=False, error=""):
        got = self.mod.read_marks(reply)
        return {"model": model, "picture": picture, "sample": sample, "full_path": f"C:/o/{model}/{picture}-try{sample}.png",
                "sheet_path": f"C:/o/{model}/grading-sheet.md", "extra": extra, "marks": [m.__dict__ for m in got.marks],
                "said_none": got.said_none, "copied": got.copied, "unread": got.unread, "error": error}

    def _grading_rows(self):
        same = "hit, 0.5, 0.5, head, sure"
        return [
            self._row("m1", "a", 1, same), self._row("m1", "a", 2, same), self._row("m1", "a", 3, "hit, 0.5, 0.6, head, sure"),
            self._row("m1", "b", 1, "none"), self._row("m1", "b", 2, self.mod.EXAMPLE_LINE),
            self._row("m1", "b", 3, "kind, 0.2, 0.2, a thing, sure"), self._row("m1", "c", 1, "", error="TimeoutError: slow"),
            self._row("m1", "x", 1, same, extra=True),
            self._row("m2", "a", 1, same), self._row("m2", "a", 2, "hit, 0.5, 0.5, head, not sure"),
        ]

    def test_a_try_is_sorted_into_marks_none_copied_unread_or_failed(self):
        classes = [self.mod.try_class(r) for r in self._grading_rows()]
        self.assertEqual(classes, ["marks", "marks", "marks", "none", "copied", "unread", "failed", "marks", "marks", "marks"])
        self.assertEqual(self.mod.try_class(self._row("m", "p", 1, "")), "unread", "an empty reply is unread, not a mark")

    def test_a_try_with_the_same_marks_as_an_earlier_try_on_its_picture_is_listed_as_same_as_that_try(self):
        opens = self.mod.tries_to_open(self._grading_rows())
        m1 = {(t["picture"], t["sample"]): t["same_as"] for t in opens["m1"]}
        self.assertEqual(m1, {("a", 1): 0, ("a", 2): 1, ("a", 3): 0, ("x", 1): 0})
        m2 = {(t["picture"], t["sample"]): t["same_as"] for t in opens["m2"]}
        self.assertEqual(m2, {("a", 1): 0, ("a", 2): 0}, "not sure instead of sure is a different mark")

    def test_how_many_pictures_a_grader_must_open_counts_a_repeat_once_and_keeps_extras_apart(self):
        self.assertEqual(self.mod.open_counts(self._grading_rows()), {"m1": (2, 1), "m2": (2, 0)})

    def test_the_index_lists_tries_to_open_per_model_and_the_markless_tries_split_by_kind(self):
        text = self.mod.format_index(self._grading_rows())
        self.assertIn("### m1: open 2 scored picture(s) and 1 extra", text)
        self.assertIn("### m2: open 2 scored picture(s) and 0 extra", text)
        self.assertIn("| a | 2 | same as try 1 | C:/o/m1/a-try2.png |", text)
        self.assertIn("| a | 3 | open | C:/o/m1/a-try3.png |", text)
        self.assertIn("### none (1)\n\n- m1 | b | try 1", text)
        self.assertIn("### copied (1)\n\n- m1 | b | try 2", text)
        self.assertIn("### unread (1)\n\n- m1 | b | try 3", text)
        self.assertIn("### failed (1)\n\n- m1 | c | try 1", text)
        self.assertIn("scores low, not zero", text)
        self.assertNotIn("b-try1.png |", text.split("## Every drawn picture")[0], "no picture to open for a try with no marks")

    def test_tries_are_saved_with_the_copy_the_paths_and_the_extra_flag(self):
        import json

        t = self.mod.Try("x", 1, "m", "avoid, 0.04, 0.96, purple teapot, sure", 2.0, "", self.mod.read_marks(
            "avoid, 0.04, 0.96, purple teapot, sure"), full_path="f.png", preview_path="p.png")
        row = json.loads(self.mod.tries_json([t], {"x"}))[0]
        self.assertEqual((row["copied"], row["marks"], row["full_path"], row["extra_picture"]),
                         (["avoid, 0.04, 0.96, purple teapot, sure"], [], "f.png", True))


class PicturesTests(_Case):
    def test_only_pictures_with_a_boss_label_are_chosen(self):
        pics = [SimpleNamespace(id="a", boss="Wolfos"), SimpleNamespace(id="b", boss=""), SimpleNamespace(id="c", boss="Gohma")]
        self.assertEqual([p.id for p in self.mod.boss_pictures(pics)], ["a", "c"])

    def test_todays_labels_give_22_scored_boss_pictures_and_the_two_extras_are_among_the_labelled(self):
        reading = sys.modules["eval_screenshot_reading"]
        labelled = self.mod.boss_pictures(reading.load_pictures(REPO_ROOT / "tests" / "fixtures" / "screenshot_eval_v1.json", None))
        ids = [p.id for p in labelled]
        for extra in self.mod.EXTRA_IDS:
            self.assertIn(extra, ids)
        self.assertEqual(len([i for i in ids if i not in self.mod.EXTRA_IDS]), 22)


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
