"""Tests for SteamID parsing and GetPlayerBans helper."""

from __future__ import annotations

import json
import unittest
from unittest.mock import patch

from backend.services.steam_vac_service import (
    extract_steamid64_from_token,
    format_vac_report_markdown,
    get_player_bans_for_ids,
    split_vac_query_body,
)
from backend.services import steam_vac_service as svs
from backend.services.vac_check_commands import COMMAND_VAC_CHECK, parse_vac_check_command, response_for_vac_check


class _FakeResponse:
    def __init__(self, payload: dict, code: int = 200):
        self.code = code
        self._payload = payload

    def read(self):
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class SteamVacServiceTests(unittest.TestCase):
    def test_extract_bare_id(self):
        r = extract_steamid64_from_token("76561198000000000")
        self.assertEqual(r.steamid64, "76561198000000000")

    def test_extract_profile_url(self):
        r = extract_steamid64_from_token(
            "https://steamcommunity.com/profiles/76561197960287930/?xml=1"
        )
        self.assertEqual(r.steamid64, "76561197960287930")

    def test_vanity_id_skipped(self):
        r = extract_steamid64_from_token("https://steamcommunity.com/id/gabelogannewell")
        self.assertIsNone(r.steamid64)
        self.assertIsNotNone(r.skip_reason)

    def test_split_body(self):
        self.assertEqual(
            split_vac_query_body(" 76561198x , https://steamcommunity.com/profiles/76561197960287930 "),
            ["76561198x", "https://steamcommunity.com/profiles/76561197960287930"],
        )

    def test_get_player_bans_batches_and_cache(self):
        svs._vac_cache.clear()
        fake = {
            "players": [
                {
                    "SteamId": "76561198000000000",
                    "VACBanned": False,
                    "NumberOfVACBans": 0,
                    "DaysSinceLastBan": 0,
                    "NumberOfGameBans": 0,
                    "CommunityBanned": False,
                    "EconomyBan": "none",
                }
            ]
        }

        with patch("backend.services.steam_vac_service.urllib.request.urlopen") as mock_open:
            mock_open.return_value = _FakeResponse(fake)
            rows, warns = get_player_bans_for_ids("k", ["76561198000000000"], now=1000.0)
        self.assertEqual(len(rows), 1)
        self.assertFalse(rows[0].get("_bonsai_missing"))
        self.assertEqual(mock_open.call_count, 1)

        with patch("backend.services.steam_vac_service.urllib.request.urlopen") as mock_open2:
            rows2, _ = get_player_bans_for_ids("k", ["76561198000000000"], now=1005.0)
        self.assertEqual(len(rows2), 1)
        mock_open2.assert_not_called()

    def test_format_report_empty_rows_skipped_only(self):
        md = format_vac_report_markdown([], [("bad", "nope")], [])
        self.assertIn("Skipped inputs", md)
        self.assertIn("bad", md)

    def test_format_report_rows_render_without_gfm_table_syntax(self):
        # The Deck's answer renderer (react-markdown, MainTabBonsaiAiMarkdownChunk.tsx) has no
        # remark-gfm plugin loaded, so a GFM pipe table is never parsed as a table -- it comes
        # out as one run-on paragraph of literal pipes and dashes (docs/test-evidence/
        # plan64-VAC-03-06.json: "the reply has 0 table elements... reads as a run of pipes").
        # A fix here has to stop emitting that syntax, not add a table the renderer cannot draw.
        rows = [
            {
                "SteamId": "76561197983599210",
                "VACBanned": False,
                "NumberOfVACBans": 0,
                "NumberOfGameBans": 0,
                "DaysSinceLastBan": 0,
                "CommunityBanned": False,
                "EconomyBan": "none",
            }
        ]
        md = format_vac_report_markdown(rows, [], [])
        self.assertNotIn("| ---", md)
        self.assertNotIn("| SteamID", md)
        for line in md.splitlines():
            stripped = line.strip()
            self.assertFalse(
                stripped.startswith("|") and stripped.endswith("|"),
                f"still a pipe-table line: {line!r}",
            )
        # The same facts have to still be there, just not in table syntax.
        self.assertIn("76561197983599210", md)
        self.assertIn("VAC", md)
        self.assertIn("False", md)

    def test_format_report_missing_row_still_readable(self):
        md = format_vac_report_markdown([{"SteamId": "1", "_bonsai_missing": True}], [], [])
        self.assertNotIn("| `1`", md)
        self.assertIn("1", md)


class VacCheckCommandsTests(unittest.TestCase):
    def test_parse_prefix_optional_slash(self):
        self.assertEqual(parse_vac_check_command("/bonsai:vac-check"), "")
        self.assertEqual(parse_vac_check_command("bonsai:vac-check 1 2"), "1 2")
        self.assertIsNone(parse_vac_check_command("hello"))

    def test_response_permission_off(self):
        md = response_for_vac_check("76561198000000000", api_key="k", capability_ok=False)
        self.assertIn("Steam Web API is off", md)
        # Name the switch the way the Permissions tab labels it (Deck, plan 64 flow H: VAC-06).
        self.assertIn("Permissions → Steam ban lookup", md)

    def test_response_no_key(self):
        md = response_for_vac_check("76561198000000000", api_key="", capability_ok=True)
        self.assertIn("No Steam Web API key", md)

    def test_constant_prefix(self):
        self.assertTrue(COMMAND_VAC_CHECK.startswith("bonsai:"))


if __name__ == "__main__":
    unittest.main()
