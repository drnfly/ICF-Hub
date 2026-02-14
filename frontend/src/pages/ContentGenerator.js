import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Copy, Trash2, Loader2, Facebook, Linkedin, Twitter, Instagram, Video, RefreshCw, Calendar, Clock } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORMS = [
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "x", label: "X / Twitter", icon: Twitter },
  { value: "tiktok", label: "TikTok", icon: Video },
];

const CONTENT_TYPES = [
  { value: "educational", label: "Educational" },
  { value: "promotional", label: "Promotional" },
  { value: "testimonial", label: "Testimonial Story" },
  { value: "behind_the_scenes", label: "Behind the Scenes" },
  { value: "tip", label: "Quick Tip" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Friendly" },
  { value: "energetic", label: "Energetic" },
  { value: "authoritative", label: "Authoritative Expert" },
];

export default function ContentGenerator() {
  const navigate = useNavigate();
  const token = localStorage.getItem("icf_token");
  const [generating, setGenerating] = useState(false);
  const [savedContent, setSavedContent] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [form, setForm] = useState({
    platform: "facebook",
    content_type: "educational",
    topic: "",
    tone: "professional",
    count: 3,
  });

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }
    fetchContent();
  }, [token, navigate]);

  const fetchContent = async () => {
    try {
      const { data } = await axios.get(`${API}/content`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedContent(data);
    } catch {}
  };

  const generateContent = async () => {
    setGenerating(true);
    setCurrentResult(null);
    try {
      const { data } = await axios.post(`${API}/content/generate`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentResult(data);
      setSavedContent(prev => [data, ...prev]);
      toast.success(`${form.count} posts generated for ${form.platform}!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const deleteContent = async (id) => {
    try {
      await axios.delete(`${API}/content/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedContent(prev => prev.filter(c => c.id !== id));
      if (currentResult?.id === id) setCurrentResult(null);
      toast.success("Content deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getPlatformIcon = (platform) => {
    const p = PLATFORMS.find(pl => pl.value === platform);
    return p ? p.icon : Sparkles;
  };

  return (
    <div className="pt-16 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="mb-8">
          <span className="mono-label mb-1 block">AI AGENT</span>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Content <span className="text-primary">Generator</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI creates SEO-optimized social media content for your ICF business</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Generator Panel */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-card border border-border rounded-sm p-6 sticky top-24 relative tech-corner">
              <h3 className="text-sm font-bold tracking-widest uppercase mb-6" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                Generate Content
              </h3>

              <div className="space-y-4">
                <div>
                  <Label className="mono-label mb-2 block">PLATFORM</Label>
                  <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v }))}>
                    <SelectTrigger data-testid="content-platform-select" className="rounded-sm bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mono-label mb-2 block">CONTENT TYPE</Label>
                  <Select value={form.content_type} onValueChange={v => setForm(p => ({ ...p, content_type: v }))}>
                    <SelectTrigger data-testid="content-type-select" className="rounded-sm bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map(ct => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mono-label mb-2 block">TONE</Label>
                  <Select value={form.tone} onValueChange={v => setForm(p => ({ ...p, tone: v }))}>
                    <SelectTrigger data-testid="content-tone-select" className="rounded-sm bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mono-label mb-2 block">TOPIC (OPTIONAL)</Label>
                  <Input
                    data-testid="content-topic-input"
                    value={form.topic}
                    onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                    placeholder="e.g., hurricane resistance, energy savings..."
                    className="rounded-sm bg-muted/50"
                  />
                </div>

                <Button
                  data-testid="content-generate-btn"
                  onClick={generateContent}
                  disabled={generating}
                  className="w-full rounded-sm text-xs tracking-widest font-bold uppercase py-3 hard-shadow"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {generating ? "GENERATING..." : "GENERATE CONTENT"}
                </Button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="col-span-12 lg:col-span-8">
            <Tabs defaultValue="results" className="space-y-4">
              <TabsList className="bg-muted rounded-sm">
                <TabsTrigger value="results" className="rounded-sm text-xs tracking-widest font-semibold uppercase">
                  <Sparkles className="w-3 h-3 mr-2" /> LATEST
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-sm text-xs tracking-widest font-semibold uppercase">
                  <RefreshCw className="w-3 h-3 mr-2" /> HISTORY
                </TabsTrigger>
              </TabsList>

              <TabsContent value="results">
                {generating ? (
                  <div className="bg-card border border-dashed border-border rounded-sm p-16 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">AI is crafting your content...</p>
                  </div>
                ) : currentResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="rounded-sm text-[10px] tracking-wider uppercase">{currentResult.platform}</Badge>
                      <Badge variant="outline" className="rounded-sm text-[10px] tracking-wider uppercase">{currentResult.content_type}</Badge>
                    </div>
                    {(currentResult.items || []).map((item, i) => {
                      const Icon = getPlatformIcon(currentResult.platform);
                      return (
                        <div key={i} data-testid={`content-result-${i}`} className="bg-card border border-border rounded-sm p-6 relative tech-corner group">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-primary" />
                              <span className="mono-label">POST {i + 1}</span>
                            </div>
                            <button onClick={() => copyText(item.text || item)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-sm">
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </div>
                          <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">{item.text || (typeof item === "string" ? item : JSON.stringify(item))}</p>
                          {item.hashtags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {item.hashtags.map((tag, j) => (
                                <Badge key={j} variant="secondary" className="text-[10px] rounded-sm">
                                  {tag.startsWith("#") ? tag : `#${tag}`}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {item.cta && <p className="text-xs text-primary font-semibold mt-2">CTA: {item.cta}</p>}
                          {item.seo_keywords?.length > 0 && (
                            <div className="mt-2">
                              <span className="mono-label text-[9px]">SEO: </span>
                              <span className="text-[10px] text-muted-foreground">{item.seo_keywords.join(", ")}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-card border border-dashed border-border rounded-sm p-16 text-center">
                    <Sparkles className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>Ready to Create</h3>
                    <p className="text-sm text-muted-foreground">Select your platform and content type, then hit generate.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                {savedContent.length === 0 ? (
                  <div className="bg-card border border-dashed border-border rounded-sm p-12 text-center">
                    <p className="text-sm text-muted-foreground">No content generated yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedContent.map((batch) => (
                      <div key={batch.id} className="bg-card border border-border rounded-sm p-4 hover:border-primary/20 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="rounded-sm text-[10px] tracking-wider uppercase">{batch.platform}</Badge>
                            <Badge variant="outline" className="rounded-sm text-[10px] tracking-wider uppercase">{batch.content_type}</Badge>
                            <span className="mono-label text-[9px]">{batch.items?.length || 0} posts</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentResult(batch)} className="text-xs text-primary hover:underline">View</button>
                            <button onClick={() => deleteContent(batch.id)} className="p-1 hover:bg-muted rounded-sm">
                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {batch.items?.[0]?.text?.slice(0, 120) || "Generated content"}...
                        </p>
                        <span className="mono-label text-[9px] mt-1 block">{new Date(batch.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
