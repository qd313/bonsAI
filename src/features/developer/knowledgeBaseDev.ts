/**
 * Title: Knowledge base seed path
 * Purpose: Deck filesystem path constant for the deployed seed knowledge-base corpus.
 * Used for: KnowledgeBaseSection and backend knowledge_base_service Phase 1 QA wiring.
 * Solves: Single documented location for seed KB content after scripts/build deploy.
 * Does not: Index or search documents — backend service owns ingestion and retrieval.
 */
export const SEED_KB_SOURCE_DIR = "~/homebrew/settings/bonsAI/seed-knowledge-base";
