import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Sparkles, Send, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EmailSMSGenerator() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    type: "email",
    recipient_name: "",
    topic: "",
    key_points: "",
    tone: "professional"
  });

  const handleGenerate = async () => {
    if (!form.recipient_name || !form.topic) {
      toast.error("Please fill in recipient and topic");
      return;
    }
    setLoading(true);
    setGenerated(null);
    try {
      const res = await axios.post(`${API}/content/generate-message`, {
        ...form,
        key_points: form.key_points.split("\n").filter(Boolean)
      });
      setGenerated(res.data);
    } catch (err) {
      toast.error("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generated) return;
    const text = form.type === "email" 
      ? `Subject: ${generated.subject}\n\n${generated.body}` 
      : generated.body;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="pt-24 min-h-screen bg-secondary/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <span className="mono-label mb-2 block">AI TOOLS</span>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Smart <span className="text-primary">Communication</span>
          </h1>
          <p className="text-muted-foreground">Generate professional emails and texts instantly.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Side */}
          <div className="bg-card border border-border rounded-sm p-6">
            <Tabs defaultValue="email" onValueChange={v => setForm(p => ({ ...p, type: v }))}>
              <TabsList className="w-full mb-6">
                <TabsTrigger value="email" className="flex-1">Email</TabsTrigger>
                <TabsTrigger value="sms" className="flex-1">SMS</TabsTrigger>
              </TabsList>

              <div className="space-y-4">
                <div>
                  <Label>Recipient Name</Label>
                  <Input 
                    value={form.recipient_name}
                    onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
                    placeholder="e.g. John Doe" 
                  />
                </div>
                <div>
                  <Label>Topic / Intent</Label>
                  <Input 
                    value={form.topic}
                    onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                    placeholder={form.type === "email" ? "e.g. Follow up on quote" : "e.g. Appointment reminder"} 
                  />
                </div>
                <div>
                  <Label>Key Points (One per line)</Label>
                  <Textarea 
                    value={form.key_points}
                    onChange={e => setForm(p => ({ ...p, key_points: e.target.value }))}
                    placeholder="- Thank them for meeting&#10;- Mention timeline&#10;- Ask for deposit"
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Tone</Label>
                  <Select value={form.tone} onValueChange={v => setForm(p => ({ ...p, tone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual / Friendly</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={loading} 
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  GENERATE DRAFT
                </Button>
              </div>
            </Tabs>
          </div>

          {/* Output Side */}
          <div className="bg-card border border-border rounded-sm p-6 flex flex-col h-full">
            <h3 className="font-bold mb-4 flex items-center justify-between">
              GENERATED DRAFT
              {generated && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              )}
            </h3>
            
            {generated ? (
              <div className="flex-1 flex flex-col gap-4">
                {form.type === "email" && (
                  <div className="border-b border-border pb-4">
                    <Label className="text-xs text-muted-foreground">SUBJECT</Label>
                    <div className="font-medium">{generated.subject}</div>
                  </div>
                )}
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">BODY</Label>
                  <Textarea 
                    value={generated.body} 
                    onChange={e => setGenerated(p => ({ ...p, body: e.target.value }))}
                    className="h-full min-h-[300px] resize-none border-0 focus-visible:ring-0 p-0 text-base"
                  />
                </div>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
                    <Send className="w-4 h-4 mr-2" />
                    SEND VIA HUBSPOT (Coming Soon)
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Connect your HubSpot account to send directly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-sm">
                Fill out the form to generate a message
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
