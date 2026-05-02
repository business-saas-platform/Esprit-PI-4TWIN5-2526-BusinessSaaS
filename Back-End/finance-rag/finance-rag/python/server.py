"""
server.py — Finance RAG API server.
Exposes POST /chat that NestJS calls.

Start:
  ollama pull mistral          # download model once
  uvicorn server:app --port 8000 --reload
"""

import re
import chromadb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import ollama

# ── Config ────────────────────────────────────────────────────────────────────
CHROMA_PATH   = "./chroma_db"
EMBED_MODEL   = "all-MiniLM-L6-v2"
LLM_MODEL     = "mistral"              # ollama model name
TOP_K         = 5                      # chunks to retrieve
MIN_SCORE     = 0.25                   # cosine similarity threshold

SYSTEM_PROMPT = """You are FinanceAI, a specialized financial assistant for a business management platform.

STRICT RULES:
1. Answer ONLY using the context provided below. Do not use outside knowledge.
2. If the context does not contain enough information to answer, say: "I don't have enough financial data to answer that. Please upload more documents."
3. ONLY answer questions about: invoices, payments, cash flow, financial ratios, fraud detection, accounting, budgets, and financial analysis.
4. If asked about anything unrelated to finance, reply: "I'm specialized in finance only. I can't help with that topic."
5. Be precise, reference specific figures from the context when available.
6. Never invent numbers or facts not present in the context.

CONTEXT:
{context}
"""

# ── Init ──────────────────────────────────────────────────────────────────────
app      = FastAPI(title="Finance RAG API")
embedder = SentenceTransformer(EMBED_MODEL)
chroma   = chromadb.PersistentClient(path=CHROMA_PATH)
col      = chroma.get_or_create_collection("finance_docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str       # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    chunks_used: int
    is_finance_topic: bool


# ── Finance topic guard ───────────────────────────────────────────────────────
FINANCE_KEYWORDS = {
    "invoice", "payment", "cash", "revenue", "expense", "profit", "loss",
    "balance", "budget", "forecast", "tax", "vat", "debt", "credit",
    "debit", "account", "ledger", "audit", "fraud", "anomaly", "overdue",
    "receivable", "payable", "liquidity", "margin", "roi", "kpi", "finance",
    "financial", "facture", "montant", "paiement", "retard", "client",
    "vendor", "supplier", "bill", "transaction", "bank", "interest", "cost",
}

def is_finance_question(text: str) -> bool:
    words = set(re.findall(r"\w+", text.lower()))
    return bool(words & FINANCE_KEYWORDS)


# ── Retriever ─────────────────────────────────────────────────────────────────
def retrieve(query: str) -> tuple[str, list[str], int]:
    embedding = embedder.encode([query])[0].tolist()
    results   = col.query(
        query_embeddings=[embedding],
        n_results=min(TOP_K, col.count() or 1),
        include=["documents", "metadatas", "distances"],
    )

    docs      = results["documents"][0]
    metas     = results["metadatas"][0]
    distances = results["distances"][0]

    # Filter by similarity score (distance = 1 - cosine_similarity)
    filtered = [
        (doc, meta["source"])
        for doc, meta, dist in zip(docs, metas, distances)
        if (1 - dist) >= MIN_SCORE
    ]

    if not filtered:
        return "", [], 0

    context = "\n\n---\n\n".join(doc for doc, _ in filtered)
    sources = list(dict.fromkeys(src for _, src in filtered))  # deduplicated
    return context, sources, len(filtered)


# ── Chat endpoint ─────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if col.count() == 0:
        raise HTTPException(
            status_code=503,
            detail="Knowledge base is empty. Run ingest.py first."
        )

    # Topic guard
    if not is_finance_question(req.message):
        return ChatResponse(
            answer="I'm specialized in finance only. I can't help with that topic — but ask me anything about invoices, payments, cash flow, or financial analysis!",
            sources=[],
            chunks_used=0,
            is_finance_topic=False,
        )

    # Retrieve relevant context
    context, sources, n_chunks = retrieve(req.message)

    if not context:
        return ChatResponse(
            answer="I don't have enough financial data to answer that. Please upload more documents or check that your knowledge base is populated.",
            sources=[],
            chunks_used=0,
            is_finance_topic=True,
        )

    # Build messages for Ollama
    system = SYSTEM_PROMPT.format(context=context)

    messages = [{"role": "system", "content": system}]
    for msg in req.history[-6:]:          # last 6 turns for context window
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": req.message})

    # Call local Ollama model
    try:
        response = ollama.chat(model=LLM_MODEL, messages=messages)
        answer   = response["message"]["content"].strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

    return ChatResponse(
        answer=answer,
        sources=sources,
        chunks_used=n_chunks,
        is_finance_topic=True,
    )


# ── Health + stats ────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model":        LLM_MODEL,
        "embed_model":  EMBED_MODEL,
        "total_chunks": col.count(),
    }

@app.post("/ingest-text")
async def ingest_text(payload: dict):
    """Ingest a single text snippet at runtime (e.g. a new invoice)."""
    text   = payload.get("text", "")
    source = payload.get("source", "runtime")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    from ingest import chunk_text, ingest_chunks
    chunks = chunk_text(text, source)
    ingest_chunks(chunks)
    return {"ingested": len(chunks), "source": source}
