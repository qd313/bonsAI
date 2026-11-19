# Plan 108d: the briefs, one per helper

How a brief is assembled: the session hands each helper [108-helper-rules.md](108-helper-rules.md), the section
below with its letter, the tip hash, the absolute path of its copy, and the plan id (108d). A section says: what a
player sees today, where it comes from, what to build, the files owned, the tests, and the check that proves it.
Evidence files are named `plan108d-<ROW>.json` by the driver or the session, never by a helper. The plan is
[108d-steam-input-layout-parse.md](../108d-steam-input-layout-parse.md).

**Line numbers are as read at tip `28306e896` on 2026-11-19 by one reader, not yet spot-checked by a second; the
session re-checks every section against the tip at go.** A lane that finds a line has moved re-greps and says so; a
lane that finds its brief wrong says so and stops rather than building the brief's mistake.

**The Deck facts in § 1 were read on the maintainer's Deck on 2026-11-19** with twelve read-only commands (`ls`,
`head`, `grep`, `wc`, `find`). Anything marked **(to confirm at step 0)** was not seen and must not be built on until
step 0 answers it.

## Rules special to plan 108d

1. **Nothing under Steam's folders is ever opened for writing.** Not by the plugin, not by a test, not by a script.
   Tests copy the fixture tree into a temporary home folder first.
2. **The Steam account number never enters the repo, a log line, a prompt or a chip.** It is the digits-only folder
   under `Steam Controller Configs`, and it also sits inside each layout on the `url` line. Fixtures use `12345678`.
   The `creator` line (a 17-digit id) is scrubbed the same way.
3. **No function in the new area raises to its caller.** A missing, huge, half-written or unknown-shaped file gives a
   "not read" result with a reason. Every public function has a test that feeds it garbage.
4. **Text from a layout file is untrusted.** Community layouts are written by strangers. Only these strings may ever
   reach the AI: key and button names from a fixed table in the code, and the English names of the game's own actions,
   each cut to 40 characters, one line, letters, digits, spaces and `' - / & ( ) . , : +` only. Never a layout's
   `description`, never a binding's own label (the text after the first comma), never a `title` from a community layout.
5. **Real shape only.** Lanes A, B and C test against lane F0's files. A hand-written snippet is allowed only for a
   broken-input test, and its comment says it is hand-written.
6. **Standard library only.** No new dependency, on either side.
7. **Words a person or the AI reads** come from this file, or from the option picked on board 7. A lane that wants a
   different sentence says so in its report; it does not ship its own.

---

## 1. What is on the Deck (the shared facts)

Steam's root is `~/.local/share/Steam` (`~/.steam/steam` and `~/.steam/root` are links to it). Under it:

| What | Where | Seen |
|---|---|---|
| The per-game folders and the choice lists | `steamapps/common/Steam Controller Configs/<account number>/config/` | one account folder; 53 game folders; 120 files |
| A game's own saved layout, per kind of controller | `…/config/<app id>/controller_neptune.vdf` (the Deck's own controls). Other kinds beside it: `controller_ps5.vdf`, `controller_ps4.vdf`, `controller_generic.vdf`, `controller_triton.vdf` | 20 KB to 135 KB, plain text |
| A named copy you saved | `…/config/<folder>/<name>_<n>.vdf`, for example `doom eternal/gamepad with mouse and gyro_0.vdf` | at least 6 files |
| A game added from outside Steam | the folder is the name in lower case (`google chrome`, `doom eternal`) or the program's name (`doometernalx64vkexe`, `2shipappimage`), not a number | many folders (not counted) |
| **The choice list for the Deck's own controls** | `…/config/configset_controller_neptune.vdf` | 1,929 bytes, 43 entries |
| Choice lists for other kinds | `configset_controller_ps5.vdf`, `…_ps4`, `…_xboxone`, `…_xbox360`, `…_xboxelite`, `…_switch_pro`, `…_generic`, `…_triton`, `…_steamcontroller_gordon`, `…_ps5_edge` | ten more files |
| Choice lists for single devices | `configset_<serial or id>.vdf` (12 files; eleven are 24 bytes, so empty; one names one game) | **(to confirm at step 0: does this beat the kind's list?)** |
| Steam's templates | `controller_base/templates/*.vdf` | 77 files, for example `controller_neptune_gamepad_fps.vdf`, `controller_neptune_gamepad+mouse.vdf`, `controller_neptune_wasd.vdf` |
| Community layouts | `steamapps/workshop/content/241100/<number>/` holding one file: `<long number>_legacy.bin` or `controller_configuration.vdf`. Plain text, same format, `"version" "2"` | 129 folders |
| A game's own shipped layouts | inside the game's install folder, for some games only (`Half-Life 2/steam_input/hl2/controller_gyro_neptune.vdf`) | not read in this plan |

**The choice list**, as written by Steam (real, cut to four entries):

```
"controller_config"
{
	"204450"
	{
		"workshop"		"702042106"
	}
	"220"
	{
		"autosave"		"1"
	}
	"782330"
	{
		"autosave"		"1"
	}
	"<one more app id>"
	{
		"template"		"controller_neptune_gamepad+mouse.vdf"
	}
}
```

Three kinds of entry were seen, 43 in all: `"autosave" "1"` (33; the layout is `<app id>/controller_neptune.vdf` in
the same folder), `"workshop" "<number>"` (6; the community folder above), `"template" "<name>"` (4). A template value
is either a file name in `controller_base/templates/` or the form `CLOUD_<folder>/<name>` (two seen:
`CLOUD_doom eternal/gamepad with mouse and gyro_0`), which is the named copy `<folder>/<name>.vdf` in the config
folder. Keys for outside games are words, not numbers (`"palworldexe"`, `"sohappimage"`), and can hold spaces.

**No entry means no file.** God of War (1593500), Hollow Knight (367520), Hades (1145360), Deep Rock Galactic
(548430), Stardew Valley (413150), Hogwarts Legacy (990080) and Sifu (2138710) are installed, have been played, and
have no entry and no folder. Portal 2 (620) has a `controller_ps5.vdf` and no entry in the Deck's list.

**A saved layout for a game that names its own actions** (Half-Life 2, `220/controller_neptune.vdf`, 4,208 lines;
real, cut; the account number replaced):

```
"controller_mappings"
{
	"version"		"3"
	"revision"		"158"
	"title"		"#Title_HL2_Gyro"
	"description"		"#SettingsController_AutosaveDescription"
	"creator"		"-1"
	"progenitor"		"game://hl2/controller_gyro_neptune.vdf"
	"url"		"autosave:///home/deck/.local/share/Steam/steamapps/common/Steam Controller Configs/<account number>/config/220/controller_neptune.vdf"
	"export_type"		"personal_cloud"
	"controller_type"		"controller_neptune"
	"actions"
	{
		"GameControls"
		{
			"title"		"#Set_InGameControls"
			"legacy_set"		"0"
			"StickPadGyro"
			{
				"Move"
				{
					"title"		"#Action_Movement"
					"input_mode"		"joystick_move"
				}
			}
			"Button"
			{
				"attack"		"#Action_Game_Fire"
				"reload"		"#Action_Game_Reload"
				"jump"		"#Action_Game_Jump"
				"sc_flashlight"		"#Action_Game_Flashlight"
			}
		}
		"VehicleControls" { … }
	}
	"action_layers" { }
	"localization"
	{
		"english"
		{
			"Set_InGameControls"		"In-Game Controls"
			"Action_Movement"		"Movement"
			"Action_Game_Fire"		"Primary Fire"
			"Action_Game_FireAlt"		"Alternate Fire"
		}
		… the other languages, to line 2057 …
	}
	"group"
	{
		"id"		"0"
		"mode"		"four_buttons"
		"inputs"
		{
			"button_a"
			{
				"activators"
				{
					"Full_Press"
					{
						"bindings"
						{
							"binding"		"xinput_button A, , "
						}
					}
				}
				"disabled_activators" { }
			}
		}
	}
	… 44 more "group" blocks, the key repeated …
	"preset"
	{
		"id"		"0"
		"name"		"GameControls"
		"group_source_bindings"
		{
			"12"		"switch active"
			"13"		"button_diamond active"
			"28"		"joystick active"
			"14"		"left_trigger active"
			"15"		"right_trigger active"
			"27"		"right_joystick active"
			"29"		"dpad active"
			"36"		"gyro inactive"
			"46"		"gyro active"
			"42"		"left_trackpad inactive"
			"44"		"left_trackpad active"
		}
	}
	… two more "preset" blocks …
	"settings" { "left_trackpad_mode" "0" "right_trackpad_mode" "0" }
}
```

What that shows, and what every lane must respect:

- **Keys repeat.** `group`, `preset` and `binding` appear many times at one level. A reader that builds a plain
  dictionary loses all but the last.
- **A value starting with `#` is a name to look up** in `localization` → `english`, without the `#`, ignoring case
  (the F.E.A.R. file has `"title" "#Title"` at the top and `"title"` in lower case in the word list).
- **A preset says which groups are in use.** `"<group id>" "<source> active"`. A group marked `inactive` is not the
  one in use. A third word after `active` (general knowledge: `modeshift`) was **not seen here**; treat a line with a
  third word as "not the main group".
- **Kinds of binding seen** (the text before the first comma): `game_action <set> <action>` (57 in this file, for
  example `game_action GameControls jump`), `xinput_button <NAME>` (names seen in both cases: `A`, `B`, `X`, `Y`,
  `shoulder_left`, `shoulder_right`, `start`/`START`, `select`/`SELECT`, `dpad_up`/`DPAD_UP` and the other three,
  `JOYSTICK_LEFT`, `JOYSTICK_RIGHT`), `key_press <KEY>` (`F`, `SPACE`, `LEFT_SHIFT`, `ESCAPE`, `TAB`, `UP_ARROW`, digits),
  `mouse_button <LEFT|…>`, `mouse_wheel <SCROLL_UP|SCROLL_DOWN>`, `controller_action <what>` (`system_key_1`,
  `empty_sub_command`), `mode_shift <source> <group id>` (no commas; The Sims 4 file).
- **Ways of pressing seen:** `Full_Press` (83 in this file), `Soft_Press` (2), `release` (3). Others exist (general
  knowledge: long press, double press, start press, chord); not seen here.
- **Group modes seen:** `four_buttons`, `dpad`, `joystick_move`, `joystick_mouse`, `absolute_mouse`, `gyro_to_mouse`,
  `single_button`, `switches`, `trigger`.
- **Names the file uses for the Deck's buttons** (F.E.A.R. file): `button_a`, `button_b`, `button_x`, `button_y`,
  `left_bumper`, `right_bumper`, `button_back_left`, `button_back_left_upper`, `button_back_right`,
  `button_back_right_upper`, `button_escape`, `button_menu`, `click`, `edge`, `dpad_north`, `dpad_south`, `dpad_east`,
  `dpad_west`. Sources in presets: `switch`, `button_diamond`, `joystick`, `right_joystick`, `left_trigger`,
  `right_trigger`, `dpad`, `gyro`, `left_trackpad`, `right_trackpad`.

**A keys-only layout** (F.E.A.R., `21090/controller_neptune.vdf`; its title is "Keyboard (WASD) and Mouse"; the
`switches` group, real, braces dropped):

```
"mode" "switches"
  "button_escape"  → "binding" "key_press ESCAPE, , "
  "button_menu"    → "binding" "key_press TAB, , "
  "left_bumper"    → "binding" "mouse_wheel SCROLL_DOWN, , "
  "right_bumper"   → "binding" "mouse_wheel SCROLL_UP, , "
  "button_back_left" → …
```

**A plain gamepad layout** (DOOM Eternal, `782330/controller_neptune.vdf`, 1,044 lines): every binding is
`xinput_button …`. It has no `actions` block; its one preset is named `Default`; its `progenitor` is
`template://controller_neptune_gamepad_fps.vdf`.

**Which games have what on this Deck** (for tests and Deck rows): named actions in the Deck's file: 220 Half-Life 2,
362890 Black Mesa, 550 Left 4 Dead 2, 1167630 Teardown (also 29 key presses). Keys: 21090 F.E.A.R. (26), 1222670 The
Sims 4 (93, with mode shifts), 12180 Grand Theft Auto 2 (23), 282030 Carmageddon 2 (39). Plain pad: 782330 DOOM
Eternal. A community layout: 204450 Call of Juarez Gunslinger (`702042106`).

## 2. The contract every lane builds against

A new back-end area, `py_modules/backend/steam_input/`. Lane A writes `__init__.py` (the house header, as
`py_modules/backend/power/__init__.py`) in its first commit and nobody edits it again. A lane that needs the contract
changed stops and says so; the session changes it here first.

```python
# steam_text.py  (lane A)
Node = list[tuple[str, "str | Node"]]      # pairs in file order; a repeated key appears once per time it is written
class SteamTextError(ValueError): ...
def parse_steam_text(text: str, *, max_nodes: int = 60_000, max_depth: int = 24) -> Node
def child(node: Node, key: str) -> "Node | None"       # first nested block with that key, case ignored
def children(node: Node, key: str) -> list[Node]        # every nested block with that key, in order
def value(node: Node, key: str, default: str = "") -> str   # first plain value with that key, case ignored

# layout_files.py  (lane B)
LAYOUT_READ_MAX_BYTES = 512 * 1024
CHOICE_LIST_MAX_BYTES = 256 * 1024
DECK_CONTROLLER_TYPE = "controller_neptune"
FIRST_OUTSIDE_GAME_ID = 2 ** 31            # a game added from outside Steam has a number at or above this
@dataclass(frozen=True)
class LayoutChoice:
    kind: str            # "saved" | "named_copy" | "template" | "community" | "none" | "not_steam_game" | "unreadable"
    path: str = ""       # real path of the layout file; "" when there is none
    detail: str = ""     # the template's file name or the community number
    warnings: tuple[str, ...] = ()
def layout_roots_for_home(home: str) -> list[str]
def path_allowed_for_layout_read(candidate_path: str, home: str) -> bool
def find_layout_for_game(app_id: str, *, home: str | None = None,
                         controller_type: str = DECK_CONTROLLER_TYPE) -> LayoutChoice
def read_layout_text(choice: LayoutChoice, *, home: str | None = None) -> str   # "" when not allowed or too big
def masked_layout_path(path: str) -> str   # from "Steam Controller Configs/" on, the account number as "<you>"

# layout_summary.py  (lane C)
@dataclass(frozen=True)
class ControlRow:
    button: str          # "A", "L4 (back grip)", "Right trackpad", "D-pad up"
    does: str            # "Jump" | "sends the F key" | "sends mouse wheel up" | "moves the camera like a mouse"
    how: str = ""        # "" for a plain press; else "soft pull", "on release", "long press"
@dataclass(frozen=True)
class ControlSet:
    name: str            # "In-Game Controls" | "Default"
    rows: tuple[ControlRow, ...]
@dataclass(frozen=True)
class LayoutSummary:
    kind: str                         # "named_actions" | "keys" | "standard_pad"
    sets: tuple[ControlSet, ...]      # the first is the main one
    action_words: tuple[str, ...] = ()   # English names of the game's own actions, cleaned (rule 4)
    unnamed_actions: int = 0          # bound game actions with no English name found
    notes: tuple[str, ...] = ()       # fixed sentences only, e.g. "2 more sets of controls are not listed."
def summarise_layout(tree: Node) -> "LayoutSummary | None"    # None when the tree is not a layout

# controls_context.py  (lane D)
CONTROLS_CAPABILITY_KEY = "steam_logs_read"   # one line to change if call d1 picks a new switch
CONTROLS_BLOCK_BUDGET_BYTES = 2048
def question_asks_about_controls(question: str) -> bool
def question_names_an_action(question: str, action_words: Sequence[str]) -> bool
def build_controls_block(summary: LayoutSummary, choice: LayoutChoice, *,
                         budget_bytes: int = CONTROLS_BLOCK_BUDGET_BYTES) -> str
@dataclass
class ControlsForAsk:
    block: str = ""       # the text for the AI; "" when nothing is attached
    state: str = ""       # "" | "read" | "switch_off" | "no_saved_layout" | "not_steam_game" | "unreadable"
    path: str = ""        # already masked
    kind: str = ""        # LayoutSummary.kind
    choice: str = ""      # LayoutChoice.kind
    rows: int = 0
    notes: str = ""
    read_ms: int = 0
    def record(self) -> dict[str, Any]   # the six "controls_layout_*" fields below, always all six
def controls_for_ask(settings: dict, app_id: str, question: str, *, home: str | None = None) -> ControlsForAsk
```

The Show details record gains six fields, all from `record()`: `controls_layout_state`, `controls_layout_path`,
`controls_layout_kind`, `controls_layout_choice`, `controls_layout_rows`, `controls_layout_notes`.

---

## S0 — The test to find out (★★, the session with the Deck driver; no helper builds anything)

**Why first.** Everything in § 1 was read from the outside. Nobody has yet turned one of these files into a table and
held it against Steam's own layout screen. The go and no-go lines are in the plan's § 5 and are not moved after the
numbers are in (helper rule 4).

**Runbook** (the session writes the driver's block from this; every step on the Deck is a read):

1. **Copy** (the driver, `scp` from the Deck, nothing written there) into the workshop folder
   `archive/research/<date>-p108d-layout-samples/`, keeping the folder shape, from
   `~/.local/share/Steam/steamapps/common/Steam Controller Configs/<account number>/config/`: every `configset_*.vdf`
   (23 files, 24 KB together); `220/`, `362890/`, `550/`, `1167630/`, `21090/`, `1222670/`, `12180/` and `782330/`
   `controller_neptune.vdf`; `doom eternal/gamepad with mouse and gyro_0.vdf`. From
   `~/.local/share/Steam/steamapps/workshop/content/241100/702042106/` its one file. From
   `~/.local/share/Steam/controller_base/templates/`: `controller_neptune_gamepad+mouse.vdf` and
   `controller_neptune_gamepad_joystick.vdf`. That is eleven layouts: eight saved (four named, three keys, one plain
   pad), one named copy, one community, one template (the second template is spare).
2. **A throwaway script** in the session's scratch folder (standard library, about 150 lines, not committed): a reader
   for the nested text that keeps repeated keys; for each layout print the main preset's table (button, what it does)
   using the rules in lanes A and C below. Time each file. Count, per named-actions file, bound `game_action`s in the
   main preset and how many got an English name. Measure each table's size in bytes.
3. **The truth check on the Deck** (the driver). For Half-Life 2 and F.E.A.R.: open Steam's own layout screen for the
   game (`steam://controllerconfig/<app id>`, the address the Developer tab's jump uses,
   `src/features/developer/steam-input-lexicon.ts` line 42; the game does not need to run), read ten buttons and what
   the screen says each does: A, B, X, Y, L4, L5, R4, R5 and the two small buttons beside the screen. Read the page
   text if the rig can; else one screenshot per page for the session to read; if neither works this step becomes the
   maintainer's (ten buttons, two games). Compare with the script's table.
4. **Three facts** (the driver, reads only):
   - *Which list wins.* 204450 has a community layout in the Deck's list and a template in one single-device list.
     Read both files' English titles from the copies first; then open that game's layout screen and read the layout's
     name. Record which list it matched.
   - *A never-set-up game.* Confirm 1593500 has no entry in any `configset_*.vdf` and no folder, and read the name the
     layout screen shows for it.
   - *Which user.* Count the digit-named folders under `Steam Controller Configs` and under `userdata`. From
     `~/.local/share/Steam/config/loginusers.vdf` record **only**: how many user blocks, whether a `MostRecent` key
     exists (general knowledge, not yet confirmed here), and whether the most recent user's 17-digit key minus
     76561197960265728 equals the folder name (yes or no). Never record a name or a number from that file.
5. **Write** `plan108d-P108D-STEP0.json` (the workshop's test-evidence folder): the five results against the five
   lines, per file: bytes, lines, read time, table bytes, named and unnamed action counts; the twenty truth pairs; the
   three facts; and the six button names the truth check settled (`button_back_left`, `button_back_left_upper`,
   `button_back_right`, `button_back_right_upper`, `button_escape`, `button_menu`: which printed label each is).
6. **Correct this file** (§ 1, and the name table in lane C) from what step 0 found, before lane F0 starts.

## M — Two mock-up tabs on board 7 (★, Opus at medium or high by the house rule of 2026-11-19, as plan 107's board 6 lanes)

Follow helper rule 10 and `docs/demos/mockup-board-5/README.md`. Board 7's folder and tab numbers are given in your
task; you own only your two tab files per tab.

**Tab "Layout switch" (call d1).** *Today:* the Permissions tab's rows, with "Read game & screenshot context" and its
line "Attaches screenshots and game logs to your questions for the AI." (copy both from
`src/features/permissions/PermissionsTab.tsx` lines 206 and 207; the other rows from the same file). *Option A:* the
same row, its line reading "Attaches screenshots, game logs and your controller layout to your questions for the AI."
*Option B:* a sixth row, "Read controller layouts", line "Reads the button layout Steam saved for the game you are
playing. Never changes it.", off, with the two-button confirm box other switches use (`src/styles/confirmBoxButtons.ts`).
*Option C:* plan 101's row "Read game install folders" with its line widened to name layouts (the words are in
`docs/planning/assets/101-lane-briefs.md` lines 94 and 95). Each card says what it costs: A no new stop; B one more
D-pad stop and one more thing to turn on; C waits on another plan. Draw at all three text sizes if the kit has them,
because the longer line may wrap.

**Tab "Layout chip" (call d6).** *Today:* Show details with the Proton log chip as the neighbour ("Read Proton log
tail", short name "Proton log"; `py_modules/backend/answer/transparency_service.py` lines 575 and 576), in the two-row
chip shape plan 105 built (the worked example is the density board, tab 1, `docs/demos/mockup-board-2/`). *Option A:*
chip "Controls"; opened: title "Controller layout", line "Read your controller layout", then the lines in lane E's
table. *Option B:* chip "Buttons"; opened: "Your buttons for this game". *Option C:* chip "Layout". Each option shows
all four states pressable: read; switch off; no saved layout; added from outside Steam. Arrow keys move along the
chips; Enter opens one.

## F0 — Test files cut from the real ones (★, Sonnet medium; waits for S0's go and call d8)

**Build.** From the workshop's `archive/research/<date>-p108d-layout-samples/`, write a small Steam tree under
`tests/fixtures/steam_input/steam/` that keeps Steam's own shape:

```
steamapps/common/Steam Controller Configs/12345678/config/configset_controller_neptune.vdf
steamapps/common/Steam Controller Configs/12345678/config/configset_FAKEDEVICE0001.vdf
steamapps/common/Steam Controller Configs/12345678/config/220/controller_neptune.vdf
steamapps/common/Steam Controller Configs/12345678/config/1167630/controller_neptune.vdf
steamapps/common/Steam Controller Configs/12345678/config/21090/controller_neptune.vdf
steamapps/common/Steam Controller Configs/12345678/config/1222670/controller_neptune.vdf
steamapps/common/Steam Controller Configs/12345678/config/782330/controller_neptune.vdf
steamapps/common/Steam Controller Configs/12345678/config/doom eternal/gamepad with mouse and gyro_0.vdf
steamapps/workshop/content/241100/702042106/<its real file name>
controller_base/templates/controller_neptune_gamepad+mouse.vdf
```

Rules for the cut, the same for every file: tabs, quoting and line order exactly as Steam wrote them; the account
number becomes `12345678` wherever it appears; a 17-digit `creator` becomes `76561190000000000`; under `localization`
keep `english` and one other language whole and delete the rest; a `description` longer than 80 characters is cut to
its first 77 and `...`; nothing else changes. The choice list keeps its real entries for 220, 1167630, 21090,
1222670, 782330 and 204450, the `CLOUD_doom eternal/gamepad with mouse and gyro_0` entry, one built-in template
entry, one entry whose key is words with a space, and nothing else. The single-device list keeps the one real entry (204450). Add
`tests/fixtures/steam_input/README.md`: where each file came from, the date, exactly what was cut, and that the words
in them are Valve's and the games' own, kept only as far as the tests need.

**Files owned:** everything under `tests/fixtures/steam_input/`. Nothing else. **Tests:** none of your own; lanes A to
C prove the files. **Before it lands** the open-source reviewer reads the folder (questions at the end of this file).
**Check:** P108D-PARSE-REAL depends on it.

## A — The reader for Steam's text files (★★ `[platform]`, Sonnet high; waits for F0)

**What a player sees today.** Nothing. bonsAI reads three of Steam's text files and each time picks one value out by
pattern: the language (`py_modules/backend/prompts/reply_language_service.py`, `parse_language_from_config_vdf`, line
134), a game's name (`py_modules/backend/media/screenshot_media.py`, `lookup_steam_app_name`, lines 522 to 543) and a
screenshot's caption (same file, lines 546 to 570). None can read nested blocks or repeated keys. Do not change them.

**What to build.** `py_modules/backend/steam_input/__init__.py` and `steam_text.py`, exactly as § 2 names them.

1. The format: a quoted key, then either a quoted value or `{ … }`; whitespace between; `//` to the end of a line is
   a comment outside quotes; inside quotes `\"` and `\\` are escapes and any other backslash is kept as written; an
   empty block `{ }` is an empty list. The top of a layout is one pair (`"controller_mappings" { … }`).
2. Keep order and repeats (§ 1: `group`, `preset`, `binding`). Never build a dictionary keyed by name.
3. Limits, as arguments with the defaults in § 2: more pairs than `max_nodes`, deeper than `max_depth`, an unclosed
   quote or brace, a stray token: raise `SteamTextError` with a short reason. It is the only thing this file raises,
   and the callers in lanes B and D catch it.
4. No recursion deeper than the depth limit allows (an explicit stack is fine), no regular expression over the whole
   text, no `eval`.
5. `child`, `children`, `value` ignore the key's case.

**Files owned:** `py_modules/backend/steam_input/__init__.py`, `py_modules/backend/steam_input/steam_text.py`,
`tests/test_steam_input_text.py`. **Tests:** every file in lane F0's tree parses; the Half-Life 2 one yields 45 `group`
blocks and 3 `preset` blocks under its top pair (the numbers are from the real file: 45 `group` lines and 3 `preset`
lines were counted on the Deck; if F0's copy differs, report it, do not change the test to fit); a text made by
repeating the English word list under made-up language names until it is the real size (about 135 KB) parses in under
half a second; garbage, an empty string, a lone brace, a file cut off mid-quote and a nest 100 deep each raise
`SteamTextError` (these five are hand-written and say so). **Check:** P108D-PARSE-REAL.

## B — The finder: which file is in use for this game (★★★ `[platform]`, Sonnet high; waits for A)

**What a player sees today.** bonsAI knows two Steam folders under the home folder
(`py_modules/backend/ask/proton_troubleshooting_logs.py`, `steam_roots_for_home`, line 77) and guards its one disk read
there with a real-path check (`path_allowed_for_proton_log`, lines 85 to 118). That guard is the model.

**What to build.** `py_modules/backend/steam_input/layout_files.py`, as § 2.

1. `layout_roots_for_home`: for each root from `steam_roots_for_home` that exists, the three folders that may be read:
   `steamapps/common/Steam Controller Configs/<digits>/config`, `controller_base/templates`,
   `steamapps/workshop/content/241100`. Real paths, duplicates dropped (the two roots are links to one folder on a Deck).
2. **Which account folder.** One digit-named folder: use it. Several: the rule step 0 confirmed (expected: the most
   recent user in `config/loginusers.vdf`, bounded read of 64 KiB, the 17-digit key minus 76561197960265728; else the
   folder whose choice list changed last) and a warning "More than one Steam user was found; the most recent one's
   layouts were read." Never log or return anything else from that file.
3. `find_layout_for_game(app_id)`: blank id → `none`. Not all digits, or at or above `FIRST_OUTSIDE_GAME_ID` →
   `not_steam_game`. Read `configset_<controller_type>.vdf` (bounded), parse with lane A, find the entry whose key is
   the id. No entry → `none`. `autosave` → `<config>/<id>/<controller_type>.vdf`, kind `saved`. `workshop` with a
   digits-only value → the single file in `…/241100/<value>/` whose name ends `_legacy.bin` or `.vdf` (two or more
   such files, or none: `unreadable`), kind `community`. `template` starting `CLOUD_` → strip it, split once at `/`,
   refuse either part if it is empty, holds `..`, a backslash, a second `/` or a control character; the file is
   `<config>/<folder>/<name>.vdf`, kind `named_copy`. Any other `template` value → refuse the same characters and a `/`;
   the file is `controller_base/templates/<value>`, kind `template`, `detail` the value. Anything else → `unreadable`.
4. **A second record.** If any other `configset_*.vdf` in the folder whose name does not start
   `configset_controller_` has an entry for the id, add the warning "This Deck has a second record for this game; the
   layout shown may not be the one in use." (Replace this rule with the true one if step 0 found which list wins.)
5. `path_allowed_for_layout_read`: real path; a regular file; under one of the three folders plus the separator; at
   most one folder below a config folder or a community folder, none below templates; name ends `.vdf` or
   `_legacy.bin`. `find_layout_for_game` checks every path with it before returning it; a path that fails is
   `unreadable`.
6. `read_layout_text`: checks the path again, refuses a file over `LAYOUT_READ_MAX_BYTES`, reads as UTF-8 with
   replacement. `masked_layout_path` as § 2.

**Files owned:** `layout_files.py`, `tests/test_steam_input_layout_files.py`. **Must not touch**
`proton_troubleshooting_logs.py` (import `steam_roots_for_home` from it). **Tests**, each on a temporary home holding a
copy of F0's tree at `.local/share/Steam`: 220 → `saved`; 204450 → `community` plus the second-record warning; the
template entry → `template`; the `CLOUD_` entry → `named_copy`; 1593500 → `none`; `3000000000` → `not_steam_game`;
a `template` value of `../../../../etc/passwd`, an absolute path, a value with a backslash → `unreadable`, and no file
outside the tree is opened (make the test prove it: a link inside the config folder that points outside the tree is
refused; skip that one case on Windows if links cannot be made, and say so); a 600 KB layout → `""` from
`read_layout_text`; two account folders → the warning; a choice list that is garbage → `unreadable`, no exception.
Break the path guard on purpose once, see the escape test fail, put it back, and name that failure in the commit
message. **Check:** P108D-PARSE-REAL. The security reviewer reads this lane before it lands.

## C — The boil-down: a file becomes a short table (★★★ `[platform]`, Sonnet high; waits for A; runs beside B and D)

**What to build.** `py_modules/backend/steam_input/layout_summary.py`, as § 2. A pure function on lane A's tree.

1. The top pair must be `controller_mappings`; else `None`.
2. Words: `localization` → `english` as a lookup that ignores case. `#Name` looks up `Name`. Clean every looked-up
   string by rule 4 at the top of this file (40 characters, one line, the allowed characters; anything else dropped).
3. Sets of controls: each block under `actions` is one (its `title` looked up; its `Button` block is action key →
   name; its `StickPadGyro` block is action key → block with a `title`). No `actions` block: one set named "Default".
4. For each `preset`, in file order: its `name` is a set's key (or `Default`). Take the lines of
   `group_source_bindings` whose second word is `active` and that have no third word. For each, find the `group`
   with that `id` and walk `inputs` → input → `activators` → way of pressing → `bindings` → every `binding`.
5. **What a binding does** (the text before the first comma, split on spaces; never use what follows the comma):
   `game_action <set> <action>` → that action's English name (none found: the action key with `_` as spaces, and
   count it in `unnamed_actions`); `key_press K` → "sends the K key" (keys through a fixed table: `SPACE` → Space,
   `LEFT_SHIFT` → Left Shift, `UP_ARROW` → Up Arrow, `ESCAPE` → Escape, `TAB` → Tab, a single letter or digit as it
   is; a key not in the table → the key lower-cased with `_` as spaces, cleaned by rule 4); `mouse_button LEFT` →
   "sends the left mouse button"; `mouse_wheel SCROLL_UP` → "sends mouse wheel up"; `xinput_button NAME` → "the
   normal NAME button" through a fixed table; `mode_shift <source> <id>` → "changes what the <source> does while
   held"; `controller_action …` and anything unknown → skipped and counted in one note ("3 bindings bonsAI does not
   recognise were left out.").
6. **Which button**, from the source and the input name, through one fixed table. From § 1: `button_a` A, `button_b`
   B, `button_x` X, `button_y` Y, `left_bumper` L1, `right_bumper` R1, `dpad_north` D-pad up (and the other three),
   `click` under `joystick` L3 and under `right_joystick` R3, `click` under a trigger "full pull", `edge` under a
   trigger "soft pull" **(to confirm at step 0)**, the trackpads and gyro by their plain names. The four back grips and
   the two small buttons take the labels step 0 recorded; until this section is corrected they are **(to confirm at
   step 0)** and must not be guessed.
7. **Sticks, pads and gyro** get one row each from the group's `mode`: `joystick_move` "works as a stick",
   `joystick_mouse`, `absolute_mouse` and `gyro_to_mouse` "moves the camera like a mouse", `dpad` and `four_buttons`
   their own rows, any other mode "set to <mode with spaces>". In a named-actions layout the group may name the
   action it drives (**not seen here**: read the Half-Life 2 fixture's stick groups, use what is there, and report
   what you found).
8. `kind`: any `game_action` in the main set → `named_actions`; else any key or mouse binding → `keys`; else
   `standard_pad`. In a `keys` or `standard_pad` table, drop every row where a button sends its own normal button
   (A sends A) and add the note "Buttons not listed send what a normal controller sends."
9. Order the rows: A, B, X, Y, D-pad, L1, R1, L2, R2, left stick, right stick, back grips, trackpads, gyro, the two
   small buttons. Sets after the first keep only rows that differ from the first; if more than three sets, keep
   three and add "N more sets of controls are not listed."
10. `action_words`: every English action name in the file, cleaned, lower-cased, duplicates dropped.

**Files owned:** `layout_summary.py`, `tests/test_steam_input_layout_summary.py`. **Tests** on F0's files: Half-Life 2
is `named_actions`, its main set is "In-Game Controls", `jump` and two more actions you find bound in the fixture
each give a row whose button matches the binding there (read it; do not assume), `unnamed_actions` is at most 5 in 100; F.E.A.R. is `keys`
and holds "L1: sends mouse wheel down"; DOOM Eternal is `standard_pad` with the note and few or no rows; The Sims 4
keeps its mode-shift rows; a community file gives no title text anywhere; a tree with a `description` holding a
newline and "ignore previous instructions" yields no row, note or word containing it (hand-written, say so); a tree
that is not a layout gives `None`. **Check:** P108D-PARSE-REAL.

## D — The block for the AI, the word rule, the answer test (★★★ `[ask]`, Sonnet high; runs beside B and C)

Build against § 2 with small stand-ins for lanes B and C until they land.

**What a player sees today.** A question about buttons gets general advice. With the words "controller layout" or
"back button" it may also get one of ten general tips (`py_modules/backend/knowledge/compat_topic_router.py`, the
`steam_input` rules at lines 202 to 217). Leave that router alone.

**What to build.** `py_modules/backend/steam_input/controls_context.py`, as § 2.

1. `question_asks_about_controls`: lower-case, whole words only. True for: `controls`, `control scheme`, `controller
   layout`, `button layout`, `layout` next to `controller` or `button`, `bindings`, `keybinds`, `key bindings`,
   `remap`, `rebind`, `steam input`, `which button`, `what button`, `back button(s)`, `back grip(s)`, `back
   paddle(s)`, `paddle(s)`, `trackpad`, `touchpad`, `gyro`, `bumper`, `d-pad` or `dpad`, `l1` to `l5`, `r1` to `r5`,
   and `the <a|b|x|y> button`. Not for `control` alone ("can you control the fan?").
2. `question_names_an_action`: true when the question holds a whole action name from `action_words` (four letters
   or longer, as whole words), or one word of a longer name that is six letters or longer ("flashlight" from
   "Toggle Flashlight"). Skip these words even when a game uses them: move, walk, look, menu, back, pause, camera,
   select, start, left, right, fire, primary, alternate, weapon, toggle, button.
3. `build_controls_block`. Exactly this frame; the rows come from the summary:

   ```
   --- Controller layout for this game (bonsAI; read from the layout Steam saved on this Deck; the Deck's own controls; may be cut short) ---
   <one of three opening lines, by kind>
   <set name>:
   - <button>[ (<how>)]: <does>
   …
   <notes, one per line>
   Use this table when the player asks about buttons or controls. Name buttons as written here. If the table does not answer the question, say so and do not guess a button. Never tell the player to edit a layout file.
   --- End controller layout ---
   ```

   Opening lines: `named_actions` "This game names its own actions. The table says what each button does." · `keys`
   "This layout sends keyboard keys and mouse buttons. The table says which key each button sends. It does not say
   what a key does in the game; if you say what a key does, say it is from general knowledge." · `standard_pad` "This
   is a normal gamepad layout. Only what differs from a normal controller is listed." For a `community` or `template`
   choice add "The player picked a community layout." or "The player picked one of Steam's templates." Cut whole rows
   from the end until the block fits the budget, then add "(N more rows not shown)". Never cut the last two lines.
4. `controls_for_ask(settings, app_id, question)`: (a) blank `app_id` → empty result. (b) switch off
   (`capability_enabled(settings, CONTROLS_CAPABILITY_KEY)` is false; the Kids lock makes it false): if the question
   asks about controls → state `switch_off`; else empty. **Open no file in this branch.** (c) find the layout (lane
   B). `not_steam_game`, `none`, `unreadable`: return that state only when the question asks about controls, else
   empty. For `none`, if call d2 was answered (b), the block is the frame's first and last lines around the one line
   "No saved layout was found for this game, so it is on its default controls. bonsAI has not read those." (d) read,
   parse, summarise; any `SteamTextError` or `None` → `unreadable` as in (c). Keep the last eight summaries in memory
   keyed by path, and reuse one only when the file's size and change time are the same. (e) attach when the question
   asks about controls, or (call d5 b) names an action; else empty. `read_ms` is the time (b) to (e) took.
5. One log line per attach or not-read state: `controls layout: state=%s kind=%s choice=%s rows=%d ms=%d`. Never a
   path, never file text.

**Files owned:** `controls_context.py`, `tests/test_steam_input_controls_context.py`. **Tests.** Must attach (control
words): "What do my back buttons do?", "Which button is jump?", "What are the controls?", "How do I remap the
trackpad?", "What does L4 do in this game?", "Is gyro on for this game?", "What's my controller layout?", "What does
the right trackpad do?", "Which button reloads?", "What are my key bindings?", "What does the X button do?", "Are the
back grips bound to anything?": 12 of 12. Must attach by an action's name, with the Half-Life 2 fixture: three
questions you write from three names that are in the fixture's English list. Must not attach, same fixture: "Who is
the G-Man?", "Why is my game crashing?", "How long is this game?", "What settings should I use?", "Is there a boss in
this chapter?", "Thanks!", "How well does this game run on Deck?", "Where do I go after the canals?", "What's the
story so far?", "Why does my Deck run hot?", "Can you control the fan?", "What model are you?": at most 1 of 12, and
name it in your report. Also: the switch off opens no file (patch `open` in the three new modules to fail the test
if called); the Kids lock the same; the budget cut keeps the frame; the cache re-reads when the change time moves;
every state's `record()` has all six fields.

**The answer test** (helper rule 6: take the lock; one call at a time; nothing it writes enters the repo). With the
model tag `scripts/kb/eval_kb_answers.py` uses for the Deck, a short script of your own in your scratch folder: a
plain system prompt, then the block built from a fixture. Six questions the table answers (four from Half-Life 2, two
from F.E.A.R., each naming something the fixture binds) and two it does not, three tries each with a seed per try,
each also run once without the block. Report a table. **Pass, written before measuring:** with the block, 15 of the
18 covered answers contain the table's button name; of the 6 uncovered answers, 0 name a button as fact. A miss is
reported as a number, not fixed by rewording until it passes: one rewording round is allowed, and it is said.
**Check:** P108D-EVAL.

## E — The join and the chip (★★★ `[ask]`, Sonnet high; the session reads the diff line by line; waits for B, C, D)

**What a player sees today.** On a troubleshooting question with the switch on, the end of the game's log is read
off the main thread, stacked with the knowledge cards under one size limit, and shown as a chip
(`py_modules/backend/ask/game_ai_request.py`, lines 414 to 457 read the log, 657 to 661 stack, 700 to 703 may stack
again, 1063 to 1074 hand the facts to the record; `py_modules/backend/knowledge/knowledge_base_chips.py`,
`StackedContext` at 577 and `stack_context_blocks` at 587 to 628; `py_modules/backend/answer/transparency_service.py`,
the Proton chip at 560 to 582 and the record's fields at 934 to 936 and 969 to 970).

**What to build.** One commit per numbered item; about a dozen new lines in `game_ai_request.py`, no more: the
logic lives in lane D's file.

1. `stack_context_blocks` gains a keyword `controls_text: str = ""`, stacked **first** (it is small and fixed), and
   `StackedContext` gains `controls_attached: bool = False`. Every caller that does not pass it behaves as today.
   Update the pinned shape in `tests/test_seam_contracts.py` (line 55) in the same commit, on purpose.
2. `notes_for_the_ai` (`py_modules/backend/knowledge/kb_notes_turn_flags.py`, lines 115 to 139) stacks a second time
   with only the Proton text when a turn's notes are held back (line 138). Give it `controls_text: str = ""` and pass
   it through there, or that path silently drops the table.
3. In `run_game_ai_request`, after the Proton section closes (line 457) and before `shortcut_name = ""` (line 459):
   `controls = await asyncio.get_running_loop().run_in_executor(None, lambda: controls_for_ask(settings, app_id,
   question_for_retrieval))`, the way the Proton section does at lines 433 to 438.
   Use `question_for_retrieval`, not `question_for_model`: the second can carry an earlier answer's text (line 399)
   and would trip the word rule. It sits after the step that sets a running game aside for a named story game (line
   382), so a question about another game reads no layout. Pass `controls_text=controls.block` at both stack calls
   (lines 657 and 700). Add `**controls.record()` to the record's facts beside `**user_notes.record()` (line 1067).
4. `build_ollama_route_snapshot` copies the six `controls_layout_*` fields from `ollama_result` (beside lines 934 to
   936). `build_context_chips_manifest` adds one chip, id `controls_layout`, right after the Proton chip, when
   `controls_layout_state` is not empty. The words below are the default; where call d6 picked a drawing, the drawing
   wins.

   | State | `label` | `short_label` | `attached` | Body title, then bullets |
   |---|---|---|---|---|
   | `read` | Read your controller layout | Controls | true | "Controller layout"; the masked path in `paths`; "Your own saved layout for this game." or "A community layout you picked." or "One of Steam's templates." or "A named copy you saved."; "The game names its own actions." or "This layout sends keys. The file does not say what a key does in the game." or "A normal gamepad layout."; "For the Deck's own controls."; "N buttons listed."; any notes; "bonsAI reads this file and never changes it." |
   | `switch_off` | Controller layout (not read) | (empty) | false | "Turn on Read game & screenshot context in Permissions to let bonsAI read your controller layout." |
   | `no_saved_layout` | Controller layout (not read) | (empty) | false | "No saved layout for this game. It runs on its default controls, which bonsAI has not read." |
   | `not_steam_game` | Controller layout (not read) | (empty) | false | "This game was added to Steam from outside. bonsAI reads layouts for Steam store games only." |
   | `unreadable` | Controller layout (not read) | (empty) | false | "The layout file could not be read, so it was left out." |

   The short name goes through a new `controls_short_label()` in `py_modules/backend/answer/chip_short_labels.py`.
5. `src/types/inputTransparency.ts` (beside lines 124 to 126): the six fields, all optional. No other screen code: a
   chip's id is a plain string on the screen side and its words come from the back end (the `ContextChip` type, lines
   83 to 96).

**Files owned:** `game_ai_request.py`, `knowledge_base_chips.py` (the stack function and its class only),
`kb_notes_turn_flags.py` (that one function), `transparency_service.py`, `chip_short_labels.py`,
`src/types/inputTransparency.ts`, `tests/test_seam_contracts.py` (one line), new `tests/test_steam_input_ask_wiring.py`.
**Must not touch** the prompt files, the Proton reader, `main.py`, the chat-slot service (a saved turn keeps whole
chips already: `transparency_snapshot_for_chat_slot`, lines 372 to 392). **Stop:** the read is over before the AI
is asked and nothing a person can stop on its own; prove Stop still behaves as today by running the existing stop
tests that name `run_game_ai_request`. **Tests:** the stack order and the three
`attached` flags; the old two-argument call gives byte-for-byte what it gave (take the cases already in
`tests/test_knowledge_base_service.py` near line 593, reuse their setup, do not copy it); the held-back path keeps the
table; one chip per state, and no chip for the empty state; the record copies six fields; a turn through
`run_game_ai_request` (reuse the setup of `tests/test_game_ai_request_kb_attached_notes.py`) with a temporary home
holding F0's tree: a back-buttons question with the switch on puts the block's first line in the prompt and the chip
in the record; the same with the switch off reads nothing; a story question attaches nothing. Then run every test file
that names `stack_context_blocks`, `notes_for_the_ai`, `build_context_chips_manifest` or
`build_ollama_route_snapshot` (`git grep -l` them under `tests/`), and `python scripts/growth_limit.py`.
**Checks:** P108D-ANSWER-NAMED, -ANSWER-KEYS, -NO-LAYOUT, -NOT-CONTROLS, -OFF, -SPEED, -DETAILS-WALK. The security
reviewer reads this lane before it lands. Its report gives the driver, for each row, the question to pin, the file to
read first for the expected button, and the log line to look for.

## P — The switch's words, or the new switch (waits for call d1)

**If d1 is (a)** (★ `[perms]`, Sonnet medium): the description at `src/features/permissions/PermissionsTab.tsx` line
207 becomes the sentence picked on board 7 (default: "Attaches screenshots, game logs and your controller layout to
your questions for the AI."). `git grep` the old sentence and "Read game & screenshot context" first; change the
row for it in `docs/guide.md` (line 260) and the Permissions section of `docs/troubleshooting.md` (lines 126 to 136)
to say the same in plain words; leave `docs/demos/` and old plans alone. Add the description to the assertion in
`src/features/permissions/PermissionsTab.test.tsx` (line 73 checks the label today). **Check:** P108D-PERM-ROW.

**If d1 is (b)** (★★★ `[perms]`, Sonnet high): the session writes this brief in full at go from plan 101's lane B
(`101-lane-briefs.md`, lines 87 to 103), with the key `controller_layout_read`, the row "Read controller layouts",
off for everyone including existing installs (`legacy_grandfather_capabilities`,
`py_modules/backend/core/capabilities.py`, line 115), the Kids lock, the confirm box, the deep link, the search index,
the two contract files. The file list is whatever `git grep -l internet_downloads` returns (61 files on 2026-11-19).
Lane D's `CONTROLS_CAPABILITY_KEY` changes to the new key in the same landing. It owes its own D-pad row and the
look check on the Permissions tab.

**If d1 is (c):** stop and ask; this plan does not build plan 101's switch on its own.

## K0 and K9 — The bookkeeper (★ docs, Sonnet medium)

**K0, before anything lands.** Decision D145's entries d1 to d8, word for word from the plan's § 4 with the answers
the task names (D145 is shared by plans 108a to 108g; append under it, check the number is still free of anything
else). One open row per check in the plan's § 6, each saying which machine. The roadmap entry reworded as the
session's task gives it. The three "only you" rows added to the checks page list.

**K9, after lane E lands and again after the Deck block.** The entry moves to Verify in the same commit as lane E's
code, naming P108D-ANSWER-NAMED; rows closed only with the evidence file named; the developer guide's list of
back-end areas (`docs/development.md`, the paragraph at lines 247 to 250) gains `steam_input`; the changelog line in
plain words ("Ask can now read the controller layout Steam saved for the game you are playing…").

## The reviewers' questions

**The security reviewer** (reads lanes B and E, and lane D's `controls_for_ask`):

1. Can any app id, any text in a choice list, or any link inside the config folder make the finder open a file
   outside the three folders? Try the `template` and `workshop` values as hostile text.
2. Are the bounds real: file size, pair count, depth, a named pipe or a device file in place of a layout, a file
   replaced between the check and the read?
3. Can text written by a stranger (a community layout's title, description, binding labels, or a doctored word list)
   reach the AI or the chip? Rule 4 at the top says which strings may. Is 40 characters of free text still too much?
4. With the switch off or the Kids lock on, is any file under Steam's folders opened or even checked for?
5. With call d5 (b), the layout is looked at on each question while a game runs, and attached only on a match. Is
   that read acceptable under this switch's wording?
6. Does the account number appear in a log line, the block, the chip, an evidence file or a fixture?
7. When the AI runs on another PC on the home network, the table travels there with the question, as the game's log
   does today. Is that said where the switch is described?

**The open-source reviewer** (reads lane F0's folder, and the plan's call d8):

1. The fixtures carry Valve's template wording and games' own action names. Is the cut in lane F0 small enough to
   keep in this repo, and is the README's note the right one?
2. Is anything in them a person's own writing (a community author's title or description) that should be replaced?
3. No dependency is added. Confirm from the imports of the four new files.

## Outside sources

- Steam's own documentation of the actions block and the word list (sets of actions, `StickPadGyro`, `Button`,
  `localization`): https://partner.steamgames.com/doc/features/steam_controller/iga_file and
  https://partner.steamgames.com/doc/features/steam_controller/concepts . Matches the Half-Life 2 file read here.
- The file name for the Deck's own controls, described by a third-party project's developer notes:
  https://retrodeck.readthedocs.io/en/latest/wiki_development/general/steam-input/ . Matches what was read here.
- Not found in any public source, read on this Deck only: the choice lists (`configset_*.vdf`) and their three kinds
  of entry; the `CLOUD_` form; the `_legacy.bin` name for community layouts.
- General knowledge, **not yet confirmed here:** the `MostRecent` key in `loginusers.vdf`; the third word `modeshift`
  on a preset line; ways of pressing other than the three seen; which printed label each back-grip name is.
