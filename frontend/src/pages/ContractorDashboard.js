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
import { LogOut, User, FileText, Loader2, Mail, Phone, MapPin, Save, Sparkles, Zap, ArrowRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ContractorDashboard() {
  const navigate = useNavigate();
  const [contractor, setContractor] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const token = localStorage.getItem("icf_token");

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/contractors/me/profile`, { headers }),
      axios.get(`${API}/leads`, { headers })
    ]).then(([profileRes, leadsRes]) => {
      setContractor(profileRes.data);
      setProfileForm(profileRes.data);
      setLeads(leadsRes.data);
    }).catch(() => {
      localStorage.removeItem("icf_token");
      navigate("/auth");
    }).finally(() => setLoading(false));
  }, [token, navigate]);

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

        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList className="bg-muted rounded-sm">
            <TabsTrigger data-testid="dashboard-leads-tab" value="leads" className="rounded-sm text-xs tracking-widest font-semibold uppercase">
              <FileText className="w-3 h-3 mr-2" /> LEADS
            </TabsTrigger>
            <TabsTrigger data-testid="dashboard-profile-tab" value="profile" className="rounded-sm text-xs tracking-widest font-semibold uppercase">
              <User className="w-3 h-3 mr-2" /> PROFILE
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
                      <div className="flex-shrink-0">
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
                      </div>
                    </div>
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
        </Tabs>
      </div>
    </div>
  );
}
