"""Title: The addresses and paths every other file agrees on

Purpose: A handful of values need to stay the same everywhere in the backend: the
address to try for Ollama when nobody has set their own, the list of names that
mean "this same machine" rather than a machine on the network, the folder
Decky's Python runs from on the Deck, and the wording for two screens that a
message sometimes needs to point a person at. Any file that needs one of these
imports it from here instead of typing it out again, so there is exactly one
place to change if it ever needs to.
Used for: working out the default place to reach Ollama before a person has set
their own address; recognizing that an address means "this same device"; and
building two messages that name a real screen by its tab labels.
Solves: without one shared copy, a typo in a hand-copied address or folder path
would only show up on the one screen or command that has it wrong, and nobody
would notice until that one thing broke.
Does not: read a settings file, make a network call, or decide anything on its
own -- everything here is a fixed value, never a check or a calculation.
"""

DEFAULT_OLLAMA_HOST = "127.0.0.1"
DEFAULT_OLLAMA_PORT = 11434
DEFAULT_OLLAMA_PCIP = f"{DEFAULT_OLLAMA_HOST}:{DEFAULT_OLLAMA_PORT}"
DEFAULT_OLLAMA_BASE_URL = f"http://{DEFAULT_OLLAMA_PCIP}"

LOOPBACK_HOSTNAMES = frozenset({"127.0.0.1", "localhost", "::1", "[::1]"})

DECK_HOME = "/home/deck"
DECK_OLLAMA_CLI_PATH = f"{DECK_HOME}/.local/bin/ollama"

# Spoiler title profiles live in backend/services/spoiler_title_profiles.py. They are not
# re-exported here: constants is the leaf module services import, so importing a service
# back into it inverts the layering and invites a cycle.

# UI navigation paths (keep aligned with src/ tab labels)
OLLAMA_TAB_WHERE_AI_RUNS = "Ollama → Where AI runs"
DEVELOPER_TAB_INTEGRATIONS = "Developer → Integrations"
