# Knowledge-base answer eval — 2026-09-17 — plan57-t5-deep

What the Deck's model writes **from** the cards, scored without a judge model. Run by `scripts/eval_kb_answers.py`; the fixture is `tests/fixtures/kb_answer_eval.json` (decision D45, plan 30 W1). Rates are over samples at the shipped temperature, so one run moving a point or two is noise; a check moving ten points is a finding.

| Setting | Value |
|---|---|
| model | `gemma4:e2b-it-qat` |
| ollama | `http://127.0.0.1:11434` |
| corpus_version | `2026.09.08` |
| corpus_sections | `293` |
| prompt_variant | `baseline` |
| kb_placement | `early` |
| voice_preset | `` |
| think_effort | `high` |
| judge_model | `` |
| samples_per_case | `3` |
| cases | `61` |
| run_minutes | `10.4` |

## Summary

| Check | Rate | Meaning |
|---|---|---|
| Facts kept | **81.3%** (139/171) | every must-mention group found in the reply |
| No contradiction | **90.7%** (49/54) | nothing from the must-not-say list appeared |
| Fence not misfired | **100.0%** (168/168) | no spoiler fence where none was due |
| Fence present when due | **44.4%** (4/9) | a fence appeared on a story-beat question |
| Branch menu on Strategy first turn | **98.6%** (136/138) | the parser accepted a bonsai-strategy-branches fence |
| No menu on Speed/Expert | **100.0%** (45/45) | no stray menu outside Strategy |
| Expected card attached | **100.0%** (171/171) | retrieval, not the model: the named card was in the block |
| Control: nothing attached | **n/a** (n/a) | uncovered-game control |
| Ask succeeded | **100.0%** (183/183) | pipeline returned a reply |
| Cases with every sample clean | **65.6%** (40/61) | strictest view |

Mean seconds per answer: **3.4**. Mean request payload: **7167.0** bytes. Mean prompt tokens (Ollama prompt_eval): **1548.9**.
Mean system prompt length: **6739.7** characters.
D46 window warnings: **3/183** samples. Mean estimated prompt tokens: **1940.2**.

## Per case

| Case | Mode | Card attached | Facts | No contradiction | Fence ok | Menu ok | Window warn | Prompt tokens | s/answer |
|---|---|---|---|---|---|---|---|---|---|
| `A-DRG-01` | strategy | 3/3 | 3/3 | — | 3/3 | 2/3 | 0/3 | 1974.0 | 2.8 |
| `A-DRG-02` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2067.3 | 4.8 |
| `A-DRG-03` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1373.3 | 2.4 |
| `A-L4D2-01` | strategy | 3/3 | 2/3 | — | 3/3 | 3/3 | 0/3 | 1949.0 | 4.4 |
| `A-L4D2-02` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1994.7 | 3.9 |
| `A-L4D2-03` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1159.0 | 1.9 |
| `A-P2-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1854.7 | 3.9 |
| `A-P2-02` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1167.0 | 1.2 |
| `A-HL2-01` | strategy | 3/3 | 2/3 | — | 3/3 | 3/3 | 0/3 | 1800.7 | 5.0 |
| `A-HL2-02` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1115.0 | 1.8 |
| `A-HL2-03` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1660.0 | 1.1 |
| `A-HADES-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1927.3 | 2.5 |
| `A-HADES-02` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1935.0 | 5.1 |
| `A-HADES-03` | strategy | 3/3 | 3/3 | — | 0/3 | 3/3 | 0/3 | 1896.7 | 4.6 |
| `A-CP77-01` | expert | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 1806.0 | 0.8 |
| `A-CP77-02` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1977.7 | 2.7 |
| `A-CP77-03` | strategy | — | — | — | 3/3 | 3/3 | 0/3 | 1647.3 | 4.8 |
| `A-CP77-04` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1216.0 | 0.5 |
| `A-FO4-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2042.0 | 4.8 |
| `A-FO4-02` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2012.3 | 4.7 |
| `A-FO4-03` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1224.0 | 2.5 |
| `A-FO4-04` | expert | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 1808.0 | 1.2 |
| `A-FO4-05` | strategy | 3/3 | 2/3 | — | 3/3 | 3/3 | 0/3 | 2049.3 | 3.2 |
| `A-RDR2-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2058.7 | 4.9 |
| `A-RDR2-02` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1184.0 | 2.4 |
| `A-RDR2-03` | strategy | — | — | — | 1/3 | 3/3 | 0/3 | 2016.0 | 4.5 |
| `A-RDR2-04` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1672.7 | 1.1 |
| `A-SOE-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2000.0 | 3.0 |
| `A-SOE-02` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1164.0 | 2.8 |
| `A-OOT-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2071.3 | 4.6 |
| `A-OOT-02` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1909.0 | 3.3 |
| `A-BG3-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1873.3 | 4.1 |
| `A-BG3-02` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1464.0 | 1.3 |
| `A-SIMS4-01` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1129.0 | 1.3 |
| `A-GTASA-01` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1110.0 | 1.9 |
| `A-NOCARD-01` | strategy | — | — | — | — | 3/3 | 0/3 | 1606.0 | 3.8 |
| `A-VAGUE-01` | strategy | — | — | — | — | 3/3 | 0/3 | 1834.7 | 3.9 |
| `A-BMS-01` | strategy | 3/3 | 0/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2332.3 | 5.8 |
| `A-BMS-02` | strategy | 3/3 | 0/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2302.0 | 2.1 |
| `A-HK-01` | strategy | 3/3 | 2/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2379.7 | 5.3 |
| `A-HK-02` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2352.7 | 1.1 |
| `A-DOOME-01` | strategy | 3/3 | 0/3 | 2/3 | 3/3 | 3/3 | 0/3 | 2174.0 | 1.4 |
| `A-DOOME-02` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2232.7 | 2.0 |
| `A-DOOM64-01` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2098.7 | 5.7 |
| `A-DOOM64-02` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2312.7 | 6.1 |
| `A-GTAV-01` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2266.0 | 4.4 |
| `A-GTAV-02` | strategy | 3/3 | 1/3 | — | 3/3 | 3/3 | 0/3 | 2312.0 | 2.7 |
| `A-GTAIV-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2339.7 | 4.2 |
| `A-GTAIV-02` | strategy | 3/3 | 1/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2434.0 | 5.4 |
| `A-FNV-01` | strategy | 3/3 | 0/3 | — | 3/3 | 3/3 | 0/3 | 2425.3 | 6.0 |
| `A-FNV-02` | strategy | 3/3 | 1/3 | 3/3 | 3/3 | 3/3 | 3/3 | 2521.7 | 4.9 |
| `A-SM64-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2312.3 | 5.7 |
| `A-SM64-02` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2305.0 | 2.0 |
| `A-MK64-01` | strategy | 3/3 | 2/3 | — | 3/3 | 2/3 | 0/3 | 2314.7 | 4.2 |
| `A-MK64-02` | strategy | 3/3 | 2/3 | — | 3/3 | 3/3 | 0/3 | 2394.0 | 1.3 |
| `A-TTYD-01` | strategy | 3/3 | 3/3 | 2/3 | 3/3 | 3/3 | 0/3 | 2298.7 | 3.6 |
| `A-TTYD-02` | strategy | 3/3 | 1/3 | — | 3/3 | 3/3 | 0/3 | 2452.7 | 4.1 |
| `A-PIK2-01` | strategy | 3/3 | 1/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2111.0 | 3.8 |
| `A-PIK2-02` | strategy | 3/3 | 0/3 | 0/3 | 3/3 | 3/3 | 0/3 | 2308.3 | 4.3 |
| `A-MELEE-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2289.3 | 3.2 |
| `A-MELEE-02` | strategy | 3/3 | 2/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2331.7 | 4.6 |

## Failures worth reading

- **A-DRG-01** sample 1: branch menu missing
- **A-L4D2-01** sample 1: missing facts: `open`
- **A-HL2-01** sample 2: missing facts: `rock`
- **A-HADES-03** sample 1: spoiler fence missing, one was due
- **A-HADES-03** sample 2: spoiler fence missing, one was due
- **A-HADES-03** sample 3: spoiler fence missing, one was due
- **A-FO4-05** sample 3: missing facts: `twice`
- **A-RDR2-03** sample 1: spoiler fence missing, one was due
- **A-RDR2-03** sample 2: spoiler fence missing, one was due
- **A-BMS-01** sample 1: missing facts: `shell blocks`
- **A-BMS-01** sample 2: missing facts: `shell blocks`
- **A-BMS-01** sample 3: missing facts: `shell blocks`
- **A-BMS-02** sample 1: missing facts: `mostly new`, `kept the same`
- **A-BMS-02** sample 2: missing facts: `kept the same`
- **A-BMS-02** sample 3: missing facts: `kept the same`
- **A-HK-01** sample 1: missing facts: `jump the shockwave`
- **A-DOOME-01** sample 1: missing facts: `shield blocks`
- **A-DOOME-01** sample 2: missing facts: `shield blocks`
- **A-DOOME-01** sample 3: missing facts: `shield blocks`; said: `rush him / get in close / close the distance / stand right next to him`
- **A-GTAV-02** sample 2: missing facts: `yellow meter`
- **A-GTAV-02** sample 3: missing facts: `yellow meter`
- **A-GTAIV-02** sample 2: missing facts: `clears your wanted level`
- **A-GTAIV-02** sample 3: missing facts: `clears your wanted level`
- **A-FNV-01** sample 1: missing facts: `cripple a leg`
- **A-FNV-01** sample 2: missing facts: `alpha male`, `cripple a leg`
- **A-FNV-01** sample 3: missing facts: `cripple a leg`
- **A-FNV-02** sample 2: missing facts: `Goodsprings`
- **A-FNV-02** sample 3: missing facts: `Goodsprings`
- **A-MK64-01** sample 1: branch menu missing
- **A-MK64-01** sample 2: missing facts: `hold it behind your kart`
- **A-MK64-02** sample 3: missing facts: `spin your tires`
- **A-TTYD-01** sample 1: said: `guard her bite / block her bite attack / her bite can be blocked`
- **A-TTYD-02** sample 1: missing facts: `guard with A`
- **A-TTYD-02** sample 2: missing facts: `guard with A`
- **A-PIK2-01** sample 1: missing facts: `kill the mother`
- **A-PIK2-01** sample 3: missing facts: `throw purples at her head`
- **A-PIK2-02** sample 1: missing facts: `two captains`; said: `there's a day limit / you have a limited number of days`
- **A-PIK2-02** sample 2: missing facts: `two captains`; said: `there's a day limit / you have a limited number of days`
- **A-PIK2-02** sample 3: missing facts: `two captains`; said: `there's a day limit / you have a limited number of days`
- **A-MELEE-02** sample 3: missing facts: `launched off the screen`

## One reply per case (sample 1, trimmed to 1,800 characters)

The full text of every sample, plus the system prompt each case received, is in the JSON next to this report.

### A-DRG-01 — Deep Rock Galactic: Survivor — strategy

**Q:** how do i beat the glyphid dreadnought  
**Cards:** Glyphid Dreadnought, Dreadnought Twins, Exploder  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ❌

> For the Glyphid Dreadnought, the main thing is to kite between its waves. Focus your fire on the weak-point armor plates as they open up. Save your high-damage abilities, like the overclock or nuke, for when you have clear windows to break its armor.

### A-DRG-02 — Deep Rock Galactic: Survivor — strategy

**Q:** the dreadnought twins keep healing back up, what am i doing wrong  
**Cards:** Dreadnought Twins, Glyphid Dreadnought, Red Sugar  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> The issue with the Dreadnought Twins is usually related to how you are managing the damage. The key tip here is to split your fire evenly between the two ships instead of focusing all your damage on one of them. If you burn one down too fast, the other one will just keep healing back up. Focus on keeping the damage balanced so their health bars drift apart. Also, remember that they become immune while they are healing the gap between them—don't waste time trying to hit them during that phase.

### A-DRG-03 — Deep Rock Galactic: Survivor — expert

**Q:** what is nitra actually for  
**Cards:** Nitra  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Nitra is the resource used to purchase weapon upgrade cards at the between-stage shop and to reroll the artifact choice from the Supply Pod. Essentially, it's the currency that allows you to buy better weapons instead of upgrading your dwarves directly. If you don't have Nitra, you'll be stuck with underleveled weapons regardless of how much gold you mine.

### A-L4D2-01 — Left 4 Dead 2 — strategy

**Q:** how to beat tank  
**Cards:** Playing as the Tank, Tank, Boomer  
**Checks:** facts ❌ · contradiction — · fence ✅ · menu ✅

> To handle the Tank, focus on positioning and exploiting his weaknesses. Keep your distance; mounted guns shred you, so try to go around rather than through him. Wait for the rest of the infected team to be up before you commit to an attack. If a teammate has someone pinned down, put your body between that survivor and their friends; the bullets hitting you are bullets not saving them. Be aware that if someone runs at you with a revved chainsaw, you can punch them before they arrive.

### A-L4D2-02 — Left 4 Dead 2 — strategy

**Q:** why did the witch suddenly attack me  
**Cards:** The Witch, Jockey, The Director  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The Witch attacks when she is startled. This usually happens if a survivor uses a flashlight on her or if a survivor gets too close. When she is startled, she lets out a growl as a warning, settles down, and then charges at you. She is fast and can incapacitate you in one hit if you are too close.
> 
> If you want to manage her, try to avoid using flashlights near her, and keep a distance. If she is already charging, the best move is usually to run away or try to hit her quickly before she lands the charge.

### A-L4D2-03 — Left 4 Dead 2 — speed

**Q:** tips for playing as the hunter in versus  
**Cards:** Playing as the Hunter  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Playing as the Hunter in Versus is about managing your positioning and utilizing your movement mechanics.
> 
> For pouncing damage, remember that it scales with distance, up to 25 on a long one. Therefore, height and a proper run-up are more important than just surprise.
> 
> When dealing with the horde, if you have to be near the group, move like a common player. The melee claw reads as horde damage until someone checks on you.
> 
> Since the pounce recharges quickly in L4D2, holding crouch and re-pouncing is a good tactic to maintain pressure on the infected.

### A-P2-01 — Portal 2 — strategy

**Q:** how do the gels work  
**Cards:** Repulsion Gel, Gels, Wheatley  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The Gels are items you interact with to change how you move or how things behave in the environment. There are three main types:
> 
> *   **Blue Gel:** This one helps you gain height. The farther you drop onto it, the higher you bounce off. It's useful for getting airborne.
> *   **Orange Gel:** This removes friction. If you have this on your feet, you keep the speed you have when you land on it.
> *   **White Gel:** This is used for portals. It allows you to portal surfaces that couldn't be portalized before, but be warned, it won't stick to solid objects like cubes or turrets, and it gets stripped away by cleansing spray.
> 
> These mechanics are useful for navigating tricky areas or setting up specific movement sequences.

### A-P2-02 — Portal 2 — speed

**Q:** the excursion funnel keeps pushing me the wrong way  
**Cards:** Excursion Funnel  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> If the Excursion Funnel is carrying you the wrong way, you need to look for the button that reverses its direction before you assume the route is closed. It passes through portals, so it can cross the whole chamber, and it ferries gel, cubes, and you.

### A-HL2-01 — Half-Life 2 — strategy

**Q:** the antlions keep coming up out of the sand and killing me  
**Cards:** Antlions, Sandtraps, Pheropod (bugbait)  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Listen up. Antlions are blind and they hunt by vibration. The key here is to stay off the sand and the rocks. If you step on the sand, they will come up and kill you. Stick to the solid ground.

### A-HL2-02 — Half-Life 2 — speed

**Q:** how do i use the bugbait  
**Cards:** Pheropod (bugbait)  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> You need to obtain the pheropod from the Antlion Guard. Once you have it, you throw it, and the antlions will reverse their behavior: they will read you as a guard and swarm whatever you have marked.

### A-HL2-03 — Half-Life 2 — expert

**Q:** what can the gravity gun actually pick up and throw  
**Cards:** Gravity Gun, Ravenholm, Rocket-Propelled Grenade Launcher, Hunter-Chopper (helicopter), Combine soldiers  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The Gravity Gun can pick up and throw various items in Half-Life 2, including:
> 
> *   **Secondary Pulls and Holds:** These are used for maneuvering and controlling objects.
> *   **Primary Punts:** Used for throwing items.
> *   **Explosive Barrels:** These hit hard.
> *   **Sawblades:** These are used to cut zombies apart.
> *   **Held Radiators:** These can be used as a shield, allowing you to walk behind them.
> *   **Manhacks and Scanners:** These are fair game for picking up.
> *   **Thrown Grenades:** These can be thrown back where they came from.

### A-HADES-01 — Hades — strategy

**Q:** which weapon is easiest to start with  
**Cards:** Weapon choice, Weapon aspects, Twin Fists of Malphon  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Take the Stygian Blade first. It is the most forgiving of the six and asks the least of you. The Shield of Chaos is the next easiest, because holding block turns a mistake into nothing. Of the rest, the Eternal Spear is the safest, since its reach keeps you out of trouble. Leave the Twin Fists of Malphon until later — they are the fastest, but they need you standing inside everything. The Heart-Seeking Bow and the Adamant Rail both want range and punish standing still, and the Rail can leave you reloading at the worst possible moment.

### A-HADES-02 — Hades — strategy

**Q:** theseus and asterius keep killing me  
**Cards:** Theseus and Asterius, Shield of Chaos, Adamant Rail  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The main issue is dealing with two enemies at once. The key is to manage the timing. Asterius, the bull, has a long charge, so focus on sidestepping that big move to briefly pin him down. Theseus, on the other hand, is more predictable because you can see the god's power mark on the ground before it hits.
> 
> Most players find it easier to take down Asterius first. If you can handle the bull, Theseus becomes much more manageable. Focus on dodging Asterius's charge, and then use the predictable timing of Theseus to land your attacks.

### A-HADES-03 — Hades — strategy

**Q:** i beat the final boss but the game just keeps going, is that the ending?  
**Cards:** Heat and the Pact of Punishment, Theseus and Asterius, Shield of Chaos  
**Checks:** facts ✅ · contradiction — · fence ❌ · menu ✅

> No, beating the final boss isn't the end. The game is designed so that once you complete a run, you continue playing. The progression is tied into the "Pact of Punishment," which involves adding Heat—a difficulty modifier—to unlock new rewards and challenge yourself further.
> 
> The game keeps going because the goal shifts from just beating a boss to managing your Heat and unlocking the next stages of the narrative.

### A-CP77-01 — Cyberpunk 2077 — expert

**Q:** what does the berserk operating system do  
**Cards:** Berserk, Sandevistan, Quickhacks, Cyberpsychos, Ripperdocs  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> The Berserk operating system is a melee-focused OS that ignores time. Its primary functions are to:
> 
> 1.  **Reduce Damage Taken:** It cuts the amount of damage you receive.
> 2.  **Health Threshold:** It prevents your health from dropping below a quarter of your maximum health.
> 3.  **Health Regeneration:** After you defeat an enemy, it restores a quarter of your maximum health.
> 
> The specific effects of the Berserk OS depend on the melee weapon model you have installed.

### A-CP77-02 — Cyberpunk 2077 — strategy

**Q:** which attributes should i put points into for a first playthrough  
**Cards:** Choosing a build, Lifepath, Berserk  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> For a first playthrough, focus on the core attributes that define your primary playstyle. If you're going the straightforward fighter route, put points into Body and Reflexes. These attributes make you a solid brawler and help you forgive mistakes in combat. If you're leaning into the netrunner route, Intelligence is key for quick hacks, but remember you'll be fragile once you start engaging physically. Technical Ability is the quiet workhorse that helps you unlock the cyberware and crafting you actually want, regardless of your main focus. Spreading points evenly is generally a bad idea because you won't hit the thresholds for the perks worth having.

### A-CP77-03 — Cyberpunk 2077 — strategy

**Q:** how does the main story end  
**Cards:** Lifepath  
**Checks:** facts — · contradiction — · fence ✅ · menu ✅

> The ending of Cyberpunk 2077 isn't fixed; it depends heavily on the choices you make, particularly which Lifepath you choose early on. Your starting path dictates the unique side jobs and dialogue options you encounter, which in turn steer the main narrative toward different outcomes. Focus on making those early decisions that align with the kind of character you want to play.
> 
> ```bonsai-spoiler
> The game offers several distinct narrative trajectories based on your initial Lifepath selection, leading to fundamentally different conclusions regarding the main storyline and character resolution.
> ```
> 
> —
> *No close match in my notes, this answer leans on the model's own knowledge.*

### A-CP77-04 — Cyberpunk 2077 — expert

**Q:** how do i beat adam smasher  
**Cards:** Adam Smasher, Iconic weapons  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> To beat Adam Smasher, focus on high DPS builds or utilizing the Sandevistan. Prioritize destroying his legs first, and use cover while he is barraging you with rockets.

### A-FO4-01 — Fallout 4 — strategy

**Q:** how do i kill a deathclaw early  
**Cards:** Deathclaw, Mirelurk queen, Choosing a build  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> For an early Deathclaw, the key is distance and positioning, as it has very high health and resists most damage. Do not get too close.
> 
> 1.  **Avoid Energy Weapons:** The knowledge base notes that lasers can reflect off its hide, making energy weapons ineffective.
> 2.  **Use Cover:** Stay behind obstacles. Use the environment to break its line of sight and force it to stomp or headbutt you, which can stagger it.
> 3.  **Manage Stagger:** If you manage to land a hit, focus on keeping distance. If it gets close enough to grab you or decapitate you, you need to maintain that distance to avoid being overwhelmed.

### A-FO4-02 — Fallout 4 — strategy

**Q:** what special stats should i pick at the start  
**Cards:** SPECIAL points, Choosing a build, Perks  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Look, the early SPECIAL points in Fallout 4 matter more than you think. You start with one point in every stat, and you get 21 points to spend, totaling 28 points. The main takeaway is this: don't try to optimize everything perfectly right away. Focus on making the character fun for the first ten hours.
> 
> Intelligence is generally the quiet recommendation because it boosts how fast you level up, meaning you get those perks sooner. If you want to be a melee fighter or handle heavy weapons, Strength paired with Endurance is solid. For a sniper or someone who needs to spot things before they happen, Agility and Perception are key. Charisma is the weakest of the bunch early on, but it pays off later if you plan on being a settlement leader or a heavy talker.
> 
> Since you're asking about starting out, the best approach is usually to pick a stat that defines the role you *want* to play, rather than trying to spread the points evenly.

### A-FO4-03 — Fallout 4 — speed

**Q:** feral ghouls keep swarming me  
**Cards:** Feral ghouls  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Focus on exploiting their primary weakness: the head. If you can take off one of their legs, they stop attacking entirely. This is your main priority during the swarm.
> 
> If you are struggling to keep up, remember they deal radiation damage as well as physical damage. If you are in a heavily irradiated area, shooting them will cause them to regenerate. If you are in a less irradiated zone, prioritize taking off limbs to break the swarm's momentum.

### A-FO4-04 — Fallout 4 — expert

**Q:** my power armor suddenly stopped working properly  
**Cards:** Upgrading power armor, Power armor and fusion cores, Stimpaks and chems, Legendary enemies, Settlement happiness  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> If your power armor suddenly stopped working, check a few things. First, make sure you are not over-encumbered, as this can drain your Fusion Core and affect your V.A.T.S. and aim. Also, verify that your Fusion Core isn't empty; if it is, you can still walk, but you'll lose V.A.T.S. and steady aim. Finally, ensure you have the necessary repairs done at a power armor station.

### A-FO4-05 — Fallout 4 — strategy

**Q:** a legendary enemy healed back to full in the middle of the fight  
**Cards:** Legendary enemies, Stimpaks and chems, Feral ghouls  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> That mechanic means you shouldn't try to rush the kill. If the enemy heals completely at half health and gets a new ability, you need to conserve your resources. Don't spend all your ammo or health on the first half of the fight; you'll find yourself fighting a much tougher version of the enemy later. Focus on managing your health and waiting for the right moment to strike.

### A-RDR2-01 — Red Dead Redemption 2 — strategy

**Q:** i just came from gta, any tips before i start  
**Cards:** Coming from GTA, Bounties, Satchel upgrades  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Look, Red Dead 2 is slow on purpose. Don't expect instant gratification. Arthur has weight, horses take time to turn, and everything is an animation. If you try to sprint through a town, the law will show up in about ninety seconds, and then they'll stay.
> 
> Here’s the gist of how things work differently:
> 
> 1.  **Wanted Levels:** They don't just disappear when you leave. If someone sees you, they turn into a bounty you have to pay off at a post office. Keep your face covered if you're doing anything questionable.
> 2.  **Movement:** Ride instead of sprinting. It’s slower, but it’s what the game wants you to do.
> 3.  **The Camp:** Don't just treat the camp as a menu. It’s your base. You need to manage your inventory carefully.
> 4.  **Satchels:** Upgrading your satchel early is worth it. Running out of space is the main reason people stop restocking before they decide to ride out.
> 
> So, before we get into specifics, where do you want to start your journey?

### A-RDR2-02 — Red Dead Redemption 2 — speed

**Q:** how do i raise honor  
**Cards:** Honor  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Raising Honor is a slider mechanic, meaning it's not a simple switch. It's built up through consistent actions:
> 
> **To Raise Honor:**
> *   Greet people.
> *   Help strangers on the road.
> *   Pay bounties instead of running.
> *   Donate to the camp.
> 
> **To Lower Honor:**
> *   Engage in robbery.
> *   Kill civilians or animals you don't intend to use.
> 
> High honor grants you shop discounts and affects how other characters react to you. Low honor changes how you are paid for work. Remember, it's a slider; one bad day doesn't erase good chapters.

### A-RDR2-03 — Red Dead Redemption 2 — strategy

**Q:** what happens to arthur at the end of the story  
**Cards:** Coming from GTA, Bounties, Satchel upgrades  
**Checks:** facts — · contradiction — · fence ❌ · menu ✅

> Look, I can't give you the final outcome, that's the whole point of the game. But getting to the end involves making tough calls about how you handle the world and your own path. It's less about a single event and more about the choices you make along the way regarding loyalty, survival, and the life you choose to build.
> 
> If you're stuck on how to approach the final chapters, we can talk about how to manage resources or specific situations.

### A-RDR2-04 — Red Dead Redemption 2 — expert

**Q:** my horse keeps throwing me off  
**Cards:** Horse bonding, Bear, Horse breeds, Coming from GTA, Satchel upgrades  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Horse bonding is key to handling. Bond level dictates how much stamina, better handling, and advanced maneuvers like the rear and drift you get. You raise the bond by riding, feeding, brushing, patting, and calming the horse during danger. Each level is per horse, so switching mounts resets the bond.
> 
> If you're having trouble with a specific horse, focus on those bonding actions. Also, remember that horse breeds matter; some, like Arabians, bolt easily until the bond is established, while draft horses are slower but carry more.

### A-SOE-01 — State of Emergency — strategy

**Q:** how do i get more time in a round  
**Cards:** Round time and the +15s pickups, Late-round rocket enemies, Unlocking characters  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The main tactic here is to stop fighting and start collecting time. Instead of trying to finish every single crowd, focus on using the +15s pickups scattered around the level. Extending the round is worth more than finishing a fight, so prioritize those pickups when you have a moment to breathe.

### A-SOE-02 — State of Emergency — speed

**Q:** whats the difference between kaos mode and revolution mode  
**Cards:** Kaos mode and Revolution mode  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Kaos mode focuses on score attack against a clock in a single zone. You extend the time by hitting objectives that pop up during the riot, rather than focusing on surviving.
> 
> Revolution mode is story-driven. It involves a chain of missions per zone, with objectives being handed out by the resistance, and this mode is where characters and zones are unlocked.

### A-OOT-01 — The Legend of Zelda: Ocarina of Time — strategy

**Q:** the shadow temple has floors missing everywhere  
**Cards:** Shadow Temple invisible floors, Dark Link, Adult dungeon order  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> To deal with the missing floors in the Shadow Temple, you need to use the Lens of Truth. Equip it, and the invisible floors, walls, and chests will become visible. Be careful not to hold it down constantly, as it drains magic. Use it in short bursts and keep your green potions or fairies handy to refill your magic.
> 
> Since you are in the Shadow Temple, you are currently in the 'Shadow' phase of the Adult Dungeon Order. The next step is moving to the Spirit Temple.

### A-OOT-02 — The Legend of Zelda: Ocarina of Time — strategy

**Q:** how do i beat volvagia  
**Cards:** Volvagia, Biggoron's Sword, Gold Skulltulas  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> For Volvagia, the key is timing your attacks with the Megaton Hammer. When the fire dragon pops up from the floor, hit its head the instant it rises, and then slash while it is stunned. To keep it in check while it flies around, use the hookshot to pull it back down. Equip the Goron Tunic and use a shield to block the fire, and make sure you stay away from the edges where the lava is.

### A-BG3-01 — Baldur's Gate 3 — strategy

**Q:** should i be long resting more often  
**Cards:** Long rest, Sneak Attack, Party composition  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Look, resting more often isn't always the answer. A long rest is a big commitment. It costs you camp supplies, and you lose some resources, but it's what pushes the story forward and advances companion scenes. The main thing is not to hoard rests; if you're running out of food or supplies, you need to focus on gathering those instead of just resting. Think of it as managing your inventory, not just your rest count.

### A-BG3-02 — Baldur's Gate 3 — expert

**Q:** what party composition should i use for a first run  
**Cards:** Party composition, Sneak Attack, Goblin Camp, Inspiration  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> For a first run, focus on coverage. You need someone to talk, someone to heal, someone who handles traps and locks, and enough damage. A good starting point is a Bard and a Paladin for talking and damage, and a Cleric and a Druid for healing. A Rogue and a Ranger can handle traps well. The key is ensuring you have healing coverage; a party without a healer will struggle significantly.
> 
> If you want a more specific setup, consider this:
> 
> 1.  **Talk/Damage:** Bard or Paladin.
> 2.  **Healer:** Cleric or Druid.
> 3.  **Utility (Traps/Locks):** Rogue or Ranger.
> 
> Try to cover these roles with your initial party members. If you find yourself lacking healing, prioritize getting a Cleric or Druid in early.

### A-SIMS4-01 — The Sims 4 — speed

**Q:** fastest way to make money early  
**Cards:** Making money  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The fastest ways to generate early income in The Sims 4 usually revolve around skills that scale quickly or assets that require minimal upfront investment.
> 
> 1.  **Painting and Writing:** These are classic self-employed earners. They require only one skill and one object, and both scale hard with level, meaning they become very efficient once you get started.
> 2.  **Selling Collectibles:** Starting with a cheap starter lot allows you to focus on acquiring and selling collectibles. This can provide immediate, albeit small, funds early on.
> 3.  **Gardening:** While it's slower to start, once established, it can become a steady income source.
> 
> Focusing on painting or writing often provides the quickest route to consistent, scalable income compared to slower methods like large-scale gardening.

### A-GTASA-01 — Grand Theft Auto: San Andreas - The Definitive Edition — speed

**Q:** how do i recruit more gang members  
**Cards:** Respect  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Look, the limit is set between one and seven gang members. To increase that cap, you gotta focus on the mechanics that build your respect.
> 
> You can increase the number of gang members you can recruit by:
> 
> 1.  Completing various missions.
> 2.  Killing rival gang members and police.
> 3.  Taking territory.
> 4.  Spraying over tags.
> 5.  Adjusting your appearance to match the gang aesthetic (this includes hair, tattoos, clothes, muscle, and wearing green when you're in Grove Street territory).
> 
> Conversely, remember that your respect level will drop if you wear the wrong colors at home, kill your own gang members, or lose turf.

### A-NOCARD-01 — ELDEN RING — strategy

**Q:** how do i beat margit  
**Cards:** none  
**Checks:** facts — · contradiction — · fence — · menu ✅

> Fighting Margit requires careful management of your stamina and positioning. Focus on dodging her large sweeping attacks; if you can time your dodges perfectly, you can punish her openings. When she uses her heavy attacks, try to keep your distance or use your dodge roll to interrupt her rhythm. Always manage your stamina so you have enough left for recovery or a crucial dodge.

### A-VAGUE-01 — Hades — strategy

**Q:** keep dying in tartarus  
**Cards:** Shield of Chaos, Theseus and Asterius, Mirror of Night  
**Checks:** facts — · contradiction — · fence — · menu ✅

> Look, keeping dying in Tartarus usually means you're either getting caught out by the attacks or trying to rush things too much. For the early levels, the key is simple: don't try to fight everything at once. Focus on dodging the big, slow attacks and only engage when you have a clear opening. If you get overwhelmed, just back away and wait for the next wave. Also, pay attention to where the enemies are coming from—if you see a pattern, you can usually predict the next move.

### A-BMS-01 — Black Mesa — strategy

**Q:** How do I damage the giant headcrab boss at the end of the Xen caverns in Black Mesa?  
**Cards:** Gonarch, Starting out in Black Mesa, The opening tram ride and where it leads  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> For the giant headcrab boss, the key is targeting the right spot. Its main body is tough, but the pale egg sac under its body is the only part that takes damage. Focus your shots there.
> 
> When you are at range, it will launch white acid mortars from its back. Up close, you need to focus on its front legs, as those are what deal the most damage. Be careful of its movement; it walks over pits, so watch your footing. When it starts spawning baby headcrabs, treat them as distractions—they are weak and fast, meant to pull your attention away from the main egg sac. When it finally dies, back away quickly before the sac bursts and releases a final swarm.

### A-BMS-02 — Black Mesa — strategy

**Q:** What's different about the Xen levels in Black Mesa compared to the original Half-Life?  
**Cards:** Starting out in Black Mesa, The opening tram ride and where it leads, Long Jump Module  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> The Xen chapters in *Black Mesa* are essentially new work, meaning they are significantly longer than the original 1998 levels. While the core structure remains similar—no cutscenes, reliance on the crowbar for crates and vents, and combat favoring doorways—the sheer volume and scope of the alien world are what sets it apart.
> 
> The main gameplay difference you'll encounter is the environment itself. Xen features floating islands where gravity is weak. To navigate these areas, you'll need the Long Jump Module, which you get later in the game, allowing you to crouch and jump in quick succession to gain distance.

### A-HK-01 — Hollow Knight — strategy

**Q:** How do I beat the big armored bug boss in the Forgotten Crossroads?  
**Cards:** Leaving the Forgotten Crossroads, False Knight, Watcher Knights  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> To beat the big armored bug boss, you need to manage his phases carefully. When he first attacks, he slams a mace that creates a shockwave across the floor. Your first move should be to jump that wave instead of backing away.
> 
> Focus on chipping away at his armor. Remember, hitting the armor itself doesn't give you soul. You only gain soul or deal real damage when the armor breaks and he topples, exposing his head. Once he exposes his head, pile hits on it, and then back off immediately. This triggers his rage phase where he rains barrels. You can knock those barrels back into him for ten damage each, which can stagger him.
> 
> Keep attacking until the armor is broken enough to expose his head a third time. After that, he will break the floor and fall below. Drop after him to finish the fight. If things get difficult, be aware that a wall above the left gate becomes breakable after his first rage, and the Vengeful Spirit spell is in the next room, which might make the rematch easier.

### A-HK-02 — Hollow Knight — strategy

**Q:** I just started Hollow Knight and don't have a map -- how do I get one, and what do benches actually do?  
**Cards:** Starting out in Hollow Knight, Watcher Knights, Charms and notches  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Getting a map in Hollow Knight is tied to finding the humming cartographer, Cornifer. You need to find him, buy his map, and then you can only see the rest of the world when you rest at benches. Benches are important because they are where you can swap charms and restore your masks.

### A-DOOME-01 — DOOM Eternal — strategy

**Q:** How do I fight the Marauder in DOOM Eternal? He keeps blocking everything.  
**Cards:** Starting out in DOOM Eternal: the combat loop, Marauder, The Crucible  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> Stay at mid-range. If you get too close, it will draw a super shotgun faster than you can dash. If you stay far, it will throw axe waves.
> 
> When it winds up the axe, its eyes will flash green. Hit it in that instant. It will stagger for a couple of seconds. After that, pour in the highest damage per shot you have, like the super shotgun, ballista, or rocket. Swap weapons between hits to keep the pressure on. Use grenades and rockets near it; they will briefly drop its shield. Keep the space between you and the Marauder.

### A-DOOME-02 — DOOM Eternal — strategy

**Q:** What's the basic combat loop I'm supposed to be doing in DOOM Eternal?  
**Cards:** Starting out in DOOM Eternal: the combat loop, Doom Hunter, The Crucible  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> The combat loop in DOOM Eternal is about managing resources and never standing still. Here is the basic flow:
> 
> 1.  **Shoot and Glory Kill:** Shoot weak enemies until they flash, then finish them off for health.
> 2.  **Fuel Management:** Use the chainsaw on fodder demons to get fuel. It costs three fuel units per kill, but it refills automatically every twenty seconds. Fodder demons cost one fuel unit, so it's a reliable way to keep your fuel up.
> 3.  **Flame Belch:** Use the flame belch on groups of enemies to burn them for armor, which is essential for survival. This has a twenty-five second cooldown.
> 4.  **Movement and Weapon Swapping:** Never stand still. Dash twice, jump twice, and swap weapons mid-fight instead of just reloading.
> 5.  **Running Dry:** If you run out of everything, the game will hand you the chainsaw for one fodder kill, and the loop restarts.
> 
> This cycle is about constantly moving, managing your fuel, and using your abilities to survive the onslaught.

### A-DOOM64-01 — Doom 64 — strategy

**Q:** How do I beat the final boss in Doom 64, the Mother Demon?  
**Cards:** Starting out in Doom 64, Mother Demon, The Lost Levels  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Alright, to handle the Mother Demon, you need to focus on timing and resource management. The key is getting the Demon Keys first.
> 
> Here is the breakdown:
> 1.  **Key Acquisition:** You must find the three Demon Keys before the main confrontation.
> 2.  **Phase 1 Defense:** When she starts, watch her flame trail. It will toss you around, and four homing rockets will follow. You need to dodge the flame trails and manage those rockets.
> 3.  **The Unmaker:** The best way to handle the rockets is by using the fully upgraded Unmaker. Use it at point-blank range to stun her, which stops her from launching the rockets, leaving you only to dodge the flame trails.
> 4.  **Final Push:** If you haven't gotten the keys yet, you'll fight a large horde first, which will drain your ammo. Once you have the keys, use the BFG or rockets for the final takedown, timing it correctly.

### A-DOOM64-02 — Doom 64 — strategy

**Q:** Is Doom 64 just a port of the original Doom games, or is it different?  
**Cards:** Starting out in Doom 64, How the coloured keycards work, Finding your way through the dark, maze-like levels  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Doom 64 is not a port; it is a separate sequel to Doom II. It features thirty-two new levels, redrawn sprites, colored lighting, and a slower, darker atmosphere. You get the core Doom arsenal, plus new elements like the Unmaker and the nightmare imp, but it's a distinct game.
> 
> When starting out in Doom 64, the key is to treat the environment like a trap. Pay close attention to the colored keycards; they are essential for unlocking doors, and losing them means you're stuck. Also, listen for sounds—a distant door or switch firing—because that usually means something has changed, even if you can't see it yet. Backtracking is often necessary, and look for switches that seem out of place; they usually lead back to where you came from.

### A-GTAV-01 — Grand Theft Auto V — strategy

**Q:** How does body armor work in GTA V, and does it help against melee?  
**Cards:** Starting out in GTA V, Weapons, armour and cover, Special abilities and how to grow them  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Body armor in GTA V comes in five tiers, with each level being five times stronger than the last. However, the important thing to know is that body armor does absolutely nothing against melee attacks. It is designed to protect you from gunfire, not close-quarters combat.

### A-GTAV-02 — Grand Theft Auto V — strategy

**Q:** How do the special abilities work for the three characters in GTA V?  
**Cards:** Starting out in GTA V, Special abilities and how to grow them, Side jobs and collectibles that count  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The special abilities are unique to each character and are tied to a small yellow meter under the radar. You can switch between characters at any time using the character wheel, but you cannot switch while you have a wanted level.
> 
> Here is a breakdown of what each character does:
> 
> *   **Michael:** His ability is Area Kill, which is bullet time for shootouts. It lasts for thirty seconds once the ability bar is maxed.
> *   **Franklin:** His ability is Driving Focus. This slows down the world while he is in any land vehicle, including tanks. It starts at a third of its final length.
> *   **Trevor:** His ability is Rage. This doubles his damage and makes him immune to everything for the duration.
> 
> The skill behind these abilities grows with use. For Franklin, you grow the time you get by climbing while drifting, threading near misses at speed, driving into oncoming traffic, or holding ninety percent of a car's top speed.

### A-GTAIV-01 — Grand Theft Auto IV — strategy

**Q:** Where can I reliably buy weapons in GTA IV, and is there a discount anywhere?  
**Cards:** Starting out in GTA IV, Weapons and where to buy them, Foot chases through construction sites  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> In GTA IV, you can acquire weapons in a few ways. Early on, you'll find basic weapons like the M4 carbine and AK assault rifle lying around on the ground after an enemy is defeated. You can also find body armor, which helps reduce damage.
> 
> For more reliable sources, you'll need to look for underground gun shops. These shops usually open after you've dealt with certain story elements. Once you get a friend named Little Jacob, his van is a good source, and he sells everything at a 60% discount.

### A-GTAIV-02 — Grand Theft Auto IV — strategy

**Q:** How does saving work in GTA IV, and does it clear my wanted level?  
**Cards:** Starting out in GTA IV, Wanted levels and the search circle, Foot chases through construction sites  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Saving in GTA IV is simple. When you are in a safehouse, you can save your progress by walking over to the bed and choosing to sleep. This action will clear your current wanted level.
> 
> Regarding wanted levels, the game has specific ways to reduce them:
> *   Sleeping in a safehouse clears the current level.
> *   If you are wanted six stars, you can try swapping cars for a few seconds, or use public transport like the subway above two stars.
> *   To clear a level entirely, you can use a 'Pay 'n' Spray' if you enter unseen in a car that fits, or use a bed.

### A-FNV-01 — Fallout: New Vegas — strategy

**Q:** Why is Quarry Junction so dangerous, and how do I survive if I have to go through it early?  
**Cards:** Deathclaws and Quarry Junction, Crossing the crater radiation pools, Starting out in Fallout: New Vegas  
**Checks:** facts ❌ · contradiction — · fence ✅ · menu ✅

> The danger at Quarry Junction comes from the Deathclaws inside the quarry past Sloan. They are tougher than normal, with double or triple health, and you have to watch out for the alpha male who deals massive damage and the mother who goes berserk if you kill one near her.
> 
> To survive the encounter:
> 1.  **Don't stand still:** Use the environment. If you can stand on a rock they cannot reach, use that.
> 2.  **Use water:** Dive into the water if you can manage it.
> 3.  **Use a flare gun:** This is your best bet for making them flee the area.
> 
> Clearing the area will reward you with a Fat Man, which includes two mini nukes and a light machine gun.

### A-FNV-02 — Fallout: New Vegas — strategy

**Q:** I'm new to Fallout: New Vegas -- how do skill checks work, and can I fail them randomly?  
**Cards:** Starting out in Fallout: New Vegas, Skills, SPECIAL points, implants and books, Choosing early armor by Damage Threshold, not by looks  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Skill checks in Fallout: New Vegas are generally not random dice rolls; they use fixed thresholds. This means if a skill check requires a "Speech of 25," you either meet that number or you don't. It's a set requirement, not a roll that might succeed or fail based on luck.
> 
> When you start, the game gives you a base level for every skill based on your starting stats. You get bonus points by tagging certain skills, and leveling up gives you more points. You can also use skill books or magazines to help you meet those thresholds.
> 
> The best way to learn is to just play. The tutorial areas, like the one in Goodsprings, will show you exactly what kind of check is required for specific actions, so you can see the target number you need to hit.

### A-SM64-01 — Super Mario 64 — strategy

**Q:** How do I actually beat Bowser in Super Mario 64? I keep missing the bombs.  
**Cards:** Starting out in Super Mario 64, Bowser: the three fights, Getting your first star in Bob-omb Battlefield  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> When you're missing the bombs, it usually comes down to timing and positioning. For the first fight, the key is to get right behind him. You need to grab his tail, and then you have to spin your stick quickly to build up speed. Once you have that momentum, you need to throw him directly into one of the four spiked bombs around the edge of the platform. If you miss the throw, he just climbs back up, so focus on that precise throw after you build up your speed.
> 
> If you are struggling with the second fight, remember that the stage tilts when he lands, so keep an eye on the ground. For the final fight, you need to throw him three times, as there are five bombs total. Focus on keeping your throws accurate and timed with his movement.

### A-SM64-02 — Super Mario 64 — strategy

**Q:** How does health work in Super Mario 64, and how do I refill it?  
**Cards:** Starting out in Super Mario 64, Getting your first star in Bob-omb Battlefield, The three caps  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Health in Super Mario 64 is managed by the eight-wedge power meter. You refill this meter by collecting coins, spinning hearts, or by surfacing in water.
> 
> To get started, focus on collecting coins and hearts as you explore the castle courses.

### A-MK64-01 — Mario Kart 64 — strategy

**Q:** Who gets the blue shell in Mario Kart 64, and can I block it?  
**Cards:** Starting out in Mario Kart 64, Items and who gets them, Picking a kart for top speed  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ❌

> The blue Spiny Shell is a powerful item. It only appears for players who are in fourth place or lower in the race.
> 
> Regarding blocking, yes, you can. The blue Spiny Shell runs along the ground with a siren and homes in on the leader. You can hold it behind your kart to block other shells from hitting you before you fire it.

### A-MK64-02 — Mario Kart 64 — strategy

**Q:** How do I get a rocket start off the line in Mario Kart 64?  
**Cards:** Starting out in Mario Kart 64, Drifting and Mini-Turbos, Picking a kart for top speed  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> To get a rocket start, you need to hold the gas as the lights change from red to blue. If you do it too early, you'll spin your tires and go slower than everyone else.

### A-TTYD-01 — Paper Mario: The Thousand-Year Door — strategy

**Q:** What's the trick to beating Hooktail in Thousand-Year Door? She keeps healing.  
**Cards:** Starting out in Paper Mario: The Thousand-Year Door, Hooktail, Rawk Hawk, Magnus von Grapple and Cortez  
**Checks:** facts ✅ · contradiction ❌ · fence ✅ · menu ✅

> The main thing to remember about Hooktail is that she heals by eating the audience. To stop her from getting stronger, you need to keep the crowd thin. Don't let too many audience members get close to her. Also, Koops is your friend; his shell toss hits her first, which helps manage the damage. If you have Fire moves, they hurt her badly. Focus on keeping your own HP high rather than trying to guard her attacks, since her bite cannot be blocked.

### A-TTYD-02 — Paper Mario: The Thousand-Year Door — strategy

**Q:** How does battling actually work in Thousand-Year Door -- what's an action command?  
**Cards:** Starting out in Paper Mario: The Thousand-Year Door, Star Power, Stylish moves and the crowd, The final battle: hands, patterns and the charge tell  
**Checks:** facts ❌ · contradiction — · fence ✅ · menu ✅

> Battles in the game are turn-based, taking place on a theatre stage. Mario and your partner each get to act once per turn, and you can choose who goes first, which also determines who acts first.
> 
> An action command is essentially a specific button press you need to time correctly during an attack animation to trigger extra damage. It's a timing mechanic, not just a random button press.
> 
> Here is a quick breakdown of the combat flow:
> 
> 1.  **Turn Order:** You decide who acts first.
> 2.  **Attack Phase:** Mario or your partner attacks the enemy.
> 3.  **Action Command:** You must press the correct button at the right moment during the attack animation to execute the action command, which deals bonus damage.
> 4.  **Defense:** Enemies can be guarded by pressing 'A' when an attack lands for reduced damage, or 'B' during a very short window for a superguard, which results in no damage and gives you a point back.
> 
> The key is timing that button press perfectly with the attack animation to maximize your damage.

### A-PIK2-01 — Pikmin 2 — strategy

**Q:** How do I deal with the giant bulborb boss that keeps making more enemies?  
**Cards:** Empress Bulblax and the Snagrets, The enemies that empty a squad, Segmented Crawbster  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> Dealing with the giant bulborb boss, the Empress Bulblax, is about managing her movement. Since she rolls from wall to wall, you need to keep your Pikmin squad moving off the sides of the screen. When she pauses, use your purple Pikmin to hit her head. Be aware of the Burrowing Snagrets; they hide underground and can sometimes get stuck, which gives you free damage if you hit them with purple.

### A-PIK2-02 — Pikmin 2 — strategy

**Q:** What's the actual goal in Pikmin 2, and is there still a day limit?  
**Cards:** Starting out in Pikmin 2, Growing your Pikmin squad, Purple and White Pikmin  
**Checks:** facts ❌ · contradiction ❌ · fence ✅ · menu ✅

> The main goal in Pikmin 2 is to collect ten thousand Pokos of treasure to settle the company's debt. You earn these Pokos from both treasures and enemy bodies.
> 
> Regarding the day limit, yes, there is a time constraint. The day ends at sunset. If you don't have a Pikmin with a captain or back at the Onion by sunset, they will be eaten when the night creatures wake up. This means planning your work around the sun is crucial.

### A-MELEE-01 — Super Smash Bros. Melee — strategy

**Q:** What makes Fox and Falco so good in Melee, and what's their weakness?  
**Cards:** Fox and Falco, Starting out in Melee, Unlocking the other eleven  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Fox is built around speed. His main strength is how fast he moves and his quick shield reflector, which can knock opponents off stage sideways. The weakness is that because he is so fast, falling quickly can make him easy to combo.
> 
> Falco is the opposite. He is slower and heavier. His strength comes from his laser, which can make opponents flinch and cancel their attacks when he lands. He also has a strong defensive move: the Falco pillar, which involves reflecting an attack into a down air spike to keep pressure on. His weakness is simply that he is slower than Fox.

### A-MELEE-02 — Super Smash Bros. Melee — strategy

**Q:** How does damage and knockback work in Melee if there's no health bar?  
**Cards:** Starting out in Melee, The techniques the game never tells you about, Classic Mode's Metal Battle  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> In Melee, there is no traditional health bar. Instead, damage is calculated as a percentage. When you hit an opponent, the damage you deal is a percentage of their remaining stock. The higher the percentage, the further the hit will send them. Stock is lost when an opponent is launched completely off the edge of the screen, not when they run out of health.
> 
> The game also features mechanics that affect knockback, such as how fast hits travel, gravity, and the power of specific moves like Smash attacks, which charge for up to a second for increased power.
