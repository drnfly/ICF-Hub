import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, User, FileText, Loader2, Mail, Phone, MapPin, Save, Sparkles, Zap, ArrowRight, Bell, Calendar, BarChart3, CheckCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ContractorDashboard() {
  const navigate = useNavigate();
  const [contractor, setContractor] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [scoringLead, setScoringLead] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const token = localStorage.getItem("icf_token");

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/contractors/me/profile`, { headers }),
      axios.get(`${API}/leads`, { headers }),
      axios.get(`${API}/notifications`, { headers })
    ]).then(([profileRes, leadsRes, notifRes]) => {
      setContractor(profileRes.data);
      setProfileForm(profileRes.data);
      setLeads(leadsRes.data);
      setNotifications(notifRes.data);
    }).catch(() => {
      localStorage.removeItem("icf_token");
      navigate("/auth");
    }).finally(() => setLoading(false));
  }, [token, navigate]);

  const markNotifRead = async (id) => {
    try {
      await axios.put(`${API}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {}
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put(`${API}/contractors/profile`, {
        company_name: profileForm.company_name,
        phone: profileForm.phone,
        city: profileForm.city,
        state: profileForm.state,
        description: profileForm.description,
        years_experience: parseInt(profileForm.years_experience) || 0
      }, { headers: { Authorization: `Bearer ${token}` } });
      setContractor(data);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    try {
      await axios.put(`${API}/leads/${leadId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
      toast.success("Lead status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const logout = () => {
    localStorage.removeItem("icf_token");
    localStorage.removeItem("icf_contractor");
    navigate("/");
    toast.success("Logged out");
  };

  const scoreLead = async (leadId) => {
    setScoringLead(leadId);
    try {
      const { data } = await axios.post(`${API}/leads/${leadId}/score`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ai_score: data.ai_score } : l));
      toast.success("Lead scored by AI!");
    } catch {
      toast.error("Failed to score lead");
    } finally { setScoringLead(null); }
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusColors = {
    new: "bg-blue-100 text-blue-700 border-blue-200",
    contacted: "bg-yellow-100 text-yellow-700 border-yellow-200",
    qualified: "bg-green-100 text-green-700 border-green-200",
    closed: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <div className="pt-16 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="mono-label mb-1 block">DASHBOARD</span>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Welcome, <span className="text-primary">{contractor?.company_name}</span>
            </h1>
          </div>
          <Button
            data-testid="dashboard-logout-btn"
            variant="outline"
            onClick={logout}
            className="rounded-sm text-xs tracking-widest font-bold uppercase"
          >
            <LogOut className="w-4 h-4 mr-2" /> LOGOUT
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "TOTAL LEADS", val: leads.length },
            { label: "NEW", val: leads.filter(l => l.status === "new").length },
            { label: "CONTACTED", val: leads.filter(l => l.status === "contacted").length },
            { label: "QUALIFIED", val: leads.filter(l => l.status === "qualified").length },
          ].map((s, i) => (
            <div key={i} data-testid={`dashboard-stat-${i}`} className="bg-card border border-border rounded-sm p-4">
              <div className="mono-label mb-1">{s.label}</div>
              <div className="stat-value text-2xl text-primary">{s.val}</div>
            </div>
          ))}
        </div>

        {/* AI Tools Quick Access */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { testid: "dashboard-content-agent", icon: Sparkles, title: "AI Content Generator", desc: "Create SEO social media posts", to: "/content" },
            { testid: "dashboard-campaign-agent", icon: Zap, title: "AI Campaign Manager", desc: "Multi-platform marketing campaigns", to: "/campaigns" },
            { testid: "dashboard-calendar-link", icon: Calendar, title: "Content Calendar", desc: "Schedule and publish posts", to: "/calendar" },
            { testid: "dashboard-analytics-link", icon: BarChart3, title: "Analytics Dashboard", desc: "Track leads and performance", to: "/analytics" },
          ].map((tool) => (
            <div
              key={tool.testid}
              data-testid={tool.testid}
              onClick={() => navigate(tool.to)}
              className="bg-card border border-border rounded-sm p-4 cursor-pointer hover:border-primary/30 transition-all hover:scale-[1.01] flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                <tool.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold truncate" style={{ fontFamily: "'Clash Display', sans-serif" }}>{tool.title}</h3>
                <p className="text-[10px] text-muted-foreground truncate">{tool.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList className="bg-muted rounded-sm">
            <TabsTrigger data-testid="dashboard-leads-tab" value="leads" className="rounded-sm text-xs tracking-widest font-semibold uppercase">
              <FileText className="w-3 h-3 mr-2" /> LEADS
            </TabsTrigger>
            <TabsTrigger data-testid="dashboard-profile-tab" value="profile" className="rounded-sm text-xs tracking-widest font-semibold uppercase">
              <User className="w-3 h-3 mr-2" /> PROFILE
            </TabsTrigger>
            <TabsTrigger data-testid="dashboard-notifications-tab" value="notifications" className="rounded-sm text-xs tracking-widest font-semibold uppercase relative">
              <Bell className="w-3 h-3 mr-2" /> NOTIFICATIONS
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="ml-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full inline-flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            {leads.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-sm p-12 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>No Leads Yet</h3>
                <p className="text-sm text-muted-foreground">Leads from homeowners will appear here when they submit quote requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead, i) => (
                  <div
                    key={lead.id}
                    data-testid={`lead-card-${i}`}
                    className="bg-card border border-border rounded-sm p-6 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>{lead.name}</h3>
                          <Badge className={`text-[10px] tracking-wider uppercase rounded-sm border ${statusColors[lead.status] || statusColors.new}`}>
                            {lead.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                          {(lead.city || lead.state) && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[lead.city, lead.state].filter(Boolean).join(", ")}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                          {lead.project_type && <Badge variant="outline" className="rounded-sm text-[10px]">{lead.project_type.replace(/_/g, " ")}</Badge>}
                          {lead.project_size && <Badge variant="outline" className="rounded-sm text-[10px]">{lead.project_size.replace(/_/g, " ")}</Badge>}
                          {lead.budget_range && <Badge variant="outline" className="rounded-sm text-[10px]">{lead.budget_range.replace(/_/g, " ")}</Badge>}
                        </div>
                        {lead.description && <p className="text-sm text-muted-foreground">{lead.description}</p>}
                      </div>
                      <div className="flex-shrink-0 flex flex-col gap-2">
                        <Select value={lead.status} onValueChange={v => updateLeadStatus(lead.id, v)}>
                          <SelectTrigger data-testid={`lead-status-select-${i}`} className="w-36 rounded-sm text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          data-testid={`lead-score-btn-${i}`}
                          variant="outline"
                          size="sm"
                          onClick={() => scoreLead(lead.id)}
                          disabled={scoringLead === lead.id}
                          className="rounded-sm text-xs tracking-widest uppercase w-36"
                        >
                          {scoringLead === lead.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          AI SCORE
                        </Button>
                      </div>
                    </div>
                    {lead.ai_score && (
                      <div className="mt-4 p-4 bg-muted/30 border border-dashed border-border rounded-sm">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="mono-label text-[9px]">SCORE</span>
                            <span className={`stat-value text-xl ${lead.ai_score.score >= 70 ? 'text-green-600' : lead.ai_score.score >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                              {lead.ai_score.score}
                            </span>
                          </div>
                          <Badge className={`text-[10px] tracking-wider uppercase rounded-sm ${
                            lead.ai_score.grade === 'A' ? 'bg-green-100 text-green-700' :
                            lead.ai_score.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                            lead.ai_score.grade === 'C' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            GRADE {lead.ai_score.grade}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] tracking-wider uppercase rounded-sm">
                            {lead.ai_score.urgency} urgency
                          </Badge>
                          {lead.ai_score.estimated_value && (
                            <span className="text-xs font-semibold text-primary">{lead.ai_score.estimated_value}</span>
                          )}
                        </div>
                        {lead.ai_score.insights && <p className="text-xs text-muted-foreground mb-2">{lead.ai_score.insights}</p>}
                        {lead.ai_score.recommended_action && (
                          <div className="flex items-start gap-2 mb-2">
                            <ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-xs font-medium">{lead.ai_score.recommended_action}</p>
                          </div>
                        )}
                        {lead.ai_score.follow_up_message && (
                          <div className="mt-2 p-3 bg-card border border-border rounded-sm">
                            <span className="mono-label text-[9px] block mb-1">SUGGESTED FOLLOW-UP</span>
                            <p className="text-xs text-foreground/80 italic">"{lead.ai_score.follow_up_message}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <div className="bg-card border border-border rounded-sm p-8 relative tech-corner max-w-2xl">
              <div className="space-y-4">
                <div>
                  <Label className="mono-label mb-2 block">COMPANY NAME</Label>
                  <Input
                    data-testid="profile-company-input"
                    value={profileForm.company_name || ""}
                    onChange={e => setProfileForm(p => ({ ...p, company_name: e.target.value }))}
                    className="rounded-sm bg-muted/50 border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mono-label mb-2 block">PHONE</Label>
                    <Input
                      data-testid="profile-phone-input"
                      value={profileForm.phone || ""}
                      onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      className="rounded-sm bg-muted/50 border-border"
                    />
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">YEARS EXPERIENCE</Label>
                    <Input
                      data-testid="profile-experience-input"
                      type="number"
                      value={profileForm.years_experience || 0}
                      onChange={e => setProfileForm(p => ({ ...p, years_experience: e.target.value }))}
                      className="rounded-sm bg-muted/50 border-border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mono-label mb-2 block">CITY</Label>
                    <Input
                      data-testid="profile-city-input"
                      value={profileForm.city || ""}
                      onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))}
                      className="rounded-sm bg-muted/50 border-border"
                    />
                  </div>
                  <div>
                    <Label className="mono-label mb-2 block">STATE</Label>
                    <Input
                      data-testid="profile-state-input"
                      value={profileForm.state || ""}
                      onChange={e => setProfileForm(p => ({ ...p, state: e.target.value }))}
                      className="rounded-sm bg-muted/50 border-border"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mono-label mb-2 block">DESCRIPTION</Label>
                  <Textarea
                    data-testid="profile-description-input"
                    value={profileForm.description || ""}
                    onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))}
                    rows={4}
                    className="rounded-sm bg-muted/50 border-border"
                    placeholder="Tell homeowners about your ICF expertise..."
                  />
                </div>
                <Button
                  data-testid="profile-save-btn"
                  onClick={updateProfile}
                  disabled={saving}
                  className="rounded-sm text-xs tracking-widest font-bold uppercase px-6 py-3 hard-shadow"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  <Save className="w-4 h-4 mr-2" /> SAVE PROFILE
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="space-y-3">
              {notifications.length > 0 && (
                <div className="flex justify-end mb-2">
                  <Button
                    data-testid="mark-all-read-btn"
                    variant="outline"
                    size="sm"
                    onClick={markAllRead}
                    className="rounded-sm text-[10px] tracking-widest uppercase"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> MARK ALL READ
                  </Button>
                </div>
              )}
              {notifications.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-sm p-12 text-center">
                  <Bell className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>No Notifications</h3>
                  <p className="text-sm text-muted-foreground">You'll receive notifications when new leads arrive or posts are published.</p>
                </div>
              ) : (
                notifications.map((notif, i) => (
                  <div
                    key={notif.id}
                    data-testid={`notification-${i}`}
                    onClick={() => markNotifRead(notif.id)}
                    className={`bg-card border rounded-sm p-4 cursor-pointer transition-colors ${
                      notif.read ? "border-border opacity-60" : "border-primary/30 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{notif.title}</span>
                          <Badge variant="outline" className="text-[9px] tracking-wider uppercase rounded-sm">{notif.type?.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                        <span className="mono-label text-[9px] mt-1 block">{new Date(notif.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
