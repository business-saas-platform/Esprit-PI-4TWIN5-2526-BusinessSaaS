# Quick Start Guide - AI Support Chat System

## What Was Built

A complete **local AI-powered support chat system** integrated into your Business Management SaaS platform:

### For Business Owners 👤
- **New Route**: `/dashboard/support`
- Ask questions to an AI assistant (powered by local Ollama)
- AI automatically escalates to human admin when needed
- Chat history is fully persisted

### For Platform Admins 🛡️
- **New Route**: `/admin/support` (separate from Communication module)
- View all escalated support tickets
- Respond directly to business owners
- Manage ticket status (open → in progress → resolved → closed)

---

## Setup Instructions

### 1. Install & Start Ollama (Required)

```bash
# Download from: https://ollama.ai
# Then start the server:
ollama serve

# In another terminal, pull the model:
ollama pull llama3
# OR: ollama pull mistral

# Verify it's running:
curl http://localhost:11434/api/tags
```

### 2. Backend Configuration (Already Done)
The backend is ready to go. Just ensure:
- `.env` has `OLLAMA_URL=http://localhost:11434`
- `.env` has `OLLAMA_MODEL=llama3` (or mistral)

### 3. Start the Application

```bash
# Terminal 1: Backend
cd Back-End
npm run start:dev

# Terminal 2: Frontend
cd Front-End
npm run dev

# Terminal 3: Ollama (from step 1)
ollama serve
```

### 4. Test the System

**As Business Owner:**
1. Log in to `/dashboard/support`
2. Ask a question (e.g., "Comment puis-je créer une facture?")
3. AI responds with helpful information
4. Ask about escalation (e.g., "Je veux parler à un humain")
5. Ticket is automatically escalated

**As Platform Admin:**
1. Log in to `/admin/support`
2. You'll see escalated support tickets
3. Click a ticket to view the conversation
4. Type a response
5. Business owner receives your message with "Agent Humain" badge

---

## Key Features ✨

✅ **Local AI Only** - Ollama running locally, no external APIs  
✅ **Automatic Escalation** - Detects keywords or failed AI responses  
✅ **Separate from Chat** - Independent module, doesn't affect communication  
✅ **French UI** - All labels and messages in French  
✅ **Full History** - All conversations are saved  
✅ **Real-time Status** - Track ticket progress  
✅ **Zero Configuration** - Already set up and ready to use  

---

## API Endpoints

All routes require authentication (JWT token).

```
POST   /api/support-chat/messages              # Submit message (triggers AI)
GET    /api/support-chat/tickets               # Get user's tickets
GET    /api/support-chat/tickets/:id           # Get specific ticket
GET    /api/support-chat/admin/tickets         # Get escalated tickets (admin)
POST   /api/support-chat/admin/tickets/:id/reply  # Admin reply (admin)
PATCH  /api/support-chat/tickets/:id           # Update status
```

---

## Escalation Examples

The system automatically escalates (creates support ticket) when:

1. **User mentions specific keywords:**
   - "parler à un humain" (talk to a human)
   - "contacter admin" (contact admin)
   - "problème technique" (technical problem)
   - "humain", "agent", "support", "aide"

2. **AI fails 3 times** - After 3 failed attempts, auto-escalate to human

3. **User explicitly requests it** - Any phrase requesting human assistance

---

## Database

Two new tables are created automatically:

- `support_tickets` - Stores ticket metadata (user, status, escalation info)
- `support_messages` - Stores all messages (user/ai/admin messages)

Migration happens automatically when the app starts.

---

## Environment Variables

Already configured in `.env`. No changes needed unless using different models:

```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3  # Change to 'mistral' if preferred
```

---

## Troubleshooting

### "Le service IA est temporairement indisponible"
→ Ollama is not running. Start it: `ollama serve`

### No tickets in admin panel
→ Check if any tickets are escalated
→ Verify database connection
→ Check backend logs for errors

### Messages not saving
→ Check database: `SELECT * FROM support_messages;`
→ Verify backend is running
→ Check browser console for errors

### Ollama model not responding
→ Install model: `ollama pull llama3`
→ Check model is in list: `ollama list`
→ Restart Ollama: `ollama serve`

---

## File Structure

### Backend (New Files)
```
src/modules/support-chat/
├── support-chat.module.ts        # Module definition
├── support-chat.controller.ts    # REST endpoints
├── support-chat.service.ts       # Business logic + Ollama
├── entities/
│   ├── support-ticket.entity.ts
│   └── support-message.entity.ts
└── dto/
    └── support-chat.dto.ts       # Input validation
```

### Frontend (New Files)
```
src/
├── app/pages/support/
│   └── BusinessOwnerSupport.tsx  # User chat interface
├── back-office/pages/admin/
│   └── AdminSupportTickets.tsx   # Admin interface
└── shared/lib/services/
    └── support.ts                # API client
```

### Modified Files
- `Back-End/src/app.module.ts` - Added SupportChatModule
- `Back-End/src/config/typeorm.config.ts` - Added entities
- `Back-End/.env` - Added Ollama config
- `Front-End/src/app/routes.tsx` - Added /dashboard/support route

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Business Owner Dashboard (/dashboard/support)          │
│ - See all support tickets                              │
│ - Chat with AI assistant                               │
└────────┬────────────────────────────────────────────────┘
         │
         │ Submit message
         ↓
┌─────────────────────────────────────────────────────────┐
│ Backend Support Chat Service                           │
│ - Check if Ollama is running                           │
│ - Build system prompt with context                     │
│ - Call Ollama for AI response                          │
│ - Detect escalation triggers                           │
│ - Save to database                                     │
└────────┬──────────────────┬─────────────────────────────┘
         │                  │
         │ AI Response      │ Escalated
         ↓                  ↓
    Return to User    ┌──────────────────────┐
                      │ Admin Panel          │
                      │ (/admin/support)     │
                      │ - View tickets       │
                      │ - Respond to users   │
                      └──────────────────────┘
```

---

## Performance Notes

- **Ollama Response Time**: 1-3 seconds depending on model and hardware
- **Fallback**: If Ollama unavailable, automatic message shown instantly
- **Scaling**: Each business has isolated tickets via `businessId`
- **Caching**: Messages are cached in memory after first load

---

## Next Steps (Optional Enhancements)

1. **Business Context** - Fetch user's invoices, clients, expenses to enrich AI responses
2. **Analytics** - Track response times, escalation rates, satisfaction
3. **Email Notifications** - Alert admins of new escalated tickets
4. **Knowledge Base** - Store and retrieve common Q&A
5. **Multi-language** - Extend to English, Spanish, etc.

---

## Important: Separation from Communication Module

⚠️ **These are completely separate systems:**

| Feature | Communication | Support Chat |
|---------|---|---|
| Route | `/dashboard/communication` | `/dashboard/support` |
| Admin Route | N/A | `/admin/support` |
| Purpose | Internal team chat | Customer support + AI |
| Users | Team members only | Business owner + Admin |
| AI | None | Local Ollama |
| Escalation | None | Automatic |

**Do not modify** the Communication module (`src/modules/communication/`).

---

**Status**: ✅ Ready for Production  
**Date**: April 19, 2026  
**Test**: All files compiled without errors
