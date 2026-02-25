import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Maximize2, Minimize2, Loader2, AlertCircle } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AdminAssistantProps {
    onClose?: () => void;
}

export default function AdminAssistant({ onClose }: AdminAssistantProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'مرحباً! أنا المساعد الذكي للجيم. اسألني عن الطلاب، الإيرادات، أو أي شيء تاني.'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
            if (!API_KEY) throw new Error('API Key missing in .env');

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: `أنت مساعد ذكي لإدارة صالة رياضية. تساعد المدير في الإجابة على أسئلته عن الطلاب، الإيرادات، والإحصائيات. تجاوب بالعربي بطريقة واضحة ومفيدة.\n\nالسؤال: ${input}`
                                    }
                                ]
                            }
                        ]
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع الحصول على رد.'
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error('Error:', err);
            setError(err instanceof Error ? err.message : 'حصل خطأ في الاتصال بالمساعد الذكي');

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'عذراً، حصل خطأ في الاتصال. تأكد من وجود API Key صحيح.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div
            className={`fixed bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${isMaximized
                ? 'inset-4'
                : 'bottom-6 right-6 w-[420px] h-[600px]'
                }`}
            style={{
                border: '1px solid rgba(139, 92, 246, 0.3)',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-xl">🤖</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Admin AI Assistant</h3>
                        <p className="text-xs text-purple-300">مساعدك الذكي</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        {isMaximized ? (
                            <Minimize2 className="w-5 h-5 text-white" />
                        ) : (
                            <Maximize2 className="w-5 h-5 text-white" />
                        )}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{error}</p>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                : 'bg-white/10 text-white border border-white/20'
                                }`}
                            style={{
                                backdropFilter: message.role === 'assistant' ? 'blur(10px)' : 'none'
                            }}
                        >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/20">
                            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-purple-500/30">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="اسأل عن الطلاب، الإيرادات..."
                        disabled={isLoading}
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 text-right"
                        dir="rtl"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-xs text-purple-300 mt-2 text-center">
                    Powered by Google Gemini • بيتعلم من استخداماتك
                </p>
            </div>
        </div>
    );
}
