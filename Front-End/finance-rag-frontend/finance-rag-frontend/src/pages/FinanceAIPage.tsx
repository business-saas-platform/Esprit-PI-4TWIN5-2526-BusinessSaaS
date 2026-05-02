/**
 * FinanceAIPage.tsx
 * 
 * Example of how to embed the FinanceAI component inside
 * your existing platform layout as a full page/section.
 * 
 * Drop this into your React router as:
 *   <Route path="/finance-ai" element={<FinanceAIPage />} />
 */

import { FinanceAI } from '../components/FinanceAI';

export function FinanceAIPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',        // fills whatever container your platform provides
      padding: '24px',
      gap: '16px',
      boxSizing: 'border-box',
    }}>

      {/* Optional page header — matches your platform's style */}
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
          Finance AI Assistant
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.6 }}>
          Ask questions about your invoices, payments, and financial data.
        </p>
      </div>

      {/* The chat component — fills remaining height */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <FinanceAI />
      </div>

    </div>
  );
}
