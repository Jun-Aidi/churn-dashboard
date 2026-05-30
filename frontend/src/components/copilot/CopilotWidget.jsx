import React, { useState, useEffect, useRef } from 'react';
import { processChat } from './chatEngine';
import { fetchCustomers } from '../../api/index';

function formatBotMessage(text) {
  if (!text) return '';
  let html = text;
  // Headers (### → h4, ## → h3)
  html = html.replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;margin:8px 0 4px;">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:10px 0 4px;">$1</h3>');
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--color-hover);padding:1px 4px;border-radius:3px;font-size:12px;">$1</code>');
  // Unordered list items
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc;">$1</li>');
  // Ordered list items
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li style="margin-left:16px;list-style:decimal;">$1</li>');
  // Tables (simple: | col | col |)
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.every(c => /^[-:]+$/.test(c.trim()))) return ''; // separator row
    const tds = cells.map(c => `<td style="padding:2px 6px;border:1px solid var(--color-border);">${c.trim()}</td>`).join('');
    return `<tr>${tds}</tr>`;
  });
  // Wrap consecutive <tr> in table
  html = html.replace(/((<tr>.*?<\/tr>\s*)+)/g, '<table style="border-collapse:collapse;font-size:12px;margin:6px 0;">$1</table>');
  // Line breaks
  html = html.replace(/\n/g, '<br/>');
  // Clean up double <br/> after block elements
  html = html.replace(/(<\/h[34]>)<br\/>/g, '$1');
  html = html.replace(/(<\/li>)<br\/>/g, '$1');
  html = html.replace(/(<\/table>)<br\/>/g, '$1');
  return html;
}

export default function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([{
    id: 1, sender: 'bot', time: new Date(),
    text: 'Halo! Saya Ghosting <i class="fa-solid fa-comment-dots" style="color: #4f8ef7;"></i>. Ada yang bisa saya bantu hari ini?',
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchCustomers()
      .then(data => setCustomers(data.slice(0, 50))) // Limit dropdown to 50 for performance
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), sender: 'user', text: input, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(async () => {
      const response = await processChat(userMsg.text);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: response, time: new Date() }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)}
      className="fade-in fixed bottom-6 right-6 z-[9999] w-[60px] h-[60px] rounded-full border-none text-white flex items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-200"
      style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #3b6fe0 100%)', boxShadow: '0 8px 24px rgba(79,142,247,0.4)' }}>
      <i className="fa-solid fa-comment-dots text-2xl"></i>
      <div className="absolute -top-[5px] -right-[5px] w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-white" />
    </button>
  );

  return (
    <div className="fade-in fixed bottom-6 right-6 z-[9999] w-[380px] max-h-[calc(100vh-48px)] rounded-2xl flex flex-col overflow-hidden transition-[height] duration-300"
      style={{ height: isMinimized ? 64 : 600, background: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>

      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #3b6fe0 100%)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <i className="fa-solid fa-comment-dots text-[18px]"></i>
          </div>
          <div>
            <div className="text-[15px] font-bold">Ghosting</div>
            <div className="text-[11px] opacity-90">Asisten cerdas pendukung retention</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setIsMinimized(!isMinimized)}
            className="bg-transparent border-none text-white cursor-pointer p-1 hover:opacity-80 transition-opacity">
            <i className={`fa-solid ${isMinimized ? 'fa-expand' : 'fa-compress'} text-sm`}></i>
          </button>
          <button onClick={() => setIsOpen(false)}
            className="bg-transparent border-none text-white cursor-pointer p-1 hover:opacity-80 transition-opacity">
            <i className="fa-solid fa-xmark text-[18px]"></i>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Area */}
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4" style={{ background: 'var(--color-input)' }}>
            {messages.map(msg => (
              <div key={msg.id} className="flex gap-2.5 max-w-[85%]"
                style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: msg.sender === 'user' ? 'var(--color-hover)' : '#e0e7ff', color: msg.sender === 'user' ? 'var(--color-muted)' : '#4f8ef7' }}>
                  <i className={`fa-solid ${msg.sender === 'user' ? 'fa-user' : 'fa-user-circle'} text-sm`}></i>
                </div>
                <div className="px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: msg.sender === 'user' ? '#4f8ef7' : 'var(--color-card)',
                    color: msg.sender === 'user' ? '#fff' : 'var(--color-text)',
                    borderRadius: msg.sender === 'user' ? '14px 2px 14px 14px' : '2px 14px 14px 14px',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--color-border)',
                  }}>
                  {msg.sender === 'bot'
                    ? <div className="bot-msg-content" dangerouslySetInnerHTML={{ __html: formatBotMessage(msg.text) }} />
                    : msg.text}
                  <div className="text-[10px] mt-1.5"
                    style={{ color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--color-subtle)', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                    {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2.5 self-start">
                <div className="w-7 h-7 rounded-full bg-[#e0e7ff] text-[#4f8ef7] flex items-center justify-center">
                  <i className="fa-solid fa-user-circle text-sm"></i>
                </div>
                <div className="px-4 py-3 rounded-[2px_14px_14px_14px] flex gap-1 items-center"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  {['-0.32s', '-0.16s', '0s'].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-subtle)', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: d }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Dropdown */}
          <div className="px-4 py-2 flex items-center gap-2.5 flex-shrink-0 border-t" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>Konteks:</span>
            <select value={selectedCustomer}
              onChange={e => { const v = e.target.value; setSelectedCustomer(v); if (v && !input.includes(v)) setInput(p => p ? `${p} ${v}` : v); }}
              className="flex-1 px-2.5 py-1.5 rounded-md text-xs font-[inherit] outline-none border"
              style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)', color: 'var(--color-text)' }}>
              <option value="">-- Pilih Customer --</option>
              {customers.map((c, i) => <option key={c.customer_id || c.id} value={c.customer_id || c.id}>{c.customer_id || c.id}</option>)}
            </select>
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 flex gap-2.5 items-center flex-shrink-0 border-t" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Tanya Ghosting..."
              className="flex-1 px-4 py-2.5 rounded-full text-[13px] font-[inherit] outline-none border transition-[border-color] duration-150"
              style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)', color: 'var(--color-text)' }} />
            <button type="submit" disabled={!input.trim() || isTyping}
              className="w-9 h-9 rounded-full border-none flex items-center justify-center transition-colors duration-200 flex-shrink-0"
              style={{ background: input.trim() && !isTyping ? '#4f8ef7' : 'var(--color-hover)', color: '#fff', cursor: input.trim() && !isTyping ? 'pointer' : 'default' }}>
              <i className="fa-solid fa-paper-plane text-sm ml-0.5"></i>
            </button>
          </form>
        </>
      )}
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </div>
  );
}
