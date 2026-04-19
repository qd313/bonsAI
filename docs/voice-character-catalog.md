# Voice Character Catalog

This file tracks curated roleplay voice/accent presets for **Character Voice Roleplay Mode** (see `docs/roadmap.md`).

**Implementation:** Preset ids, work titles, and UI grouping live in [`src/data/characterCatalog.ts`](../src/data/characterCatalog.ts); backend prompt text and validation use [`backend/services/ai_character_service.py`](../backend/services/ai_character_service.py). Keep these three in sync when editing the catalog.

**Accent intensity (shipped):** When roleplay is on, Settings **Accent intensity** (`ai_character_accent_intensity`) adjusts how strongly the system prompt requests dialect/accent (`subtle` → `unleashed`). Labels and helper text live in [`src/data/aiCharacterAccentIntensity.ts`](../src/data/aiCharacterAccentIntensity.ts); ids must stay aligned with `VALID_ACCENT_INTENSITY_IDS` in `ai_character_service.py` (see `tests/test_accent_intensity_parity.py`). **Ultra** (`heavy`) allows light tangents with a mandatory snap-back to the question; **Nightmare** (`unleashed`) allows stronger wandering and near-caricature delivery, then the same snap-back plus a short plain recap—replies can be harder to skim on purpose.

**Heavy (TF2):** Backend style hints target the Heavy Weapons Guy register (Russian-flavored broken English, few words), not a generic cowboy drawl—see `tf2_heavy` in `ai_character_service.py` and the picker row in `characterCatalog.ts` (same `id`).

## Preset catalog seed list

- **Cyberpunk 2077**
  - Jackie
- **Red Dead Redemption 2**
  - Arthur
  - Dutch ("talkin' about robbin'")
- **Grand Theft Auto V**
  - Michael
  - Trevor
  - Lamar
  - Lester
- **The Legend of Zelda**
  - Zelda
  - Navi ("urgent guidance to Link")
- **Metal Gear Solid**
  - Otacon ("radio with Solid Snake on deep-cover mission")
- **Samurai Champloo**
  - Fuu
- **Baldur's Gate 3**
  - Shadowheart
  - Astarion
  - Lae'zel
- **Team Fortress 2**
  - All classes (including Announcer)
  - Pyro voice handling: research/TBD
- **Left 4 Dead 2**
  - Ellis
- **Hades**
  - Character style slot (specific character selection to be finalized)
- **Fallout 4**
  - Nick Valentine
  - Piper
  - Preston
- **Portal**
  - GLaDOS
 - **Da Ali G Show**
  - Ali G 

## Custom entry rules (planning)

- Keep one built-in "Custom" entry row that prompts:
  - `Video game title`
  - `Character name`
- Pass custom entry as plain prompt context metadata, not as authoritative canon.
- Store user-defined entries locally in settings (no cloud dependency).
- Always allow turning roleplay off and returning to neutral assistant voice.

## Future data-shape notes

- Candidate schema (draft): `id`, `franchise`, `character`, `styleNotes`, `sourceType` (`preset` or `custom`), `enabled`.
- Keep this catalog human-editable and exportable for offline portability.
