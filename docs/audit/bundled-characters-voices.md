# The 31 bundled characters: whose voice would a voice for each one copy?

Plan 105, lane E3. Written 2026-11-17. No code was changed.

This is the check a legal reader does before any bundled character gets a voice. For each of the 31
characters it names the work, the company that makes it, the real person who voices or plays the
character, and a plain judgement: could a voice for this character be a type (for example "a gruff old
soldier") rather than a copy of one person's voice? This is not legal advice. It only lays out facts
and a first guess so that a lawyer, or the maintainer, has something to start from.

## How to read it

- The 31 rows are the rows of `_CHARACTER_ROWS` in `py_modules/backend/characters/ai_character_service.py`
  (counted: 31, the same ids the picker shows). The Python list is the one this file follows.
- Every fact about a real person or a company comes from a page fetched on 2026-11-17, with its address
  beside the row. Where no page said it, the cell says "not found". Nothing here comes from memory.
- Most pages are Wikipedia. A voice credit there is good enough to start a legal check, not to end it:
  a lawyer should confirm it against the game's own credits.
- "Owner" means the company the page names as developer or publisher. Only some pages say who holds the
  copyright. Where a page names only the maker, that is what is written.
- Judgement scale. **Yes**: the character is a recognisable type, and a voice made from a short written
  description would sound like the character without sounding like one person. **No**: the character's
  sound is that one performer's own voice or act, so any close voice is a copy of them. **Unclear**: it
  could go either way, and a person should listen before deciding.
- A voice is only one part. The name, face and story of each character belong to the work's owner whether
  or not any voice is used. This file does not judge those.

## The table

### Cyberpunk 2077 (made and published by CD Projekt)

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Jackie Welles | Jason Hightower (English) | https://en.wikipedia.org/wiki/Cyberpunk_2077 | Unclear. "Warm Night City fixer" is a type, but the page credits one actor and his voice is the character's whole identity. |

### Red Dead Redemption 2 (developed and published by Rockstar Games, whose parent is Take-Two Interactive)

Owner sources: https://en.wikipedia.org/wiki/Red_Dead_Redemption_2 and https://en.wikipedia.org/wiki/Take-Two_Interactive

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Arthur Morgan | Roger Clark | https://en.wikipedia.org/wiki/Red_Dead_Redemption_2 | Unclear. A gritty outlaw is a type, but Clark's gravelly delivery is widely what the character sounds like. |
| Dutch van der Linde | Benjamin Byron Davis | https://en.wikipedia.org/wiki/Red_Dead_Redemption_2 | Yes. A charismatic gang leader who gives speeches is a type; no single trait of one voice is needed. |

The page says "plays", not "voices", and does not say whether the same actors did the voice and the body
movement. Not found.

### Grand Theft Auto V (developed by Rockstar North, published by Rockstar Games, parent Take-Two Interactive)

Sources for the owner: https://en.wikipedia.org/wiki/Grand_Theft_Auto_V and https://en.wikipedia.org/wiki/Take-Two_Interactive

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Michael De Santa | Ned Luke | https://en.wikipedia.org/wiki/Grand_Theft_Auto_V | Yes. A tired, sarcastic ex-criminal dad is a type. |
| Trevor Philips | Steven Ogg | https://en.wikipedia.org/wiki/Grand_Theft_Auto_V | Unclear. "Volatile and chaotic" is a type, but Ogg's particular sound and rhythm are the character. |
| Lamar Davis | Slink Johnson | https://en.wikipedia.org/wiki/Grand_Theft_Auto_V | Unclear. A streetwise friend is a type, but the delivery is one performer's own speech style. |
| Lester Crest | Jay Klaitz | https://en.wikipedia.org/wiki/Grand_Theft_Auto_V | Yes. A dry, sarcastic planner is a type. |

### The Legend of Zelda (developed and published by Nintendo)

Owner source: https://en.wikipedia.org/wiki/The_Legend_of_Zelda (names Nintendo as developer and publisher;
it does not say who holds the copyright: not found).

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Princess Zelda | No single voice: the page lists many. English: Cyndy Preston (1989 cartoon), Bonnie Jean Wilbur (1993 games), Patricia Summersett (Breath of the Wild, Age of Calamity, Tears of the Kingdom), Brandy Kopp, Stephanie Marton or Martone (Cadence of Hyrule), Erica Mendez (2026 Ocarina of Time remake). Japanese: many, including Jun Mizusawa, Yu Shimamura and Hikari Tachibana. | https://en.wikipedia.org/wiki/Princess_Zelda | Yes. "Regal, concise guidance" is a type, and the role has already been recast many times, so no one voice defines her. |
| Navi | Kaori Mizuhashi (Japanese, Ocarina of Time). Lisa Reimold (English, the 2026 remake). The page names no English performer for the 1998 original. | https://en.wikipedia.org/wiki/Navi_(The_Legend_of_Zelda) | Unclear. Her voice is mostly short shouts ("Hey!", "Listen!"). A fairy guide is a type, but the shout itself is a famous sound of one recording. |

### Metal Gear Solid (developed and published by Konami)

Owner sources: https://en.wikipedia.org/wiki/Metal_Gear_Solid (says "Developed and published by Konami"),
https://www.konami.com/mg/ (the Metal Gear site carries a Konami Digital Entertainment copyright line).

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Otacon | Christopher Randolph (English), Hideyuki Tanaka (Japanese) | https://en.wikipedia.org/wiki/Otacon | Yes. A nervous, kind technical-support friend is a type. |

### Samurai Champloo (anime made by studio Manglobe)

Owner source: https://en.wikipedia.org/wiki/Samurai_Champloo. It names Manglobe as the studio and a
production committee of Victor Entertainment, Tokuma Shoten and Geneon Entertainment. It does not name
the copyright holder: not found.

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Fuu | Ayako Kawasumi (Japanese), Kari Wahlgren (English) | https://en.wikipedia.org/wiki/Samurai_Champloo | Yes. A young, determined traveller is a type. |

### Baldur's Gate 3 (developed and published by Larian Studios)

Source for all three: https://en.wikipedia.org/wiki/Baldur%27s_Gate_3

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Shadowheart | Jennifer English | https://en.wikipedia.org/wiki/Baldur%27s_Gate_3 | Yes. A guarded, sarcastic cleric is a type. |
| Astarion | Neil Newbon | https://en.wikipedia.org/wiki/Baldur%27s_Gate_3 | Unclear. "Playful vampire" is a type, but the performance is much talked about as one person's. |
| Lae'zel | Devora Wilde | https://en.wikipedia.org/wiki/Baldur%27s_Gate_3 | Yes. A blunt, direct warrior alien is a type. |

### Team Fortress 2 (developed and published by Valve Corporation)

Source for all ten: https://en.wikipedia.org/wiki/Team_Fortress_2. Valve is named as developer and publisher;
who holds the copyright is not stated: not found. Note: the page says Dennis Bateman is credited for both
Pyro and Spy, and Gary Schwartz for both Demoman and Heavy.

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Scout | Nathan Vetterlein | https://en.wikipedia.org/wiki/Team_Fortress_2 | Yes. A fast-talking Boston runner is a type (the page: baseball fan and street runner from Boston). |
| Soldier | Rick May (the page mentions his death and a 2020 tribute update; it does not say who voices him since) | https://en.wikipedia.org/wiki/Team_Fortress_2 | Yes. A loud, jingoistic patriot (the page's words) is a type. The performer has died, so a lawyer should ask about the estate, not only the living. |
| Pyro | Dennis Bateman | https://en.wikipedia.org/wiki/Team_Fortress_2 | Yes. The code already treats Pyro as wordless ("describe mood without real speech"), so a voice would be invented, not copied. The page credits Bateman for the character, so the original does have a performer; whether it has real words was not found. |
| Demoman | Gary Schwartz | https://en.wikipedia.org/wiki/Team_Fortress_2 | Unclear. A booming Scottish demolitions expert is a type, but the accent is the performer's own act. |
| Heavy | Gary Schwartz (the page writes only "Schwartz" in the Heavy entry) | https://en.wikipedia.org/wiki/Team_Fortress_2 | Unclear. A large Russian man with few words is a type, but Schwartz's delivery is the character. |
| Engineer | Grant Goodeve | https://en.wikipedia.org/wiki/Team_Fortress_2 | Yes. A calm Texan problem-solver is a type. |
| Medic | Robin Atkin Downes | https://en.wikipedia.org/wiki/Team_Fortress_2 | Yes. A gleeful mad-science doctor is a type. |
| Sniper | John Patrick Lowrie | https://en.wikipedia.org/wiki/Team_Fortress_2 | Yes. A dry, professional marksman is a type (the code's own hint: dry professional distance). |
| Spy | Dennis Bateman | https://en.wikipedia.org/wiki/Team_Fortress_2 | Yes. A smooth, understated French covert operative is a type (the page calls him a French covert operative). |
| Announcer | Ellen McLain (the page names her as the voice of the Administrator, who is the announcer) | https://en.wikipedia.org/wiki/Team_Fortress_2 | No. A calm, cold arena voice is a type, but this one is the same performer as the Portal computer (GLaDOS below), so a close copy points at one person. |

### Left 4 Dead 2 (developed by Valve; Electronic Arts published the Xbox 360 and shop copies)

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Ellis | Eric Ladin | https://en.wikipedia.org/wiki/Left_4_Dead_2 | Yes. A friendly, talkative Southern mechanic is a type. |

### Hades (developed and published by Supergiant Games; Private Division published the PlayStation and Xbox boxed copies)

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Zagreus | Darren Korb | https://en.wikipedia.org/wiki/Hades_(video_game) | Yes. A determined young prince is a type. |

### Fallout 4 (developed by Bethesda Game Studios, published by Bethesda Softworks, owned by ZeniMax Media)

Owner source: https://en.wikipedia.org/wiki/Fallout_4 (names the developer, publisher and ZeniMax Media as
the holding company of Bethesda Softworks).

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Nick Valentine | Stephen Russell (same actor as Codsworth) | https://en.wikipedia.org/wiki/Stephen_Russell | Yes. A world-weary noir detective is a type. |
| Piper Wright | Courtney Ford | https://en.wikipedia.org/wiki/Courtney_Ford | Yes. A persistent, quick-talking reporter is a type. |
| Preston Garvey | Not found. Neither the Fallout 4 nor the Preston Garvey Wikipedia page names the voice. | https://en.wikipedia.org/wiki/Preston_Garvey | Yes on the description (earnest, hopeful leader), but someone must find the performer first. |

### Portal (developed and published by Valve)

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| GLaDOS | Ellen McLain (English); the page says her voice was altered to sound more artificial | https://en.wikipedia.org/wiki/Portal_(video_game) | No. A calm, sarcastic computer is a type, but the effect on one person's voice is the sound. A close copy points at her. |

### Da Ali G Show (production company Talkback; Channel 4 in the UK, HBO in the US)

Owner source: https://en.wikipedia.org/wiki/Da_Ali_G_Show. It names Talkback as the production company
and the broadcasters. It does not say who holds the rights: not found.

| Character | Voiced or played by | Source | Could it be a type? |
|---|---|---|---|
| Ali G | Sacha Baron Cohen, who created and plays him | https://en.wikipedia.org/wiki/Ali_G | No. The character is one real person's own comic act; a "streetwise interviewer" voice that sounds right would be an impression of him. |

## Summary

- Rows: 31. Yes: 20. Unclear: 8. No: 3 (Announcer, GLaDOS, Ali G). Preston Garvey is counted as Yes on the
  description alone, with the performer not found.
- Highest care before any voice: Ali G (a real living person's own act), GLaDOS and the Announcer (one
  person for both), and Soldier (the performer has died).
- Not found: the copyright holder for Samurai Champloo, Team Fortress 2, The Legend of Zelda, Da Ali G Show
  and Metal Gear Solid in any of the pages read; the English voice of the 1998 Navi; the voice of Preston Garvey;
  who has voiced the Soldier since 2020.
- One reading note: the Navi and Zelda pages mention a 2026 remake of Ocarina of Time. That is what the
  pages said when fetched; it was not checked anywhere else.
