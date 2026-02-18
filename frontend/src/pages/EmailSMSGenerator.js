import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Sparkles, Send, Copy, Check, Cable } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EmailSMSGenerator() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchParams] = useSearchParams();
  const [redirectUriDisplay, setRedirectUriDisplay] = useState("");
  
  const [form, setForm] = useState({
    type: "email",
    recipient_name: "",
    recipient_email: "",
    topic: "",
    key_points: "",
    tone: "professional"
  });

  useEffect(() => {
    // Set initial redirect URI for display
    const currentOrigin = window.location.origin;
    let uri = `${currentOrigin}/api/auth/hubspot/callback`;
    if (currentOrigin.includes("localhost:3000")) {
        uri = "http://localhost:8001/api/auth/hubspot/callback";
    }
    setRedirectUriDisplay(uri);

    checkConnection();
    if (searchParams.get("connected")) {
      toast.success("HubSpot Connected Successfully!");
    } else if (searchParams.get("error")) {
      toast.error("HubSpot Connection Failed: " + searchParams.get("error"));
    }
  }, []);

  const checkConnection = async () => {
    try {
      const token = localStorage.getItem("icf_token");
      if (!token) return;
      const res = await axios.get(`${API}/integrations/hubspot/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnected(res.data.connected);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnect = async () => {
    try {
      const token = localStorage.getItem("icf_token");
      const contractor = JSON.parse(localStorage.getItem("icf_contractor") || "{}");
      if (!contractor.id) return toast.error("Please login first");

      // Dynamic Redirect URI based on current browser location
      // This ensures it works on both localhost AND cloud previews
      // IMPORTANT: This URL must be added to HubSpot Developer App settings!
      const currentOrigin = window.location.origin; // e.g., https://myapp.com or http://localhost:3000
      
      // Note: In local dev, frontend is 3000, backend is 8001.
      // But in PROD/Cloud, they are often on the SAME domain, just /api route.
      // We will tell the backend to use THIS logic as the redirect target.
      // The backend is proxied at /api usually.
      // So the callback should be: origin + /api/auth/hubspot/callback
      
      // HOWEVER, if we are local (3000), the backend is at 8001. 
      // If we redirect to 3000/api/..., the react dev server proxies it? Yes, usually setupProxy.js.
      // If not, we might need to point to 8001 directly.
      
      // Let's try pointing to the BACKEND URL directly if we can.
      // But REACT_APP_BACKEND_URL might be internal (0.0.0.0).
      
      // SAFEST BET: Use the window.location.origin + /api/... 
      // ensuring the cloud ingress handles the routing.
      // If local, we might need a special check.
      
      let redirectUri = `${currentOrigin}/api/auth/hubspot/callback`;
      if (currentOrigin.includes("localhost:3000")) {
          redirectUri = "http://localhost:8001/api/auth/hubspot/callback";
      }
      
      // Store for display
      setRedirectUriDisplay(redirectUri);

      console.log("Using Redirect URI:", redirectUri);

      const res = await axios.get(`${API}/auth/hubspot/authorize`, {
        params: {
          user_id: contractor.id,
          redirect_uri: redirectUri
        }
      });
      
      // Show instruction toast
      toast.info("Redirecting to HubSpot...", { duration: 2000 });
      setTimeout(() => {
          window.location.href = res.data.url;
      }, 1000);
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to start connection");
    }
  };

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

  const handleSend = async () => {
    if (!connected) {
      toast.error("Please connect HubSpot first");
      return;
    }
    if (!form.recipient_email) {
      toast.error("Recipient email required to send");
      return;
    }
    
    setSending(true);
    try {
      const token = localStorage.getItem("icf_token");
      await axios.post(`${API}/integrations/hubspot/send`, {
        recipient_email: form.recipient_email,
        subject: generated.subject || "New Message",
        body: generated.body
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Sent via HubSpot!");
    } catch (err) {
      toast.error("Failed to send");
    } finally {
      setSending(false);
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <span className="mono-label mb-2 block">AI TOOLS</span>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Smart <span className="text-primary">Communication</span>
            </h1>
            <p className="text-muted-foreground">Generate professional emails and texts instantly.</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Button 
                variant={connected ? "outline" : "default"}
                className={connected ? "border-green-500/50 bg-green-500/10 text-green-600 hover:bg-green-500/20" : "bg-[#ff7a59] hover:bg-[#ff7a59]/90"}
                onClick={connected ? null : handleConnect}
            >
                {connected ? (
                <>
                    <Check className="w-4 h-4 mr-2" />
                    HubSpot Connected
                </>
                ) : (
                <>
                    <Cable className="w-4 h-4 mr-2" />
                    Connect HubSpot
                </>
                )}
            </Button>
            {!connected && (
                <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px] text-muted-foreground bg-card px-2 py-1 rounded border border-border text-right">
                        Required for auto-sending
                    </div>
                    {redirectUriDisplay && (
                        <div className="text-[10px] bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200 max-w-[300px] break-all">
                            <strong>Setup Required:</strong> Add this Redirect URL to HubSpot App:<br/>
                            <span className="font-mono select-all cursor-pointer hover:bg-yellow-100" onClick={() => {navigator.clipboard.writeText(redirectUriDisplay); toast.success("Copied URL!");}}>
                                {redirectUriDisplay}
                            </span>
                        </div>
                    )}
                </div>
            )}
          </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Recipient Name</Label>
                    <Input 
                      value={form.recipient_name}
                      onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
                      placeholder="e.g. John Doe" 
                    />
                  </div>
                  <div>
                    <Label>Recipient Email</Label>
                    <Input 
                      value={form.recipient_email}
                      onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))}
                      placeholder="john@example.com" 
                    />
                  </div>
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
                  <Button 
                    className={`w-full ${connected ? "bg-[#ff7a59] hover:bg-[#ff7a59]/90" : "bg-muted text-muted-foreground"}`}
                    disabled={!connected || sending}
                    onClick={handleSend}
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {connected ? "SEND VIA HUBSPOT" : "CONNECT HUBSPOT TO SEND"}
                  </Button>
                  {!connected && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Connect your account above to enable sending.
                    </p>
                  )}
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
