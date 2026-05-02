"""
ingest.py — Load your financial documents into ChromaDB vector store.
Run this ONCE to build your knowledge base.

Install deps first:
  pip install chromadb sentence-transformers pandas PyPDF2 tqdm
"""

import os
import csv
import json
import glob
import chromadb
import pandas as pd
from tqdm import tqdm
from sentence_transformers import SentenceTransformer

# ── Config ────────────────────────────────────────────────────────────────────
CHROMA_PATH   = "./chroma_db"          # where vectors are stored
EMBED_MODEL   = "all-MiniLM-L6-v2"    # free, fast, runs locally
CHUNK_SIZE    = 400                    # characters per chunk
CHUNK_OVERLAP = 80

# ── Init ──────────────────────────────────────────────────────────────────────
embedder = SentenceTransformer(EMBED_MODEL)
client   = chromadb.PersistentClient(path=CHROMA_PATH)
col      = client.get_or_create_collection(
    name="finance_docs",
    metadata={"hnsw:space": "cosine"}
)

# ── Chunker ───────────────────────────────────────────────────────────────────
def chunk_text(text: str, source: str) -> list[dict]:
    chunks = []
    start  = 0
    idx    = 0
    text   = text.strip()
    while start < len(text):
        end   = min(start + CHUNK_SIZE, len(text))
        chunk = text[start:end].strip()
        if len(chunk) > 40:                          # skip tiny fragments
            chunks.append({
                "id":      f"{source}__chunk{idx}",
                "text":    chunk,
                "source":  source,
            })
            idx += 1
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


# ── Ingest helpers ────────────────────────────────────────────────────────────
def ingest_chunks(chunks: list[dict]):
    if not chunks:
        return
    ids       = [c["id"]     for c in chunks]
    docs      = [c["text"]   for c in chunks]
    metas     = [{"source": c["source"]} for c in chunks]
    embeddings = embedder.encode(docs, show_progress_bar=False).tolist()
    col.upsert(ids=ids, documents=docs, metadatas=metas, embeddings=embeddings)


def ingest_text_file(path: str):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    source = os.path.basename(path)
    chunks = chunk_text(text, source)
    ingest_chunks(chunks)
    print(f"  [txt]  {source} → {len(chunks)} chunks")


def ingest_pdf(path: str):
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(path)
        text   = "\n".join(p.extract_text() or "" for p in reader.pages)
        source = os.path.basename(path)
        chunks = chunk_text(text, source)
        ingest_chunks(chunks)
        print(f"  [pdf]  {source} → {len(chunks)} chunks")
    except Exception as e:
        print(f"  [pdf]  SKIP {path}: {e}")


def ingest_csv_invoices(path: str):
    """
    Converts each invoice row into a human-readable text chunk so the
    model can reason about individual invoices.
    """
    df      = pd.read_csv(path)
    chunks  = []
    source  = os.path.basename(path)

    for _, row in df.iterrows():
        lines = [f"Invoice record — {source}"]
        for col_name, val in row.items():
            if pd.notna(val) and str(val).strip():
                lines.append(f"  {col_name}: {val}")
        text = "\n".join(lines)
        row_id = str(row.get("invoice_id", row.name))
        chunks.append({
            "id":     f"{source}__row{row_id}",
            "text":   text,
            "source": source,
        })

    ingest_chunks(chunks)
    print(f"  [csv]  {source} → {len(chunks)} invoice records")


def ingest_qa_json(path: str):
    """
    Load a JSON file of finance Q&A pairs:
    [{"question": "...", "answer": "..."}, ...]
    """
    with open(path, "r") as f:
        pairs = json.load(f)
    chunks = []
    source = os.path.basename(path)
    for i, pair in enumerate(pairs):
        text = f"Q: {pair['question']}\nA: {pair['answer']}"
        chunks.append({"id": f"{source}__qa{i}", "text": text, "source": source})
    ingest_chunks(chunks)
    print(f"  [qa]   {source} → {len(chunks)} Q&A pairs")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n=== Finance RAG — Document Ingestion ===\n")

    # CSV invoices (your existing data)
    for path in glob.glob("../data/*.csv"):
        ingest_csv_invoices(path)

    # PDFs (annual reports, accounting docs, etc.)
    for path in glob.glob("../data/*.pdf"):
        ingest_pdf(path)

    # Plain text files (financial rules, policies)
    for path in glob.glob("../data/*.txt"):
        ingest_text_file(path)

    # Q&A pairs JSON
    for path in glob.glob("../data/*.json"):
        ingest_qa_json(path)

    total = col.count()
    print(f"\nDone. Vector store contains {total} chunks.")
    print(f"Database saved to: {CHROMA_PATH}\n")
