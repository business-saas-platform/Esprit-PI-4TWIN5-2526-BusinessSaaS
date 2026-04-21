# AI-Powered Support Chat System - Implementation Guide

## Overview
A complete AI-powered support chat system has been implemented for the Business Management SaaS platform. This system enables:
- **Business Owners**: Ask questions to an AI assistant that has context about their business data
- **Admin**: Respond to escalated support tickets from business owners
- **Automatic Escalation**: When AI cannot resolve issues, tickets are automatically escalated to human admins

## Architecture

### Backend (NestJS)
**New Module**: `src/modules/support-chat/`
- **Entities**: 
  - `SupportTicketEntity` - Stores support tickets with status tracking
  - `SupportMessageEntity` - Stores all messages (user, AI, admin)
- **Service**: Handles AI integration with Ollama, escalation logic, and business context
- **Controller**: REST API endpoints for chat interactions
- **Routes**: 
  - `POST /api/support-chat/messages` - Submit message (triggers AI response)
  - `GET /api/support-chat/tickets` - Get user's tickets
  - `GET /api/support-chat/tickets/:id` - Get specific ticket
  - `GET /api/support-chat/admin/tickets` - Get all escalated tickets (admin only)
  - `POST /api/support-chat/admin/tickets/:id/reply` - Admin reply (admin only)
  - `PATCH /api/support-chat/tickets/:id` - Update ticket status

### Frontend (React + Vite)
**New Pages**:
- `/dashboard/support` - Business Owner chat interface (NEW)
- `/admin/support` - Admin support tickets interface (UPDATED - now separate from Communication module)

**New Service**: `src/shared/lib/services/support.ts`
- API client for support chat operations

## Ollama Integration

### Setup
1. **Install Ollama**: Download from https://ollama.ai
2. **Start Ollama Server**: `ollama serve`
3. **Pull Model**: `ollama pull llama3` (or `mistral`)
4. **Verify**: Test with `curl http://localhost:11434/api/tags`

### Configuration
Add to `.env` (already configured):
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### How It Works
1. User submits a message via `/dashboard/support`
2. Backend receives message and checks if Ollama is running
3. Backend builds a system prompt with business context
4. Backend calls `http://localhost:11434/api/chat` with the user's message
5. AI responds based on context
6. Response is saved and displayed to user

### Fallback Behavior
- If Ollama is unavailable: "Le service IA est temporairement indisponible."
- If response generation fails 3 times: Ticket is automatically escalated to admin

### Escalation Triggers
A support ticket is automatically escalated to admin (and marked for human response) when:
1. User mentions keywords: "parler à un humain", "contacter admin", "problème technique", "humain", "agent", "support", "aide"
2. AI fails to generate a response 3 times
3. User explicitly requests human assistance

## User Flows

### Business Owner Flow
1. Navigate to `/dashboard/support`
2. See list of existing support tickets
3. Select a ticket or create a new one by typing a message
4. Message is processed by AI assistant
5. AI responds with contextual information
6. If issue escalates, user sees: "Votre demande a été transmise à l'administrateur"
7. User can check ticket status

### Admin Flow
1. Navigate to `/admin/support` (separate from Communication module)
2. See all escalated support tickets in left sidebar
3. Select a ticket to view conversation history
4. Type response in reply field
5. Select status (Ouvert, En cours, Résolu, Fermé)
6. Send reply - message is delivered to business owner in their chat
7. Business owner sees message with "Agent Humain" badge

## Database Schema

### support_tickets table
```sql
- id (UUID, PK)
- businessId (UUID, indexed)
- userId (UUID, indexed)
- title (varchar 255)
- description (text, nullable)
- status (enum: open, in_progress, resolved, closed)
- escalatedToAdmin (boolean)
- failedAIResponseCount (integer)
- createdAt (timestamp)
- updatedAt (timestamp)
- resolvedAt (timestamp, nullable)
```

### support_messages table
```sql
- id (UUID, PK)
- ticketId (UUID, indexed, FK)
- sender (enum: user, ai, admin)
- content (text)
- isAIResponse (boolean)
- createdAt (timestamp)
```

## UI/UX Features

### Business Owner Dashboard (`/dashboard/support`)
- **Sidebar**: List of support tickets with status badges
- **Chat Area**: 
  - Message history with timestamps
  - Message badges: "IA" (AI responses), "Agent Humain" (admin responses)
  - Input field for new messages
  - Auto-scroll to latest messages
  - Visual distinction between user, AI, and admin messages

### Admin Interface (`/admin/support`)
- **Sidebar**: List of escalated tickets waiting for response
- **Ticket Info**: Business ID, timestamp, status
- **Chat Area**:
  - Full message history (user messages, AI responses, admin responses)
  - Reply field with status selector
  - Send button
- **Status Management**: Change ticket status while replying

## Language
All UI text is in French:
- "Support" → Support section
- "Ouvrir une demande" → Open a request
- "Votre demande a été transmise à l'administrateur" → Your request has been sent to admin
- "Agent Humain" → Human Agent
- "Assistant IA" → AI Assistant
- Status labels: "Ouvert", "En cours", "Résolu", "Fermé"

## Key Features Implemented

✅ **Local AI Only** - Uses Ollama, no external APIs
✅ **Automatic Escalation** - Based on keywords and failed responses
✅ **Business Context** - AI can be enhanced to use business data
✅ **Real-time Updates** - Messages are stored and retrieved via REST API
✅ **Admin Dashboard** - Separate from Communication module
✅ **Message Tracking** - All messages tagged by sender (user/ai/admin)
✅ **Status Management** - Track ticket lifecycle
✅ **Fallback Handling** - Graceful error messages if Ollama is unavailable
✅ **Separation from Communication** - Completely independent module

## Testing Checklist

### Backend
- [ ] Database tables created successfully (check with `\dt` in psql)
- [ ] Ollama service is running (`curl http://localhost:11434/api/tags`)
- [ ] API routes are accessible (check with Postman/curl)
- [ ] Messages are persisted to database
- [ ] Escalation logic works correctly

### Frontend
- [ ] `/dashboard/support` page loads without errors
- [ ] `/admin/support` page loads without errors
- [ ] Can submit messages as business owner
- [ ] Can see AI responses in ticket
- [ ] Admin can see escalated tickets
- [ ] Admin can reply to tickets
- [ ] Messages appear in real-time

### Integration
- [ ] User message triggers AI via Ollama
- [ ] AI response is saved and displayed
- [ ] Escalation keywords trigger ticket creation
- [ ] Admin receives and can respond to tickets
- [ ] Business owner sees admin replies with badge

## Configuration & Environment

### Backend .env
```env
# Ollama (Local AI)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3  # or mistral
```

### Frontend
No additional configuration needed - routes are automatic.

## Important Notes

⚠️ **IMPORTANT**: Do NOT modify the Communication module (`src/modules/communication/`). 
- The new support chat system is completely separate
- `/dashboard/communication` is for internal team chat (unchanged)
- `/admin/support` now shows support tickets (not communication channels)
- `/dashboard/support` is for customer support (NEW)

## Future Enhancements

1. **Business Data Integration**: Fetch invoices, clients, expenses to build richer context
2. **Analytics**: Track support ticket metrics, response times, resolution rates
3. **Advanced Escalation**: ML-based escalation prediction
4. **Webhooks**: Notify admins via email or Slack of new tickets
5. **Multi-language Support**: Expand beyond French
6. **Knowledge Base**: Store and search common questions/answers
7. **Canned Responses**: Pre-built admin responses for quick replies

## Troubleshooting

### "Le service IA est temporairement indisponible"
- Check if Ollama is running: `curl http://localhost:11434/api/tags`
- Start Ollama: `ollama serve`
- Check `.env` configuration for OLLAMA_URL

### No tickets appearing in admin panel
- Check database connection
- Verify `support_tickets` table exists: `SELECT * FROM support_tickets;`
- Check if any tickets have `escalatedToAdmin = true`

### Messages not appearing
- Check browser console for errors
- Verify API routes in backend logs
- Check database for `support_messages` entries

### Ollama model not responding
- Verify model is installed: `ollama list`
- Check model name in .env matches installed model
- Check Ollama logs for errors

## Files Created/Modified

### Backend (New)
- `src/common/enums-support.ts` - Support ticket enums
- `src/modules/support-chat/` - Complete module
  - `support-chat.module.ts`
  - `support-chat.controller.ts`
  - `support-chat.service.ts`
  - `entities/support-ticket.entity.ts`
  - `entities/support-message.entity.ts`
  - `dto/support-chat.dto.ts`

### Backend (Modified)
- `src/config/typeorm.config.ts` - Added new entities
- `src/app.module.ts` - Imported SupportChatModule
- `.env` - Added Ollama configuration

### Frontend (New)
- `src/app/pages/support/BusinessOwnerSupport.tsx` - User chat interface
- `src/back-office/pages/admin/AdminSupportTickets.tsx` - Admin interface
- `src/shared/lib/services/support.ts` - API client

### Frontend (Modified)
- `src/app/routes.tsx` - Added /dashboard/support and updated /admin/support routes

---

**Status**: ✅ Complete and Ready for Testing
**Date**: April 19, 2026
