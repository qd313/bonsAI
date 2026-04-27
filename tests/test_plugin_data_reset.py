import unittest
import tempfile
from pathlib import Path

from backend.services.plugin_data_reset import reset_plugin_disk_and_defaults
from backend.services.settings_service import load_settings, save_settings, sanitize_settings


class _Logger:
    def warning(self, *args, **kwargs):
        pass

    def exception(self, *args, **kwargs):
        pass


def _sanitize(data):
    return sanitize_settings(
        data,
        default_latency_warning_seconds=15,
        default_request_timeout_seconds=120,
        min_latency_warning_seconds=5,
        max_latency_warning_seconds=300,
        min_request_timeout_seconds=10,
        max_request_timeout_seconds=300,
        valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
        default_persistence_mode="persist_all",
        valid_ask_modes={"speed", "strategy", "deep"},
        default_ask_mode="speed",
    )


class PluginDataResetTests(unittest.TestCase):
    def test_reset_removes_old_settings_and_writes_defaults(self):
        logger = _Logger()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            settings_dir = root / "settings"
            settings_dir.mkdir()
            settings_path = str(settings_dir / "settings.json")
            runtime_dir = str(root / "runtime")
            log_dir = str(root / "logs")
            Path(runtime_dir).mkdir()
            Path(log_dir).mkdir()
            (Path(runtime_dir) / "captures").mkdir()
            (Path(runtime_dir) / "captures" / "x.bin").write_bytes(b"x")
            Path(settings_path).write_text(
                '{"latency_warning_seconds": 99, "capabilities": {"filesystem_write": true}}',
                encoding="utf-8",
            )
            (Path(log_dir) / "plugin.log").write_text("x", encoding="utf-8")

            out = reset_plugin_disk_and_defaults(
                settings_path=settings_path,
                settings_dir=str(settings_dir),
                runtime_dir=runtime_dir,
                log_dir=log_dir,
                sanitize_func=_sanitize,
                load_settings=lambda p, s, lg: load_settings(p, s, lg),
                save_settings=save_settings,
                logger=logger,
            )

            self.assertEqual(out["latency_warning_seconds"], 15)
            reloaded = load_settings(settings_path, _sanitize, logger)
            self.assertEqual(reloaded["latency_warning_seconds"], 15)
            self.assertFalse(out["capabilities"]["filesystem_write"])
            self.assertTrue(Path(runtime_dir).is_dir())
            self.assertFalse((Path(runtime_dir) / "captures").exists())
            self.assertFalse((Path(log_dir) / "plugin.log").exists())


if __name__ == "__main__":
    unittest.main()
