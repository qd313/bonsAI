import asyncio
import json
import logging
import os
import urllib.request
import urllib.error
from urllib.parse import urlparse
from typing import Any, Optional

import decky

class Plugin:
    @staticmethod
    def _coerce_instance(self_or_cls: Any) -> "Plugin":
        """api_version 1 uses an instance; older loaders may pass the class as self."""
        return self_or_cls() if isinstance(self_or_cls, type) else self_or_cls

    async def _main(self):
        logging.info("bonsAI plugin loaded!")

    async def _unload(self):
        logging.info("bonsAI plugin unloaded!")

    async def _resolve_active_app_id(self) -> Optional[str]:
        # Best-effort resolver. Decky runtime APIs differ across versions, so we check
        # common attributes/method names and known environment variables.
        for attr_name in ("current_app_id", "active_app_id", "app_id"):
            value = getattr(self, attr_name, None)
            normalized = self._normalize_app_id(value)
            if normalized:
                return normalized

        for method_name in (
            "get_current_app_id",
            "get_active_app_id",
            "get_current_game_app_id",
            "get_app_id",
        ):
            method = getattr(self, method_name, None)
            if not callable(method):
                continue
            try:
                result = method()
                if hasattr(result, "__await__"):
                    result = await result
                normalized = self._normalize_app_id(result)
                if normalized:
                    return normalized
            except Exception as exc:
                logging.debug(f"Active AppID resolver '{method_name}' failed: {exc}")

        env_app_id = self._normalize_app_id(
            os.environ.get("STEAM_GAME_ID") or os.environ.get("SteamGameId")
        )
        if env_app_id:
            return env_app_id

        return None

    def _normalize_app_id(self, candidate: Any) -> Optional[str]:
        if candidate is None:
            return None
        candidate_str = str(candidate).strip()
        if not candidate_str or candidate_str == "0" or not candidate_str.isdigit():
            return None
        return candidate_str

    # This method can be called directly from your React frontend
    async def log_navigation(self, setting_path: str):
        logging.info(f"User navigated to: {setting_path}")
        # In the future, you could put os.system() or subprocess calls here
        # to apply hidden system settings that the normal UI can't reach.
        return True

    async def ask_game_ai(self, question: Any = "", PcIp: str = ""):
        plugin = Plugin._coerce_instance(self)
        app_id = None
        app_context = "none"
        try:
            if isinstance(question, dict):
                payload = question
                question = payload.get("question", "")
                PcIp = payload.get("PcIp", payload.get("pcIp", payload.get("pc_ip", PcIp)))

            question = (question or "").strip()
            pc_ip = (PcIp or "").strip()
            if not question:
                return {
                    "success": False,
                    "response": "Question is required.",
                    "app_id": "",
                    "app_context": "none",
                }
            if not pc_ip:
                return {
                    "success": False,
                    "response": "PC IP Address is required.",
                    "app_id": "",
                    "app_context": "none",
                }

            app_id = await plugin._resolve_active_app_id()
            app_context = "active" if app_id else "none"
            ollama_app_id = app_id if app_id else "unknown"

            ollama_result = await plugin.ask_ollama(question, pc_ip, ollama_app_id)
            return {
                "success": bool(ollama_result.get("success", False)),
                "response": str(ollama_result.get("response", "") or "No response text."),
                "app_id": str(app_id or ""),
                "app_context": str(app_context),
            }
        except Exception as exc:
            logging.exception("ask_game_ai failed")
            return {
                "success": False,
                "response": f"Backend error: {exc}",
                "app_id": str(app_id or ""),
                "app_context": str(app_context),
            }

    async def ask_ollama(self, question: str, PcIp: str, app_id: str):
        logging.info(f"Asking Ollama at {PcIp}: {question} for AppID: {app_id}")
        url = self._build_ollama_generate_url(PcIp)
        app_context_line = (
            f"Game AppID: {app_id}"
            if app_id and app_id != "unknown"
            else "Game AppID: unknown (no active game context available)"
        )
        prompt_text = f"{app_context_line}\nUser Question: {question}"
        models_to_try = ["gemma4:latest", "gemma4", "llama3:latest", "llama3"]

        def _do_request(model_name: str):
            payload = json.dumps({
                "model": model_name,
                "prompt": prompt_text,
                "stream": False,
            }).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                # Cold model load + first token can exceed tens of seconds over LAN; match generous curl -m 180.
                with urllib.request.urlopen(req, timeout=180) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    return {
                        "success": True,
                        "response": data.get("response", "No response text."),
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
            logging.error(f"Ollama request failed: {e}")
            return {"success": False, "response": str(e)}

    def _build_ollama_generate_url(self, pc_ip: str) -> str:
        raw = (pc_ip or "").strip()
        if not raw:
            return "http://127.0.0.1:11434/api/generate"

        if "//" not in raw:
            raw = f"http://{raw}"

        parsed = urlparse(raw)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 11434
        return f"http://{host}:{port}/api/generate"
