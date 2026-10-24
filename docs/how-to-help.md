# How to help

bonsAI is free and open source, and it is made in spare time. Here are the easy ways to help.

## Report a bug

1. Check the [known problems](guide.md#known-problems) in the guide. Yours may already be listed.
2. [Open a bug report](https://github.com/qd313/bonsAI/issues/new?template=bug_report.yml) on GitHub.
   You need a free GitHub account. The form asks a few plain questions:
   - what you did,
   - what you saw,
   - what you expected,
   - your bonsAI version (open the **About** tab; it is on the title line),
   - your SteamOS channel (stable, beta or preview),
   - and whether the AI runs on the Deck or on a PC.

   The plugin log helps too, but only if you can get it. bonsAI has no button for it. The log
   files are on the Deck in `~/homebrew/logs/bonsAI/`. If that is too much, send the report without it.
3. Have an idea instead of a bug? Open an issue the same way and say what you would like.

## Suggest a game for the knowledge library

The [knowledge library](guide.md#the-knowledge-library) is a set of notes about games that the
AI uses to answer. It has no list to sign up for. To ask for a game:

1. [Open an issue](https://github.com/qd313/bonsAI/issues/new) and put the game's name in the title.
2. Say what you would like it to know about (bosses, areas, items, anything else).
3. If a fan wiki covers the game well, add its link. The notes are reworded from fan wikis, and each
   one keeps a link back to its source.

Press **Update knowledge base** on the **Ollama** tab now and then to pick up the games added since
your last download.

## Free and open source

The code is under the [Apache-2.0 license](../LICENSE), so you can read it, use it, change it and
share it. The game notes are under CC BY-SA 4.0. The [README](../README.md#license) has the full
list of licenses.

If you want to build it yourself, start with the [development guide](development.md).
