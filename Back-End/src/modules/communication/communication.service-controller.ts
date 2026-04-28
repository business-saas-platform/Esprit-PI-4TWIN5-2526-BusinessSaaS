// ─── communication.service.ts ─────────────────────────────
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ChannelEntity } from './channel.entity';
import { MessageEntity } from './message.entity';
import { TodoEntity } from './todo.entity';

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(ChannelEntity)
    private readonly channels: Repository<ChannelEntity>,
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
    @InjectRepository(TodoEntity)
    private readonly todos: Repository<TodoEntity>,
  ) {}

  // Get all channels for a business (tenant-scoped, filter private by membership)
  async getChannels(businessId: string, userId: string) {
    let all = await this.channels.find({
      where: { businessId },
      order: { createdAt: 'ASC' },
    });

    // Ensure AI Copilot channel exists for this specific user
    const aiChannelName = `🤖 AI Copilot`;
    let aiChannel = all.find(ch => ch.name === aiChannelName && ch.memberIds?.includes(userId));
    
    if (!aiChannel) {
      aiChannel = this.channels.create({
        businessId,
        name: aiChannelName,
        type: 'dm',
        memberIds: [userId, 'ai-bot-id'],
        description: 'Your personal AI assistant',
      });
      aiChannel = await this.channels.save(aiChannel);
      all.push(aiChannel);
    }

    return all.filter(ch => {
      if (ch.type !== 'private') return true;
      const ids = ch.memberIds || [];
      return ids.includes(userId);
    });
  }

  // Create a channel (auto-include creator for private/dm)
  async createChannel(businessId: string, creatorId: string, dto: {
    name: string;
    description?: string;
    type?: 'public' | 'private' | 'dm';
    memberIds?: string[];
  }) {
    let memberIds = dto.memberIds ?? [];
    if ((dto.type === 'private' || dto.type === 'dm') && !memberIds.includes(creatorId)) {
      memberIds = [creatorId, ...memberIds];
    }
    const channel = this.channels.create({
      businessId,
      name: dto.name.trim(),
      description: dto.description,
      type: dto.type ?? 'public',
      memberIds,
    });
    return this.channels.save(channel);
  }

  // Seed default channels
  async seedDefaultChannels(businessId: string) {
    const defaults = ['general', 'announcements', 'random'];
    for (const name of defaults) {
      const exists = await this.channels.findOne({ where: { businessId, name } });
      if (!exists) {
        await this.channels.save(
          this.channels.create({
            businessId,
            name,
            type: 'public',
            isDefault: true,
          }),
        );
      }
    }
  }

  // Get messages for a channel
  async getMessages(businessId: string, channelId: string, limit = 50, before?: string) {
    const channel = await this.channels.findOne({ where: { id: channelId, businessId } });
    if (!channel) throw new NotFoundException('Channel not found');

    const query = this.messages
      .createQueryBuilder('m')
      .where('m.channelId = :channelId', { channelId })
      .andWhere('m.businessId = :businessId', { businessId })
      .orderBy('m.createdAt', 'DESC')
      .take(limit);

    if (before) {
      query.andWhere('m.createdAt < :before', { before: new Date(before) });
    }

    const msgs = await query.getMany();
    return msgs.reverse();
  }

  // Search messages across channels
  async searchMessages(businessId: string, userId: string, query: string, limit = 30) {
    if (!query || query.trim().length < 2) return [];

    // Get channels user has access to
    const channels = await this.getChannels(businessId, userId);
    const channelIds = channels.map(c => c.id);
    if (channelIds.length === 0) return [];

    return this.messages
      .createQueryBuilder('m')
      .where('m.businessId = :businessId', { businessId })
      .andWhere('m.channelId IN (:...channelIds)', { channelIds })
      .andWhere('m.content ILIKE :q', { q: `%${query.trim()}%` })
      .orderBy('m.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  // Pin / Unpin a message
  async togglePin(businessId: string, messageId: string) {
    const msg = await this.messages.findOne({ where: { id: messageId, businessId } });
    if (!msg) throw new NotFoundException('Message not found');
    msg.isPinned = !msg.isPinned;
    await this.messages.save(msg);
    return msg;
  }

  // Get pinned messages for a channel
  async getPinnedMessages(businessId: string, channelId: string) {
    return this.messages.find({
      where: { channelId, businessId, isPinned: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Delete channel
  async deleteChannel(businessId: string, channelId: string, userId: string, role: string) {
    const channel = await this.channels.findOne({ where: { id: channelId, businessId } });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.isDefault) throw new ForbiddenException('Cannot delete default channels');
    if (!['platform_admin', 'business_owner', 'business_admin'].includes(role)) {
      throw new ForbiddenException('Not authorized');
    }
    await this.channels.delete(channelId);
    return { ok: true };
  }

  // Add member to channel
  async addMember(businessId: string, channelId: string, memberId: string) {
    const channel = await this.channels.findOne({ where: { id: channelId, businessId } });
    if (!channel) throw new NotFoundException('Channel not found');
    
    // Initialize memberIds if null
    if (!channel.memberIds) {
      channel.memberIds = [];
    }
    
    if (!channel.memberIds.includes(memberId)) {
      // Force a new array reference for simple-array to detect change
      channel.memberIds = [...channel.memberIds, memberId];
      await this.channels.save(channel);
    }
    return channel;
  }

  // AI Summarize recent messages
  async summarizeChannel(businessId: string, channelId: string) {
    const msgs = await this.messages.find({
      where: { channelId, businessId },
      order: { createdAt: 'DESC' },
      take: 30,
    });

    if (msgs.length === 0) return { summary: 'No messages to summarize.' };

    const transcript = msgs.reverse().map(m =>
      `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.senderName}: ${m.content}`
    ).join('\n');

    try {
      // Use the specific key provided by the user for the Summarizer
      const apiKey = process.env.GEMINI_API_KEY_SUMMARIZER || 'AIzaSyAnCX4hNkJSvipt97VB3jHUzIh3qsLLdDI';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Summarize this chat conversation concisely in 3-5 bullet points. Focus on key decisions, action items, and important information. Here is the transcript:\n\n${transcript}` }]
          }],
          generationConfig: { temperature: 0.3 }
        }),
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) throw new Error('No text returned from Gemini');
      return { summary: text };
    } catch (err) {
      console.error("Gemini API Error:", err);
      // Fallback
      const uniqueSenders = [...new Set(msgs.map(m => m.senderName))];
      return {
        summary: `📋 Channel had ${msgs.length} messages from ${uniqueSenders.join(', ')}. AI summarization failed, please check API key.`,
      };
    }
  }

  // ─── TODOS ────────────────────────────────────────────────
  async getTodos(businessId: string, userId: string) {
    return this.todos.find({
      where: { businessId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async addTodo(businessId: string, userId: string, description: string, deadline?: string, sourceChannelId?: string) {
    const todo = this.todos.create({
      businessId,
      userId,
      description,
      deadline,
      sourceChannelId,
    });
    return this.todos.save(todo);
  }

  async toggleTodo(businessId: string, userId: string, todoId: string) {
    const todo = await this.todos.findOne({ where: { id: todoId, businessId, userId } });
    if (!todo) throw new NotFoundException('Todo not found');
    todo.isCompleted = !todo.isCompleted;
    return this.todos.save(todo);
  }

  async deleteTodo(businessId: string, userId: string, todoId: string) {
    const todo = await this.todos.findOne({ where: { id: todoId, businessId, userId } });
    if (!todo) throw new NotFoundException('Todo not found');
    await this.todos.remove(todo);
    return { success: true };
  }
}


// ─── communication.controller.ts ──────────────────────────
import { Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

const fileStorage = diskStorage({
  destination: './uploads/communication',
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});

@Controller('communication')
export class CommunicationController {
  constructor(private readonly service: CommunicationService) {}

  @UseGuards(JwtAuthGuard)
  @Get('channels')
  getChannels(@Req() req: any) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.getChannels(bizId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('channels')
  createChannel(@Req() req: any, @Body() dto: any) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.createChannel(bizId, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('channels/:id')
  deleteChannel(@Req() req: any, @Param('id') id: string) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.deleteChannel(bizId, id, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('channels/:id/members')
  addMember(@Req() req: any, @Param('id') id: string, @Body() body: { memberId: string }) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.addMember(bizId, id, body.memberId);
  }

  // --- Search messages ---
  @UseGuards(JwtAuthGuard)
  @Get('search')
  searchMessages(@Req() req: any, @Query('q') q: string, @Query('limit') limit?: string) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.searchMessages(bizId, req.user.sub, q, limit ? parseInt(limit) : 30);
  }

  // --- Pin / Unpin message ---
  @UseGuards(JwtAuthGuard)
  @Patch('messages/:id/pin')
  togglePin(@Req() req: any, @Param('id') id: string) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.togglePin(bizId, id);
  }

  // --- Get pinned messages ---
  @UseGuards(JwtAuthGuard)
  @Get('channels/:id/pinned')
  getPinnedMessages(@Req() req: any, @Param('id') id: string) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.getPinnedMessages(bizId, id);
  }

  // --- AI Summarize ---
  @UseGuards(JwtAuthGuard)
  @Post('channels/:id/summarize')
  summarize(@Req() req: any, @Param('id') id: string) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.summarizeChannel(bizId, id);
  }

  // --- AI Extract Tasks ---
  @UseGuards(JwtAuthGuard)
  @Post('channels/:id/extract-tasks')
  async extractTasks(@Req() req: any, @Param('id') id: string) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    const msgs = await this.service.getMessages(bizId, id, 50);
    if (msgs.length === 0) return { tasks: [] };

    const transcript = msgs.map(m => `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.senderName}: ${m.content}`).join('\n');

    try {
      const apiKey = process.env.GEMINI_API_KEY_SUMMARIZER || 'AIzaSyAnCX4hNkJSvipt97VB3jHUzIh3qsLLdDI';
      const prompt = `You are an AI assistant. Extract actionable tasks (to-dos) from the following chat transcript. Return ONLY a valid JSON array of objects. Each object must have three string properties: "description" (what needs to be done), "assignee" (who needs to do it, if mentioned, otherwise "Unassigned"), and "deadline" (when it needs to be done, if mentioned, otherwise "None"). Do not include markdown code blocks, just the raw JSON array. If there are no tasks, return [].\n\nTranscript:\n${transcript}`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        }),
      });
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const tasks = JSON.parse(text);
      return { tasks };
    } catch (err) {
      console.error("Gemini Extract Tasks Error:", err);
      return { tasks: [] };
    }
  }

  // --- AI Smart Replies ---
  @UseGuards(JwtAuthGuard)
  @Post('channels/:id/smart-replies')
  async getSmartReplies(@Req() req: any, @Param('id') id: string) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    const msgs = await this.service.getMessages(bizId, id, 5);
    if (msgs.length === 0) return { replies: ['Hello!', 'How can I help?', 'Sounds good.'] };

    const transcript = msgs.map(m => `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.senderName}: ${m.content}`).join('\n');

    try {
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyB7Wjoug0QSyzYWdIuwwubzcyyvppRgOgo';
      const prompt = `Based on this chat history, generate exactly 3 short, natural, distinct reply suggestions for the user to pick from. Return ONLY a valid JSON array of 3 strings. Do not include markdown blocks. Example: ["Sure!", "I'll check later.", "No problem."]\n\nHistory:\n${transcript}`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6 }
        }),
      });
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '["Yes", "No", "Thanks"]';
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const replies = JSON.parse(text);
      return { replies };
    } catch (err) {
      console.error("Gemini Smart Replies Error:", err);
      return { replies: ['Got it!', 'Okay.', 'Thanks.'] };
    }
  }

  // --- AI Tone Enhancer ---
  @UseGuards(JwtAuthGuard)
  @Post('enhance-tone')
  async enhanceTone(@Body() body: { text: string; tone: string }) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyB7Wjoug0QSyzYWdIuwwubzcyyvppRgOgo';
      const prompt = `Rewrite the following message to sound more ${body.tone || 'professional'}. Keep the core meaning the same, just adjust the tone. Do not add any introductory or concluding text, just return the rewritten message.\n\nMessage: "${body.text}"`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 }
        }),
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No text returned from Gemini');
      
      return { enhanced: text.trim() };
    } catch (err) {
      console.error("Gemini API Error:", err);
      return { enhanced: body.text };
    }
  }

  // --- AI Translate ---
  @UseGuards(JwtAuthGuard)
  @Post('translate')
  async translateMsg(@Body() body: { text: string; language?: string }) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyB7Wjoug0QSyzYWdIuwwubzcyyvppRgOgo';
      const targetLang = body.language || 'English';
      const prompt = `Translate the following message into ${targetLang}. Preserve the original tone, formatting, and technical jargon if any. Return ONLY the translated text without any introduction.\n\nMessage: "${body.text}"`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        }),
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No text returned from Gemini');
      
      return { translated: text.trim() };
    } catch (err) {
      console.error("Gemini Translate Error:", err);
      return { translated: body.text };
    }
  }

  // --- File upload ---
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: fileStorage, limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadFile(@UploadedFile() file: any) {
    if (!file) return { error: 'No file uploaded' };
    const url = `/uploads/communication/${file.filename}`;
    return { url, originalName: file.originalname, size: file.size, mimeType: file.mimetype };
  }

  // --- Todos ---
  @UseGuards(JwtAuthGuard)
  @Get('todos')
  getTodos(@Req() req: any) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.getTodos(bizId, req.user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('todos')
  addTodo(@Req() req: any, @Body() body: { description: string; deadline?: string; sourceChannelId?: string }) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.addTodo(bizId, req.user?.sub, body.description, body.deadline, body.sourceChannelId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('todos/:id/toggle')
  toggleTodo(@Req() req: any, @Param('id') id: string) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.toggleTodo(bizId, req.user?.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('todos/:id')
  deleteTodo(@Req() req: any, @Param('id') id: string) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.deleteTodo(bizId, req.user?.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('channels/:id/messages')
  getMessages(
    @Req() req: any,
    @Param('id') channelId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const bizId = req.user?.businessId || req.headers['x-business-id'];
    return this.service.getMessages(
      bizId,
      channelId,
      limit ? parseInt(limit) : 50,
      before,
    );
  }
}
