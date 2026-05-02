import { useState, useCallback, useRef } from 'react';

export type MessageRole = 'user' | 'assistant' | 'error';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  sources?: string[];
  chunksUsed?: number;
  isFinanceTopic?: boolean;
  timestamp: Date;
}

interface ChatApiResponse {
  answer: string;
  sources: string[];
  chunksUsed: number;
  isFinanceTopic: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useFinanceAI() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const abortRef                  = useRef<AbortController | null>(null);

  const historyPayload = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id:        uid(),
      role:      'user',
      content:   text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/finance-ai/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text.trim(), history: historyPayload }),
        signal:  abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Server error' }));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }

      const data: ChatApiResponse = await res.json();

      const aiMsg: Message = {
        id:             uid(),
        role:           'assistant',
        content:        data.answer,
        sources:        data.sources,
        chunksUsed:     data.chunksUsed,
        isFinanceTopic: data.isFinanceTopic,
        timestamp:      new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errMsg = err.message ?? 'Failed to reach the Finance AI service.';
      setError(errMsg);
      setMessages(prev => [
        ...prev,
        {
          id:        uid(),
          role:      'error',
          content:   errMsg,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, historyPayload]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return { messages, loading, error, sendMessage, clearChat, cancelRequest };
}
