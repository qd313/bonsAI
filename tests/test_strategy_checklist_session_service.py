import json
import os
import tempfile
import unittest

from backend.strategy.strategy_checklist_session_service import (
    clear_session_entry,
    get_session_entry,
    load_session_store,
    normalize_ask_checklist_state,
    rpc_entry_to_store_payload,
    sanitize_session_store,
    save_session_store,
    upsert_session_entry,
)


def _route_store(**kept):
    """A one-game store holding a three-step route, with the ticks and revealed steps given."""
    steps = [{"id": str(n), "label": f"Step {n}"} for n in (1, 2, 3)]
    return upsert_session_entry({}, app_id="1", title="T", items=steps, **kept)


class StrategyChecklistSessionServiceTests(unittest.TestCase):
    def test_upsert_and_get_by_app_id(self):
        store = upsert_session_entry(
            {},
            app_id="1245620",
            app_name="Elden Ring",
            title="Boss tips",
            items=[{"id": "a", "label": "Dodge roll"}, {"id": "b", "label": "Heal"}],
            checked_ids=["a"],
        )
        entry = get_session_entry(store, "1245620")
        self.assertIsNotNone(entry)
        self.assertEqual(entry["title"], "Boss tips")
        self.assertEqual(entry["checked_ids"], ["a"])

    def test_clear_one_app(self):
        store = upsert_session_entry(
            {},
            app_id="1",
            title="A",
            items=[{"id": "1", "label": "x"}, {"id": "2", "label": "y"}],
        )
        store = upsert_session_entry(
            store,
            app_id="2",
            title="B",
            items=[{"id": "1", "label": "p"}, {"id": "2", "label": "q"}],
        )
        cleared = clear_session_entry(store, "1")
        self.assertIsNone(get_session_entry(cleared, "1"))
        self.assertIsNotNone(get_session_entry(cleared, "2"))

    def test_atomic_save_and_load(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "strategy_checklist_session.json")
            store = upsert_session_entry(
                {},
                app_id="",
                title="Generic",
                items=[{"id": "1", "label": "Step A"}, {"id": "2", "label": "Step B"}],
                checked_ids=["2"],
            )
            save_session_store(path, store, settings_dir=tmp)
            loaded = load_session_store(path)
            entry = get_session_entry(loaded, "")
            self.assertIsNotNone(entry)
            self.assertEqual(entry["checked_ids"], ["2"])
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            self.assertEqual(data["version"], 1)

    def test_normalize_ask_checklist_state(self):
        state = normalize_ask_checklist_state(
            {
                "title": "T",
                "items": [{"id": "1", "label": "A"}, {"id": "2", "label": "B"}],
                "checkedIds": ["1"],
            }
        )
        self.assertIsNotNone(state)
        self.assertEqual(state["checked_ids"], ["1"])

    def test_revealed_steps_are_kept_beside_the_ticks(self):
        entry = get_session_entry(_route_store(checked_ids=["1"], revealed=["3"]), "1")
        self.assertEqual(entry["checked_ids"], ["1"])
        self.assertEqual(entry["revealed"], ["3"])

    def test_revealed_keeps_only_real_step_ids_once_each(self):
        store = _route_store(revealed=["3", "3", "99", "", None])
        self.assertEqual(get_session_entry(store, "1")["revealed"], ["3"])

    def test_revealed_survives_a_write_and_a_read_of_the_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "strategy_checklist_session.json")
            save_session_store(path, _route_store(checked_ids=["1"], revealed=["3"]), settings_dir=tmp)
            self.assertEqual(get_session_entry(load_session_store(path), "1")["revealed"], ["3"])
            with open(path, encoding="utf-8") as f:
                self.assertEqual(json.load(f)["by_app_id"]["1"]["revealed"], ["3"])

    def test_an_old_file_with_no_revealed_key_loads_as_empty(self):
        old_entry = {"title": "T", "checked_ids": ["1"], "updated_at": 1}
        old_entry["items"] = [{"id": "1", "label": "x"}, {"id": "2", "label": "y"}]
        entry = get_session_entry(sanitize_session_store({"version": 1, "by_app_id": {"1": old_entry}}), "1")
        self.assertEqual(entry["checked_ids"], ["1"])
        self.assertEqual(entry["revealed"], [])

    def test_clearing_a_game_takes_its_revealed_steps_with_the_ticks(self):
        store = _route_store(checked_ids=["1"], revealed=["3"])
        self.assertIsNone(get_session_entry(clear_session_entry(store, "1"), "1"))

    def test_the_screen_payload_carries_revealed_in_either_spelling(self):
        items = [{"id": "1", "label": "A"}, {"id": "2", "label": "B"}, {"id": "3", "label": "C"}]
        for key, ids in (("revealed", ["3"]), ("revealedIds", ["2"]), ("other", [])):
            frag = rpc_entry_to_store_payload({"title": "T", "items": items, key: ids or ["9"]})
            self.assertEqual(frag["revealed"], ids)


if __name__ == "__main__":
    unittest.main()
