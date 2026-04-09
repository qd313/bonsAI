import asyncio
import glob
import json
import os
import re
import socket
import subprocess
import time
import urllib.request
import urllib.error
from urllib.parse import urlparse
from typing import Any, Optional

import decky

logger = decky.logger

class Plugin:
    @staticmethod
    def _coerce_instance(self_or_cls: Any) -> "Plugin":
        """api_version 1 uses an instance; older loaders may pass the class as self."""
        return self_or_cls() if isinstance(self_or_cls, type) else self_or_cls

    async def _main(self):
        logger.info("bonsAI plugin loaded!")

    async def _unload(self):
        logger.info("bonsAI plugin unloaded!")

    TDP_MIN_W = 3
    TDP_MAX_W = 15
    GPU_CLK_MIN_MHZ = 200
    GPU_CLK_MAX_MHZ = 1600

    @staticmethod
    def _parse_tdp_recommendation(text: str) -> Optional[dict]:
        """Extract a TDP recommendation from the AI response.
        Tries: fenced JSON, bare JSON, then natural-language patterns."""
        rec = None

        # 1) Fenced ```json ... ```
        m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if not m:
            # 2) Bare {"tdp_watts": N ...}
            m = re.search(r'(\{\s*"tdp_watts"\s*:\s*\d+[^}]*\})', text, re.DOTALL)
        if m:
            try:
                rec = json.loads(m.group(1))
            except json.JSONDecodeError as exc:
                logger.info("_parse_tdp_recommendation: JSON decode failed: %s / raw=%r", exc, m.group(1))

        # 3) Natural-language fallback: "TDP to 8 watts" / "TDP of 8W" / "TDP: 8 watts"
        if rec is None:
            nl = re.search(r"(?:tdp|TDP)\s*(?:to|of|at|:)?\s*(\d+)\s*(?:w|W|watts?)", text)
            if nl:
                rec = {"tdp_watts": int(nl.group(1))}
                logger.info("_parse_tdp_recommendation: extracted from natural language: %s", rec)

        if rec is None:
            logger.info("_parse_tdp_recommendation: no TDP value found in response")
            return None

        tdp = rec.get("tdp_watts")
        gpu = rec.get("gpu_clock_mhz")
        if not isinstance(tdp, (int, float)):
            return None
        result: dict = {"tdp_watts": max(Plugin.TDP_MIN_W, min(Plugin.TDP_MAX_W, int(tdp)))}
        if isinstance(gpu, (int, float)):
            result["gpu_clock_mhz"] = max(Plugin.GPU_CLK_MIN_MHZ, min(Plugin.GPU_CLK_MAX_MHZ, int(gpu)))
        else:
            result["gpu_clock_mhz"] = None
        return result

    @staticmethod
    def _find_amdgpu_hwmon() -> Optional[str]:
        """Return the hwmon directory whose 'name' file contains 'amdgpu'."""
        for name_path in sorted(glob.glob("/sys/class/hwmon/hwmon*/name")):
            try:
                with open(name_path) as f:
                    if "amdgpu" in f.read().strip().lower():
                        return name_path.rsplit("/", 1)[0]
            except OSError:
                continue
        return None

    PRIV_WRITE = "/usr/bin/steamos-polkit-helpers/steamos-priv-write"

    @staticmethod
    def _clean_env() -> dict:
        """Return a copy of os.environ without Decky's LD_ overrides that break system binaries."""
        env = dict(os.environ)
        for key in ("LD_LIBRARY_PATH", "LD_PRELOAD"):
            env.pop(key, None)
        return env

    @staticmethod
    def _write_sysfs(path: str, value: str) -> None:
        """Write a value to a sysfs file, escalating privileges as needed."""
        clean = Plugin._clean_env()

        # 1) Direct write (works if plugin_loader runs as root)
        try:
            with open(path, "w") as f:
                f.write(value)
            logger.info("_write_sysfs: direct write OK -> %s", path)
            return
        except PermissionError:
            logger.info("_write_sysfs: direct write denied for %s", path)
        except OSError as exc:
            logger.info("_write_sysfs: direct write failed for %s: %s", path, exc)

        # 2) steamos-priv-write (the official SteamOS sysfs helper, no password needed)
        if os.path.isfile(Plugin.PRIV_WRITE):
            result = subprocess.run(
                [Plugin.PRIV_WRITE, path, value],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=clean,
                timeout=5,
            )
            if result.returncode == 0:
                logger.info("_write_sysfs: steamos-priv-write OK -> %s", path)
                return
            stderr = result.stderr.decode("utf-8", errors="replace").strip()
            logger.info("_write_sysfs: steamos-priv-write failed (rc=%d): %s", result.returncode, stderr)
        else:
            logger.info("_write_sysfs: steamos-priv-write not found at %s", Plugin.PRIV_WRITE)

        # 3) Last resort: sudo -n tee (non-interactive)
        result = subprocess.run(
            ["sudo", "-n", "tee", path],
            input=value.encode(),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            env=clean,
            timeout=5,
        )
        if result.returncode == 0:
            logger.info("_write_sysfs: sudo -n tee OK -> %s", path)
            return
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        raise OSError(f"All write methods failed for {path}: {stderr}")

    @staticmethod
    def _apply_tdp(rec: dict) -> dict:
        """Write TDP (and optionally GPU clock) to sysfs. Returns a status dict."""
        applied: dict = {"tdp_watts": None, "gpu_clock_mhz": None, "errors": []}

        hwmon = Plugin._find_amdgpu_hwmon()
        if not hwmon:
            applied["errors"].append("Could not find amdgpu hwmon path in sysfs.")
            logger.error("_apply_tdp: amdgpu hwmon not found")
            return applied

        tdp_w = rec.get("tdp_watts")
        if tdp_w is not None:
            cap_path = f"{hwmon}/power1_cap"
            microwatts = str(int(tdp_w) * 1_000_000)
            try:
                Plugin._write_sysfs(cap_path, microwatts)
                applied["tdp_watts"] = int(tdp_w)
                logger.info("_apply_tdp: wrote %s to %s (%dW)", microwatts, cap_path, tdp_w)
            except Exception as exc:
                msg = f"Failed to write TDP to {cap_path}: {exc}"
                applied["errors"].append(msg)
                logger.error("_apply_tdp: %s", msg)

        gpu_mhz = rec.get("gpu_clock_mhz")
        if gpu_mhz is not None:
            applied["gpu_clock_mhz"] = int(gpu_mhz)
            logger.info("_apply_tdp: GPU clock %d MHz noted (sysfs write not yet implemented)", gpu_mhz)

        return applied

    async def log_navigation(self, setting_path: str):
        logger.info(f"User navigated to: {setting_path}")
        return True

    async def get_deck_ip(self):
        """Return the Steam Deck's LAN IP address."""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            try:
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return "unknown"

    async def test_ollama_connection(self, pc_ip: str = ""):
        """Ping Ollama's /api/version and /api/tags to verify reachability."""
        raw = (pc_ip or "").strip()
        if not raw:
            return {"reachable": False, "error": "No PC IP provided."}

        if "//" not in raw:
            raw = f"http://{raw}"
        parsed = urlparse(raw)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 11434
        base = f"http://{host}:{port}"

        try:
            ver_req = urllib.request.Request(f"{base}/api/version", method="GET")
            ver_resp = urllib.request.urlopen(ver_req, timeout=5)
            ver_data = json.loads(ver_resp.read().decode("utf-8"))
            version = ver_data.get("version", "unknown")

            tags_req = urllib.request.Request(f"{base}/api/tags", method="GET")
            tags_resp = urllib.request.urlopen(tags_req, timeout=5)
            tags_data = json.loads(tags_resp.read().decode("utf-8"))
            models = [m.get("name", "?") for m in tags_data.get("models", [])]

            return {"reachable": True, "version": version, "models": models}
        except Exception as e:
            return {"reachable": False, "error": str(e)}

    async def ask_game_ai(self, question: Any = "", PcIp: str = ""):
        app_id = ""
        app_name = ""
        start = time.time()
        try:
            logger.info("ask_game_ai: RPC entry (arg type=%s)", type(question).__name__)
            plugin = Plugin._coerce_instance(self)
            if isinstance(question, dict):
                payload = question
                question = payload.get("question", "")
                PcIp = payload.get("PcIp", payload.get("pcIp", payload.get("pc_ip", PcIp)))
                app_id = str(payload.get("appId", "") or "").strip()
                app_name = str(payload.get("appName", "") or "").strip()

            question = (question or "").strip()
            pc_ip = (PcIp or "").strip()
            if not question:
                logger.info("ask_game_ai: rejected (empty question)")
                return {
                    "success": False,
                    "response": "Question is required.",
                    "app_id": app_id,
                    "app_context": "none",
                    "elapsed_seconds": 0,
                }
            if not pc_ip:
                logger.info("ask_game_ai: rejected (empty pc_ip)")
                return {
                    "success": False,
                    "response": "PC IP Address is required.",
                    "app_id": app_id,
                    "app_context": "none",
                    "elapsed_seconds": 0,
                }

            app_context = "active" if app_id else "none"
            logger.info(
                "ask_game_ai: host=%s game=%r appid=%s question=%r (len=%d)",
                pc_ip, app_name, app_id, question, len(question),
            )

            ollama_result = await plugin.ask_ollama(question, pc_ip, app_id, app_name)
            elapsed = round(time.time() - start, 1)
            response_text = str(ollama_result.get("response", "") or "No response text.")
            applied = None

            if ollama_result.get("success"):
                rec = Plugin._parse_tdp_recommendation(response_text)
                if rec:
                    logger.info("ask_game_ai: parsed TDP recommendation: %s", rec)
                    loop = asyncio.get_running_loop()
                    applied = await loop.run_in_executor(None, Plugin._apply_tdp, rec)
                    logger.info("ask_game_ai: apply result: %s", applied)
                else:
                    logger.info("ask_game_ai: no TDP recommendation found in response")

            logger.info("ask_game_ai: completed in %.1fs", elapsed)
            return {
                "success": bool(ollama_result.get("success", False)),
                "response": response_text,
                "app_id": app_id,
                "app_context": app_context,
                "applied": applied,
                "elapsed_seconds": elapsed,
            }
        except Exception as exc:
            elapsed = round(time.time() - start, 1)
            logger.exception("ask_game_ai failed (%.1fs)", elapsed)
            return {
                "success": False,
                "response": f"Backend error: {exc}",
                "app_id": app_id,
                "app_context": "none",
                "elapsed_seconds": elapsed,
            }

    async def ask_ollama(self, question: str, PcIp: str, app_id: str, app_name: str):
        url = self._build_ollama_chat_url(PcIp)

        if app_name:
            game_line = f"The currently running game is: {app_name} (AppID: {app_id})."
        elif app_id:
            game_line = f"The currently running game has AppID: {app_id} (name unknown)."
        else:
            game_line = "No game is currently running."

        system_content = (
            "You are bonsAI, an expert system assistant embedded on a Steam Deck handheld. "
            "Always answer directly, concisely, and in English. "
            "The Steam Deck APU supports a TDP range of 3-15 watts and GPU clock of 200-1600 MHz. "
            "Never suggest power values outside these hardware limits. "
            f"{game_line}\n\n"
            "IMPORTANT: When you recommend or apply a TDP or GPU clock change, you MUST include this exact JSON block in your response:\n"
            '```json\n{"tdp_watts": <int 3-15>, "gpu_clock_mhz": <int 200-1600 or null>}\n```\n'
            "Without this JSON block, the change will NOT be applied. Only include it when actively recommending a change."
        )
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": question},
        ]

        logger.info(
            "ask_ollama: url=%s game=%r appid=%s user_message=%r (len=%d)",
            url, app_name, app_id, question, len(question),
        )

        models_to_try = ["llama3:latest", "llama3", "gemma4:latest", "gemma4", "gemma3:latest"]

        def _do_request(model_name: str):
            body_dict = {
                "model": model_name,
                "messages": messages,
                "stream": False,
                "keep_alive": -1,
                "options": {
                    "num_predict": 300,
                    "temperature": 0.2
                }
            }
            payload = json.dumps(body_dict).encode("utf-8")
            logger.info(
                "ask_ollama: POST %s model=%s payload_bytes=%d",
                url, model_name, len(payload),
            )
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    raw = resp.read().decode("utf-8")
                    data = json.loads(raw)
                    text = data.get("message", {}).get("content", "No response text.")
                    logger.info(
                        "ask_ollama: OK model=%s response_len=%d first_200=%r",
                        model_name, len(text), text[:200],
                    )
                    return {
                        "success": True,
                        "response": text,
                        "model": model_name,
                    }
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")
                return {
                    "success": False,
                    "response": f"HTTP {e.code} from {url} using model '{model_name}': {body}",
                    "status": e.code,
                    "body": body,
                }
            except urllib.error.URLError as e:
                if isinstance(e.reason, TimeoutError):
                    return {
                        "success": False,
                        "response": "Ollama did not respond within 120 seconds. Check that Ollama is running and your PC IP is correct.",
                    }
                return {
                    "success": False,
                    "response": f"Failed to reach {url} using model '{model_name}': {e}",
                }
            except Exception as e:
                return {
                    "success": False,
                    "response": f"Failed to reach {url} using model '{model_name}': {e}",
                }

        try:
            loop = asyncio.get_running_loop()
            last_failure = {"success": False, "response": "No model attempts executed."}

            for model_name in models_to_try:
                result = await loop.run_in_executor(None, _do_request, model_name)
                if result.get("success"):
                    return result

                last_failure = result
                body = (result.get("body") or "").lower()
                is_model_not_found = "not found" in body and "model" in body
                if is_model_not_found:
                    continue
                return result

            return last_failure
        except Exception as e:
            logger.error(f"Ollama request failed: {e}")
            return {"success": False, "response": str(e)}

    def _build_ollama_chat_url(self, pc_ip: str) -> str:
        raw = (pc_ip or "").strip()
        if not raw:
            return "http://127.0.0.1:11434/api/chat"

        if "//" not in raw:
            raw = f"http://{raw}"

        parsed = urlparse(raw)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 11434
        return f"http://{host}:{port}/api/chat"