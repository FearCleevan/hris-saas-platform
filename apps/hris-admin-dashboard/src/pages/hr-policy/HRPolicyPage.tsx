import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Send, Loader2, Bot, User, Search, ChevronRight,
  Copy, Check, RefreshCw, Trash2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { getGeminiClient, GEMINI_MODEL, isGeminiAvailable } from '@/lib/gemini';
import type { ChatSession } from '@google/generative-ai';
import leaveTypesData from '@/data/mock/leave-types.json';
import doleData from '@/data/mock/compliance-dole.json';
import employeesData from '@/data/mock/employees.json';

/* ─── Types ─── */
interface LeaveType { id: string; code: string; name: string; daysPerYear: number; isPaid: boolean; isMonetizable: boolean; requiresDocuments: boolean; documentNote: string; maxCarryOver: number; description: string; color: string; }
interface DoleItem { id: string; requirement: string; category: string; status: string; frequency: string; notes: string; }
interface Message { id: string; role: 'user' | 'assistant'; content: string; }
interface PolicyCard { id: string; title: string; category: string; summary: string; question: string; icon: string; }

/* ─── Static Policy Library ─── */
const POLICY_CARDS: PolicyCard[] = [
  { id: 'p1', category: 'Leave',       icon: '🏖️', title: 'Vacation Leave Entitlement',    summary: '15 days VL per year, monetizable, max 15-day carry-over', question: 'How many vacation leave days are employees entitled to, and can unused VL be monetized?' },
  { id: 'p2', category: 'Leave',       icon: '🤒', title: 'Sick Leave Policy',              summary: '15 days SL per year; medical cert required for 3+ consecutive days', question: 'What is the sick leave policy? When is a medical certificate required?' },
  { id: 'p3', category: 'Leave',       icon: '⚖️', title: 'Service Incentive Leave',        summary: '5 days mandatory SIL under the Labor Code, convertible to cash', question: 'What is Service Incentive Leave and who is entitled to it under Philippine law?' },
  { id: 'p4', category: 'Leave',       icon: '👶', title: 'Maternity & Paternity Leave',    summary: '105 days ML (RA 11210), 7 days PL (RA 8187)', question: 'How many maternity and paternity leave days are employees entitled to under Philippine law?' },
  { id: 'p5', category: 'Leave',       icon: '👩‍⚕️', title: 'Magna Carta Leave for Women',  summary: '2 months special leave for gynecological conditions (RA 9710)', question: 'What is the Magna Carta leave for women and who can avail it?' },
  { id: 'p6', category: 'Labor Law',   icon: '🏦', title: 'SSS Contribution Rates',         summary: 'Employee 4.5%, Employer 9.5% of MSC — updated 2023 schedule', question: 'What are the current SSS contribution rates for employers and employees in the Philippines?' },
  { id: 'p7', category: 'Labor Law',   icon: '🏥', title: 'PhilHealth Premium Rates',       summary: '5% of basic salary split equally (employee/employer), max ₱5,000/mo total', question: 'What are the current PhilHealth premium rates and how are they computed?' },
  { id: 'p8', category: 'Labor Law',   icon: '🏡', title: 'Pag-IBIG / HDMF Contributions', summary: '2% employee, 2% employer for salaries above ₱5,000', question: 'What are Pag-IBIG contribution rates and what are the benefits employees can avail?' },
  { id: 'p9', category: 'Tax',         icon: '📋', title: 'BIR TRAIN Law Tax Brackets',     summary: '0% on first ₱250,000 annual income; escalating brackets up to 35%', question: 'What are the income tax brackets under the TRAIN Law and how is withholding tax computed?' },
  { id: 'p10', category: 'Tax',        icon: '💳', title: '13th Month Pay',                 summary: 'Mandatory for rank-and-file employees; 1/12 of total basic salary earned', question: 'How is the 13th month pay computed and what is the deadline for payment?' },
  { id: 'p11', category: 'DOLE',       icon: '⚙️', title: 'Probationary Employment',        summary: 'Max 6 months probationary period; regularization after successful period', question: 'What is the maximum probationary period under Philippine labor law and what are the employee rights?' },
  { id: 'p12', category: 'DOLE',       icon: '📜', title: 'Overtime Pay Rules',              summary: '25% premium for OT; 30% on rest days/holidays', question: 'What are the overtime pay rules and premium rates for regular work days, rest days, and holidays?' },
  { id: 'p13', category: 'DOLE',       icon: '🏛️', title: 'Night Differential',             summary: '10% additional pay for work between 10 PM and 6 AM', question: 'What is the night differential rate and who is entitled to it under Philippine law?' },
  { id: 'p14', category: 'DOLE',       icon: '🚫', title: 'Termination & Due Process',      summary: 'Just and authorized causes; twin-notice rule required', question: 'What are the grounds for termination and what is the twin-notice rule under Philippine labor law?' },
  { id: 'p15', category: 'Privacy',    icon: '🔒', title: 'Data Privacy Act Compliance',    summary: 'RA 10173 — employee data must be collected with consent and kept secure', question: 'What are the obligations of the company under the Data Privacy Act regarding employee data?' },
  { id: 'p16', category: 'Privacy',    icon: '📁', title: '201 File Requirements',          summary: 'Mandatory employee records: contract, TIN, SSS, PhilHealth, Pag-IBIG IDs', question: 'What documents must be included in the employee 201 file under Philippine law?' },
];

const CATEGORIES = ['All', 'Leave', 'Labor Law', 'Tax', 'DOLE', 'Privacy'];

/* ─── Helpers ─── */
function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 px-1 rounded">$1</code>')
    .replace(/^### (.*$)/gm, '<p class="font-bold text-sm mt-3 mb-1">$1</p>')
    .replace(/^## (.*$)/gm, '<p class="font-bold text-sm mt-3 mb-1">$1</p>')
    .replace(/^# (.*$)/gm, '<p class="font-bold text-sm mt-3 mb-1">$1</p>')
    .replace(/^[-•] (.*$)/gm, '<div class="flex gap-2 my-0.5"><span class="text-indigo-400 mt-0.5 shrink-0">•</span><span>$1</span></div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

/* ─── Main Page ─── */
export default function HRPolicyPage() {
  const leaveTypes = leaveTypesData as LeaveType[];
  const doleItems  = doleData as DoleItem[];

  /* ─── Policy Library State ─── */
  const [catFilter,  setCatFilter]  = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPolicies = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return POLICY_CARDS.filter(p => {
      if (catFilter !== 'All' && p.category !== catFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.summary.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catFilter, searchQuery]);

  /* ─── Chat State ─── */
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState<string | null>(null);
  const chatSession = useRef<ChatSession | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Build system prompt */
  const buildSystemPrompt = () => {
    const leaveLines = leaveTypes.map(l =>
      `${l.code} (${l.name}): ${l.daysPerYear} days/yr, paid=${l.isPaid}, monetizable=${l.isMonetizable}, carry-over max=${l.maxCarryOver}d. ${l.description}`
    ).join('\n');

    const doleLines = doleItems.map(d =>
      `[${d.category}] ${d.requirement} — Status: ${d.status} (${d.frequency}). ${d.notes}`
    ).join('\n');

    const active   = employeesData.filter(e => e.status === 'active').length;
    const regular  = employeesData.filter(e => e.type === 'regular').length;
    const proby    = employeesData.filter(e => e.type === 'probationary').length;
    const contract = employeesData.filter(e => e.type === 'contractual').length;

    return `You are an expert HR Policy Assistant for a Philippine company called HRIS Solutions Inc. You answer questions about:
- Philippine labor law (Labor Code, special laws)
- Company HR policies (leave entitlements, benefits, procedures)
- DOLE compliance requirements
- Tax obligations (TRAIN Law, BIR)
- SSS, PhilHealth, Pag-IBIG contributions
- Data Privacy Act (RA 10173) compliance

COMPANY DATA:
- Active employees: ${active} (${regular} regular, ${proby} probationary, ${contract} contractual)

COMPANY LEAVE POLICIES:
${leaveLines}

DOLE COMPLIANCE STATUS:
${doleLines}

IMPORTANT RULES:
- Always cite the specific law or DOLE issuance (e.g., "under Article 95 of the Labor Code", "per RA 11210")
- Be specific — include exact numbers, rates, and deadlines
- Use Philippine peso (₱) for monetary amounts
- Format responses clearly with bullet points or numbered lists where helpful
- If uncertain about a very recent change, say so and recommend checking with DOLE/BIR
- Keep responses focused and practical — HR officers need actionable answers`;
  };

  const initChat = () => {
    if (!isGeminiAvailable()) return null;
    const client = getGeminiClient();
    if (!client) return null;
    const model = client.getGenerativeModel({ model: GEMINI_MODEL });
    return model.startChat({
      history: [
        { role: 'user',  parts: [{ text: buildSystemPrompt() }] },
        { role: 'model', parts: [{ text: 'Hello! I\'m your HR Policy Assistant. I can help you with Philippine labor law, leave entitlements, DOLE compliance, tax obligations, and company HR policies. What would you like to know?' }] },
      ],
    });
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!isGeminiAvailable()) {
      toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env');
      return;
    }

    if (!chatSession.current) {
      chatSession.current = initChat();
    }
    if (!chatSession.current) {
      toast.error('Could not initialize AI session');
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await chatSession.current.sendMessage(trimmed);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response.text(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        toast.error('Rate limit reached. Please wait a moment and try again.');
      } else {
        toast.error(`AI error: ${msg}`);
      }
      chatSession.current = null;
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    chatSession.current = null;
    toast.success('Chat cleared');
  };

  const handlePolicyClick = (card: PolicyCard) => {
    setInput(card.question);
    inputRef.current?.focus();
  };

  /* ─── Render ─── */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">HR Policy Q&A</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Philippine labor law · Leave policies · DOLE compliance · Tax obligations — powered by Gemini
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Trash2 size={13} />Clear Chat
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-220px)] min-h-[500px]">

        {/* ─── Left: Policy Library ─── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Policy Library</p>
            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search policies…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-7 pl-7 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-indigo-400"
              />
            </div>
            {/* Category filter chips */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatFilter(cat)}
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                    catFilter === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Policy cards list */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {filteredPolicies.length === 0 && (
              <p className="text-center py-8 text-xs text-gray-400">No policies match your search</p>
            )}
            {filteredPolicies.map(card => (
              <button
                key={card.id}
                type="button"
                onClick={() => handlePolicyClick(card)}
                className="w-full text-left p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/10 transition-all group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-base shrink-0 mt-0.5">{card.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{card.title}</p>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 shrink-0">{card.category}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-snug">{card.summary}</p>
                  </div>
                  <ChevronRight size={12} className="text-gray-300 dark:text-gray-700 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Right: Q&A Chat ─── */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
              <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">HR Policy Assistant</p>
              <p className="text-[10px] text-gray-400">Powered by Gemini · Philippine labor law · DOLE · BIR · SSS</p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={clearChat} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <RefreshCw size={11} />New session
              </button>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Welcome state */}
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 py-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                  <BookOpen size={24} className="text-indigo-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Ask anything about HR policy</p>
                  <p className="text-xs text-gray-400 mt-1">Click a policy card on the left or type your question below</p>
                </div>
                {/* Quick starts */}
                <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                  {[
                    'How many leave days are employees entitled to?',
                    'What are the SSS contribution rates?',
                    'How is 13th month pay computed?',
                    'What is the twin-notice rule?',
                  ].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="text-[10px] px-2.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors font-medium"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-[#0038a8] text-white'
                    : 'bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'
                }`}>
                  {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-indigo-600 dark:text-indigo-400" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] group ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0038a8] text-white rounded-tr-md'
                      : 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-md'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div
                        className="text-xs leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    ) : (
                      <p className="text-xs">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 px-1"
                    >
                      {copied === msg.id ? <Check size={10} /> : <Copy size={10} />}
                      {copied === msg.id ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
                  <Bot size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center gap-1">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            {!isGeminiAvailable() && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">
                Configure <code className="font-mono text-[11px]">VITE_GEMINI_API_KEY</code> in .env to enable AI Q&A
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ask about leave policies, DOLE rules, tax obligations…"
                disabled={loading || !isGeminiAvailable()}
                className="flex-1 h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim() || !isGeminiAvailable()}
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors shrink-0"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              AI responses are for guidance only. Consult DOLE or legal counsel for compliance decisions.
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
