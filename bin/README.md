# whisper-cli binary (maintainer)

Place a prebuilt **whisper.cpp** `whisper-cli` (or `main`) binary here for local speech-to-text on Steam Deck / Linux:

- `bin/whisper-cli` — preferred name (chmod +x)
- `bin/main` — alternate whisper.cpp build output name

Build for **x86_64** (Steam Deck LCD/OLED). The plugin also checks `whisper-cli` on `PATH` if the bundled binary is absent.

GGUF models are **not** bundled; users download them from Settings → Voice input after enabling the microphone permission.

On-device install compiles a CPU-safe `whisper-cli` from a **digest-pinned** podman image (see `WHISPER_CPP_IMAGE` in `py_modules/backend/services/voice_transcription_service.py` and [workshop:archive/voice-input-follow-up.md](../../bonsAI-workshop/archive/voice-input-follow-up.md)).
