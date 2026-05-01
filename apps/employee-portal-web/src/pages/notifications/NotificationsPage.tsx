import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, MessageSquare, Megaphone, Settings2, CheckCheck,
  Banknote, CalendarDays, Clock, FileText, TrendingUp,
  Receipt, Pin, ChevronRight, Send, ArrowLeft,
  Mail, Smartphone, Monitor, Check,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

import rawNotifications from '@/data/mock/notifications.json';
import rawAnnouncements from '@/data/mock/announcements.json';
import messagesData from '@/data/mock/messages.json';
import prefData from '@/data/mock/email-preferences.json';

// ─── types ───────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  date: string;
  author: string;
  pinned: boolean;
}

interface Message {
  id: string;
  from: 'employee' | 'hr';
  sender?: string;
  text: string;
  time: string;
}

interface Thread {
  id: string;
  subject: string;
  with: string;
  withAvatar: string;
  lastMessage: string;
  lastTime: string;
  unread: boolean;
  messages: Message[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  payroll:      <Banknote className="w-4 h-4 text-green-600" />,
  leave:        <CalendarDays className="w-4 h-4 text-blue-600" />,
  attendance:   <Clock className="w-4 h-4 text-amber-600" />,
  performance:  <TrendingUp className="w-4 h-4 text-purple-600" />,
  expense:      <Receipt className="w-4 h-4 text-orange-600" />,
  document:     <FileText className="w-4 h-4 text-indigo-600" />,
  announcement: <Megaphone className="w-4 h-4 text-rose-600" />,
};

const NOTIF_BG: Record<string, string> = {
  payroll:      'bg-green-100 dark:bg-green-900/30',
  leave:        'bg-blue-100 dark:bg-blue-900/30',
  attendance:   'bg-amber-100 dark:bg-amber-900/30',
  performance:  'bg-purple-100 dark:bg-purple-900/30',
  expense:      'bg-orange-100 dark:bg-orange-900/30',
  document:     'bg-indigo-100 dark:bg-indigo-900/30',
  announcement: 'bg-rose-100 dark:bg-rose-900/30',
};

const ANN_CATEGORY_COLORS: Record<string, string> = {
  holiday:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  event:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  benefits: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  payroll:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  policy:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  wellness: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  general:  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

function timeAgo(iso: string) {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`} style={style}>
      {children}
    </div>
  );
}

// ─── TAB: NOTIFICATIONS ──────────────────────────────────────────────────────

const NOTIF_FILTERS = ['All', 'Unread', 'payroll', 'leave', 'attendance', 'performance', 'expense', 'document', 'announcement'] as const;

function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>(rawNotifications as Notification[]);
  const [filter, setFilter] = useState<string>('All');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.read;
    return n.type === filter;
  });

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{unreadCount} unread</span>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-brand-blue hover:opacity-80 transition-opacity"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {NOTIF_FILTERS.slice(0, 5).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-brand-blue text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        {NOTIF_FILTERS.slice(5).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-brand-blue text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No notifications</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((n, i) => (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => markRead(n.id)}
                className={`flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  !n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${NOTIF_BG[n.type] ?? 'bg-gray-100 dark:bg-gray-700'}`}>
                  {NOTIF_ICONS[n.type] ?? <Bell className="w-4 h-4 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.time)}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ─── TAB: MESSAGES ───────────────────────────────────────────────────────────

function MessagesTab() {
  const [threads, setThreads] = useState<Thread[]>(messagesData.threads as Thread[]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  function openThread(thread: Thread) {
    setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, unread: false } : t)));
    setActiveThread({ ...thread, unread: false });
    setComposing(false);
  }

  function sendMessage() {
    if (!draft.trim() || !activeThread) return;
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      from: 'employee',
      text: draft.trim(),
      time: new Date().toISOString(),
    };
    const updated = { ...activeThread, messages: [...activeThread.messages, newMsg], lastMessage: newMsg.text, lastTime: newMsg.time };
    setActiveThread(updated);
    setThreads((prev) => prev.map((t) => (t.id === activeThread.id ? updated : t)));
    setDraft('');
  }

  function startNewMessage() {
    setComposing(true);
    setActiveThread(null);
  }

  function sendNewMessage() {
    if (!newSubject.trim() || !newBody.trim()) return;
    const newThread: Thread = {
      id: `thread-${Date.now()}`,
      subject: newSubject.trim(),
      with: 'HR Department',
      withAvatar: 'HR',
      lastMessage: newBody.trim(),
      lastTime: new Date().toISOString(),
      unread: false,
      messages: [
        {
          id: `msg-${Date.now()}`,
          from: 'employee',
          text: newBody.trim(),
          time: new Date().toISOString(),
        },
      ],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThread(newThread);
    setComposing(false);
    setNewSubject('');
    setNewBody('');
  }

  if (composing) {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
          <button type="button" aria-label="Go back" onClick={() => setComposing(false)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="font-semibold text-gray-900 dark:text-white">New Message to HR</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Subject</label>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="What is this about?"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Message</label>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Type your message..."
              rows={6}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setComposing(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={sendNewMessage}
              disabled={!newSubject.trim() || !newBody.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </Card>
    );
  }

  if (activeThread) {
    return (
      <Card className="overflow-hidden flex flex-col" style={{ minHeight: '60vh' }}>
        {/* Thread header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
          <button type="button" aria-label="Back to inbox" onClick={() => setActiveThread(null)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-brand-blue/10 flex items-center justify-center text-xs font-bold text-brand-blue shrink-0">
            {activeThread.withAvatar}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{activeThread.with}</p>
            <p className="text-xs text-gray-500">{activeThread.subject}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
          {activeThread.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.from === 'employee' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.from === 'employee' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {msg.from === 'hr' && (
                  <p className="text-xs text-gray-400 px-1">{msg.sender}</p>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.from === 'employee'
                    ? 'bg-brand-blue text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
                <p className="text-xs text-gray-400 px-1">
                  {format(parseISO(msg.time), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a reply..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
          />
          <button
            type="button"
            aria-label="Send reply"
            onClick={sendMessage}
            disabled={!draft.trim()}
            className="px-4 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{threads.filter((t) => t.unread).length} unread</p>
        <button
          onClick={startNewMessage}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-brand-blue/90 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          New Message
        </button>
      </div>

      <Card>
        {threads.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No messages yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {threads.map((thread, i) => (
              <motion.li
                key={thread.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => openThread(thread)}
                className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  thread.unread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-xs font-bold text-brand-blue shrink-0">
                  {thread.withAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-sm font-medium truncate ${thread.unread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {thread.subject}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(thread.lastTime)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{thread.lastMessage}</p>
                </div>
                <div className="flex items-center gap-2">
                  {thread.unread && <span className="w-2 h-2 rounded-full bg-brand-blue" />}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ─── TAB: ANNOUNCEMENTS ──────────────────────────────────────────────────────

const ANN_CATEGORIES = ['All', 'holiday', 'event', 'benefits', 'payroll', 'policy', 'wellness', 'general'] as const;

function AnnouncementsTab() {
  const [catFilter, setCatFilter] = useState<string>('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const announcements: Announcement[] = rawAnnouncements as Announcement[];

  const filtered = announcements.filter((a) => catFilter === 'All' || a.category === catFilter);
  const pinned = filtered.filter((a) => a.pinned);
  const rest = filtered.filter((a) => !a.pinned);

  function AnnCard({ ann }: { ann: Announcement }) {
    const isOpen = expanded === ann.id;
    return (
      <motion.div
        layout
        className={`border rounded-2xl overflow-hidden transition-colors ${
          ann.pinned
            ? 'border-brand-blue/30 bg-blue-50/50 dark:bg-blue-900/10 dark:border-brand-blue/20'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }`}
      >
        <button
          onClick={() => setExpanded(isOpen ? null : ann.id)}
          className="w-full flex items-start gap-3 p-4 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {ann.pinned && (
                <span className="flex items-center gap-1 text-xs font-semibold text-brand-blue">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ANN_CATEGORY_COLORS[ann.category] ?? ANN_CATEGORY_COLORS.general}`}>
                {ann.category.charAt(0).toUpperCase() + ann.category.slice(1)}
              </span>
            </div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{ann.title}</p>
            <p className="text-xs text-gray-400 mt-1">{ann.author} · {format(parseISO(ann.date), 'MMM d, yyyy')}</p>
          </div>
          <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
          </motion.span>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
                {ann.body}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {ANN_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              catFilter === c
                ? 'bg-brand-blue text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {c === 'All' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="py-16 text-center text-gray-400">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No announcements</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pinned.map((a) => <AnnCard key={a.id} ann={a} />)}
          {rest.map((a) => <AnnCard key={a.id} ann={a} />)}
        </div>
      )}
    </div>
  );
}

// ─── TAB: PREFERENCES ────────────────────────────────────────────────────────

interface PrefState {
  channels: { email: boolean; inApp: boolean; sms: boolean };
  categories: Record<string, { label: string; email: boolean; inApp: boolean }>;
}

function Toggle({ checked, onChange, label = 'Toggle' }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${checked ? 'bg-brand-blue' : 'bg-gray-200 dark:bg-gray-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0'}`} />
    </button>
  );
}

function PreferencesTab() {
  const [prefs, setPrefs] = useState<PrefState>(prefData as PrefState);
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const CHANNELS = [
    { key: 'email' as const,  label: 'Email Notifications', icon: <Mail className="w-4 h-4" />, desc: 'Receive updates via company email' },
    { key: 'inApp' as const,  label: 'In-App Notifications', icon: <Monitor className="w-4 h-4" />, desc: 'Show notifications in the portal' },
    { key: 'sms'   as const,  label: 'SMS Alerts', icon: <Smartphone className="w-4 h-4" />, desc: 'Text alerts to your registered mobile' },
  ];

  return (
    <div className="space-y-5">
      {/* Global channels */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notification Channels</h3>
        <div className="space-y-4">
          {CHANNELS.map((ch) => (
            <div key={ch.key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                  {ch.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{ch.label}</p>
                  <p className="text-xs text-gray-400">{ch.desc}</p>
                </div>
              </div>
              <Toggle
                checked={prefs.channels[ch.key]}
                onChange={(v) => setPrefs((p) => ({ ...p, channels: { ...p.channels, [ch.key]: v } }))}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Per-category */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Category Preferences</h3>
        <p className="text-xs text-gray-400 mb-4">Choose which events you want to be notified about</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left py-2 pr-4">Category</th>
                <th className="text-center py-2 px-4">Email</th>
                <th className="text-center py-2 px-4">In-App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {Object.entries(prefs.categories).map(([key, cat]) => (
                <tr key={key}>
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{cat.label}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center">
                      <Toggle
                        checked={cat.email && prefs.channels.email}
                        onChange={(v) =>
                          setPrefs((p) => ({
                            ...p,
                            categories: { ...p.categories, [key]: { ...p.categories[key], email: v } },
                          }))
                        }
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center">
                      <Toggle
                        checked={cat.inApp && prefs.channels.inApp}
                        onChange={(v) =>
                          setPrefs((p) => ({
                            ...p,
                            categories: { ...p.categories, [key]: { ...p.categories[key], inApp: v } },
                          }))
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={save}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-brand-blue/90 transition-colors"
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}

// ─── ROOT PAGE ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'messages',      label: 'Messages',      icon: MessageSquare },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'preferences',   label: 'Preferences',   icon: Settings2 },
] as const;

type TabId = typeof TABS[number]['id'];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('notifications');

  const unreadNotifs = (rawNotifications as Notification[]).filter((n) => !n.read).length;
  const unreadMessages = messagesData.threads.filter((t) => t.unread).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications & Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Stay updated with all activity across your portal</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const badge = tab.id === 'notifications' ? unreadNotifs : tab.id === 'messages' ? unreadMessages : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center relative ${
                active
                  ? 'bg-white dark:bg-gray-700 text-brand-blue shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'messages'      && <MessagesTab />}
          {activeTab === 'announcements' && <AnnouncementsTab />}
          {activeTab === 'preferences'   && <PreferencesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
