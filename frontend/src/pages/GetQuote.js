import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Zap, Loader2, Check, Paperclip, FileText } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [sessionId] = useState(uuidv4());
  const [complete, setComplete] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, uploading]);

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

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    try {
      const res = await axios.post(`${API}/intake/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const fileUrl = res.data.url;
      const fileName = file.name;
      
      // Simulate user message with file
      const userMsg = `Uploaded file: ${fileName}`;
      setMessages(p => [...p, { role: "user", content: userMsg, isFile: true, fileUrl }]);
      
      // Send to AI context
      setLoading(true);
      const chatRes = await axios.post(`${API}/intake/chat`, {
        session_id: sessionId,
        message: `[System: User uploaded file: ${fileUrl}]`
      });
      
      setMessages(p => [...p, { role: "assistant", content: chatRes.data.response }]);

    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setLoading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
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

        <div 
          ref={scrollRef}
          className="flex-1 bg-card border border-border rounded-lg shadow-sm p-6 mb-4 overflow-y-auto min-h-[500px] flex flex-col gap-4"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted text-foreground rounded-tl-none"
                }`}
              >
                {m.isFile ? (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/80">
                      {m.content.replace("Uploaded file: ", "")}
                    </a>
                  </div>
                ) : (
                  m.content.replace("COMPLETE:", "")
                )}
              </div>
            </div>
          ))}
          {(loading || uploading) && (
            <div className="flex justify-start">
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                {uploading ? (
                  <span className="text-xs text-muted-foreground animate-pulse">Uploading file...</span>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce delay-150" />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="relative flex gap-2">
          <Input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-sm border-border bg-card hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading}
            title="Upload Plans/Blueprints"
          >
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </Button>
          
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your answer here..."
              className="pr-12 py-7 bg-card border-border shadow-sm text-base h-14"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading || uploading}
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
