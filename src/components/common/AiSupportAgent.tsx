import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageSquare, X, Send, Image as ImageIcon, User, Phone, Sparkles, UserCheck, ArrowRight, RefreshCw, ShoppingBag, CheckCircle, Headphones, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  stock: number;
  image?: string;
  category?: string;
  link?: string;
}

interface Message {
  id: string;
  sender: 'customer' | 'ai' | 'moderator';
  text: string;
  image?: string;
  products?: RecommendedProduct[];
  timestamp: number;
}

interface UserProfile {
  name: string;
  mobile: string;
}

export function AiSupportAgent() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');

  // Chat State
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHandoff, setIsHandoff] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load stored profile and conversation session on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('tazumart_ai_customer');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.name && parsed.mobile) {
          setUserProfile(parsed);
          setFormName(parsed.name);
          setFormMobile(parsed.mobile);
        }
      }

      const storedConvId = localStorage.getItem('tazumart_ai_conv_id');
      if (storedConvId) {
        setConversationId(storedConvId);
      } else {
        const newConvId = `conv_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        setConversationId(newConvId);
        localStorage.setItem('tazumart_ai_conv_id', newConvId);
      }
    } catch (e) {
      console.error("Error loading stored AI agent profile:", e);
    }
  }, []);

  // Initialize greeting message when user profile is verified
  useEffect(() => {
    if (userProfile && messages.length === 0) {
      const initialGreeting: Message = {
        id: `msg_welcome_${Date.now()}`,
        sender: 'ai',
        text: `হ্যালো ${userProfile.name}! TAZU MART BD AI Support Agent-এ আপনাকে স্বাগতম 🌸\n\nআমাদের ফ্যাশন ও লাইফস্টাইল কালেকশন, অর্ডার প্রসেস, ডেলিভারি চার্জ কিংবা কোনো প্রোডাক্ট অনুসন্ধান করতে চাইলে আমাকে লিখুন বা ছবি দিয়ে সার্চ করুন!`,
        timestamp: Date.now()
      };
      setMessages([initialGreeting]);
    }
  }, [userProfile]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleOpenClick = () => {
    if (!userProfile) {
      setIsModalOpen(true);
    } else {
      setIsOpen(true);
    }
  };

  const handleVerifyAndStart = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    const cleanMobile = formMobile.trim();

    if (!cleanName) {
      toast.error('অনুগ্রহ করে আপনার নাম লিখুন');
      return;
    }

    if (!cleanMobile || cleanMobile.length < 10) {
      toast.error('অনুগ্রহ করে একটি সঠিক ১০/১১ ডিজিটের মোবাইল নম্বর দিন');
      return;
    }

    const profile: UserProfile = { name: cleanName, mobile: cleanMobile };
    setUserProfile(profile);
    localStorage.setItem('tazumart_ai_customer', JSON.stringify(profile));

    setIsModalOpen(false);
    setIsOpen(true);
    toast.success('ভেরিফিকেশন সফল হয়েছে! চ্যাট শুরু করতে পারেন।');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ছবি সাইজ সর্বোচ্চ 5MB হতে পারবে');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || isLoading || !userProfile) return;

    const currentText = inputText.trim();
    const currentImage = attachedImage;

    // Reset input fields
    setInputText('');
    setAttachedImage(null);

    const userMessage: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'customer',
      text: currentText,
      image: currentImage || undefined,
      timestamp: Date.now()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: userProfile.name,
          mobileNumber: userProfile.mobile,
          conversationId,
          messages: nextMessages.map(m => ({
            role: m.sender === 'customer' ? 'user' : 'assistant',
            content: m.text,
            image: m.image
          })),
          image: currentImage
        })
      });

      const data = await response.json();

      if (data.handoffRequested) {
        setIsHandoff(true);
      }

      const aiMessage: Message = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: data.reply || 'ধন্যবাদ আপনার মেসেজের জন্য।',
        products: data.products || [],
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error("AI Chat send error:", err);
      const errorMessage: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'ai',
        text: 'দুঃখিত, সংযোগ স্থাপন করতে সমস্যা হচ্ছে। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন বা সরাসরি আমাদের কাস্টমার কেয়ারে নক দিন।',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestHumanSupport = async () => {
    if (!userProfile) return;
    setIsLoading(true);

    const userHandoffMsg: Message = {
      id: `msg_handoff_req_${Date.now()}`,
      sender: 'customer',
      text: 'আমি একজন প্রতিনিধি / Human Support সাথে কথা বলতে চাই।',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userHandoffMsg]);

    try {
      await fetch('/api/ai-chat/toggle-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          status: 'moderator'
        })
      });

      setIsHandoff(true);

      const confirmMsg: Message = {
        id: `msg_mod_ack_${Date.now()}`,
        sender: 'ai',
        text: 'আপনার অনুরোধটি গ্রহণ করা হয়েছে। একজন প্রতিনিধি শীঘ্রই আপনার চ্যাটে যুক্ত হবেন। অনুগ্রহ করে কিছু সময় অপেক্ষা করুন।',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, confirmMsg]);
      toast.success('হিউম্যান প্রতিনিধির সাথে কানেক্ট করা হচ্ছে');
    } catch (err) {
      toast.error('অনুরোধ পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    const newConvId = `conv_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    setConversationId(newConvId);
    localStorage.setItem('tazumart_ai_conv_id', newConvId);
    setIsHandoff(false);

    if (userProfile) {
      setMessages([{
        id: `msg_welcome_${Date.now()}`,
        sender: 'ai',
        text: `হ্যালো ${userProfile.name}! চ্যাট রিসেট করা হয়েছে। কীভাবে সাহায্য করতে পারি বলুন!`,
        timestamp: Date.now()
      }]);
    } else {
      setMessages([]);
    }
    toast.success('নতুন চ্যাট সেশন শুরু হয়েছে');
  };

  return (
    <>
      {/* 1. FLOATING AGENT BUTTON */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[9990] flex flex-col items-end gap-2">
        <button
          onClick={handleOpenClick}
          className="group relative flex items-center gap-2.5 bg-neutral-950 hover:bg-neutral-900 text-white font-sans px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-neutral-800"
          aria-label="Open AI Support Agent"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-neutral-800 text-amber-400">
            <Bot className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-neutral-950 rounded-full"></span>
          </div>

          <div className="flex flex-col items-start text-left">
            <span className="text-xs font-black tracking-wider uppercase flex items-center gap-1 text-neutral-100">
              AI Support <Sparkles className="w-3 h-3 text-amber-400" />
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">TAZU MART BD</span>
          </div>
        </button>
      </div>

      {/* 2. CUSTOMER INFORMATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 relative overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-neutral-950 text-white rounded-xl flex items-center justify-center shadow-md">
                <Bot className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-neutral-900 tracking-tight">TAZU MART BD</h3>
                <p className="text-xs text-neutral-500 font-medium">AI Support Agent Verification</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 mb-6 leading-relaxed bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
              আপনার সাথে কথা বলতে এবং সঠিক তথ্য ও অর্ডার সহায়তা প্রদান করতে আপনার নাম এবং মোবাইল নম্বর দিয়ে ভেরিফাই করুন।
            </p>

            <form onSubmit={handleVerifyAndStart} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Customer Name (আপনার নাম) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="উদাহরণ: তানভীর আহমেদ"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Mobile Number (মোবাইল নম্বর) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-98 mt-2"
              >
                <span>Verify & Start</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. MAIN AI CHATBOX DRAWER/MODAL */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-[99999] md:w-[440px] md:h-[620px] bg-white md:rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* CHAT HEADER */}
          <div className="bg-neutral-950 text-white p-4 flex items-center justify-between border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-400 shadow-inner">
                  <Bot className="w-6 h-6" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-neutral-950 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  TAZU MART BD
                  <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-400/30">
                    {isHandoff ? 'Human Agent' : 'AI Agent'}
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {userProfile ? `${userProfile.name} • 24/7 Active` : 'Online Support'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Reset Conversation"
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={handleRequestHumanSupport}
                title="Connect with Human Representative"
                className="p-2 text-amber-400 hover:text-amber-300 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
              >
                <Headphones className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CHAT MESSAGES CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50">
            {messages.map((msg) => {
              const isUser = msg.sender === 'customer';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-neutral-950 text-amber-400 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Text Bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                        isUser
                          ? 'bg-neutral-950 text-white rounded-br-none shadow-md'
                          : 'bg-white text-neutral-800 rounded-bl-none border border-neutral-200 shadow-sm'
                      }`}
                    >
                      {msg.text}

                      {/* Image Attachment inside Message */}
                      {msg.image && (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-neutral-200 shadow-sm max-w-[240px]">
                          <img
                            src={msg.image}
                            alt="Uploaded attachment"
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Interactive Recommended Product Cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-3 w-full space-y-2">
                        <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-neutral-700" /> Recommended Products
                        </p>
                        {msg.products.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-white border border-neutral-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 group"
                          >
                            <img
                              src={prod.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80'}
                              alt={prod.name}
                              className="w-14 h-14 object-cover rounded-lg border border-neutral-100 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-neutral-900 truncate group-hover:text-amber-600 transition-colors">
                                {prod.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-extrabold text-neutral-950">
                                  ৳{prod.discountPrice || prod.price}
                                </span>
                                {prod.discountPrice && prod.discountPrice < prod.price && (
                                  <span className="text-[10px] text-neutral-400 line-through font-medium">
                                    ৳{prod.price}
                                  </span>
                                )}
                              </div>
                              <span className={`inline-block text-[10px] font-bold mt-1 ${prod.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {prod.stock > 0 ? '• In Stock' : '• Out of Stock'}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/product/${prod.id}`);
                              }}
                              className="bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shrink-0 shadow-sm"
                            >
                              Buy Now
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="text-[10px] text-neutral-400 mt-1 font-medium px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-lg bg-neutral-950 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-neutral-200 px-4 py-3 rounded-2xl rounded-bl-none text-xs text-neutral-500 font-medium flex items-center gap-2 shadow-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-800" />
                  <span>TAZU MART BD AI চিন্তা করছে...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CHAT INPUT AREA */}
          <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
            {/* Attached Image Preview Pill */}
            {attachedImage && (
              <div className="mb-2 flex items-center justify-between bg-neutral-100 p-2 rounded-xl border border-neutral-200">
                <div className="flex items-center gap-2 overflow-hidden">
                  <img src={attachedImage} alt="Attachment" className="w-8 h-8 object-cover rounded-md" />
                  <span className="text-xs text-neutral-700 font-medium truncate">সংযুক্ত ছবি</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Image / Search by Photo"
                className="p-2.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors shrink-0"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="আপনার বার্তা লিখুন (Write message)..."
                className="flex-1 bg-neutral-100 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:bg-white transition-all font-medium"
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && !attachedImage) || isLoading}
                className="bg-neutral-950 hover:bg-neutral-900 disabled:opacity-40 text-white p-2.5 rounded-xl shadow-md transition-all shrink-0 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
