import { create } from 'zustand';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  rating?: 'up' | 'down' | null;
}

interface ChatStore {
  isOpen: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
  unreadCount: number;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  addMessage: (role: MessageRole, content: string) => void;
  setTyping: (typing: boolean) => void;
  rateMessage: (id: string, rating: 'up' | 'down') => void;
  clearHistory: () => void;
  markRead: () => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your **HRIS Assistant**, powered by Gemini AI. I can answer HR questions, pull data from your system, draft announcements, and navigate to any page.\n\nTry asking me something or use the quick actions below!",
  timestamp: new Date(),
  rating: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  messages: [WELCOME],
  isTyping: false,
  unreadCount: 0,

  setOpen: (open) =>
    set((s) => ({
      isOpen: open,
      unreadCount: open ? 0 : s.unreadCount,
    })),

  toggleOpen: () =>
    set((s) => ({
      isOpen: !s.isOpen,
      unreadCount: !s.isOpen ? 0 : s.unreadCount,
    })),

  addMessage: (role, content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: uid(), role, content, timestamp: new Date(), rating: null },
      ],
      unreadCount: role === 'assistant' && !s.isOpen ? s.unreadCount + 1 : s.unreadCount,
    })),

  setTyping: (typing) => set({ isTyping: typing }),

  rateMessage: (id, rating) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, rating } : m)),
    })),

  clearHistory: () => set({ messages: [WELCOME], unreadCount: 0 }),

  markRead: () => set({ unreadCount: 0 }),
}));
