# Finance AI — React Frontend Integration

Drop-in React component that connects to your NestJS + RAG backend.

## File structure

```
src/
├── components/
│   └── FinanceAI/
│       ├── index.ts              ← import from here
│       ├── FinanceAI.tsx         ← main chat UI component
│       ├── FinanceAI.module.css  ← scoped styles (CSS Modules)
│       └── useFinanceAI.ts       ← API logic + state hook
└── pages/
    └── FinanceAIPage.tsx         ← example page wrapper
```

## Setup

### 1. Copy the component

Copy `src/components/FinanceAI/` into your existing React project.

### 2. Set the API URL

In your `.env` file:
```env
VITE_API_URL=http://localhost:3000
```
This points to your NestJS server. In production, replace with your deployed URL.

### 3. Add to your router

```tsx
// App.tsx or your router file
import { FinanceAIPage } from './pages/FinanceAIPage';

<Route path="/finance-ai" element={<FinanceAIPage />} />
```

### 4. Or embed directly in any existing page

```tsx
import { FinanceAI } from './components/FinanceAI';

export function MyDashboard() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main>
        <div style={{ height: '700px' }}>
          <FinanceAI />
        </div>
      </main>
    </div>
  );
}
```

## API communication flow

```
User types message
       ↓
useFinanceAI hook
       ↓
POST /finance-ai/chat  (your NestJS)
       ↓
NestJS FinanceAiService
       ↓
POST /chat  (Python FastAPI RAG server)
       ↓
ChromaDB vector search + Ollama LLM
       ↓
Answer with sources rendered in UI
```

## Component features

- Finance-only topic guard (non-finance questions get a polite refusal)
- Source attribution — shows which documents each answer came from
- Multi-turn conversation history (last 10 messages sent to backend)
- Cancel in-flight requests
- Auto-scroll, auto-resize textarea
- 6 suggestion chips on empty state
- Typing indicator while waiting for response
- Full error handling with user-friendly messages
- CSS Modules — zero style leakage into your existing platform

## Customisation

### Change the suggestion chips
Edit the `SUGGESTIONS` array at the top of `FinanceAI.tsx`.

### Change colours
All design tokens are CSS custom properties in `FinanceAI.module.css`.
The main accent colour is `#00d9a6` — do a find-replace to change it.

### Use the hook directly (headless)
If you want to build your own UI:

```tsx
import { useFinanceAI } from './components/FinanceAI';

function MyCustomChat() {
  const { messages, loading, sendMessage, clearChat } = useFinanceAI();
  // build your own UI here
}
```
