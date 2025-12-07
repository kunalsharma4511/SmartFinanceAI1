
import React, { useState, useEffect, useRef } from 'react';
import { FinanceChatService } from '../services/geminiService';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

export const ChatBot = ({ transactions }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatServiceRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize chat service when transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      chatServiceRef.current = new FinanceChatService(transactions);
      setMessages([
        {
          role: 'model',
          text: `Hi! I'm your personal finance assistant. I've analyzed your ${transactions.length} transactions. Ask me anything about your spending habits, how to save money, or specific transaction details!`,
          timestamp: new Date()
        }
      ]);
    } else {
      setMessages([{
        role: 'model',
        text: "Please upload a bank statement first so I can analyze your financial data.",
        timestamp: new Date()
      }]);
    }
  }, [transactions]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatServiceRef.current || loading) return;

    const userMsg = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await chatServiceRef.current.sendMessage(userMsg.text);
      const botMsg = { role: 'model', text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I had trouble thinking about that.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 p-4 flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <Sparkles className="text-white w-5 h-5" />
        </div>
        <div>
          <h2 className="text-white font-semibold">Financial Assistant</h2>
          <p className="text-indigo-100 text-xs">Powered by Gemini 3 Pro</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
            }`}>
               <div className="whitespace-pre-wrap">{msg.text}</div>
              <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex items-start gap-3">
             <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
               <Bot size={16} />
             </div>
             <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 border border-slate-100 flex items-center gap-2">
               <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
               <span className="text-slate-400 text-xs">Thinking...</span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={transactions.length > 0 ? "Ask about your spending..." : "Upload a statement first..."}
            className="w-full resize-none rounded-xl border border-slate-200 pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
            rows={1}
            disabled={transactions.length === 0}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || transactions.length === 0}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
