import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useFinanceAI, Message } from './useFinanceAI';
import styles from './FinanceAI.module.css';

/* ── Suggestion chips shown on empty state ───────────────────────────── */
const SUGGESTIONS = [
  'Which clients have the highest payment delay risk?',
  'Show anomalies in recent invoices',
  'What does a high DSO indicate?',
  'Explain cash flow forecasting',
  'How to detect duplicate invoices?',
  'What is working capital?',
];

/* ── Typing dots animation component ─────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className={styles.typingBubble}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  );
}

/* ── Source pills shown under AI messages ─────────────────────────────── */
function SourcePills({ sources, chunks }: { sources: string[]; chunks: number }) {
  if (!sources?.length) return null;
  return (
    <div className={styles.sources}>
      <span className={styles.sourcesLabel}>{chunks} chunk{chunks !== 1 ? 's' : ''} from:</span>
      {sources.map(s => (
        <span key={s} className={styles.sourcePill}>{s}</span>
      ))}
    </div>
  );
}

/* ── Single message bubble ────────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: Message }) {
  const isUser  = msg.role === 'user';
  const isError = msg.role === 'error';
  const isOff   = msg.role === 'assistant' && msg.isFinanceTopic === false;

  return (
    <div className={`${styles.msgRow} ${isUser ? styles.msgRowUser : styles.msgRowAi}`}>
      {!isUser && (
        <div className={`${styles.avatar} ${isError ? styles.avatarError : styles.avatarAi}`}>
          {isError ? '!' : 'AI'}
        </div>
      )}
      <div className={styles.bubbleWrap}>
        <div
          className={`${styles.bubble} ${
            isUser  ? styles.bubbleUser  :
            isError ? styles.bubbleError :
            isOff   ? styles.bubbleOff   :
                      styles.bubbleAi
          }`}
        >
          {msg.content.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < msg.content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
        {msg.role === 'assistant' && msg.sources && (
          <SourcePills sources={msg.sources} chunks={msg.chunksUsed ?? 0} />
        )}
        <div className={styles.ts}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && <div className={`${styles.avatar} ${styles.avatarUser}`}>YOU</div>}
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────────────────── */
function EmptyState({ onSuggest }: { onSuggest: (s: string) => void }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <svg viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="currentColor" opacity=".1"/>
          <path d="M12 20h6M22 20h6M20 12v6M20 22v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 className={styles.emptyTitle}>Finance AI Assistant</h2>
      <p className={styles.emptySubtitle}>
        Ask anything about your invoices, payments, cash flow, or financial analysis.
        I only answer finance questions — grounded in your own data.
      </p>
      <div className={styles.suggestions}>
        {SUGGESTIONS.map(s => (
          <button key={s} className={styles.suggestion} onClick={() => onSuggest(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */
export function FinanceAI() {
  const { messages, loading, sendMessage, clearChat, cancelRequest } = useFinanceAI();
  const [input, setInput]   = useState('');
  const bottomRef           = useRef<HTMLDivElement>(null);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  /* auto-scroll to latest message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* auto-resize textarea */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }, [input]);

  const submit = () => {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerDot} />
          <div>
            <div className={styles.headerTitle}>Finance AI</div>
            <div className={styles.headerSub}>Powered by your financial data</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.badge}>FINANCE ONLY</span>
          {messages.length > 0 && (
            <button className={styles.clearBtn} onClick={clearChat} title="Clear chat">
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <div className={styles.messages}>
        {messages.length === 0
          ? <EmptyState onSuggest={s => { sendMessage(s); }} />
          : messages.map(m => <MessageBubble key={m.id} msg={m} />)
        }
        {loading && (
          <div className={`${styles.msgRow} ${styles.msgRowAi}`}>
            <div className={`${styles.avatar} ${styles.avatarAi}`}>AI</div>
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className={styles.inputArea}>
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask a finance question…"
            rows={1}
            disabled={loading}
          />
          <button
            className={`${styles.sendBtn} ${loading ? styles.sendBtnLoading : ''}`}
            onClick={loading ? cancelRequest : submit}
            title={loading ? 'Cancel' : 'Send'}
          >
            {loading
              ? <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><rect x="4" y="4" width="8" height="8" rx="1"/></svg>
              : <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M1 14L15 8 1 2v4.5l10 1.5-10 1.5z"/></svg>
            }
          </button>
        </div>
        <div className={styles.hint}>
          Finance-only · answers grounded in your documents · Enter to send
        </div>
      </div>
    </div>
  );
}
