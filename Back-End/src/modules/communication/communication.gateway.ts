import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { MessageEntity } from './message.entity';
import { ChannelEntity } from './channel.entity';
import { UserEntity } from '../users/entities/user.entity';

@WebSocketGateway({
  namespace: 'communication',
  cors: { origin: '*' }
})
export class CommunicationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private onlineUsers = new Map<string, string>(); // socketId -> userId
  private userPresence = new Map<string, { status: string; customText?: string }>(); // userId -> presence

  constructor(
    @InjectRepository(MessageEntity) private readonly messages: Repository<MessageEntity>,
    @InjectRepository(ChannelEntity) private readonly channels: Repository<ChannelEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: any) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) return client.disconnect();
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.businessId = payload.businessId;
      client.role = payload.role;
      
      const user = await this.users.findOne({ where: { id: client.userId } });
      client.userName = user?.name || 'User';

      this.onlineUsers.set(client.id, client.userId);
      if (!this.userPresence.has(client.userId)) {
        this.userPresence.set(client.userId, { status: 'online' });
      }
      client.join('global');
      client.join(`user:${client.userId}`);
      
      const onlineIds = Array.from(this.onlineUsers.values());
      client.emit('online:list', onlineIds);

      // Send all presence statuses
      const presenceMap: Record<string, any> = {};
      this.userPresence.forEach((v, k) => { presenceMap[k] = v; });
      client.emit('presence:all', presenceMap);

      this.server.to('global').emit('user:online', { userId: client.userId });
    } catch (error) {
      console.error('Socket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: any) {
    if (client.userId) {
      this.onlineUsers.delete(client.id);
      // Only remove presence if no other sockets for this user
      const stillOnline = Array.from(this.onlineUsers.values()).includes(client.userId);
      if (!stillOnline) {
        this.userPresence.delete(client.userId);
      }
      this.server.to('global').emit('user:offline', { userId: client.userId });
    }
  }

  // ═══════════════════════════════════════════
  //  CHANNELS
  // ═══════════════════════════════════════════

  @SubscribeMessage('channel:join')
  async handleChannelJoin(@ConnectedSocket() client: any, @MessageBody() data: { channelId: string }) {
    client.join(`channel:${data.channelId}`);
    const history = await this.messages.find({
      where: { channelId: data.channelId },
      order: { createdAt: 'ASC' },
      take: 50,
    });
    client.emit('channel:history', history);
  }

  // ═══════════════════════════════════════════
  //  MESSAGES (with reply support)
  // ═══════════════════════════════════════════

  @SubscribeMessage('message:send')
  async handleSendMessage(@ConnectedSocket() client: any, @MessageBody() data: {
    channelId: string; content: string; type?: string; senderName?: string;
    replyToId?: string; replyToContent?: string; replyToSender?: string;
  }) {
    if (!data.content || !data.channelId) return;

    const newMessage = await this.messages.save(
      this.messages.create({
        channelId: data.channelId,
        businessId: client.businessId,
        senderId: client.userId,
        senderName: data.senderName || client.userName,
        content: data.content,
        type: (data.type as any) || 'text',
        replyToId: data.replyToId || undefined,
        replyToContent: data.replyToContent || undefined,
        replyToSender: data.replyToSender || undefined,
        reactions: {},
        readBy: [client.userId],
        isPinned: false,
      })
    );

    this.server.to(`channel:${data.channelId}`).emit('message:new', newMessage);

    // AI Copilot Integration
    const channel = await this.channels.findOne({ where: { id: data.channelId } });
    if (channel && channel.name === '🤖 AI Copilot') {
      try {
        const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyB7Wjoug0QSyzYWdIuwwubzcyyvppRgOgo';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: data.content }] }],
            generationConfig: { temperature: 0.5 }
          }),
        });
        const aiData = await res.json();
        const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (aiText) {
          const aiMessage = await this.messages.save(
            this.messages.create({
              channelId: data.channelId,
              businessId: client.businessId,
              senderId: 'ai-bot-id',
              senderName: 'AI Copilot',
              content: aiText,
              type: 'text',
              reactions: {},
              readBy: [client.userId],
              isPinned: false,
            })
          );
          this.server.to(`channel:${data.channelId}`).emit('message:new', aiMessage);
        }
      } catch (err) {
        console.error("AI Copilot Error:", err);
      }
    }
  }

  // ═══════════════════════════════════════════
  //  REACTIONS
  // ═══════════════════════════════════════════

  @SubscribeMessage('message:react')
  async handleReaction(@ConnectedSocket() client: any, @MessageBody() data: { messageId: string; emoji: string; channelId: string }) {
    const msg = await this.messages.findOne({ where: { id: data.messageId } });
    if (!msg) return;

    const reactions = msg.reactions || {};
    if (!reactions[data.emoji]) reactions[data.emoji] = [];

    const idx = reactions[data.emoji].indexOf(client.userId);
    if (idx >= 0) {
      reactions[data.emoji].splice(idx, 1);
      if (reactions[data.emoji].length === 0) delete reactions[data.emoji];
    } else {
      reactions[data.emoji].push(client.userId);
    }

    msg.reactions = reactions;
    await this.messages.save(msg);

    this.server.to(`channel:${data.channelId}`).emit('message:updated', {
      id: msg.id,
      reactions: msg.reactions,
    });
  }

  // ═══════════════════════════════════════════
  //  READ RECEIPTS
  // ═══════════════════════════════════════════

  @SubscribeMessage('message:read')
  async handleRead(@ConnectedSocket() client: any, @MessageBody() data: { messageIds: string[]; channelId: string }) {
    if (!data.messageIds?.length) return;

    const msgs = await this.messages.find({ where: { id: In(data.messageIds) } });
    for (const msg of msgs) {
      if (!msg.readBy) msg.readBy = [];
      if (!msg.readBy.includes(client.userId)) {
        msg.readBy.push(client.userId);
      }
    }
    await this.messages.save(msgs);

    this.server.to(`channel:${data.channelId}`).emit('message:read-update', {
      messageIds: data.messageIds,
      userId: client.userId,
      userName: client.userName,
    });
  }

  // ═══════════════════════════════════════════
  //  PRESENCE STATUS
  // ═══════════════════════════════════════════

  @SubscribeMessage('presence:update')
  handlePresenceUpdate(@ConnectedSocket() client: any, @MessageBody() data: { status: string; customText?: string }) {
    this.userPresence.set(client.userId, { status: data.status, customText: data.customText });
    this.server.to('global').emit('presence:changed', {
      userId: client.userId,
      status: data.status,
      customText: data.customText,
    });
  }

  // ═══════════════════════════════════════════
  //  MESSAGE FORWARDING
  // ═══════════════════════════════════════════

  @SubscribeMessage('message:forward')
  async handleForward(@ConnectedSocket() client: any, @MessageBody() data: { messageId: string; targetChannelId: string }) {
    const original = await this.messages.findOne({ where: { id: data.messageId } });
    if (!original) return;

    const forwarded = await this.messages.save(
      this.messages.create({
        channelId: data.targetChannelId,
        businessId: client.businessId,
        senderId: client.userId,
        senderName: client.userName,
        content: original.content,
        type: original.type,
        fileUrl: original.fileUrl,
        reactions: {},
        readBy: [client.userId],
        isPinned: false,
        replyToId: undefined,
        replyToContent: `Forwarded from ${original.senderName}`,
        replyToSender: original.senderName,
      })
    );

    this.server.to(`channel:${data.targetChannelId}`).emit('message:new', forwarded);
  }

  // ═══════════════════════════════════════════
  //  TYPING INDICATORS
  // ═══════════════════════════════════════════

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: any, @MessageBody() data: { channelId: string }) {
    client.to(`channel:${data.channelId}`).emit('typing:start', { userId: client.userId, userName: client.userName });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: any, @MessageBody() data: { channelId: string }) {
    client.to(`channel:${data.channelId}`).emit('typing:stop', { userId: client.userId });
  }

  // ═══════════════════════════════════════════
  //  WEBRTC & CALLS
  // ═══════════════════════════════════════════

  @SubscribeMessage('call:join')
  handleCallJoin(@ConnectedSocket() client: any, @MessageBody() data: { callId: string }) {
    client.join(`call:${data.callId}`);
    client.to(`call:${data.callId}`).emit('call:peer-joined', { userId: client.userId, userName: client.userName, callId: data.callId });
  }

  @SubscribeMessage('call:invite')
  handleCallInvite(@ConnectedSocket() client: any, @MessageBody() data: { channelId: string, callId: string, type: string }) {
    client.to(`channel:${data.channelId}`).emit('call:invite', {
      callId: data.callId,
      channelId: data.channelId,
      callerId: client.userId,
      callerName: client.userName,
      type: data.type
    });
  }

  @SubscribeMessage('webrtc:offer')
  handleWebrtcOffer(@ConnectedSocket() client: any, @MessageBody() data: { targetId: string, callId: string, offer: any }) {
    this.server.to(`user:${data.targetId}`).emit('webrtc:offer', {
      from: client.userId,
      fromName: client.userName,
      callId: data.callId,
      offer: data.offer
    });
  }

  @SubscribeMessage('webrtc:answer')
  handleWebrtcAnswer(@ConnectedSocket() client: any, @MessageBody() data: { targetId: string, callId: string, answer: any }) {
    this.server.to(`user:${data.targetId}`).emit('webrtc:answer', {
      from: client.userId,
      callId: data.callId,
      answer: data.answer
    });
  }

  @SubscribeMessage('webrtc:ice')
  handleWebrtcIce(@ConnectedSocket() client: any, @MessageBody() data: { targetId: string, callId: string, candidate: any }) {
    this.server.to(`user:${data.targetId}`).emit('webrtc:ice', {
      from: client.userId,
      callId: data.callId,
      candidate: data.candidate
    });
  }

  @SubscribeMessage('call:leave')
  handleCallLeave(@ConnectedSocket() client: any, @MessageBody() data: { callId: string }) {
    client.leave(`call:${data.callId}`);
    this.server.to(`call:${data.callId}`).emit('call:peer-left', { userId: client.userId });
  }

  @SubscribeMessage('screen:share')
  handleScreenShare(@ConnectedSocket() client: any, @MessageBody() data: { callId: string, sharing: boolean }) {
    this.server.to(`call:${data.callId}`).emit('screen:share', {
      userId: client.userId,
      sharing: data.sharing
    });
  }
}