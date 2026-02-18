import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Zap, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GetQuote() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi there! I'm the ICF Hub Intake Assistant. I can help connect you with the perfect certified contractor for your project. To start, what is your first name?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(uuidv4());
  const [complete, setComplete] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages(p => [...p, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/intake/chat`, {
        session_id: sessionId,
        message: userMsg
      });

      const aiResponse = res.data.response;
      setMessages(p => [...p, { role: "assistant", content: aiResponse }]);
      
      if (res.data.is_complete) {
        setComplete(true);
        toast.success("Intake complete! Matching you with pros now...");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (complete) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center noise-bg blueprint-grid">
        <div className="text-center max-w-lg px-6 animate-fade-up">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            We've Found Your <span className="text-primary">Match!</span>
          </h2>
          <p className="text-base text-muted-foreground mb-8">
            Based on your project details, we've identified certified ICF contractors in your area who are perfect for the job. Our team is reviewing the connection and you'll receive an introduction shortly.
          </p>
          <Button
            onClick={() => window.location.href = "/"}
            className="rounded-sm text-xs tracking-widest font-bold uppercase px-8 py-3"
            size="lg"
          >
            BACK TO HOME
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen flex flex-col bg-secondary/30">
      <div className="flex-1 max-w-3xl w-full mx-auto p-4 flex flex-col">
        <div className="text-center mb-8 pt-8">
          <span className="mono-label mb-2 block">PROJECT INTAKE</span>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Let's Build Your <span className="text-primary">Vision</span>
          </h1>
        </div>

        <div className="flex-1 bg-card border border-border rounded-sm shadow-sm p-6 mb-4 overflow-y-auto min-h-[500px] flex flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] p-4 rounded-lg text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted text-foreground rounded-tl-none"
                }`}
              >
                {m.content.replace("COMPLETE:", "")}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted p-4 rounded-lg rounded-tl-none flex items-center gap-2">
                <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="relative">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your answer here..."
            className="pr-12 py-6 bg-card border-border shadow-sm text-base"
            autoFocus
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading}
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
