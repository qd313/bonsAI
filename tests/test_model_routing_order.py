import unittest

from backend.ollama.ollama_routing import (
    build_host_fallback_tail,
    build_initial_routing_order,
    default_text_routing_seed,
    is_embedding_only_tag,
    is_high_vram_tag,
    merge_pulled_tag,
    remove_tag_from_routing_orders,
    resolve_routing_order,
)


class ModelRoutingOrderTests(unittest.TestCase):
    def test_note_search_model_is_never_tried_for_an_answer(self):
        emb = "nomic-embed-text:latest"
        self.assertTrue(is_embedding_only_tag(emb))
        self.assertFalse(is_embedding_only_tag("gemma4:e2b-it-qat"))
        installed = ["gemma4:e2b-it-qat", emb]
        self.assertNotIn(emb, build_initial_routing_order(False, installed))
        saved = {"text_model_routing_order": [emb, "gemma4:e2b-it-qat"]}
        self.assertEqual(resolve_routing_order(False, saved, installed), ["gemma4:e2b-it-qat"])
        self.assertNotIn(emb, build_host_fallback_tail([], installed))

    def test_default_seed_intersect_installed(self):
        installed = ["gemma4:latest", "qwen2.5vl:3b", "tinyllama"]
        order = build_initial_routing_order(False, installed)
        self.assertEqual(order[0], "qwen2.5vl:3b")
        self.assertIn("gemma4:latest", order)
        self.assertIn("tinyllama", order)

    def test_a_fresh_install_and_automatic_try_the_starter_model_first_for_text_and_pictures(self):
        installed = ["qwen2.5vl:3b", "gemma4:e2b-it-qat", "qwen3.5:4b"]
        self.assertEqual(resolve_routing_order(False, {}, installed)[0], "gemma4:e2b-it-qat")
        self.assertEqual(resolve_routing_order(True, {}, installed)[0], "gemma4:e2b-it-qat")
        # Automatic is an empty saved list.
        auto = {"text_model_routing_order": [], "vision_model_routing_order": []}
        self.assertEqual(resolve_routing_order(False, auto, installed)[0], "gemma4:e2b-it-qat")

    def test_an_order_a_person_set_by_hand_is_not_touched_by_the_seeds(self):
        installed = ["qwen2.5vl:3b", "gemma4:e2b-it-qat", "qwen3.5:4b"]
        mine = ["qwen3.5:4b", "qwen2.5vl:3b", "gemma4:e2b-it-qat"]
        self.assertEqual(resolve_routing_order(False, {"text_model_routing_order": mine}, installed), mine)
        self.assertEqual(resolve_routing_order(True, {"vision_model_routing_order": mine}, installed), mine)

    def test_resolve_skips_high_vram_when_toggle_off(self):
        settings = {
            "model_allow_high_vram_fallbacks": False,
            "text_model_routing_order": ["qwen2.5:32b", "qwen2.5vl:3b"],
        }
        order = resolve_routing_order(False, settings, ["qwen2.5:32b", "qwen2.5vl:3b"])
        self.assertEqual(order, ["qwen2.5vl:3b"])

    def test_resolve_keeps_high_vram_when_toggle_on(self):
        settings = {
            "model_allow_high_vram_fallbacks": True,
            "text_model_routing_order": ["qwen2.5:32b", "qwen2.5vl:3b"],
        }
        order = resolve_routing_order(False, settings, ["qwen2.5:32b", "qwen2.5vl:3b"])
        self.assertEqual(order, ["qwen2.5:32b", "qwen2.5vl:3b"])

    def test_merge_pulled_tag_bottom_and_top(self):
        base = list(default_text_routing_seed())
        merged = merge_pulled_tag(base, "gemma4:latest", False)
        self.assertEqual(merged[-1], "gemma4:latest")
        top = merge_pulled_tag(base, "qwen2.5:32b", True)
        self.assertEqual(top[0], "qwen2.5:32b")

    def test_is_high_vram_by_size(self):
        self.assertTrue(is_high_vram_tag("custom:tag", 16.0))
        self.assertFalse(is_high_vram_tag("custom:tag", 8.0))

    def test_remove_tag_from_both_lists(self):
        settings = {
            "text_model_routing_order": ["a", "b"],
            "vision_model_routing_order": ["b", "c"],
        }
        out = remove_tag_from_routing_orders(settings, "b")
        self.assertEqual(out["text_model_routing_order"], ["a"])
        self.assertEqual(out["vision_model_routing_order"], ["c"])

    def test_host_fallback_tail_cap_and_deprioritize(self):
        user = ["qwen2.5vl:3b"]
        installed = ["qwen2.5vl:3b", "gemma4:e2b", "tinyllama", "a", "b", "c", "d"]
        tail = build_host_fallback_tail(user, installed)
        self.assertNotIn("qwen2.5vl:3b", tail)
        self.assertLessEqual(len(tail), 5)
        if "tinyllama" in tail:
            self.assertGreater(tail.index("tinyllama"), 0)


if __name__ == "__main__":
    unittest.main()
