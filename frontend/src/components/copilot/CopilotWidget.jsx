import React, { useState, useEffect, useRef } from 'react';
import { processChat } from './chatEngine';

function formatBotMessage(text) {
  if (!text) return '';
  let html = text;
  html = html.replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:800;margin:8px 0 4px;color:var(--gdu-text);">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:800;margin:10px 0 4px;color:var(--gdu-text);">$1</h3>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--gdu-hover);padding:2px 5px;border-radius:6px;font-size:12px;color:var(--gdu-text);">$1</code>');
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc;">$1</li>');
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li style="margin-left:16px;list-style:decimal;">$1</li>');
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.every(c => /^[-:]+$/.test(c.trim()))) return '';
    const tds = cells.map(c => `<td style="padding:4px 7px;border:1px solid var(--gdu-border);">${c.trim()}</td>`).join('');
    return `<tr>${tds}</tr>`;
  });
  html = html.replace(/((<tr>.*?<\/tr>\s*)+)/g, '<div style="overflow-x:auto;margin:6px 0;"><table style="border-collapse:collapse;font-size:12px;width:100%;">$1</table></div>');
  // Strip whitespace/newlines between table rows so they don't become stray <br/> inside the table (which browsers push above the table as blank space)
  html = html.replace(/\s*<tr>/g, '<tr>');
  html = html.replace(/<\/tr>\s*/g, '</tr>');
  html = html.replace(/\n/g, '<br/>');
  html = html.replace(/(<\/h[34]>)<br\/>/g, '$1');
  html = html.replace(/(<\/li>)<br\/>/g, '$1');
  html = html.replace(/(<\/table><\/div>)<br\/>/g, '$1');
  // Collapse blank lines (multiple <br/>) that appear right before/after a table block
  html = html.replace(/(<br\/>\s*)+(<div style="overflow-x:auto)/g, '$2');
  html = html.replace(/(<\/div>)(<br\/>\s*)+/g, '$1');
  return html;
}

export default function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([{
    id: 1,
    sender: 'bot',
    time: new Date(),
    text: 'Halo! Saya **Ghosting**, asisten retensi Anda. Berikut beberapa contoh pertanyaan:\n\n'
      + '- Siapa pelanggan dengan risiko churn tinggi?\n'
      + '- Berapa total pelanggan berisiko tinggi?\n'
      + '- Tampilkan profil pelanggan C-0001\n'
      + '- Bagaimana sebaran churn per segmen?\n'
      + '- Apa faktor utama penyebab churn?',
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

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
    }, 700 + Math.random() * 900);
  };

  if (!isOpen) return (
    <button
      onClick={() => setIsOpen(true)}
      className="fade-in fixed bottom-6 right-6 z-[9999] flex h-[68px] w-[68px] cursor-pointer items-center justify-center rounded-full border border-[var(--gdu-border)] text-white transition-transform duration-200 hover:scale-105"
      style={{ background: 'linear-gradient(135deg, var(--gdu-teal) 0%, var(--gdu-panel) 100%)', boxShadow: 'var(--gdu-shadow)' }}
      aria-label="Buka chatbot Ghosting"
    >
      <i className="fa-solid fa-comment-dots text-3xl"></i>
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--gdu-red)] text-[10px] text-white ring-4 ring-[var(--gdu-bg)]">
        <i className="fa-solid fa-sparkles"></i>
      </span>
    </button>
  );

  return (
    <div
      className="fade-in fixed bottom-6 right-6 z-[9999] flex w-[440px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-48px)] flex-col overflow-hidden rounded-[1.75rem] border border-[var(--gdu-border)] transition-[height] duration-300 sm:w-[460px]"
      style={{ height: isMinimized ? 74 : 640, background: 'var(--gdu-card)', boxShadow: 'var(--gdu-shadow)', backdropFilter: 'blur(20px)' }}
    >
      <div className="relative flex flex-shrink-0 items-center justify-between overflow-hidden px-5 py-4 text-[#fffaf0]" style={{ background: 'var(--gdu-panel)' }}>
        <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[var(--gdu-teal)]/25 blur-2xl" />
        <div className="absolute -bottom-20 left-12 h-32 w-32 rounded-full bg-[var(--gdu-amber)]/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
            <i className="fa-solid fa-robot text-xl text-[#fffaf0]"></i>
          </div>
          <div>
            <div className="text-[15px] font-black tracking-[-0.02em]">Ghosting Assistant</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#fffaf0]/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gdu-teal)]"></span>
              Retention intelligence online
            </div>
          </div>
        </div>
        <div className="relative flex gap-1.5">
          <button onClick={() => setIsMinimized(!isMinimized)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/15">
            <i className={`fa-solid ${isMinimized ? 'fa-expand' : 'fa-compress'} text-xs`}></i>
          </button>
          <button onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/15">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--gdu-bg)' }}>
            <div className="flex flex-col gap-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className="flex max-w-[88%] gap-2.5"
                  style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border"
                    style={{
                      background: msg.sender === 'user' ? 'var(--gdu-panel)' : 'var(--gdu-card)',
                      borderColor: 'var(--gdu-border)',
                      color: msg.sender === 'user' ? '#fffaf0' : 'var(--gdu-teal)',
                    }}
                  >
                    <i className={`fa-solid ${msg.sender === 'user' ? 'fa-user' : 'fa-circle-user'} text-sm`}></i>
                  </div>
                  <div
                    className="min-w-0 px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: msg.sender === 'user' ? 'var(--gdu-teal)' : 'var(--gdu-card)',
                      color: msg.sender === 'user' ? '#fff' : 'var(--gdu-text)',
                      borderRadius: msg.sender === 'user' ? '18px 6px 18px 18px' : '6px 18px 18px 18px',
                      border: msg.sender === 'user' ? 'none' : '1px solid var(--gdu-border)',
                      boxShadow: msg.sender === 'user' ? '0 12px 30px rgba(0,166,166,0.24)' : 'none',
                    }}
                  >
                    {msg.sender === 'bot'
                      ? <div className="bot-msg-content" dangerouslySetInnerHTML={{ __html: formatBotMessage(msg.text) }} />
                      : msg.text}
                    <div className="mt-2 text-[10px] font-semibold" style={{ color: msg.sender === 'user' ? 'rgba(255,255,255,0.72)' : 'var(--gdu-subtle)', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                      {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2.5 self-start">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--gdu-border)] text-[var(--gdu-teal)]" style={{ background: 'var(--gdu-card)' }}>
                    <i className="fa-solid fa-circle-user text-sm"></i>
                  </div>
                  <div className="flex items-center gap-1 rounded-[6px_18px_18px_18px] border border-[var(--gdu-border)] px-4 py-3" style={{ background: 'var(--gdu-card)' }}>
                    {['-0.32s', '-0.16s', '0s'].map(d => (
                      <span key={d} className="h-1.5 w-1.5 rounded-full bg-[var(--gdu-teal)]" style={{ animation: 'gdu-bounce 1.4s infinite ease-in-out both', animationDelay: d }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSend} className="flex flex-shrink-0 items-center gap-2.5 border-t border-[var(--gdu-border)] p-4" style={{ background: 'var(--gdu-card)' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tanya Ghosting..."
              className="flex-1 rounded-full px-4 py-3 text-[13px] font-semibold outline-none transition"
              style={{ background: 'var(--gdu-input)', border: '1px solid var(--gdu-border)', color: 'var(--gdu-text)' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-none text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: input.trim() && !isTyping ? 'var(--gdu-teal)' : 'var(--gdu-hover)', cursor: input.trim() && !isTyping ? 'pointer' : 'default' }}
            >
              <i className="fa-solid fa-paper-plane text-sm ml-0.5"></i>
            </button>
          </form>
        </>
      )}
      <style>{`@keyframes gdu-bounce { 0%, 80%, 100% { transform: scale(0); opacity: .4; } 40% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}
