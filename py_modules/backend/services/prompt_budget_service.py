"""Title: Deciding how the room in a question is shared out

Purpose: A question sent to the AI has to hold several things at once -- who
the AI is and the rules it follows, the game's cards, what this chat has
already covered, the question itself, room for the AI to think, and room for
the answer. This file decides how much each of those gets. It is the plugin
making that call, rather than each part taking whatever size it happens to be
and the AI quietly dropping whatever did not fit.
Used for: sizing the answer and the thinking allowance on every question, and
sizing the chat's own memory once there is one.
Solves: two things the maintainer ruled out. Squeezing the answer to make room
for everything else is not the answer -- a reply that needs to be thorough
cannot be cut short because something unrelated grew. Fixed limits per part
are not the answer either -- the same numbers every time waste the room on an
easy question and starve a hard one. What is here instead is a floor for each
part that nothing can take away, the room above those floors shared out by
what the question actually needs, a ceiling thinking can never cross, and the
plugin choosing what to leave out when something has to go.
Does not: fetch or shorten anything itself. It hands out numbers; the parts
themselves are built elsewhere and are expected to fit what they are given.

How it works:
 1. Some parts cannot be negotiated and are taken off the top: who the AI is,
    the rules, and the question a person actually typed.
 2. Thinking is capped at a share of the room, so turning thinking up can
    never eat the answer, the rules or the chat.
 3. The answer is given its floor before anything optional is considered, so
    no attachment can ever make a reply short.
 4. What is left is shared between the optional parts -- the game's cards and
    the chat's memory -- each getting a floor first, then a share of the rest
    in proportion to what it asked for.
 5. Anything still spare goes back to the answer, up to its full length.
 6. A second limit runs alongside the room: how long a person waits. Reading
    the question is the slow part of an answer, measured on the Deck at about
    1.75 seconds for every 1,000 tokens. Filling a 16,384-token room would
    cost nearly half a minute before the first word, so the question is held
    to what is worth waiting for rather than to what fits.
 7. Whatever could not be given its floor is named in `left_out`, so the
    person can be told instead of finding out from a worse answer.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# Thinking may never take more than this share of the room. A person who turns thinking on is
# asking for reasoning headroom, not for their answer to disappear.
THINKING_SHARE_CEILING = 0.25

# Measured on the Deck 2026-09-20. Reading the question is the slow part: 188 tokens took 0.8
# seconds, 2,848 took 7.9, 7,048 took 12.3 and 14,048 took 24.4. That is about 1.75 seconds for
# every 1,000 tokens once the small fixed cost is set aside.
PROMPT_SECONDS_PER_1000_TOKENS = 1.75

# How long a person should wait before the first word of an answer, in the worst case. Eight
# seconds is roughly 4,500 tokens of question. Today's largest question is about 2,900, so nothing
# is made smaller by this -- it is a ceiling on growth, not a cut.
#
# It is a WORST case, not the usual one: the server skips re-reading any part of the front of a
# question that has not changed since last time, so a second question with the same rules, cards
# and memory in front of it came back in 1.1 and 0.8 seconds where the first took 15.3.
TARGET_PROMPT_SECONDS = 8

# Floors. Each is the least a part may have if it is present at all -- below this, a part is not
# worth including and is left out and said so, rather than reduced to a fragment that misleads.
ANSWER_FLOOR_TOKENS = 600
CARDS_FLOOR_TOKENS = 300
MEMORY_FLOOR_TOKENS = 250


def tokens_worth_waiting_for(seconds: float = TARGET_PROMPT_SECONDS) -> int:
    """How big a question may be before a person is kept waiting longer than this."""
    return int(max(0.0, float(seconds)) * 1000.0 / PROMPT_SECONDS_PER_1000_TOKENS)


@dataclass
class BudgetPlan:
    """What each part of one question is allowed, and what could not be included."""

    room_tokens: int
    rules_tokens: int
    question_tokens: int
    cards_tokens: int
    memory_tokens: int
    thinking_tokens: int
    answer_tokens: int
    left_out: list[str] = field(default_factory=list)

    @property
    def prompt_tokens(self) -> int:
        """Everything that gets sent, as opposed to everything that gets written back."""
        return self.rules_tokens + self.question_tokens + self.cards_tokens + self.memory_tokens

    @property
    def fits(self) -> bool:
        """Whether everything planned actually fits the room.

        False only in the one case nothing can rescue: the rules and the question alone fill the
        room, so the AI drops the start of the question whatever anyone does. It is reported
        rather than hidden, because going over does not cost the excess -- it costs about half of
        everything sent, and the half that goes is the beginning.
        """
        return self.prompt_tokens + self.thinking_tokens + self.answer_tokens <= self.room_tokens

    @property
    def seconds_to_first_word(self) -> float:
        """Roughly how long the person waits before the answer starts, worst case."""
        return self.prompt_tokens * PROMPT_SECONDS_PER_1000_TOKENS / 1000.0

    def as_dict(self) -> dict[str, Any]:
        return {
            "room_tokens": self.room_tokens,
            "rules_tokens": self.rules_tokens,
            "question_tokens": self.question_tokens,
            "cards_tokens": self.cards_tokens,
            "memory_tokens": self.memory_tokens,
            "thinking_tokens": self.thinking_tokens,
            "answer_tokens": self.answer_tokens,
            "prompt_tokens": self.prompt_tokens,
            "seconds_to_first_word": round(self.seconds_to_first_word, 1),
            "fits": self.fits,
            "left_out": list(self.left_out),
        }


def _share_out(spare: int, wants: list[tuple[str, int, int]]) -> tuple[dict[str, int], list[str]]:
    """Give each named part its floor, then split what remains in proportion to what it wanted.

    ``wants`` is (name, wanted, floor). A part that wants nothing is skipped entirely and is not
    reported as left out -- there was nothing to leave out.
    """
    given: dict[str, int] = {name: 0 for name, _w, _f in wants}
    left_out: list[str] = []
    asking = [(name, wanted, floor) for name, wanted, floor in wants if wanted > 0]
    if not asking:
        return given, left_out

    # Floors first, in the order given -- that order is the priority order.
    remaining = spare
    seated: list[tuple[str, int]] = []
    for name, wanted, floor in asking:
        need = min(wanted, floor)
        if need <= remaining:
            given[name] = need
            remaining -= need
            seated.append((name, wanted))
        else:
            left_out.append(name)

    # Then the rest, in proportion to how much more each still wanted.
    outstanding = {name: wanted - given[name] for name, wanted in seated if wanted > given[name]}
    total_outstanding = sum(outstanding.values())
    if remaining > 0 and total_outstanding > 0:
        for name, still_wants in outstanding.items():
            given[name] += min(still_wants, remaining * still_wants // total_outstanding)
        # Whole tokens divide unevenly, so a few are always over. They go down the priority order
        # rather than to whoever happens to be first in a dictionary.
        leftover = spare - sum(given.values())
        for name, wanted in seated:
            if leftover <= 0:
                break
            take = min(leftover, wanted - given[name])
            given[name] += take
            leftover -= take
    return given, left_out


def plan_prompt_budget(
    *,
    room_tokens: int,
    rules_tokens: int,
    question_tokens: int,
    answer_wanted: int,
    thinking_wanted: int = 0,
    cards_wanted: int = 0,
    memory_wanted: int = 0,
    answer_floor: int = ANSWER_FLOOR_TOKENS,
    seconds_worth_waiting: float = TARGET_PROMPT_SECONDS,
) -> BudgetPlan:
    """Decide what each part of one question gets. See the file header for the rules."""
    room = max(0, int(room_tokens or 0))
    rules = max(0, int(rules_tokens or 0))
    question = max(0, int(question_tokens or 0))
    answer_wanted = max(0, int(answer_wanted or 0))
    left_out: list[str] = []

    # 1. Who the AI is and what a person actually typed cannot be negotiated away.
    must_have = rules + question
    if must_have >= room:
        # There is no plan to make. The rules and the question alone fill the room, so the AI will
        # drop the start of the question and answer from whatever is left. Nothing optional can
        # help. Said out loud here, because the alternative is a confident answer with nothing
        # behind it and only a log line that noticed.
        left_out.append("everything optional -- the rules and the question alone fill the room")
        return BudgetPlan(
            room_tokens=room,
            rules_tokens=rules,
            question_tokens=question,
            cards_tokens=0,
            memory_tokens=0,
            thinking_tokens=0,
            answer_tokens=min(answer_wanted, max(0, int(answer_floor or 0))),
            left_out=left_out,
        )
    remaining = room - must_have

    # 3. The answer's floor is taken before anything optional is even considered. No attachment,
    #    and no thinking setting, may be the reason a reply comes out short.
    floor_for_answer = min(max(0, int(answer_floor or 0)), answer_wanted, remaining)
    remaining -= floor_for_answer

    # 2. Thinking, capped both by its share of the whole room and by what is actually left.
    thinking = min(max(0, int(thinking_wanted or 0)), int(room * THINKING_SHARE_CEILING), remaining)
    if thinking_wanted and thinking < thinking_wanted:
        left_out.append("some of the thinking room")
    remaining -= thinking

    # 6. The second limit: how much question is worth waiting for. Whichever is smaller wins.
    wait_limit = tokens_worth_waiting_for(seconds_worth_waiting)
    room_for_optional = min(remaining, max(0, wait_limit - must_have))

    # 4. The optional parts, floors first. The chat's memory is placed ahead of the game's cards
    #    on purpose: cards are looked up again on the next question, while a conversation that is
    #    dropped is gone for good.
    given, dropped = _share_out(
        room_for_optional,
        [
            ("memory", max(0, int(memory_wanted or 0)), MEMORY_FLOOR_TOKENS),
            ("cards", max(0, int(cards_wanted or 0)), CARDS_FLOOR_TOKENS),
        ],
    )
    for name in dropped:
        left_out.append("the chat's memory" if name == "memory" else "the game's cards")
    remaining -= given["cards"] + given["memory"]

    # 5. Anything still spare goes back to the answer, up to its full length.
    answer = min(answer_wanted, floor_for_answer + max(0, remaining))

    return BudgetPlan(
        room_tokens=room,
        rules_tokens=rules,
        question_tokens=question,
        cards_tokens=given["cards"],
        memory_tokens=given["memory"],
        thinking_tokens=thinking,
        answer_tokens=answer,
        left_out=left_out,
    )
