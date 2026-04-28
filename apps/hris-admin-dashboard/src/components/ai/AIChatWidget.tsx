import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Trash2, BotMessageSquare } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { getGeminiClient, GEMINI_MODEL, isGeminiAvailable } from '@/lib/gemini';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { QuickActionChips } from './QuickActionChips';

// Mock data imports for AI context
import employees from '@/data/mock/employees.json';
import leaveRequests from '@/data/mock/leave-requests.json';
import pendingApprovals from '@/data/mock/pending-approvals.json';
import payrollRuns from '@/data/mock/payroll-runs.json';
import activities from '@/data/mock/activities.json';
import overtimeRequests from '@/data/mock/overtime-requests.json';

function buildSystemPrompt(tenantName: string): string {
  const today = new Date().toISOString().split('T')[0];
  const activeEmployees = employees.filter((e) => e.status === 'active');
  const deptCounts = activeEmployees.reduce<Record<string, number>>((acc, e) => {
    acc[e.department] = (acc[e.department] || 0) + 1;
    return acc;
  }, {});
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending');
  const latestPayroll = payrollRuns[payrollRuns.length - 1];
  const pendingCount = pendingApprovals.length;
  const pendingOT = overtimeRequests.filter((o: { status: string }) => o.status === 'pending').length;

  const upcomingBirthdays = activeEmployees
    .filter((e) => {
      const bd = new Date(e.birthday);
      const now = new Date();
      const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
      const diff = (thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    })
    .map((e) => e.name);

  return `You are HRIS Assistant, an internal AI helper for ${tenantName} — a company using the Philippine HRIS SaaS platform. Today is ${today}.

REAL COMPANY DATA (use this to answer questions accurately):
- Total employees: ${activeEmployees.length} active out of ${employees.length} total
- Departments: ${JSON.stringify(deptCounts)}
- Pending leave requests: ${pendingLeaves.length}
- Total pending approvals: ${pendingCount} (leaves, overtime, expenses)
- Pending overtime requests: ${pendingOT}
- Latest payroll run: ${latestPayroll?.period || 'N/A'} | Gross: ₱${latestPayroll?.totalGross?.toLocaleString() || 'N/A'} | Net Pay: ₱${latestPayroll?.totalNetPay?.toLocaleString() || 'N/A'} | ${latestPayroll?.employeeCount || 0} employees
- Upcoming birthdays (next 30 days): ${upcomingBirthdays.length > 0 ? upcomingBirthdays.join(', ') : 'None'}
- Recent activities: ${activities.slice(0, 3).map((a: { message: string }) => a.message).join(' | ')}

EMPLOYEES SUMMARY (top 10 by salary):
${activeEmployees
  .sort((a, b) => b.salary - a.salary)
  .slice(0, 10)
  .map((e) => `${e.name} | ${e.position} | ${e.department} | ₱${e.salary.toLocaleString()}`)
  .join('\n')}

YOUR BEHAVIOR:
- Be professional, concise, and helpful
- Always answer in English
- Use Philippine peso (₱) for currency amounts
- When asked to navigate somewhere, respond with EXACTLY this format on its own line: NAVIGATE:/path
  Valid paths: /attendance, /employees, /leaves, /payroll, /performance, /recruitment, /benefits, /expenses, /documents, /reports, /analytics, /settings, /schedule, /onboarding, /offboarding, /hr-policy
- For content generation (announcements, memos), write professional Philippine business English
- For Philippine labor law questions, cite RA numbers or DOLE regulations when relevant
- If you don't have specific data, say so clearly — don't invent numbers
- Keep responses under 200 words unless a longer answer is truly needed
- Use **bold** for key numbers or important terms`;
}

export function AIChatWidget() {
  const navigate = useNavigate();
  const { isOpen, messages, isTyping, unreadCount, toggleOpen, setOpen, addMessage, setTyping, clearHistory } =
    useChatStore();
  const { tenant } = useAuthStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<ReturnType<typeof getGeminiClient>>(null);
  const chatSession = useRef<ReturnType<Awaited<ReturnType<NonNullable<typeof chatRef.current>['getGenerativeModel']>>['startChat']> | null>(null);

  const tenantName = tenant?.name || 'Your Company';

  const initChat = useCallback(() => {
    const client = getGeminiClient();
    if (!client || chatSession.current) return;
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: buildSystemPrompt(tenantName),
    });
    chatSession.current = model.startChat({ history: [] });
  }, [tenantName]);

  useEffect(() => {
    if (isOpen) {
      initChat();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, initChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      addMessage('user', trimmed);
      setInput('');
      setTyping(true);

      if (!isGeminiAvailable()) {
        setTimeout(() => {
          setTyping(false);
          addMessage(
            'assistant',
            '⚠️ **Gemini API key not configured.**\n\nTo enable AI features:\n1. Get a free API key at [aistudio.google.com](https://aistudio.google.com)\n2. Add `VITE_GEMINI_API_KEY=your_key` to your `.env` file\n3. Restart the dev server\n\nNo credit card required!'
          );
        }, 800);
        return;
      }

      try {
        initChat();
        if (!chatSession.current) throw new Error('Chat not initialized');

        const result = await chatSession.current.sendMessage(trimmed);
        const responseText = result.response.text();

        setTyping(false);

        // Handle navigation commands
        const navMatch = responseText.match(/NAVIGATE:(\/\S+)/);
        if (navMatch) {
          const path = navMatch[1];
          const cleanResponse = responseText.replace(/NAVIGATE:\/\S+/, '').trim();
          addMessage('assistant', cleanResponse || `Navigating to ${path}...`);
          setTimeout(() => navigate(path), 500);
        } else {
          addMessage('assistant', responseText);
        }
      } catch (err) {
        setTyping(false);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        const isQuota = msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('429');
        addMessage(
          'assistant',
          isQuota
            ? "⚠️ **Rate limit reached.** The free Gemini API allows 15 requests/minute. Please wait a moment and try again."
            : `⚠️ **Error reaching AI:** ${msg}\n\nPlease check your API key in the \`.env\` file.`
        );
      }
    },
    [isTyping, addMessage, setTyping, initChat, navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => {
    clearHistory();
    chatSession.current = null;
    initChat();
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {!isOpen && unreadCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-white dark:bg-gray-800 rounded-xl px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 max-w-[180px]"
            >
              New message from HRIS Assistant
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={toggleOpen}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center transition-colors"
          title="HRIS Assistant"
          aria-label="Toggle AI assistant"
        >
          {/* Pulsing ring */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-30" />
          )}
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X size={22} />
              </motion.span>
            ) : (
              <motion.span
                key="bot"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <BotMessageSquare size={22} />
              </motion.span>
            )}
          </AnimatePresence>
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Chat drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-120px)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
                🤖
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">HRIS Assistant</p>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[10px] text-indigo-200">Online</span>
                  </span>
                </div>
                <p className="text-[10px] text-indigo-300">Powered by Gemini AI · Free tier</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-3 space-y-0.5 scroll-smooth">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            <QuickActionChips onSelect={(text) => sendMessage(text)} />

            {/* Input */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… (Enter to send)"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none outline-none leading-relaxed max-h-24 overflow-y-auto"
                  style={{ scrollbarWidth: 'none' }}
                />
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-gray-400">{input.length}/500</span>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isTyping}
                    className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                    aria-label="Send"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 mt-1.5">
                Shift+Enter for newline · Data is for demo purposes
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
