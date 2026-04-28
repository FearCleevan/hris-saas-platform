import { useState } from 'react';
import { Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { useChatStore, type ChatMessage as ChatMessageType } from '@/store/chatStore';

interface Props {
  message: ChatMessageType;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br />');
}

export function ChatMessage({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const { rateMessage } = useChatStore();

  const isUser = message.role === 'user';

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1.5">
        <div className="max-w-[80%]">
          <div className="bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
          <p className="text-right text-[10px] text-gray-400 dark:text-gray-500 mt-1 pr-1">
            {format(message.timestamp, 'h:mm a')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 px-4 py-1.5">
      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-sm shrink-0 mt-0.5">
        🤖
      </div>
      <div className="max-w-[85%]">
        <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm border border-gray-100 dark:border-gray-700">
          <p
            className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        </div>
        <div className="flex items-center gap-2 mt-1 pl-1">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {format(message.timestamp, 'h:mm a')}
          </span>
          {message.id !== 'welcome' && (
            <>
              <button
                onClick={copy}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Copy"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              <button
                onClick={() => rateMessage(message.id, 'up')}
                className={`transition-colors ${message.rating === 'up' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
                title="Helpful"
              >
                <ThumbsUp size={12} />
              </button>
              <button
                onClick={() => rateMessage(message.id, 'down')}
                className={`transition-colors ${message.rating === 'down' ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
                title="Not helpful"
              >
                <ThumbsDown size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
