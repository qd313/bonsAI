# whisper-cli binary (maintainer)

Place a prebuilt **whisper.cpp** `whisper-cli` (or `main`) binary here for local speech-to-text on Steam Deck / Linux:

- `bin/whisper-cli` — preferred name (chmod +x)
- `bin/main` — alternate whisper.cpp build output name

Build for **x86_64** (Steam Deck LCD/OLED). The plugin also checks `whisper-cli` on `PATH` if the bundled binary is absent.

GGUF models are **not** bundled; users download them from Settings → Voice input after enabling the microphone permission.
