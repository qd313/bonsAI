import json
import unittest
from unittest import mock

from backend.services.knowledge_base_schema import DEFAULT_EMBEDDING_MODEL
from backend.services.ollama_embed_service import (
    OllamaEmbedError,
    embed_texts,
    format_embed_document,
    format_embed_query,
    nomic_embed_available,
    reset_embed_availability_cache,
)


class OllamaEmbedServiceTests(unittest.TestCase):
    def setUp(self):
        # Availability is cached per (host, model) with a TTL, so without this every test
        # after the first reads a neighbour's answer.
        reset_embed_availability_cache()

    def test_nomic_embed_available_matches_tag(self):
        with mock.patch(
            "backend.services.ollama_embed_service.list_installed_ollama_tags",
            return_value=["llama3.2", "nomic-embed-text:latest"],
        ):
            self.assertTrue(nomic_embed_available("127.0.0.1:11434"))

    def test_nomic_embed_available_missing(self):
        with mock.patch(
            "backend.services.ollama_embed_service.list_installed_ollama_tags",
            return_value=["llama3.2"],
        ):
            self.assertFalse(nomic_embed_available("127.0.0.1:11434"))

    def test_nomic_embed_available_is_cached_per_host_and_model(self):
        with mock.patch(
            "backend.services.ollama_embed_service.list_installed_ollama_tags",
            return_value=["nomic-embed-text:latest"],
        ) as tags:
            self.assertTrue(nomic_embed_available("127.0.0.1:11434"))
            self.assertTrue(nomic_embed_available("127.0.0.1:11434"))
        # One /api/tags round trip, not one per Ask.
        self.assertEqual(tags.call_count, 1)

    def test_nomic_embed_available_cache_does_not_span_models(self):
        with mock.patch(
            "backend.services.ollama_embed_service.list_installed_ollama_tags",
            return_value=["nomic-embed-text:latest"],
        ):
            self.assertTrue(nomic_embed_available("127.0.0.1:11434"))
            self.assertFalse(nomic_embed_available("127.0.0.1:11434", model="bge-m3"))

    # --- Task prefixes ---
    #
    # These pair with the document prefix baked by scripts/build_rag_db.py. A change on one
    # side without the other silently searches one vector space with the other's queries,
    # which is why EMBEDDING_VARIANT exists and why the eval imports these helpers.

    def test_nomic_prefixes_are_asymmetric(self):
        self.assertEqual(
            format_embed_query("boss fight", model=DEFAULT_EMBEDDING_MODEL),
            "search_query: boss fight",
        )
        self.assertEqual(
            format_embed_document("Boss\ncard text", model=DEFAULT_EMBEDDING_MODEL),
            "search_document: Boss\ncard text",
        )

    def test_prefixes_branch_by_model_family(self):
        self.assertEqual(format_embed_query("q", model="snowflake-arctic-embed2"), "query: q")
        self.assertEqual(format_embed_document("d", model="snowflake-arctic-embed2"), "passage: d")
        self.assertTrue(format_embed_query("q", model="bge-m3").startswith("Represent this"))
        # Unknown families are passed through rather than guessed at.
        self.assertEqual(format_embed_query("q", model="some-new-model"), "q")
        self.assertEqual(format_embed_document("d", model="some-new-model"), "d")

    def test_prefixes_leave_empty_input_alone(self):
        self.assertEqual(format_embed_query("", model=DEFAULT_EMBEDDING_MODEL), "")
        self.assertEqual(format_embed_document("   ", model=DEFAULT_EMBEDDING_MODEL), "   ")

    def test_eval_and_runtime_apply_the_same_prefixes(self):
        """The eval must not re-implement prefixing — that divergence is the bug being fixed.

        scripts/eval_kb_embed_models.py kept private copies of these, applied them, and
        production applied neither; the 2026-07-31 bake-off therefore measured a
        configuration that was never shipped.
        """
        import importlib.util
        import sys
        from pathlib import Path

        spec = importlib.util.spec_from_file_location(
            "eval_kb_embed_models",
            Path(__file__).resolve().parents[1] / "scripts" / "eval_kb_embed_models.py",
        )
        module = importlib.util.module_from_spec(spec)
        # @dataclass resolves annotations through sys.modules, so the module has to be
        # registered before it is executed, not after.
        sys.modules[spec.name] = module
        try:
            spec.loader.exec_module(module)
        except Exception:  # pragma: no cover - keeps a load failure from leaking a stub
            sys.modules.pop(spec.name, None)
            raise
        self.addCleanup(sys.modules.pop, spec.name, None)

        for model in (DEFAULT_EMBEDDING_MODEL, "bge-m3", "snowflake-arctic-embed2"):
            self.assertEqual(
                module._format_query(model, "q", "prompted"),
                format_embed_query("q", model=model),
            )
            self.assertEqual(
                module._format_document(model, "d", "prompted"),
                format_embed_document("d", model=model),
            )
            # The bare arm exists only to measure the no-prefix case; production has no such
            # mode, so it must stay untouched.
            self.assertEqual(module._format_query(model, "q", "bare"), "q")

    def test_embed_texts_parses_response(self):
        payload = {"embeddings": [[0.1, 0.2, 0.3]]}

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(payload).encode("utf-8")

        with mock.patch("urllib.request.urlopen", return_value=FakeResp()):
            vectors = embed_texts("127.0.0.1:11434", ["hello"])
        self.assertEqual(vectors, [[0.1, 0.2, 0.3]])

    def test_embed_texts_sends_keep_alive_when_given(self):
        """KB-SPEED-02: the note-search model must be told to stay loaded the same length of
        time as the answer model, or it evicts after Ollama's 5-minute default and the next
        question pays a reload."""
        payload = {"embeddings": [[0.1, 0.2, 0.3]]}
        captured_requests = []

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(payload).encode("utf-8")

        def fake_urlopen(req, timeout=None):
            captured_requests.append(req)
            return FakeResp()

        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            embed_texts("127.0.0.1:11434", ["hello"], keep_alive="4h")

        self.assertEqual(len(captured_requests), 1)
        sent_body = json.loads(captured_requests[0].data.decode("utf-8"))
        self.assertEqual(sent_body.get("keep_alive"), "4h")

    def test_embed_texts_omits_keep_alive_when_not_given(self):
        """Other callers (the archived eviction probe script) never had an opinion on
        keep_alive and must keep getting Ollama's own default -- no field, not an empty one."""
        payload = {"embeddings": [[0.1, 0.2, 0.3]]}
        captured_requests = []

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(payload).encode("utf-8")

        def fake_urlopen(req, timeout=None):
            captured_requests.append(req)
            return FakeResp()

        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            embed_texts("127.0.0.1:11434", ["hello"])

        self.assertEqual(len(captured_requests), 1)
        sent_body = json.loads(captured_requests[0].data.decode("utf-8"))
        self.assertNotIn("keep_alive", sent_body)

    def test_embed_texts_raises_on_bad_payload(self):
        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps({"embeddings": []}).encode("utf-8")

        with mock.patch("urllib.request.urlopen", return_value=FakeResp()):
            with self.assertRaises(OllamaEmbedError):
                embed_texts("127.0.0.1:11434", ["hello"])


if __name__ == "__main__":
    unittest.main()
