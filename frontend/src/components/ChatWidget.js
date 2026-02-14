import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your ICF construction advisor. Ask me anything about Insulated Concrete Forms - costs, benefits, timelines, or whether ICF is right for your project." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/chat`, {
        message: userMsg,
        session_id: sessionId
      });
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          data-testid="chat-widget-toggle"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-sm hard-shadow flex items-center justify-center chat-bounce hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div
          data-testid="chat-widget-panel"
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[520px] bg-card border border-border rounded-sm shadow-2xl flex flex-col overflow-hidden"
          style={{ animation: "fadeSlideUp 0.3s ease forwards" }}
        >
          <div className="bg-secondary text-secondary-foreground px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-sm font-semibold tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>ICF ADVISOR</span>
            </div>
            <button
              data-testid="chat-widget-close"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-secondary-foreground/10 rounded-sm transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  data-testid={`chat-message-${i}`}
                  className={`max-w-[80%] px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-sm rounded-br-none"
                      : "bg-muted text-foreground rounded-sm rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-3 rounded-sm rounded-bl-none flex gap-1.5">
                  <div className="w-2 h-2 bg-foreground/40 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-foreground/40 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-foreground/40 rounded-full typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input
                data-testid="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about ICF construction..."
                className="flex-1 bg-muted px-3 py-2 text-sm rounded-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                data-testid="chat-send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                size="sm"
                className="rounded-sm px-3"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
