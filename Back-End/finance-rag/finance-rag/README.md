# Finance RAG AI — Complete Setup Guide

A fully local, finance-only AI assistant using RAG.
No API keys. No cloud. Runs entirely on your machine.

---

## Architecture

```
Your financial data (CSV, PDF, TXT)
        ↓
   [ingest.py] → ChromaDB (vector store)
        ↓
   [server.py] FastAPI on :8000
        ↓
   NestJS FinanceAiModule → /finance-ai/chat
```

---

## Step 1 — Install Ollama (the local LLM runner)

### Linux / WSL
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### macOS
Download from https://ollama.com

### Pull the model (one time, ~4GB download)
```bash
ollama pull mistral
```

---

## Step 2 — Set up the Python RAG server

```bash
cd python/

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## Step 3 — Add your financial data

Place your files in the `data/` folder:
- `*.csv`  — your invoice datasets (the ones from your notebooks)
- `*.pdf`  — financial reports, accounting documents
- `*.txt`  — financial rules, business policies
- `*.json` — Q&A pairs (finance_qa.json already included)

---

## Step 4 — Ingest your data into the vector store

```bash
cd python/
python ingest.py
```

Output example:
```
=== Finance RAG — Document Ingestion ===

  [csv]  invoices_ml.csv → 2847 invoice records
  [json] finance_qa.json → 12 Q&A pairs
  [pdf]  annual_report.pdf → 143 chunks

Done. Vector store contains 3002 chunks.
```

Run this again anytime you add new documents.

---

## Step 5 — Start the RAG API server

```bash
# Make sure Ollama is running first
ollama serve &

# Start the FastAPI server
cd python/
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Test it:
```bash
curl http://localhost:8000/health
# {"status":"ok","model":"mistral","total_chunks":3002}

curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Which clients have the highest payment delay risk?"}'
```

---

## Step 6 — Integrate into NestJS

1. Copy the `nestjs/src/finance-ai/` folder into your NestJS project's `src/` directory.

2. Install the HTTP module if not already present:
```bash
npm install @nestjs/axios axios class-validator class-transformer
```

3. Import the module in your `app.module.ts`:
```typescript
import { FinanceAiModule } from './finance-ai/finance-ai.module';

@Module({
  imports: [
    FinanceAiModule,
    // ...your other modules
  ],
})
export class AppModule {}
```

4. Add the environment variable:
```env
FINANCE_AI_URL=http://localhost:8000
```

5. Your NestJS endpoints are now live:
```
POST /finance-ai/chat    — send a question, get a finance answer
GET  /finance-ai/health  — check model status
POST /finance-ai/ingest  — add new text to the knowledge base
```

---

## API Reference

### POST /finance-ai/chat
```json
// Request
{
  "message": "Why is invoice #1042 overdue?",
  "history": [
    { "role": "user",      "content": "Show me overdue invoices" },
    { "role": "assistant", "content": "Here are the overdue invoices..." }
  ]
}

// Response
{
  "answer": "Invoice #1042 from client ACME Corp is 23 days overdue...",
  "sources": ["invoices_ml.csv", "finance_qa.json"],
  "chunksUsed": 4,
  "isFinanceTopic": true
}
```

### POST /finance-ai/ingest
```json
// Request — add new data at runtime
{
  "text": "Client XYZ Corp has a new payment policy: net 30 days only.",
  "source": "policy-update-2024"
}
```

---

## How the Finance-Only Lock Works

Two layers of protection:

1. **Keyword guard** (in `server.py`): before calling the LLM at all,
   the question is checked against a set of ~40 finance keywords.
   Non-finance questions are rejected immediately.

2. **System prompt** (in `server.py`): the LLM is instructed to answer
   ONLY from the provided context and to refuse off-topic questions.

Result: even if someone asks "what is the weather?" — it never reaches
the model. It's blocked at the keyword gate and returns a polite refusal.

---

## Adding More Financial Data

The more data you add to `data/`, the smarter the assistant gets:

- SEC EDGAR filings: https://efts.sec.gov/LATEST/search-index?q=%22annual+report%22&dateRange=custom&startdt=2023-01-01&enddt=2024-01-01&forms=10-K
- Financial PhraseBank: https://huggingface.co/datasets/financial_phrasebank
- Your own business rules as .txt files
- Export Q&A pairs from your existing ML notebook results as JSON

---

## Production Checklist

- [ ] Run `ollama serve` as a systemd service (auto-start on reboot)
- [ ] Run `uvicorn` behind nginx as a reverse proxy
- [ ] Add authentication to the `/finance-ai/` NestJS routes
- [ ] Schedule weekly re-ingestion as new invoices arrive
- [ ] Set `FINANCE_AI_URL` in your NestJS `.env` file
