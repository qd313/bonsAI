import json
import os
import tempfile
import unittest

from backend.services.strategy_checklist_session_service import (
    clear_session_entry,
    get_session_entry,
    load_session_store,
    normalize_ask_checklist_state,
    save_session_store,
    upsert_session_entry,
)


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


if __name__ == "__main__":
    unittest.main()
