import logging
import decky_plugin

class Plugin:
    async def _main(self):
        logging.info("Settings Search plugin loaded!")

    async def _unload(self):
        logging.info("Settings Search plugin unloaded!")

    # This method can be called directly from your React frontend
    async def log_navigation(self, setting_path: str):
        logging.info(f"User navigated to: {setting_path}")
        # In the future, you could put os.system() or subprocess calls here
        # to apply hidden system settings that the normal UI can't reach.
        return True

