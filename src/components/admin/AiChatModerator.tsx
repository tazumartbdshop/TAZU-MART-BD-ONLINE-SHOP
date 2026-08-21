import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, RefreshCw, Headphones, CheckCircle, ShieldAlert, Image as ImageIcon, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id?: string;
  sender: 'customer' | 'ai' | 'moderator';
  text: string;
  image?: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  customerName: string;
  mobileNumber: string;
  status: 'ai' | 'moderator';
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  handoffRequested?: boolean;
}

export function AiChatModerator() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/ai-chat/conversations');
      const data = await res.json();
      if (data.conversations && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        if (!selectedConvId && data.conversations.length > 0) {
          setSelectedConvId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching AI chat conversations:", err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchConversations().finally(() => setIsLoading(false));

    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConvId, conversations]);

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvId || isSending) return;

    const currentText = replyText.trim();
    setReplyText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai-chat/moderator-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConvId,
          text: currentText,
          moderatorName: 'Admin Moderator'
        })
      });

      const data = await res.json();
      if (data.conversation) {
        setConversations(prev =>
          prev.map(c => c.id === selectedConvId ? data.conversation : c)
        );
        toast.success('বার্তা সফলভাবে পাঠানো হয়েছে');
      }
    } catch (err) {
      toast.error('বার্তা পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleHandoff = async (newStatus: 'ai' | 'moderator') => {
    if (!selectedConvId) return;

    try {
      const res = await fetch('/api/ai-chat/toggle-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConvId,
          status: newStatus
        })
      });

      const data = await res.json();
      if (data.conversation) {
        setConversations(prev =>
          prev.map(c => c.id === selectedConvId ? data.conversation : c)
        );
        toast.success(`চ্যাট মোড পরিবর্তিত হয়েছে: ${newStatus === 'ai' ? 'AI Agent' : 'Human Moderator'}`);
      }
    } catch (err) {
      toast.error('মোড পরিবর্তন করতে ব্যর্থ হয়েছে');
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[650px]">
      {/* LEFT COLUMN: CONVERSATION LIST */}
      <div className="w-full md:w-80 border-r border-neutral-200 bg-neutral-50 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-neutral-900" />
            <h3 className="font-extrabold text-sm text-neutral-900 uppercase tracking-wider">AI Live Chats</h3>
          </div>
          <button
            onClick={() => fetchConversations()}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
            title="Refresh Conversations"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {conversations.map((conv) => {
            const isSelected = conv.id === selectedConvId;
            const lastMsg = conv.messages[conv.messages.length - 1];

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-neutral-950 text-white border-neutral-950 shadow-md'
                    : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs truncate max-w-[140px]">{conv.customerName}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    conv.status === 'moderator'
                      ? 'bg-amber-400 text-neutral-950'
                      : isSelected ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {conv.status === 'moderator' ? 'HUMAN' : 'AI'}
                  </span>
                </div>

                <p className={`text-[11px] font-mono mb-1 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  📞 {conv.mobileNumber}
                </p>

                {lastMsg && (
                  <p className={`text-xs truncate ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {lastMsg.sender === 'customer' ? '👤 ' : lastMsg.sender === 'moderator' ? '👨‍💼 ' : '🤖 '}
                    {lastMsg.text}
                  </p>
                )}

                <div className="mt-2 flex items-center justify-between text-[10px] opacity-70">
                  <span>{new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{conv.messages.length} msgs</span>
                </div>
              </button>
            );
          })}

          {conversations.length === 0 && (
            <div className="p-8 text-center text-xs text-neutral-400 font-medium italic">
              এখনো কোনো গ্রাহক চ্যাট শুরু করেননি।
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE CONVERSATION MESSAGES & MODERATOR REPLY */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            {/* CONVERSATION HEADER */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h4 className="font-black text-sm text-neutral-900 flex items-center gap-2">
                  {selectedConv.customerName}
                  <span className="text-xs font-mono text-neutral-500 font-medium">({selectedConv.mobileNumber})</span>
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Session ID: <span className="font-mono">{selectedConv.id}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedConv.status === 'ai' ? (
                  <button
                    onClick={() => handleToggleHandoff('moderator')}
                    className="bg-amber-400 hover:bg-amber-500 text-neutral-950 font-black text-xs px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Take Over Chat</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleHandoff('ai')}
                    className="bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Switch Back to AI</span>
                  </button>
                )}
              </div>
            </div>

            {/* MESSAGES LOG */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/30">
              {selectedConv.messages.map((msg, idx) => {
                const isCust = msg.sender === 'customer';
                const isMod = msg.sender === 'moderator';

                return (
                  <div key={msg.id || idx} className={`flex gap-2.5 ${isCust ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] flex flex-col ${isCust ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                          {isCust ? selectedConv.customerName : isMod ? 'Human Moderator' : 'AI Agent'}
                        </span>
                      </div>

                      <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed font-sans whitespace-pre-wrap ${
                        isCust
                          ? 'bg-white border border-neutral-200 text-neutral-900 rounded-tl-none shadow-sm'
                          : isMod
                          ? 'bg-amber-500 text-neutral-950 font-bold rounded-tr-none shadow-md'
                          : 'bg-neutral-950 text-white rounded-tr-none shadow-md'
                      }`}>
                        {msg.text}

                        {msg.image && (
                          <img src={msg.image} alt="Customer upload" className="mt-2 rounded-lg max-w-[200px] border" />
                        )}
                      </div>

                      <span className="text-[9px] text-neutral-400 mt-1 font-mono px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* MODERATOR INPUT FORM */}
            <form onSubmit={handleSendReply} className="p-3 border-t border-neutral-200 bg-white flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="গ্রাহককে সরাসরি রিপ্লাই লিখুন (Reply as Human Moderator)..."
                className="flex-1 bg-neutral-50 border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-950 font-medium"
              />

              <button
                type="submit"
                disabled={!replyText.trim() || isSending}
                className="bg-neutral-950 hover:bg-neutral-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-40"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="m-auto text-center p-8 text-neutral-400">
            <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold uppercase tracking-wider">Please select a conversation from the left</p>
          </div>
        )}
      </div>
    </div>
  );
}
