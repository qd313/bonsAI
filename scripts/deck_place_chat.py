#!/usr/bin/env python3
"""Title: Place a hand-written chat on the Deck (and take exactly that chat back)

Purpose: Put one saved chat, with exactly the shape a check needs, into the Deck's chat folder, so the
    plugin draws it from its file the next time the chat is picked, and later take it away again with the
    chat list put back byte for byte. Shapes it ships (recipe names): hidden-in-bold (a hidden line inside a
    bold heading, a bold bullet and a bold plain line), two-covers (two covered answers in one chat),
    step-list (an answer that is a numbered list of steps), notes-line (an answer with a "From the notes"
    line) and long-chat (45 short question-and-answer turns). A JSON file of your own works too.
Used for: Deck check rows whose answer shape the AI never wrote (plan 105, lane T2), run from this PC by the
    driver, from the checkout it will also remove from:
        python scripts/deck_place_chat.py --host deck@<ip> <recipe name or a .json file>
        python scripts/deck_place_chat.py --host deck@<ip> --remove <id it printed>
        python scripts/deck_place_chat.py --list-recipes      (or --show-commands, which sends nothing)
    The id is the only thing printed on standard output. The chat's name in the chat list starts with
    "Placed:". Switch to it from another chat: the plugin does not reload the chat that is already open.
Solves: Several rows stayed "unclear" because the AI never wrote the shape they need (a hidden line inside a
    bold heading, a step list, two covered answers). The plugin reads a chat file on every switch, so a placed
    file is drawn as written.
Does not: Run shell text built from anything but a placed chat's own id, which is checked against a short list
    of safe characters first. Touch any chat it did not place (--remove needs the record this script wrote when
    it placed that chat, and the id must be one this script makes). Place a chat when ten chats are saved or
    when the chat list cannot be read. Read or print settings values. Make the step-list recipe's tick-box
    panel: that panel comes from a separate saved file, so the recipe is a numbered list in the answer only.
    Lose a chat made on the Deck while it runs: it reads the chat list again right before writing it back, checks
    that copy's checksum is unchanged, starts once from the fresh copy if it moved, then stops with a plain message
    (the chat file it wrote is removed; the chat list was not touched).
    The commands it sends over SSH, in the one form `ssh <host> '<command>'`, and no others (D is the Deck's
    chat folder, ~/homebrew/settings/bonsAI/chat_slots):
        if [ -f D/index.json ]; then cat D/index.json; else echo @@NOINDEX; fi
        test ! -e D/<id>.json
        mkdir -p D && cat > D/<id>.json.tmp && mv D/<id>.json.tmp D/<id>.json   (the chat on standard input)
        mkdir -p D && cat > D/index.json.tmp && mv D/index.json.tmp D/index.json (the list on standard input)
        rm -f -- D/<id>.json            (--remove, or a placing that failed half way)
        rm -f -- D/index.json           (--remove, when the Deck had no chat list before the placing)
"""
import argparse
import base64
import copy
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import uuid

# The Deck's chat folder, the way a remote shell reads it (the home folder of the account ssh logs in as).
DECK_DIR = "~/homebrew/settings/bonsAI/chat_slots"
MAX_CHAT_SLOTS = 10  # the plugin's own limit (chat_slot_service.MAX_CHAT_SLOTS)
MAX_TURNS = 200
NO_INDEX = "@@NOINDEX"
# \Z, not $: "$" also matches just before a trailing newline, which a shell would run as a second command.
HOST_RE = re.compile(r"\Adeck@\d{1,3}(\.\d{1,3}){3}\Z")
ID_RE = re.compile(r"\Aplaced-[a-z0-9]+(-[a-z0-9]+)*\Z")
FENCE = "`" * 3
LABEL_PREFIX = "Placed: "

CHAT_KEYS = {"label", "origin_app_id", "origin_app_name", "turns"}
TURN_KEYS = {"role", "text", "display_text", "asked_entity", "app_id", "app_name", "spoiler_consent", "transparency"}


class Refusal(Exception):
    """A plain sentence saying why nothing (more) was done."""


class Changed(Exception):
    """The Deck's chat list moved under the placing (inside place only; turned into a Refusal)."""


# ---------------------------------------------------------------------------
# The commands sent to the Deck (the only ones)
# ---------------------------------------------------------------------------


def cmd_read_index():
    """The chat list's bytes, or the word @@NOINDEX when there is no chat list."""
    path = f"{DECK_DIR}/index.json"
    return f"if [ -f {path} ]; then cat {path}; else echo {NO_INDEX}; fi"


def cmd_check_free(chat_id):
    """Succeeds only when no file already has this chat's name."""
    return f"test ! -e {DECK_DIR}/{check_id(chat_id)}.json"


def cmd_write(name):
    """Write what arrives on standard input to one file in the chat folder, swapped in whole (chat id's file or the list)."""
    if name != "index.json" and not (name.endswith(".json") and ID_RE.match(name[: -len(".json")])):
        raise Refusal(f"refusing to write {name!r}: not a chat this script places, and not the chat list")
    path = f"{DECK_DIR}/{name}"
    return f"mkdir -p {DECK_DIR} && cat > {path}.tmp && mv {path}.tmp {path}"


def cmd_remove_chat(chat_id):
    return f"rm -f -- {DECK_DIR}/{check_id(chat_id)}.json"


def cmd_remove_index():
    return f"rm -f -- {DECK_DIR}/index.json"


def check_host(host):
    if not isinstance(host, str) or not HOST_RE.match(host):
        raise Refusal(f"the host must look like deck@192.168.0.5, not {host!r}")
    return host


def check_id(chat_id):
    if not isinstance(chat_id, str) or len(chat_id) > 64 or not ID_RE.match(chat_id):
        raise Refusal(f"{chat_id!r} is not an id this script makes (it starts with placed- and uses letters, digits and dashes)")
    return chat_id


def ssh_run(host, remote_command, data=None, timeout=60):
    """Run one command on the Deck: ssh, the address, the command, nothing between. (exit code, stdout bytes)."""
    argv = ["ssh", check_host(host), remote_command]
    try:
        if data is None:
            done = subprocess.run(argv, stdin=subprocess.DEVNULL, capture_output=True, timeout=timeout)
        else:
            done = subprocess.run(argv, input=data, capture_output=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Refusal(f"ssh did not run: {exc}") from exc
    if done.returncode == 255:
        raise Refusal(f"the Deck did not answer over SSH: {done.stderr.decode(errors='replace').strip()[:150]}")
    return done.returncode, done.stdout


# ---------------------------------------------------------------------------
# The chats
# ---------------------------------------------------------------------------


def make_turn(chat_id, n, role, text, created_at, extra=None):
    """One saved turn with every key the plugin's cleaning keeps (the shape _normalize_turn gives back)."""
    extra = extra or {}
    turn = {
        "id": f"{chat_id}-{n:03d}",
        "role": role,
        "text": text,
        "request_id": None,
        "app_id": extra.get("app_id", ""),
        "app_name": extra.get("app_name", ""),
        "asked_entity": extra.get("asked_entity", ""),
        "spoiler_consent": extra.get("spoiler_consent") is True,
        "display_text": extra.get("display_text", ""),
        "attachment_refs": [],
        "transparency": extra.get("transparency"),
        "created_at": created_at,
    }
    return turn


def make_chat(chat_id, label, pairs, now, origin_app_id="", origin_app_name=""):
    """A whole chat from (role, text, extra) triples, oldest first, spaced half a minute apart and ending now."""
    total = len(pairs)
    turns = [make_turn(chat_id, i + 1, role, text, now - (total - i) * 30, extra) for i, (role, text, extra) in enumerate(pairs)]
    return {
        "id": chat_id,
        "label": label,
        "created_at": now - total * 30,
        "updated_at": now,
        "origin_app_id": origin_app_id,
        "origin_app_name": origin_app_name,
        "label_by_hand": True,
        "declined_title": "",
        "summary": None,
        "subject": None,
        "turns": turns,
    }


def _spoiler(secret):
    return f"{FENCE}bonsai-spoiler {secret}{FENCE}"


def recipe_hidden_in_bold():
    heading = f"## **3. {_spoiler('the Hollow Warden')}**\nBring fire resistance before the gate."
    bullet = f"- **4. {_spoiler('the Ash Sovereign')}**\n- Keep one heal in reserve."
    plain = f"**5. {_spoiler('the Last Bell')} Boss**\nBring a ranged weapon."
    answer = f"Here is the route, in the order you will meet things.\n\n{heading}\n\n{bullet}\n\n{plain}\n"
    return "a hidden line inside bold", [("user", "Walk me through the late-game route.", None), ("assistant", answer, None)]


def recipe_two_covers():
    def covered(secret):
        return f"The first fight is easy.\n\n{FENCE}bonsai-spoiler\n{secret}\n{FENCE}\n\nDodge left and wait."

    return "two covered answers", [
        ("user", "How do I beat the first gate guard?", None),
        ("assistant", covered("The guard changes stance at half health."), None),
        ("user", "And the second one?", None),
        ("assistant", covered("The second guard heals once, so save your big hit."), None),
    ]


def recipe_step_list():
    steps = ["Pick up the lantern by the door.", "Light the first brazier.", "Cross the bridge.", "Open the side gate.",
             "Ring the bell twice.", "Walk through the arch."]
    answer = "Here are the steps, in order.\n\n" + "\n".join(f"{i}. {s}" for i, s in enumerate(steps, 1)) + "\n\nThat clears the area."
    return "a step list", [("user", "How do I clear the tutorial area, step by step?", None), ("assistant", answer, None)]


def notes_snapshot():
    """The saved details of an answer that used one note, in the form the plugin keeps (and cleans) them."""
    note = {
        "name": "Placed test note", "kind": "strategy", "card": "Summary: a note placed for a screen check.\nTips: none.",
        "trust_tier": "seed", "source_host": "", "source_license": "", "domain": "strategy", "game_title": "",
        "section_id": 0, "demoted": False,
    }
    chip = {"id": "kb", "rank": 1, "label": "1 note attached", "attached": True, "tier_class": "",
            "body": {"title": "Local knowledge base", "paths": [], "bullets": ["1 note attached"]}}
    return {"route": "ollama", "success": True, "context_chips": [chip], "overflow_skips": [],
            "kb_attached_notes": [note], "user_notes_attached": [], "user_notes_off_count": 0}


def recipe_notes_line():
    answer = "A sword is a good first weapon: it is quick and forgiving.\n"
    return "an answer with a notes line", [("user", "What is a good first weapon?", None),
                                          ("assistant", answer, {"transparency": notes_snapshot()})]


def recipe_long_chat():
    pairs = []
    for i in range(1, 46):
        pairs.append(("user", f"Placed question {i} of 45.", None))
        pairs.append(("assistant", f"Placed answer {i}.", None))
    return "45 short turns", pairs


RECIPES = {
    "hidden-in-bold": recipe_hidden_in_bold,
    "two-covers": recipe_two_covers,
    "step-list": recipe_step_list,
    "notes-line": recipe_notes_line,
    "long-chat": recipe_long_chat,
}


def new_chat_id(name, token=None):
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:30] or "chat"
    return check_id(f"placed-{base}-{token or uuid.uuid4().hex[:8]}")


def chat_from_recipe(name, now, token=None):
    label, pairs = RECIPES[name]()
    return make_chat(new_chat_id(name, token), LABEL_PREFIX + label, pairs, now)


def chat_from_file(path, now, token=None):
    """A chat built from a JSON file: {label, origin_app_id, origin_app_name, turns: [{role, text, ...}]}."""
    try:
        with open(path, encoding="utf-8") as fh:
            raw = json.load(fh)
    except (OSError, ValueError) as exc:
        raise Refusal(f"cannot read {path}: {exc}") from exc
    if not isinstance(raw, dict) or set(raw) - CHAT_KEYS:
        raise Refusal(f"{path}: a chat file holds an object with only {', '.join(sorted(CHAT_KEYS))}")
    turns = raw.get("turns")
    if not isinstance(turns, list) or not turns or len(turns) > MAX_TURNS:
        raise Refusal(f"{path}: turns must be a list of 1 to {MAX_TURNS} turns")
    pairs = []
    for i, turn in enumerate(turns, 1):
        if not isinstance(turn, dict) or set(turn) - TURN_KEYS:
            raise Refusal(f"{path}: turn {i} holds an object with only {', '.join(sorted(TURN_KEYS))}")
        if turn.get("role") not in ("user", "assistant") or not str(turn.get("text") or "").strip():
            raise Refusal(f"{path}: turn {i} needs a role of user or assistant and some text")
        pairs.append((turn["role"], str(turn["text"]), {k: v for k, v in turn.items() if k not in ("role", "text")}))
    label = " ".join(str(raw.get("label") or os.path.basename(path)).split())[:100]
    stem = os.path.splitext(os.path.basename(path))[0]
    return make_chat(new_chat_id(stem, token), LABEL_PREFIX + label, pairs, now,
                     str(raw.get("origin_app_id") or ""), str(raw.get("origin_app_name") or ""))


def index_row(chat):
    """The chat's row in the chat list (the row _upsert_index_row writes)."""
    return {"id": chat["id"], "label": chat["label"], "created_at": chat["created_at"], "updated_at": chat["updated_at"],
            "origin_app_id": chat["origin_app_id"], "origin_app_name": chat["origin_app_name"], "turn_count": len(chat["turns"])}


def dump_json(obj):
    """The bytes the plugin itself writes for a chat or the list: two-space indent, keys sorted, no final newline."""
    return json.dumps(obj, indent=2, sort_keys=True).encode("utf-8")


def parse_index(raw_bytes):
    """The chat list as a dict; a missing list is an empty one. A Refusal when it cannot be read as the plugin writes it."""
    if raw_bytes is None:
        return {"version": 1, "slots": []}
    try:
        data = json.loads(raw_bytes.decode("utf-8"))
    except ValueError as exc:
        raise Refusal(f"the Deck's chat list cannot be read ({exc}); nothing was changed") from exc
    if not isinstance(data, dict) or not isinstance(data.get("slots"), list):
        raise Refusal("the Deck's chat list is not shaped as expected; nothing was changed")
    return data


def index_with_row(index, row):
    """A copy of the chat list with the row first of the rows (newest update first, as the plugin keeps them)."""
    out = copy.deepcopy(index)
    rows = [r for r in out["slots"] if not (isinstance(r, dict) and r.get("id") == row["id"])]
    rows.append(row)
    rows.sort(key=lambda r: (int(r.get("updated_at") or 0) if isinstance(r, dict) else 0), reverse=True)
    out["slots"] = rows
    return out


def index_without_row(index, chat_id):
    out = copy.deepcopy(index)
    out["slots"] = [r for r in out["slots"] if not (isinstance(r, dict) and r.get("id") == chat_id)]
    return out


# ---------------------------------------------------------------------------
# Placing and taking back
# ---------------------------------------------------------------------------


def sha(raw_bytes):
    return None if raw_bytes is None else hashlib.sha256(raw_bytes).hexdigest()


def read_index(run):
    """The Deck's chat list bytes, or None when the Deck has none."""
    code, out = run(cmd_read_index())
    if code != 0:
        raise Refusal("the Deck's chat list could not be read; nothing was changed")
    return None if out.strip() == NO_INDEX.encode() else out


def must(run, command, data=None):
    """Send one command that has to succeed; a Refusal naming it when the Deck says otherwise."""
    code, _ = run(command, data)
    if code != 0:
        raise Refusal(f"the Deck refused a command (exit {code}): {command.split(' && ')[-1][:80]}")


def record_path(record_dir, chat_id):
    return os.path.join(record_dir, f"deck-placed-chat-{check_id(chat_id)}.json")


def write_record(path, record):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "x", encoding="utf-8", newline="\n") as fh:
        json.dump(record, fh, indent=2, sort_keys=True)
        fh.write("\n")


def place(host, chat, run, record_dir, now=None):
    """Place the chat and its row in the chat list. Returns the record. Nothing is written when anything looks wrong."""
    check_host(host)
    chat_id = check_id(chat["id"])
    original = read_index(run)
    index = parse_index(original)
    if len(index["slots"]) >= MAX_CHAT_SLOTS:
        raise Refusal(f"{MAX_CHAT_SLOTS} chats are saved on the Deck already; the plugin refuses an eleventh, so nothing was placed")
    code, _ = run(cmd_check_free(chat_id))
    if code != 0:
        raise Refusal(f"a file named {chat_id}.json is already on the Deck; nothing was placed")
    chat_bytes = dump_json(chat)
    path = record_path(record_dir, chat_id)

    def stage(seen):
        """Work out the new chat list from the list `seen`, and (re)write the record that taking back reads."""
        rec = {
            "version": 1, "host": host, "id": chat_id, "label": chat["label"], "placed_at": int(now if now is not None else time.time()),
            "original_index_b64": None if seen is None else base64.b64encode(seen).decode("ascii"),
            "original_index_sha256": sha(seen), "chat_sha256": sha(chat_bytes),
        }
        data = dump_json(index_with_row(parse_index(seen), index_row(chat)))
        rec["new_index_sha256"] = sha(data)
        if os.path.exists(path):
            os.remove(path)
        write_record(path, rec)
        return rec, data

    record, new_index = stage(original)
    try:
        must(run, cmd_write(f"{chat_id}.json"), chat_bytes)
        # A chat made on the Deck while this ran changes the list; writing the old copy back would drop it.
        # Read it again right before the write; if it moved, start once from the fresh copy, then stop.
        for attempt in (1, 2):
            fresh = read_index(run)
            if sha(fresh) == record["original_index_sha256"]:
                break
            if attempt == 2:
                raise Changed("the Deck's chat list changed twice while the chat was being placed; nothing was kept")
            if len(parse_index(fresh)["slots"]) >= MAX_CHAT_SLOTS:
                raise Changed(f"{MAX_CHAT_SLOTS} chats are saved on the Deck now; nothing was kept")
            record, new_index = stage(fresh)
        must(run, cmd_write("index.json"), new_index)
    except Changed as exc:
        # The chat list was never written by this script, so only its own file and record are removed.
        must(run, cmd_remove_chat(chat_id))
        os.remove(path)
        raise Refusal(f"{exc}. Run it again.") from exc
    except Refusal as exc:
        try:
            take_back(host, chat_id, run, record_dir)
        except Refusal as again:
            raise Refusal(f"{exc}; and taking it back failed: {again}") from exc
        raise Refusal(f"{exc}; whatever was written has been taken back") from exc
    return record


def take_back(host, chat_id, run, record_dir):
    """Remove one placed chat and its row. The chat list goes back byte for byte when it is as this script left it.

    Returns a list of plain sentences saying what was done. Refuses (touching nothing) for a chat this script has
    no record of placing, from this host.
    """
    check_host(host)
    chat_id = check_id(chat_id)
    path = record_path(record_dir, chat_id)
    if not os.path.isfile(path):
        raise Refusal(f"no record of placing {chat_id} in {record_dir}: this script only takes back a chat it placed")
    with open(path, encoding="utf-8") as fh:
        record = json.load(fh)
    if record.get("host") != host or record.get("id") != chat_id:
        raise Refusal(f"the record was made for host {record.get('host')!r} and chat {record.get('id')!r}: they must match")
    said = []
    current = read_index(run)
    if sha(current) == record.get("original_index_sha256"):
        said.append("the chat list was already as it was before the chat was placed; left alone")
    elif sha(current) == record.get("new_index_sha256"):
        original = record.get("original_index_b64")
        if original is None:
            must(run, cmd_remove_index())
            said.append("the Deck had no chat list before; the one this script made is removed")
        else:
            must(run, cmd_write("index.json"), base64.b64decode(original))
            said.append("the chat list is back as it was, byte for byte")
    else:
        rows = index_without_row(parse_index(current), chat_id)
        must(run, cmd_write("index.json"), dump_json(rows))
        said.append("the chat list had changed since the placing, so only this chat's row was taken out of it (not byte for byte)")
    must(run, cmd_remove_chat(chat_id))
    os.remove(path)
    said.append(f"the chat file {chat_id}.json is removed")
    return said


# ---------------------------------------------------------------------------
# The command line
# ---------------------------------------------------------------------------


def show_commands():
    """Every command this script can send, with the id spelled <id>."""
    lines = [cmd_read_index(), cmd_check_free("placed-x").replace("placed-x", "<id>"),
             cmd_write("placed-x.json").replace("placed-x", "<id>"), cmd_write("index.json"),
             cmd_remove_chat("placed-x").replace("placed-x", "<id>"), cmd_remove_index()]
    return ["ssh <host> '" + line + "'" for line in lines]


def default_record_dir():
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".scratch", "deck-placed-chats")


def build_chat(what, now):
    """A recipe's name, or the path of a .json file, turned into a chat."""
    if what in RECIPES:
        return chat_from_recipe(what, now)
    if what.lower().endswith(".json"):
        return chat_from_file(what, now)
    raise Refusal(f"{what!r} is not a recipe ({', '.join(RECIPES)}) and not a .json file")


def main(argv=None, run_for=None):
    ap = argparse.ArgumentParser(description="Place a hand-written chat on the Deck, or take back one this script placed.")
    ap.add_argument("--host", help="deck@address of the Deck, e.g. deck@192.168.86.52")
    ap.add_argument("--remove", metavar="ID", help="take back the chat with this id (the one placing printed)")
    ap.add_argument("--record-dir", default=None, help="where the record of each placed chat is kept (default: .scratch in this checkout)")
    ap.add_argument("--list-recipes", action="store_true", help="name the recipes and stop")
    ap.add_argument("--show-commands", action="store_true", help="print every command this script can send and stop")
    ap.add_argument("recipe", nargs="?", help="a recipe name, or a .json file of your own")
    args = ap.parse_args(argv)
    try:
        if args.list_recipes:
            for name, make in RECIPES.items():
                print(f"{name}: {make()[0]}")
            return 0
        if args.show_commands:
            print("\n".join(show_commands()))
            return 0
        if not args.host:
            raise Refusal("--host deck@<address> is needed")
        record_dir = args.record_dir or default_record_dir()
        run = (run_for or (lambda host: (lambda cmd, data=None: ssh_run(host, cmd, data))))(args.host)
        if args.remove:
            if args.recipe:
                raise Refusal("--remove takes the id and no recipe")
            for line in take_back(args.host, args.remove, run, record_dir):
                print(line, file=sys.stderr)
            print(args.remove)
            return 0
        if not args.recipe:
            raise Refusal("name a recipe or a .json file (see --list-recipes)")
        chat = build_chat(args.recipe, int(time.time()))
        place(args.host, chat, run, record_dir)
        print(f'placed "{chat["label"]}" with {len(chat["turns"])} saved turns; take it back with --remove {chat["id"]}', file=sys.stderr)
        print(chat["id"])
        return 0
    except Refusal as exc:
        print(f"deck_place_chat: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
