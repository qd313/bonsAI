"""Title: Turning Internet downloads off stops the downloads that are running

Purpose: The Internet downloads permission used to be checked once, when a download started. Turn it off in the
middle of a setup and the downloads already running (the AI engine, the models, the knowledge library, the voice
engine and its build) carried on. This asks each of them to stop, the same way its own Cancel button does, at the
moment the permission is saved as off.
Used for: main.py's save_settings, which every way of flipping the switch ends up in (the Permissions tab, the
first-time setup box, the download notice).
Solves: A person who turns downloads off expects the downloading to stop, not just future downloads to be refused.
Does not: Cancel anything when the permission was already off or stays on, delete what a stopped download left
(each download's own stop path does that), or cover the Steam parental lock, which is not a saved setting.
"""

from typing import Any

PERMISSION = "internet_downloads"


def _running(task: Any) -> bool:
    return task is not None and not task.done()


def turned_off(prev_caps: dict, next_caps: dict) -> bool:
    """True when the Internet downloads permission goes from on to off in this save."""
    return prev_caps.get(PERMISSION) is True and next_caps.get(PERMISSION) is not True


async def stop_running_downloads_if_turned_off(plugin: Any, prev_caps: dict, next_caps: dict) -> list[str]:
    """Stop every running download when the permission just went from on to off.

    In: the plugin, and the capabilities before and after the save. Out: which downloads were asked to stop
    ("ollama_setup", "knowledge_library", "voice_install"); empty when the permission did not go on to off or
    nothing was running. Each is stopped through its own cancel, so its card ends as Stopped.
    """
    if not turned_off(prev_caps, next_caps):
        return []
    stopped: list[str] = []
    if _running(getattr(plugin, "_local_ollama_setup_task", None)):
        await plugin.cancel_local_ollama_setup()
        stopped.append("ollama_setup")
    if _running(getattr(plugin, "_rag_corpus_download_task", None)):
        await plugin.cancel_rag_corpus_download()
        stopped.append("knowledge_library")
    voice_cancel = getattr(plugin, "_voice_install_cancel", None)
    if _running(getattr(plugin, "_voice_install_task", None)) and voice_cancel is not None:
        voice_cancel.set()
        stopped.append("voice_install")
    if stopped:
        await plugin._maybe_app_log(
            "settings.save",
            "internet downloads turned off: running downloads asked to stop",
            fields={"stopped": ",".join(stopped)},
        )
    return stopped
