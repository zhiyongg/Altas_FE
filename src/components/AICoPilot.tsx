import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface AICoPilotProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onApplySuggestion?: (suggestion: string) => void;
  isGenerating?: boolean;
}

export const AICoPilot: React.FC<AICoPilotProps> = ({
  messages,
  onSendMessage,
  onApplySuggestion,
  isGenerating = false,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <aside className="w-full md:w-[32%] lg:w-[28%] bg-[#ffffff] border-r border-[#e1e3e4] flex flex-col h-full shrink-0">
      {/* Co-Pilot Header */}
      <div className="p-4 border-b border-[#e1e3e4] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[#0058be] text-[24px]">qr_code_2</span>
          <h2 className="font-medium text-lg text-[#191c1d]">AI Co-Pilot</h2>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-[#006c49] bg-[#6cf8bb]/30 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#006c49] animate-pulse"></span>
          Live
        </span>
      </div>

      {/* Messages Stream */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 flex flex-col custom-scrollbar">
        {messages.map((msg) => {
          const isAI = msg.sender === 'ai';

          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 max-w-[92%] ${
                isAI ? 'self-start' : 'self-end'
              }`}
            >
              {isAI ? (
                <div className="relative group">
                  {/* Subtle Ambient AI Glow */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#adc6ff] to-[#6ffbbe] opacity-25 rounded-2xl blur-xs -z-10 transition-opacity"></div>
                  
                  <div className="bg-[#f3f4f5] text-[#191c1d] rounded-t-2xl rounded-br-2xl p-3.5 shadow-sm text-sm leading-relaxed border border-[#edeeef]">
                    <p>{msg.text}</p>

                    {/* Quick suggestion pills if present */}
                    {msg.suggestionPills && msg.suggestionPills.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#e1e3e4] flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-[#727785] uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-[#0058be]">auto_awesome</span>
                          Quick Actions
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestionPills.map((pill, idx) => (
                            <button
                              key={idx}
                              onClick={() => onApplySuggestion ? onApplySuggestion(pill) : onSendMessage(pill)}
                              className="text-left text-xs bg-white hover:bg-[#d8e2ff] text-[#0058be] hover:text-[#001a42] px-2.5 py-1 rounded-full border border-[#c2c6d6] transition-all shadow-2xs active:scale-95"
                            >
                              {pill}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-[#727785] ml-1 mt-1 block">
                    Aether AI • {msg.timestamp}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <div className="bg-[#0058be] text-white rounded-t-2xl rounded-bl-2xl p-3.5 shadow-sm text-sm leading-relaxed">
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-[11px] text-[#727785] mr-1 mt-1">
                    You • {msg.timestamp}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex flex-col gap-1 max-w-[90%] self-start">
            <div className="bg-[#f3f4f5] rounded-2xl p-3.5 flex items-center gap-2 shadow-xs border border-[#edeeef]">
              <span className="material-symbols-outlined text-[#0058be] animate-spin text-[18px]">progress_activity</span>
              <span className="text-xs text-[#727785]">Aether AI is rebalancing the itinerary...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="p-3.5 bg-white border-t border-[#e1e3e4]">
        <form
          onSubmit={handleSubmit}
          className="relative bg-[#f8f9fa] rounded-full flex items-center p-1 border border-[#e1e3e4] focus-within:ring-2 focus-within:ring-[#0058be] focus-within:border-transparent focus-within:bg-white transition-all shadow-xs"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask AI to change the itinerary..."
            className="bg-transparent border-none w-full text-sm focus:ring-0 text-[#191c1d] py-1.5 pl-4 pr-2 placeholder:text-[#727785] outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className="bg-[#0058be] text-white p-2 rounded-full hover:bg-[#2170e4] disabled:opacity-40 disabled:hover:bg-[#0058be] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title="Send request"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>
      </div>
    </aside>
  );
};
