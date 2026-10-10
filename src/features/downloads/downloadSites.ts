/**
 * Title: Where each download connects, as the download notice names it
 *
 * Purpose: The address and, where the code knows it, the size for every download button, so the
 * notice before a download says exactly where bonsAI connects. Each address is read from the back
 * end constant named beside it; tests/test_download_sites_match_backend.py fails if a back-end
 * address stops starting with one listed here.
 *
 * Used for: the call sites of `confirmDownload` (downloadNotice.tsx).
 *
 * Does not: know a size the code does not know. Ollama itself, the voice engine, the voice models
 * and the knowledge library have no size in the code ahead of time; their notices say so.
 */
import type { DownloadNotice } from "./downloadNotice";

/** local_ollama_setup_service.py: OLLAMA_OFFICIAL_INSTALL_SH and the ollama.com/download tarballs. */
const OLLAMA_SITE = "https://ollama.com";
/** ollama_catalog_service.py: REGISTRY_HOST -- where `ollama pull` and the size lookups go. */
const OLLAMA_REGISTRY_SITE = "https://registry.ollama.ai";
/** voice_engine_build_service.py: WHISPER_CPP_IMAGE. */
const VOICE_ENGINE_IMAGE_SITE = "https://ghcr.io";
/** voice_model_download_service.py: VOICE_STT_MODEL_SPECS urls; knowledge_base_schema.py: DEFAULT_MANIFEST_HF_URL. */
const HUGGING_FACE_SITE = "https://huggingface.co";
/** knowledge_base_schema.py: DEFAULT_MANIFEST_GITHUB_URL (the library's second source). */
const GITHUB_SITE = "https://github.com";

/** Ollama is fetched only when it is not installed yet (or on Update). */
export const OLLAMA_PROGRAM_NOTICE: DownloadNotice = {
  site: OLLAMA_SITE,
  what: "Ollama, if it is not installed yet",
  size: null,
};

/** One or more models by name; `size` from the bundled catalog when every one has a size. */
export function modelPullNotice(tags: readonly string[], size: string | null): DownloadNotice {
  return { site: OLLAMA_REGISTRY_SITE, what: tags.join(", "), size };
}

/** KnowledgeBaseSection.tsx's own title for the meaning-search model offer says about 270 MB. */
export const MEANING_SEARCH_MODEL_NOTICE: DownloadNotice = modelPullNotice(["nomic-embed-text"], "about 270 MB");

/** The library's size is only known once its list file has been fetched. */
export const KNOWLEDGE_LIBRARY_NOTICES: DownloadNotice[] = [
  { site: HUGGING_FACE_SITE, what: "the knowledge library", size: null },
  { site: GITHUB_SITE, what: "the knowledge library if Hugging Face does not answer", size: null },
];

/** The voice engine is built in a container image the first time; the speech model is a file. */
export function voiceEngineNotices(opts: { engineReady: boolean; modelReady: boolean; model: string }): DownloadNotice[] {
  const out: DownloadNotice[] = [];
  if (!opts.engineReady) {
    out.push({
      site: VOICE_ENGINE_IMAGE_SITE,
      what: "the voice engine's build image, which then fetches its compilers from its own package servers",
      size: null,
    });
  }
  if (!opts.modelReady) {
    out.push({ site: HUGGING_FACE_SITE, what: `the ${opts.model} speech model`, size: null });
  }
  return out;
}
