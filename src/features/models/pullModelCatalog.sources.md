# Where the new rows in the AI models list come from

The rows below were added to `pullModelCatalog.ts` on 2026-11-17 (plan 105, lane D5). Each one was read that day from the
model's own public pages, not from memory. The 26 rows that were already in the list are not covered by this file.

**How each column was read**

- **Size on the page:** the download size Ollama's page for that tag shows for the llama.cpp build (the build a Deck
  runs), as written there. A picture model's figure includes its vision part. The list stores it rounded to one decimal
  place in GB (523 MB is 0.5, 292 MB is 0.3).
- **Licence:** the licence text on Ollama's page for the tag (its "license" file, linked in the Licence text column). The
  label in the list is the name that text opens with. The class in the list follows the plugin's own table in
  `py_modules/backend/ollama/model_policy.py` (`tests/test_pull_model_catalog_parity.py` checks the two agree). The
  maker's own Hugging Face page gave the same licence for every row that has one.
- **Release month:** the month the maker's public Hugging Face page for the model was created (the name in brackets).
  Ollama's own page shows only when a tag was last pushed, not when the model came out.
- **Good for:** from the page's own labels. A "vision" label or an Image input gives Pictures; a "thinking" label gives
  Strategy; a model made for code gives Coding; any general language model gives Chat.
- **Stars (Deck fit):** none yet. No page says how well a model runs on a Deck, so the list shows a dash until someone
  measures one.
- **Too big for a Deck:** a download over 12 GB is marked "needs a PC". It is still shown, never hidden.
- **Group:** a download of 5.0 GB or less is "More models"; a bigger one is "Expert (large)"; the two models made for
  one job (reasoning, code) are "Specialist".

**Things the licence reviewer should look at**

- `mistral:7b`, `smollm2:1.7b`, `deepseek-r1:7b`, and the older rows `deepseek-r1:1.5b` and `moondream`: the pages say
  Apache 2.0 (`mistral:7b`, `smollm2:1.7b`, `moondream`) or MIT (the two DeepSeek tags), so they are in the open-source
  class. The plugin's policy table classes whole families by name (Mistral and DeepSeek as open weight, SmolLM unknown), so
  `model_policy.py` carries a short list of these exact tags, checked first. The rest of those families is unchanged: other
  Mistral sizes use other licences, and DeepSeek's 8b and 70b are built on Llama. Pages read 2026-11-17: the five rows'
  Ollama tag pages (moondream: `moondream:latest` and `moondream:1.8b`, licence text
  https://ollama.com/library/moondream:latest/blobs/c71d239df917; `deepseek-r1:1.5b`:
  https://ollama.com/library/deepseek-r1:1.5b/blobs/6e4c38e1172f); the makers' Hugging Face pages say the same
  (`vikhyatk/moondream2` Apache 2.0, `deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B` MIT).
- `llama3.1:8b` (Llama 3.1 Community Licence) and the three Gemma 3 rows (Gemma Terms of Use) are open-weight, as the
  older Llama 3.2 and Gemma 3 rows already were.
- `gemma4:26b`: the model page shows Apache 2.0. **Its release month (2026-04) is borrowed from the Gemma 4 family rows
  already in the list, not read from any page for this model**; no public repository page was found for it.

| Tag | Size on the page | Licence | Class in the list | Model page | Licence text | Release month (source) | Read |
|---|---|---|---|---|---|---|---|
| `qwen3:0.6b` | 523MB | Apache 2.0 | foss | https://ollama.com/library/qwen3:0.6b | https://ollama.com/library/qwen3:0.6b/blobs/d18a5cc71b84 | 2025-04 (Qwen/Qwen3-0.6B) | 2026-11-17 |
| `qwen3.5:0.8b` | 1.3GB | Apache 2.0 | foss | https://ollama.com/library/qwen3.5:0.8b | https://ollama.com/library/qwen3.5:0.8b/blobs/5f3a3c817e78 | 2026-02 (Qwen/Qwen3.5-0.8B) | 2026-11-17 |
| `qwen3.5:2b` | 2.7GB | Apache 2.0 | foss | https://ollama.com/library/qwen3.5:2b | https://ollama.com/library/qwen3.5:2b/blobs/5f3a3c817e78 | 2026-02 (Qwen/Qwen3.5-2B) | 2026-11-17 |
| `qwen3-vl:2b` | 1.9GB | Apache 2.0 | foss | https://ollama.com/library/qwen3-vl:2b | https://ollama.com/library/qwen3-vl:2b/blobs/7339fa418c9a | 2025-10 (Qwen/Qwen3-VL-2B-Instruct) | 2026-11-17 |
| `qwen3-vl:4b` | 3.3GB | Apache 2.0 | foss | https://ollama.com/library/qwen3-vl:4b | https://ollama.com/library/qwen3-vl:4b/blobs/7339fa418c9a | 2025-10 (Qwen/Qwen3-VL-4B-Instruct) | 2026-11-17 |
| `gemma3:270m` | 292MB | Gemma Terms | open_weight | https://ollama.com/library/gemma3:270m | https://ollama.com/library/gemma3:270m/blobs/3e2c24001f9e | 2025-07 (google/gemma-3-270m-it) | 2026-11-17 |
| `smollm2:1.7b` | 1.8GB | Apache 2.0 | foss | https://ollama.com/library/smollm2:1.7b | https://ollama.com/library/smollm2:1.7b/blobs/58d1e17ffe51 | 2024-10 (HuggingFaceTB/SmolLM2-1.7B-Instruct) | 2026-11-17 |
| `phi3:3.8b` | 2.2GB | MIT | foss | https://ollama.com/library/phi3:3.8b | https://ollama.com/library/phi3:3.8b/blobs/fa8235e5b48f | 2024-04 (microsoft/Phi-3-mini-4k-instruct) | 2026-11-17 |
| `mistral:7b` | 4.4GB | Apache 2.0 | foss | https://ollama.com/library/mistral:7b | https://ollama.com/library/mistral:7b/blobs/43070e2d4e53 | 2024-05 (mistralai/Mistral-7B-Instruct-v0.3) | 2026-11-17 |
| `llama3.1:8b` | 4.9GB | Llama 3.1 | open_weight | https://ollama.com/library/llama3.1:8b | https://ollama.com/library/llama3.1:8b/blobs/0ba8f0e314b4 | 2024-07 (meta-llama/Llama-3.1-8B-Instruct) | 2026-11-17 |
| `qwen3:8b` | 5.2GB | Apache 2.0 | foss | https://ollama.com/library/qwen3:8b | https://ollama.com/library/qwen3:8b/blobs/d18a5cc71b84 | 2025-04 (Qwen/Qwen3-8B) | 2026-11-17 |
| `qwen3:14b` | 9.3GB | Apache 2.0 | foss | https://ollama.com/library/qwen3:14b | https://ollama.com/library/qwen3:14b/blobs/d18a5cc71b84 | 2025-04 (Qwen/Qwen3-14B) | 2026-11-17 |
| `qwen3-vl:8b` | 6.2GB | Apache 2.0 | foss | https://ollama.com/library/qwen3-vl:8b | https://ollama.com/library/qwen3-vl:8b/blobs/7339fa418c9a | 2025-10 (Qwen/Qwen3-VL-8B-Instruct) | 2026-11-17 |
| `gemma3:12b` | 8.2GB | Gemma Terms | open_weight | https://ollama.com/library/gemma3:12b | https://ollama.com/library/gemma3:12b/blobs/dd084c7d92a3 | 2025-03 (google/gemma-3-12b-it) | 2026-11-17 |
| `phi4:14b` | 9.1GB | MIT | foss | https://ollama.com/library/phi4:14b | https://ollama.com/library/phi4:14b/blobs/fa8235e5b48f | 2024-12 (microsoft/phi-4) | 2026-11-17 |
| `qwen2.5vl:7b` | 6.0GB | Apache 2.0 | foss | https://ollama.com/library/qwen2.5vl:7b | https://ollama.com/library/qwen2.5vl:7b/blobs/832dd9e00a68 | 2025-01 (Qwen/Qwen2.5-VL-7B-Instruct) | 2026-11-17 |
| `deepseek-r1:7b` | 4.7GB | MIT | foss | https://ollama.com/library/deepseek-r1:7b | https://ollama.com/library/deepseek-r1:7b/blobs/6e4c38e1172f | 2025-01 (deepseek-ai/DeepSeek-R1-Distill-Qwen-7B) | 2026-11-17 |
| `qwen2.5-coder:7b` | 4.7GB | Apache 2.0 | foss | https://ollama.com/library/qwen2.5-coder:7b | https://ollama.com/library/qwen2.5-coder:7b/blobs/832dd9e00a68 | 2024-09 (Qwen/Qwen2.5-Coder-7B-Instruct) | 2026-11-17 |
| `qwen3.5:27b` | 17GB | Apache 2.0 | foss | https://ollama.com/library/qwen3.5:27b | https://ollama.com/library/qwen3.5:27b/blobs/5f3a3c817e78 | 2026-02 (Qwen/Qwen3.5-27B) | 2026-11-17 |
| `gemma3:27b` | 17GB | Gemma Terms | open_weight | https://ollama.com/library/gemma3:27b | https://ollama.com/library/gemma3:27b/blobs/dd084c7d92a3 | 2025-03 (google/gemma-3-27b-it) | 2026-11-17 |
| `gemma4:26b` | 19GB | Apache 2.0 (Gemma) | foss | https://ollama.com/library/gemma4:26b | https://ollama.com/library/gemma4:26b/blobs/a59e1ee2d202 | 2026-04 ((the catalog's own Gemma 4 rows; no public repo read)) | 2026-11-17 |
| `gpt-oss:20b` | 14GB | Apache 2.0 | foss | https://ollama.com/library/gpt-oss:20b | https://ollama.com/library/gpt-oss:20b/blobs/f60356777647 | 2025-08 (openai/gpt-oss-20b) | 2026-11-17 |
