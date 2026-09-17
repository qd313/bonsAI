# Knowledge-base answer eval — 2026-09-17 — plan57-t5-balanced

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
| think_effort | `medium` |
| judge_model | `` |
| samples_per_case | `3` |
| cases | `61` |
| run_minutes | `9.8` |

## Summary

| Check | Rate | Meaning |
|---|---|---|
| Facts kept | **77.2%** (132/171) | every must-mention group found in the reply |
| No contradiction | **94.4%** (51/54) | nothing from the must-not-say list appeared |
| Fence not misfired | **100.0%** (168/168) | no spoiler fence where none was due |
| Fence present when due | **55.6%** (5/9) | a fence appeared on a story-beat question |
| Branch menu on Strategy first turn | **94.2%** (130/138) | the parser accepted a bonsai-strategy-branches fence |
| No menu on Speed/Expert | **100.0%** (45/45) | no stray menu outside Strategy |
| Expected card attached | **100.0%** (171/171) | retrieval, not the model: the named card was in the block |
| Control: nothing attached | **n/a** (n/a) | uncovered-game control |
| Ask succeeded | **100.0%** (183/183) | pipeline returned a reply |
| Cases with every sample clean | **59.0%** (36/61) | strictest view |

Mean seconds per answer: **3.2**. Mean request payload: **7167.0** bytes. Mean prompt tokens (Ollama prompt_eval): **1548.9**.
Mean system prompt length: **6739.7** characters.
D46 window warnings: **0/183** samples. Mean estimated prompt tokens: **1940.2**.

## Per case

| Case | Mode | Card attached | Facts | No contradiction | Fence ok | Menu ok | Window warn | Prompt tokens | s/answer |
|---|---|---|---|---|---|---|---|---|---|
| `A-DRG-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1974.0 | 2.1 |
| `A-DRG-02` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2067.3 | 4.6 |
| `A-DRG-03` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1373.3 | 1.3 |
| `A-L4D2-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1949.0 | 4.6 |
| `A-L4D2-02` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1994.7 | 3.5 |
| `A-L4D2-03` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1159.0 | 3.3 |
| `A-P2-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1854.7 | 4.0 |
| `A-P2-02` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1167.0 | 0.6 |
| `A-HL2-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1800.7 | 3.2 |
| `A-HL2-02` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1115.0 | 2.6 |
| `A-HL2-03` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1660.0 | 1.2 |
| `A-HADES-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1927.3 | 4.9 |
| `A-HADES-02` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1935.0 | 3.5 |
| `A-HADES-03` | strategy | 3/3 | 3/3 | — | 0/3 | 3/3 | 0/3 | 1896.7 | 4.5 |
| `A-CP77-01` | expert | 3/3 | 2/3 | 3/3 | 3/3 | 3/3 | 0/3 | 1806.0 | 1.5 |
| `A-CP77-02` | strategy | 3/3 | 3/3 | — | 3/3 | 2/3 | 0/3 | 1977.7 | 3.5 |
| `A-CP77-03` | strategy | — | — | — | 2/3 | 3/3 | 0/3 | 1647.3 | 4.5 |
| `A-CP77-04` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1216.0 | 0.5 |
| `A-FO4-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2042.0 | 5.1 |
| `A-FO4-02` | strategy | 3/3 | 2/3 | — | 3/3 | 2/3 | 0/3 | 2012.3 | 4.2 |
| `A-FO4-03` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1224.0 | 0.6 |
| `A-FO4-04` | expert | 3/3 | 3/3 | 2/3 | 3/3 | 3/3 | 0/3 | 1808.0 | 1.4 |
| `A-FO4-05` | strategy | 3/3 | 1/3 | — | 3/3 | 3/3 | 0/3 | 2049.3 | 4.9 |
| `A-RDR2-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2058.7 | 5.4 |
| `A-RDR2-02` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1184.0 | 2.1 |
| `A-RDR2-03` | strategy | — | — | — | 3/3 | 2/3 | 0/3 | 2016.0 | 4.5 |
| `A-RDR2-04` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1672.7 | 1.0 |
| `A-SOE-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2000.0 | 1.6 |
| `A-SOE-02` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1164.0 | 0.7 |
| `A-OOT-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2071.3 | 4.7 |
| `A-OOT-02` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1909.0 | 4.4 |
| `A-BG3-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1873.3 | 4.6 |
| `A-BG3-02` | expert | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1464.0 | 1.8 |
| `A-SIMS4-01` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1129.0 | 1.1 |
| `A-GTASA-01` | speed | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 1110.0 | 1.7 |
| `A-NOCARD-01` | strategy | — | — | — | — | 3/3 | 0/3 | 1606.0 | 3.8 |
| `A-VAGUE-01` | strategy | — | — | — | — | 3/3 | 0/3 | 1834.7 | 3.7 |
| `A-BMS-01` | strategy | 3/3 | 0/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2332.3 | 3.9 |
| `A-BMS-02` | strategy | 3/3 | 0/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2302.0 | 3.5 |
| `A-HK-01` | strategy | 3/3 | 0/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2379.7 | 5.1 |
| `A-HK-02` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2352.7 | 1.4 |
| `A-DOOME-01` | strategy | 3/3 | 0/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2174.0 | 2.8 |
| `A-DOOME-02` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2232.7 | 2.1 |
| `A-DOOM64-01` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 2/3 | 0/3 | 2098.7 | 4.1 |
| `A-DOOM64-02` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2312.7 | 4.8 |
| `A-GTAV-01` | strategy | 3/3 | 2/3 | 3/3 | 3/3 | 2/3 | 0/3 | 2266.0 | 2.5 |
| `A-GTAV-02` | strategy | 3/3 | 0/3 | — | 3/3 | 3/3 | 0/3 | 2312.0 | 3.0 |
| `A-GTAIV-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2339.7 | 3.4 |
| `A-GTAIV-02` | strategy | 3/3 | 0/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2434.0 | 3.1 |
| `A-FNV-01` | strategy | 3/3 | 0/3 | — | 3/3 | 3/3 | 0/3 | 2425.3 | 5.1 |
| `A-FNV-02` | strategy | 3/3 | 1/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2521.7 | 5.1 |
| `A-SM64-01` | strategy | 3/3 | 3/3 | — | 3/3 | 3/3 | 0/3 | 2312.3 | 5.1 |
| `A-SM64-02` | strategy | 3/3 | 3/3 | — | 3/3 | 2/3 | 0/3 | 2305.0 | 0.8 |
| `A-MK64-01` | strategy | 3/3 | 2/3 | — | 3/3 | 2/3 | 0/3 | 2314.7 | 3.2 |
| `A-MK64-02` | strategy | 3/3 | 2/3 | — | 3/3 | 3/3 | 0/3 | 2394.0 | 1.6 |
| `A-TTYD-01` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2298.7 | 5.0 |
| `A-TTYD-02` | strategy | 3/3 | 0/3 | — | 3/3 | 3/3 | 0/3 | 2452.7 | 3.1 |
| `A-PIK2-01` | strategy | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 2111.0 | 5.2 |
| `A-PIK2-02` | strategy | 3/3 | 0/3 | 1/3 | 3/3 | 3/3 | 0/3 | 2308.3 | 3.4 |
| `A-MELEE-01` | strategy | 3/3 | 2/3 | — | 3/3 | 3/3 | 0/3 | 2289.3 | 4.7 |
| `A-MELEE-02` | strategy | 3/3 | 1/3 | 3/3 | 3/3 | 2/3 | 0/3 | 2331.7 | 2.7 |

## Failures worth reading

- **A-HADES-03** sample 1: spoiler fence missing, one was due
- **A-HADES-03** sample 2: spoiler fence missing, one was due
- **A-HADES-03** sample 3: spoiler fence missing, one was due
- **A-CP77-01** sample 3: missing facts: `damage taken`
- **A-CP77-02** sample 1: branch menu missing
- **A-CP77-03** sample 3: spoiler fence missing, one was due
- **A-FO4-02** sample 1: missing facts: `intelligence`, `strength`; branch menu missing
- **A-FO4-04** sample 1: said: `training perk / power armor training`
- **A-FO4-05** sample 2: missing facts: `twice`
- **A-FO4-05** sample 3: missing facts: `twice`
- **A-RDR2-03** sample 2: branch menu missing
- **A-BMS-01** sample 1: missing facts: `shell blocks`
- **A-BMS-01** sample 2: missing facts: `shell blocks`
- **A-BMS-01** sample 3: missing facts: `shell blocks`
- **A-BMS-02** sample 1: missing facts: `mostly new`, `kept the same`
- **A-BMS-02** sample 2: missing facts: `kept the same`
- **A-BMS-02** sample 3: missing facts: `kept the same`
- **A-HK-01** sample 1: missing facts: `hit the head`
- **A-HK-01** sample 2: missing facts: `hit the head`
- **A-HK-01** sample 3: missing facts: `hit the head`
- **A-DOOME-01** sample 1: missing facts: `shield blocks`
- **A-DOOME-01** sample 2: missing facts: `shield blocks`
- **A-DOOME-01** sample 3: missing facts: `shield blocks`
- **A-DOOM64-01** sample 2: branch menu missing
- **A-GTAV-01** sample 2: missing facts: `five tiers`
- **A-GTAV-01** sample 3: branch menu missing
- **A-GTAV-02** sample 1: missing facts: `yellow meter`
- **A-GTAV-02** sample 2: missing facts: `yellow meter`
- **A-GTAV-02** sample 3: missing facts: `yellow meter`
- **A-GTAIV-02** sample 1: missing facts: `clears your wanted level`
- **A-GTAIV-02** sample 2: missing facts: `clears your wanted level`
- **A-GTAIV-02** sample 3: missing facts: `clears your wanted level`
- **A-FNV-01** sample 1: missing facts: `cripple a leg`
- **A-FNV-01** sample 2: missing facts: `cripple a leg`
- **A-FNV-01** sample 3: missing facts: `cripple a leg`
- **A-FNV-02** sample 1: missing facts: `Goodsprings`
- **A-FNV-02** sample 2: missing facts: `Goodsprings`
- **A-SM64-02** sample 3: branch menu missing
- **A-MK64-01** sample 1: missing facts: `hold it behind your kart`
- **A-MK64-01** sample 3: branch menu missing
- **A-MK64-02** sample 3: missing facts: `spin your tires`
- **A-TTYD-02** sample 1: missing facts: `guard with A`
- **A-TTYD-02** sample 2: missing facts: `guard with A`
- **A-TTYD-02** sample 3: missing facts: `guard with A`
- **A-PIK2-02** sample 1: missing facts: `two captains`; said: `there's a day limit / you have a limited number of days`
- **A-PIK2-02** sample 2: missing facts: `two captains`; said: `there's a day limit / you have a limited number of days`
- **A-PIK2-02** sample 3: missing facts: `two captains`
- **A-MELEE-01** sample 3: missing facts: `die early`
- **A-MELEE-02** sample 1: branch menu missing
- **A-MELEE-02** sample 2: missing facts: `launched off the screen`
- **A-MELEE-02** sample 3: missing facts: `launched off the screen`

## One reply per case (sample 1, trimmed to 1,800 characters)

The full text of every sample, plus the system prompt each case received, is in the JSON next to this report.

### A-DRG-01 — Deep Rock Galactic: Survivor — strategy

**Q:** how do i beat the glyphid dreadnought  
**Cards:** Glyphid Dreadnought, Dreadnought Twins, Exploder  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> To beat the Glyphid Dreadnought, focus on kiting it between waves. Target its weak-point armor plates as they open up. Save your overclock or nuke abilities for when you have a window to break its armor.

### A-DRG-02 — Deep Rock Galactic: Survivor — strategy

**Q:** the dreadnought twins keep healing back up, what am i doing wrong  
**Cards:** Dreadnought Twins, Glyphid Dreadnought, Red Sugar  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> The issue with them healing back up is usually related to how you are distributing your damage. You need to split the fire evenly between both Dreadnoughts instead of focusing all your attention on burning one down completely. The key is to keep the pressure balanced so the healing mechanism doesn't get a chance to trigger effectively. Also, focus your shots on their weak-point armor plates as they open up. Save your powerful moves like overclock or nuke for when you see clear windows to break their armor.

### A-DRG-03 — Deep Rock Galactic: Survivor — expert

**Q:** what is nitra actually for  
**Cards:** Nitra  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Nitra is the resource you use to purchase weapon upgrade cards at the between-stage shop and to reroll the artifact choice from the Supply Pod. If you don't have nitra, you'll be stuck with an underleveled weapon regardless of how much gold you mine.

### A-L4D2-01 — Left 4 Dead 2 — strategy

**Q:** how to beat tank  
**Cards:** Playing as the Tank, Tank, Boomer  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> When you run into the Tank, the main idea is to keep your distance and fight him in the open. He throws concrete, so try to stay where you can shoot him without getting hit by his big punches. Anything he throws that hits you can actually hit other enemies too, so focus on taking him down quickly. If you see him trying to crouch through a vent, that's your chance; he's slow and won't look for an alternate route.

### A-L4D2-02 — Left 4 Dead 2 — strategy

**Q:** why did the witch suddenly attack me  
**Cards:** The Witch, Jockey, The Director  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The Witch doesn't just attack randomly; she has specific triggers. She ignores gunfire unless it's aimed directly at her, and she ignores other infected. What wakes her up is usually a flashlight or a survivor standing too close. When she starts, she lets out a growl as a warning, which means you should back off. If you keep coming, she will charge and try to incapacitate you in one hit.
> 
> To deal with her, you need to manage the start of the fight. If you can light a wandering witch while she is still calm, she will keep full speed. If you manage to burn her with fire, it slows her down, but only once she is already startled. Remember, she will switch targets to whoever burned her, not necessarily whoever woke her up.

### A-L4D2-03 — Left 4 Dead 2 — speed

**Q:** tips for playing as the hunter in versus  
**Cards:** Playing as the Hunter  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The Hunter mechanic revolves around positioning and timing, not just surprise.
> 
> 1.  **Distance and Scaling:** Remember that pounce damage scales with distance—it can hit 25 on a long one. Focus on using height and a proper run-up to maximize that damage rather than relying solely on surprise.
> 2.  **Target Selection:** Prioritize taking the straggler. If you must engage the main group, move like a common player; your melee claw will register as horde damage until someone actively checks on you.
> 3.  **Sustained Pressure:** Since the pounce recharges quickly, maintain pressure by holding the crouch and rapidly re-pouncing when opportunities arise. Don't let the charge reset without action.

### A-P2-01 — Portal 2 — strategy

**Q:** how do the gels work  
**Cards:** Repulsion Gel, Gels, Wheatley  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The Gels are three different materials you can use in the game, each with a specific function.
> 
> The blue gel bounces you higher the further you fall. If you drop onto it from a good height, it will give you a bigger bounce.
> 
> The orange gel removes friction. If you land on it, you keep the speed you have when you arrive.
> 
> The white gel lets you portal surfaces that couldn't be ported before. However, it won't stick to cubes or turrets, and you need a cleansing spray to remove it.

### A-P2-02 — Portal 2 — speed

**Q:** the excursion funnel keeps pushing me the wrong way  
**Cards:** Excursion Funnel  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> If the Excursion Funnel is carrying you in the wrong direction, you need to find the reversal mechanism. Look for the button that reverses the direction of the funnel before you assume the route is closed. Since it passes through portals, it can traverse the entire chamber.

### A-HL2-01 — Half-Life 2 — strategy

**Q:** the antlions keep coming up out of the sand and killing me  
**Cards:** Antlions, Sandtraps, Pheropod (bugbait)  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The Antlions are hunting by vibration, so the safest bet is to stay on the rock formations near the coast. If you step onto the sand, they will come up. Once you manage to get the Pheropod from the Antlion Guard, you can throw it to make them swarm whatever you mark.

### A-HL2-02 — Half-Life 2 — speed

**Q:** how do i use the bugbait  
**Cards:** Pheropod (bugbait)  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Obtain the pheropod from the Antlion Guard. Once you have it, throw it, and the Antlions will read you as a guard, causing them to swarm whatever you have marked.

### A-HL2-03 — Half-Life 2 — expert

**Q:** what can the gravity gun actually pick up and throw  
**Cards:** Gravity Gun, Ravenholm, Rocket-Propelled Grenade Launcher, Hunter-Chopper (helicopter), Combine soldiers  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The Gravity Gun is primarily used for secondary pulls and holds, and for primary punts.
> 
> You can use it to pick up and throw:
> *   Explosive barrels
> *   Sawblades (which cut zombies apart)
> *   A held radiator (which acts as a shield you can walk behind)
> 
> It will not lift most enemies, but you can use it on manhacks and scanners. You can also throw grenades, and they will return to where they came from.

### A-HADES-01 — Hades — strategy

**Q:** which weapon is easiest to start with  
**Cards:** Weapon choice, Weapon aspects, Twin Fists of Malphon  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> For starting out, the Stygian Blade is generally considered the most forgiving weapon; it asks the least of you. The Shield of Chaos is the next easiest option because holding the block allows you to mitigate mistakes. The Eternal Spear is also a safe choice due to its reach, keeping you out of trouble. Save the Twin Fists of Malphon for later, as they are the fastest but require you to be standing inside everything.

### A-HADES-02 — Hades — strategy

**Q:** theseus and asterius keep killing me  
**Cards:** Theseus and Asterius, Shield of Chaos, Adamant Rail  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> It sounds like you're stuck on the fight with Theseus and Asterius. The general advice is to try and kill Asterius first. He telegraphs a long charge, and if you sidestep it, he gets stuck for a moment. Then, use Theseus's spear attacks and watch for the god's power indicators on the ground before they land.

### A-HADES-03 — Hades — strategy

**Q:** i beat the final boss but the game just keeps going, is that the ending?  
**Cards:** Heat and the Pact of Punishment, Theseus and Asterius, Shield of Chaos  
**Checks:** facts ✅ · contradiction — · fence ❌ · menu ✅

> The game doesn't end after the final boss. That is just the middle of the story. Hades is designed for multiple runs, and the game continues as you progress through the rest of the narrative and unlock new content. The game also has a mechanic called Heat, which you can choose to raise for optional difficulty and rewards.
> 
> Since you've finished the main challenge, you can focus on exploring the rest of the areas or trying a new run with different settings.

### A-CP77-01 — Cyberpunk 2077 — expert

**Q:** what does the berserk operating system do  
**Cards:** Berserk, Sandevistan, Quickhacks, Cyberpsychos, Ripperdocs  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> The Berserk operating system is a melee-focused OS in Cyberpunk 2077. It functions by cutting damage taken and prevents your health from dropping below a quarter. Furthermore, after you defeat an enemy with it, they return a quarter of your maximum health. The specific effects for your melee weapons depend on the model installed.

### A-CP77-02 — Cyberpunk 2077 — strategy

**Q:** which attributes should i put points into for a first playthrough  
**Cards:** Choosing a build, Lifepath, Berserk  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ❌

> For a first playthrough, the attribute split depends entirely on the playstyle you want to run. You generally want to focus on two main attributes, as spreading points evenly usually results in mediocre stats across the board.
> 
> If you want to be a straightforward brawler or fighter, focus on Body and Reflexes. These stats make you resilient and good at handling mistakes in combat. If you lean into the netrunner route, Intelligence is key, as it boosts your quickhacks, though you will be fragile once you start engaging in direct fights. If you want a versatile build that covers crafting, cyberware, and stealth, Technical Ability is the best choice.
> 
> Since you haven't specified your preferred style, we need to narrow down the focus.

### A-CP77-03 — Cyberpunk 2077 — strategy

**Q:** how does the main story end  
**Cards:** Lifepath  
**Checks:** facts — · contradiction — · fence ✅ · menu ✅

> Look, I can't give you the final ending details, because that's a massive spoiler. The way the main story resolves heavily depends on which path you take right at the start. You need to decide which way you want to play before you know the outcome.
> 
> ```bonsai-spoiler
> The ending you experience is directly tied to your initial Lifepath choice: Nomad, Streetkid, or Corpo. These choices dictate the opening chapter, specific side jobs you unlock, and the dialogue options you encounter throughout the game, which fundamentally shapes the narrative you follow.
> ```
> 
> —
> *No close match in my notes, this answer leans on the model's own knowledge.*

### A-CP77-04 — Cyberpunk 2077 — expert

**Q:** how do i beat adam smasher  
**Cards:** Adam Smasher, Iconic weapons  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> To beat Adam Smasher, focus on high DPS and utilizing abilities like the Sandevistan. Prioritize destroying his legs first, and use cover while he is performing rocket barrages.

### A-FO4-01 — Fallout 4 — strategy

**Q:** how do i kill a deathclaw early  
**Cards:** Deathclaw, Mirelurk queen, Choosing a build  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> When facing a Deathclaw early on, the key is not trying to out-damage it head-on. It has very high health and resists a lot of damage. Your focus should be on positioning and exploiting its initial moves.
> 
> First, use cover. Don't walk straight into it. When it opens up with that roar and ground stomp, try to stay behind obstacles. Its initial headbutts are designed to stagger you, so use that moment to reposition.
> 
> Avoid using pure energy weapons; the knowledge base says lasers reflect off its hide. Melee weapons or high-impact explosives that can knock it down are usually more effective against its tough hide. Keep your distance until you have a clear opening or until it gets too close to use its powerful attacks.

### A-FO4-02 — Fallout 4 — strategy

**Q:** what special stats should i pick at the start  
**Cards:** SPECIAL points, Choosing a build, Perks  
**Checks:** facts ❌ · contradiction — · fence ✅ · menu ❌

> No response text.

### A-FO4-03 — Fallout 4 — speed

**Q:** feral ghouls keep swarming me  
**Cards:** Feral ghouls  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Take the head off one of the Feral ghouls. It's the reliable weakness. Taking a leg off stops them from attacking altogether, while taking both arms off does not. They deal radiation damage and physical damage, and they regenerate if you shoot them in heavily irradiated areas like the Glowing Sea.

### A-FO4-04 — Fallout 4 — expert

**Q:** my power armor suddenly stopped working properly  
**Cards:** Upgrading power armor, Power armor and fusion cores, Stimpaks and chems, Legendary enemies, Settlement happiness  
**Checks:** facts ✅ · contradiction ❌ · fence ✅ · menu ✅

> If your power armor suddenly stopped working, check these common issues:
> 
> 1.  **Power Core Status:** Ensure your fusion core is not empty. If it drains too fast (due to sprinting, V.A.T.S. use, etc.), you might lose the ability to move or aim.
> 2.  **Over-encumbrance:** If you are carrying too much gear, you might be over-encumbered, which affects your V.A.T.S. and steady aim. Try dropping some weight.
> 3.  **Damage/Integrity:** Check the armor's integrity. If it's heavily damaged, it might be non-functional or glitching.
> 4.  **Compatibility/Mods:** If you have installed mods, they could be conflicting with the game's armor mechanics. Try disabling recent mods to see if the issue resolves.
> 
> If the core is empty, you'll still be able to walk, but you'll lose V.A.S. and steady aim. You won't need a specific training perk to fix this, just managing your core and weight.

### A-FO4-05 — Fallout 4 — strategy

**Q:** a legendary enemy healed back to full in the middle of the fight  
**Cards:** Legendary enemies, Stimpaks and chems, Feral ghouls  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> When you encounter a legendary enemy that heals back to full health and gains a new ability around half its health, the main tactic is patience. Don't burn all your resources on the first half of the fight. If you focus too much damage early on, you'll find the enemy recovers and becomes significantly tougher, turning the fight into a much longer grind.
> 
> Focus on chipping away at its health consistently rather than trying to finish it quickly. Wait for the right moment to apply your most powerful attacks or use special abilities.

### A-RDR2-01 — Red Dead Redemption 2 — strategy

**Q:** i just came from gta, any tips before i start  
**Cards:** Coming from GTA, Bounties, Satchel upgrades  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The biggest difference coming from GTA is the pace. RDR2 is deliberately slow. Don't try to sprint everywhere; use horses for travel, and treat your camp as your main base. When dealing with law enforcement, cover your face if you're doing something questionable, and ride rather than sprint.
> 
> Focus on resource management early on. Upgrading your satchel is crucial because running out of room stops you from restocking, which is a common early frustration. Also, remember that bounties stick around; if you get caught, you have to pay them off at a post office, and wearing a mask can reduce the bounty size.

### A-RDR2-02 — Red Dead Redemption 2 — speed

**Q:** how do i raise honor  
**Cards:** Honor  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Raising Honor is a slider mechanic based on your actions. It increases when you perform positive interactions and decreases when you engage in negative ones.
> 
> To raise your Honor:
> *   **Be helpful:** Greeting people, helping strangers on the road, and paying bounties instead of running contribute positively.
> *   **Be cautious:** Avoid actions like robbing, killing civilians, or killing animals you don't intend to use.
> 
> High Honor results in shop discounts and different reactions from NPCs. Low Honor changes how you are treated and how you are compensated. Remember, it's a slider, so one bad day doesn't completely undo good progress.

### A-RDR2-03 — Red Dead Redemption 2 — strategy

**Q:** what happens to arthur at the end of the story  
**Cards:** Coming from GTA, Bounties, Satchel upgrades  
**Checks:** facts — · contradiction — · fence ✅ · menu ✅

> I can't give you the full ending, but I can guide you through the key narrative points and choices that lead to the conclusion. The story isn't just about shooting your way through towns; it's about the choices you make and the weight you carry.
> 
> When you're playing, focus on how you handle the relationships and the difficult decisions that define Arthur's journey. Pay attention to the moral dilemmas you face, as those choices are what shape the final outcome.
> 
> ```bonsai-spoiler
> The ending involves major narrative consequences based on your actions throughout the game. Focus on maintaining your character's integrity and how you interact with the world around you.
> ```

### A-RDR2-04 — Red Dead Redemption 2 — expert

**Q:** my horse keeps throwing me off  
**Cards:** Horse bonding, Bear, Horse breeds, Coming from GTA, Satchel upgrades  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Horse bonding is key to handling. Each horse has a bond level, and raising it involves riding, feeding, brushing, patting, and calming it during danger. Higher bond levels grant you better stamina, improved handling, and eventually advanced maneuvers like the rear and drift. A high-bond horse also prevents it from spooking when something scares it. Remember, bond is per horse, so switching mounts resets the process.

### A-SOE-01 — State of Emergency — strategy

**Q:** how do i get more time in a round  
**Cards:** Round time and the +15s pickups, Late-round rocket enemies, Unlocking characters  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The key to getting more time in a round is to stop focusing on fighting and start focusing on time pickups.
> 
> *   **Prioritize Time:** Instead of staying in a prolonged fight, look for and grab the +15s pickups scattered around the level.
> *   **Know When to Bail:** A round you extend by collecting time is worth more than a crowd you finish quickly.
> *   **Strategic Breaks:** Learn when it's worth breaking off a fight to secure those extra seconds.

### A-SOE-02 — State of Emergency — speed

**Q:** whats the difference between kaos mode and revolution mode  
**Cards:** Kaos mode and Revolution mode  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Kaos mode focuses on direct attack against a clock in one zone. The goal here is to extend the time by hitting objectives that pop up mid-riot, rather than focusing on survival.
> 
> Revolution mode is structured around the story. It involves a chain of missions per zone, with objectives being handed out by the resistance, and this mode is where characters and zones are unlocked.

### A-OOT-01 — The Legend of Zelda: Ocarina of Time — strategy

**Q:** the shadow temple has floors missing everywhere  
**Cards:** Shadow Temple invisible floors, Dark Link, Adult dungeon order  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> You need to use the Lens of Truth to see the invisible floors, walls, and chests in the Shadow Temple. Be careful, holding the Lens drains magic, so use it in short bursts rather than keeping it on constantly. You can keep the magic flowing by using green potions or interacting with the fairies in the temple.

### A-OOT-02 — The Legend of Zelda: Ocarina of Time — strategy

**Q:** how do i beat volvagia  
**Cards:** Volvagia, Biggoron's Sword, Gold Skulltulas  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> To handle Volvagia, focus on timing the attacks correctly. The main attack is the Megaton Hammer. You need to hit its head the instant it pops up, and then slash it while it is stunned. When it flies around the room, use the hookshot to pull it back down. Defensively, wear the Goron Tunic and keep your shield ready for the fire, making sure you stay clear of the lava at the edges.

### A-BG3-01 — Baldur's Gate 3 — strategy

**Q:** should i be long resting more often  
**Cards:** Long rest, Sneak Attack, Party composition  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Resting more than you feel like is usually the right call. A long rest is powerful because it lets you recover spells, health, and abilities, but it also costs you camp supplies. Think of it this way: if you are running low on food or supplies, using a long rest to recover everything is smart resource management. If you have plenty of supplies and you are in a narrative moment where you need to advance a companion's personal quest or a key scene, then a long rest is the tool to use. Hoarding rests just means you might miss story moments.

### A-BG3-02 — Baldur's Gate 3 — expert

**Q:** what party composition should i use for a first run  
**Cards:** Party composition, Sneak Attack, Goblin Camp, Inspiration  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> For a first run, aim for a balanced four-person party that covers the essential roles. You need someone to talk, someone to heal, someone who can handle traps and locks, and enough damage.
> 
> A good starting template is:
> 
> 1.  **Talker/Damage:** A Bard or Paladin. They handle dialogue well and provide decent front-line damage.
> 2.  **Healer:** A Cleric or Druid. This is crucial; you cannot cover the party without someone who can keep everyone alive.
> 3.  **Utility/Skill:** A Rogue or Ranger. They excel at finding and disarming traps and picking locks.
> 4.  **Damage/Tank:** A Fighter or Barbarian. This character provides necessary frontline combat prowess and extra damage.
> 
> If you struggle with the party composition, focus on ensuring you have at least one dedicated healer. The party you cannot cover is the one with no healing at all.

### A-SIMS4-01 — The Sims 4 — speed

**Q:** fastest way to make money early  
**Cards:** Making money  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The fastest methods for making money early in The Sims 4 usually revolve around painting, writing, or selling collectibles.
> 
> 1.  **Painting and Writing:** These are often cited as the quickest because they require minimal initial investment—usually just one skill and one object. Both skills scale rapidly with level, meaning you can start earning consistently once you get the basic level up.
> 2.  **Selling Collectibles:** If you can secure a cheap starter lot, selling collectibles can provide immediate funds to buy the necessary items for other income streams.
> 
> Focus on leveling those specific skills first to maximize the income potential as soon as possible.

### A-GTASA-01 — Grand Theft Auto: San Andreas - The Definitive Edition — speed

**Q:** how do i recruit more gang members  
**Cards:** Respect  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Recruiting more gang members in Grand Theft Auto: San Andreas - The Definitive Edition is governed by the Respect mechanic. You can recruit up to seven gang members. This is influenced by several factors: completing specific missions, killing rival gang members or police, taking territory, spraying over tags, and appearance nudges—things like hair, tattoos, clothes, muscle, and wearing green in Grove Street territory. It falls if you wear the wrong colors at home, kill your own gang members, or lose turf.

### A-NOCARD-01 — ELDEN RING — strategy

**Q:** how do i beat margit  
**Cards:** none  
**Checks:** facts — · contradiction — · fence — · menu ✅

> I will give you the basic approach for Margit. Focus on dodging her heavy attacks and using your stamina efficiently to manage her aggressive patterns. Keep your distance when possible and use your healing items during her recovery phases. When she gets into a specific attack rhythm, learn the timing for rolling or sidestepping.

### A-VAGUE-01 — Hades — strategy

**Q:** keep dying in tartarus  
**Cards:** Shield of Chaos, Theseus and Asterius, Mirror of Night  
**Checks:** facts — · contradiction — · fence — · menu ✅

> It sounds like you're stuck in the early, intense parts of Hades. The key to surviving Tartarus is managing your health and knowing when to switch from pure offense to defense.
> 
> Focus on blocking when you feel overwhelmed, especially against the tougher enemies. Blocking turns a mistake into nothing, and it also sets up a rush that closes the distance. Don't just spam attacks; try to alternate between attacking and blocking to keep the pressure on the enemies.
> 
> For the bosses, remember that Asterius, the bull, telegraphs a long charge. Sidestep that charge, and he gets briefly stuck. Theseus is predictable, so focus on managing his power attacks by watching where they land on the ground.

### A-BMS-01 — Black Mesa — strategy

**Q:** How do I damage the giant headcrab boss at the end of the Xen caverns in Black Mesa?  
**Cards:** Gonarch, Starting out in Black Mesa, The opening tram ride and where it leads  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> To damage the Gonarch boss, you need to focus your fire on its pale egg sac located under its body. Anything you shoot that misses the sac is wasted. Keep an eye on it because when it sees you, it spawns up weak, fast baby headcrabs to distract you from the main target. Watch your footing too, as it walks over pits in the webbing.

### A-BMS-02 — Black Mesa — strategy

**Q:** What's different about the Xen levels in Black Mesa compared to the original Half-Life?  
**Cards:** Starting out in Black Mesa, The opening tram ride and where it leads, Long Jump Module  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> The main difference is that Xen in Black Mesa is essentially new work. While the core structure remains similar—you'll still expect no cutscenes, a crowbar for crates and vents, and combat that favors doorways—the Xen chapters are significantly longer than the original 1998 levels. You need to budget more time for the alien world than you might have expected.

### A-HK-01 — Hollow Knight — strategy

**Q:** How do I beat the big armored bug boss in the Forgotten Crossroads?  
**Cards:** Leaving the Forgotten Crossroads, False Knight, Watcher Knights  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> The False Knight is the first real fight you'll have. When he attacks, he leaps, charges, and slams a mace that creates a shockwave across the floor. The key here is to jump the shockwave rather than trying to back away.
> 
> Focus on managing his armor. Hitting his armor doesn't give you soul, so you need to save your resources. You only gain soul or deal significant damage when his armor empties and he topples. Once he breaks the floor after the third exposure, drop after him and finish him off. If the fight gets rough, remember that a wall above the left gate becomes breakable after his first rage, and the Vengeful Spirit spell is nearby for an easier rematch.

### A-HK-02 — Hollow Knight — strategy

**Q:** I just started Hollow Knight and don't have a map -- how do I get one, and what do benches actually do?  
**Cards:** Starting out in Hollow Knight, Watcher Knights, Charms and notches  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Getting a map in Hollow Knight is straightforward. You need to find Cornifer, the humming cartographer. He's the one who sells the map, and you'll find him in Dirtmouth. Once you buy his copy, the map will start filling in as you rest at benches. Benches are important because they are where you can swap charms and they also save your masks and restore them.

### A-DOOME-01 — DOOM Eternal — strategy

**Q:** How do I fight the Marauder in DOOM Eternal? He keeps blocking everything.  
**Cards:** Starting out in DOOM Eternal: the combat loop, Marauder, The Crucible  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> Stay at mid-range. If you get too close, it will draw a super shotgun faster than you can dash. If you stay too far, it will throw axe waves.
> 
> When it winds up its axe, watch its feet. A dash is for repositioning, and a run means it's coming in to swing. Hit it the instant its eyes flash green. Then, pour in the highest damage per shot you have—super shotgun, ballista, rocket—swapping weapons for two or three hits per stagger. Grenades and rockets exploding nearby will also briefly drop its shield.

### A-DOOME-02 — DOOM Eternal — strategy

**Q:** What's the basic combat loop I'm supposed to be doing in DOOM Eternal?  
**Cards:** Starting out in DOOM Eternal: the combat loop, Doom Hunter, The Crucible  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> The basic combat loop in DOOM Eternal is about managing your resources and never standing still. Here is the rundown:
> 
> 1.  **Shoot and Glory Kill:** Shoot weak enemies until they flash, then finish them off for health.
> 2.  **Chainsaw for Ammo:** Chainsaw fodder demons to get ammo. This uses three fuel units, but the chainsaw refuels automatically every twenty seconds. Fodder demons cost one fuel unit, so this is a constant option.
> 3.  **Flame Belch for Armor:** Use the flame belch on groups of enemies to burn them for armor. This has a twenty-five-second cooldown.
> 4.  **Manage Heavy Demons:** Heavy demons cost all three fuel units and cannot be sawed.
> 5.  **Movement is Key:** Never stand still. Dash twice, jump twice, and swap weapons mid-fight instead of reloading. If you run out of everything, the game will give you the chainsaw for one fodder kill, and the loop restarts.

### A-DOOM64-01 — Doom 64 — strategy

**Q:** How do I beat the final boss in Doom 64, the Mother Demon?  
**Cards:** Starting out in Doom 64, Mother Demon, The Lost Levels  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> The Mother Demon fight in Doom 64 revolves around managing her attacks. You need to focus on dodging her flame trails, as they toss you into the air and you can't steer, and watch out for the four homing rockets. To maximize your chances, you should try to get the fully upgraded Unmaker weapon. Its fire rate stuns her, which stops her from launching the rockets, leaving you only to dodge the flame trails. If you don't have all three Demon Keys, you'll also face a large horde before she appears, which will burn a lot of your ammo. Getting those keys first is crucial.

### A-DOOM64-02 — Doom 64 — strategy

**Q:** Is Doom 64 just a port of the original Doom games, or is it different?  
**Cards:** Starting out in Doom 64, How the coloured keycards work, Finding your way through the dark, maze-like levels  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Doom 64 is not a port of the original Doom games. It is a separate sequel to Doom II. It features thirty-two new levels, redrawn larger sprites, colored lighting, and a slower, darker atmosphere. While it retains much of the classic Doom arsenal, it introduces new elements like the Unmaker and the nightmare imp.
> 
> The game is different because it's a distinct entry, not just a copy.

### A-GTAV-01 — Grand Theft Auto V — strategy

**Q:** How does body armor work in GTA V, and does it help against melee?  
**Cards:** Starting out in GTA V, Weapons, armour and cover, Special abilities and how to grow them  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Body armor in GTA V comes in five tiers, available from Ammu-Nation. Each tier is stronger than the last, but once you buy a heavier one, the lighter ones are removed from the shelf. It does nothing against melee attacks.

### A-GTAV-02 — Grand Theft Auto V — strategy

**Q:** How do the special abilities work for the three characters in GTA V?  
**Cards:** Starting out in GTA V, Special abilities and how to grow them, Side jobs and collectibles that count  
**Checks:** facts ❌ · contradiction — · fence ✅ · menu ✅

> The special abilities for the three characters are distinct. Michael slows time during gunfights, Franklin slows down the world while driving any vehicle, and Trevor takes half damage while dealing double damage when raging.

### A-GTAIV-01 — Grand Theft Auto IV — strategy

**Q:** Where can I reliably buy weapons in GTA IV, and is there a discount anywhere?  
**Cards:** Starting out in GTA IV, Weapons and where to buy them, Foot chases through construction sites  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> For weapons, the general locations are the underground gun shops, which become accessible after a specific point in the story, and Little Jacob's van. The knowledge base notes that Little Jacob's van sells everything at a sixty percent discount once you have earned his favor.

### A-GTAIV-02 — Grand Theft Auto IV — strategy

**Q:** How does saving work in GTA IV, and does it clear my wanted level?  
**Cards:** Starting out in GTA IV, Wanted levels and the search circle, Foot chases through construction sites  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> Saving in GTA IV is straightforward. You can save your game by walking to a bed in a safehouse and choosing to sleep. This action will also clear any current wanted level.

### A-FNV-01 — Fallout: New Vegas — strategy

**Q:** Why is Quarry Junction so dangerous, and how do I survive if I have to go through it early?  
**Cards:** Deathclaws and Quarry Junction, Crossing the crater radiation pools, Starting out in Fallout: New Vegas  
**Checks:** facts ❌ · contradiction — · fence ✅ · menu ✅

> Listen, Quarry Junction is dangerous because the Deathclaws there are tougher than usual—they have double or triple the health. You'll also run into specific threats: there's an alpha male that hits hard, and a mother who will go berserk if you kill one in front of her.
> 
> For survival, use the environment. If you can stand on a rock they can't reach, they stop chasing you. If you can dive into the water, that stops their leaping attacks and slows them down. If you have a flare gun, use it to make them flee.

### A-FNV-02 — Fallout: New Vegas — strategy

**Q:** I'm new to Fallout: New Vegas -- how do skill checks work, and can I fail them randomly?  
**Cards:** Starting out in Fallout: New Vegas, Skills, SPECIAL points, implants and books, Choosing early armor by Damage Threshold, not by looks  
**Checks:** facts ❌ · contradiction ✅ · fence ✅ · menu ✅

> Skill checks in Fallout: New Vegas are not random. Instead of rolling dice, the game uses fixed thresholds for almost every check. For example, if a quest requires a Speech check, you need to have a Speech score of 25 or higher to succeed. If you have 24 or less, you fail that specific check. It's all about hitting that required number.

### A-SM64-01 — Super Mario 64 — strategy

**Q:** How do I actually beat Bowser in Super Mario 64? I keep missing the bombs.  
**Cards:** Starting out in Super Mario 64, Bowser: the three fights, Getting your first star in Bob-omb Battlefield  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> The key to hitting those bombs usually comes down to timing and positioning. For the first fight, you need to get behind Bowser. Once you have him, spin the stick quickly to build up speed, and then throw him directly into one of the four spiked bombs around the edge of the stage. If you miss, he just climbs back up, so focus on getting that throw in cleanly.
> 
> Since Bowser has three distinct fights, I need to know which part you are struggling with.

### A-SM64-02 — Super Mario 64 — strategy

**Q:** How does health work in Super Mario 64, and how do I refill it?  
**Cards:** Starting out in Super Mario 64, Getting your first star in Bob-omb Battlefield, The three caps  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Health in Super Mario 64 is managed by the eight-wedge power meter. You refill this meter by collecting coins, spinning hearts, or by surfacing in water.

### A-MK64-01 — Mario Kart 64 — strategy

**Q:** Who gets the blue shell in Mario Kart 64, and can I block it?  
**Cards:** Starting out in Mario Kart 64, Items and who gets them, Picking a kart for top speed  
**Checks:** facts ❌ · contradiction — · fence ✅ · menu ✅

> The blue Spiny Shell is a defensive item. It only comes to players who are in fourth place or lower. Regarding blocking, yes, you can hold the shell behind your kart to block other shells from hitting you.

### A-MK64-02 — Mario Kart 64 — strategy

**Q:** How do I get a rocket start off the line in Mario Kart 64?  
**Cards:** Starting out in Mario Kart 64, Drifting and Mini-Turbos, Picking a kart for top speed  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> To get a rocket start, you need to hold the gas pedal as the lights change from red to blue. If you let go too early, you'll spin your tires and go slower than everyone else.
> 
> Here are the steps:
> 1. Watch the lights change from red to blue.
> 2. Hold the gas button down.
> 3. When the lights hit blue, release the gas and immediately start drifting.
> 
> If you hop and hold to drift, then wiggle the stick side to side while holding it, the smoke will change colors (white, yellow, then orange). Letting go on the orange smoke gives you a mini-turbo boost. Gas and brake together while spinning the kart on the spot will also spin you up.

### A-TTYD-01 — Paper Mario: The Thousand-Year Door — strategy

**Q:** What's the trick to beating Hooktail in Thousand-Year Door? She keeps healing.  
**Cards:** Starting out in Paper Mario: The Thousand-Year Door, Hooktail, Rawk Hawk, Magnus von Grapple and Cortez  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Focus on managing the audience size. Since Hooktail heals by eating audience members, try to keep the crowd thin so she doesn't recover much HP between turns. Your best damage output comes from Fire attacks, as she is weak to that element. Koops is also useful early on; his shell toss can hit her first before you commit Mario. Keep an eye out for the badge that changes your attack sound to a cricket's chirp; using that sound might cause her to flinch, which could give you an opening.

### A-TTYD-02 — Paper Mario: The Thousand-Year Door — strategy

**Q:** How does battling actually work in Thousand-Year Door -- what's an action command?  
**Cards:** Starting out in Paper Mario: The Thousand-Year Door, Star Power, Stylish moves and the crowd, The final battle: hands, patterns and the charge tell  
**Checks:** facts ❌ · contradiction — · fence ✅ · menu ✅

> Battles are turn-based on a theatre stage. Mario and your partner each get to act every turn. You can swap who goes first, and the person in front goes first.
> 
> An action command is a button press you make at the right moment during an attack animation to deal extra damage. It's usually done by pressing a specific button when the attack is in a certain position.

### A-PIK2-01 — Pikmin 2 — strategy

**Q:** How do I deal with the giant bulborb boss that keeps making more enemies?  
**Cards:** Empress Bulblax and the Snagrets, The enemies that empty a squad, Segmented Crawbster  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ✅

> Dealing with the giant bulborb boss, the Empress Bulblax, is all about targeting the right thing. In the Frontier Cavern, she is awake and constantly pumping out larvae, so focus on killing the mother, not the children.
> 
> Here is the basic approach:
> 1. **Positioning:** Keep your Pikmin squad off the sides of the screen.
> 2. **Attacking:** When she is rolling around, use your purple Pikmin to hit her head during the pauses when she stops.
> 3. **Prioritize:** Make sure you are focused on the main boss entity, the mother, rather than the smaller larvae.

### A-PIK2-02 — Pikmin 2 — strategy

**Q:** What's the actual goal in Pikmin 2, and is there still a day limit?  
**Cards:** Starting out in Pikmin 2, Growing your Pikmin squad, Purple and White Pikmin  
**Checks:** facts ❌ · contradiction ❌ · fence ✅ · menu ✅

> The main goal in Pikmin 2 is to clear the company's debt by collecting ten thousand Pokos of treasure. Both treasures and enemy bodies contribute to this total. Regarding the day limit, there is still one: the day ends at sunset. You need to make sure all your Pikmin are either with a captain or back at the Onion before night creatures wake up, or they will be eaten.

### A-MELEE-01 — Super Smash Bros. Melee — strategy

**Q:** What makes Fox and Falco so good in Melee, and what's their weakness?  
**Cards:** Fox and Falco, Starting out in Melee, Unlocking the other eleven  
**Checks:** facts ✅ · contradiction — · fence ✅ · menu ✅

> Fox is good because he is incredibly fast. He has the second fastest dash and the third fastest fall, and his jump is three frames. His main strength is his shield reflector, which is instant and knocks opponents sideways. The weakness is his speed; because he falls fast, he can get combo'd hard if you aren't careful.
> 
> Falco is the slower, heavier twin. His strength lies in his laser; it makes opponents flinch and cancel their attacks when he lands, which stops them from getting in close. His down air spikes straight down, and his shield routine—reflector into a down air spike into more—is one of the best ways to defend. His weakness is generally his slower movement compared to Fox.

### A-MELEE-02 — Super Smash Bros. Melee — strategy

**Q:** How does damage and knockback work in Melee if there's no health bar?  
**Cards:** Starting out in Melee, The techniques the game never tells you about, Classic Mode's Metal Battle  
**Checks:** facts ✅ · contradiction ✅ · fence ✅ · menu ❌

> In Melee, you don't have a traditional health bar. Instead, damage is calculated as a percentage. The higher the percentage of damage you take, the further the hit sends you. Losing a stock happens when you get launched past the edge of the screen, not when your health reaches zero.
> 
> The game also has faster gameplay than the first game, with less freeze on hits, higher gravity, and faster falls. Smash attacks charge for up to a second, dealing 40% more power. Shielding with the shoulder buttons allows you to press them partially for a bigger, longer-lasting, but weaker shield. Sudden Death after a tie restarts the fight at 300%, where almost anything can be knocked out.
