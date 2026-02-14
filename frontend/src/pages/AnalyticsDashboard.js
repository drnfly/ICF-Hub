import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, Users, FileText, Zap, Calendar, Send, Bell,
  Loader2, ArrowUp, ArrowDown, Facebook, Linkedin, Twitter, Instagram, Video
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ["#FF4F00", "#1A2B3C", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"];
const PLATFORM_ICONS = { facebook: Facebook, instagram: Instagram, linkedin: Linkedin, x: Twitter, tiktok: Video };

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("icf_token");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }
    fetchAnalytics();
  }, [token, navigate]);

  const fetchAnalytics = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(data);
    } catch { toast.error("Failed to load analytics"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="pt-16 min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!analytics) return null;

  const leadStatusData = Object.entries(analytics.leads.by_status || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value
  }));

  const leadsOverTime = Object.entries(analytics.leads.by_date || {}).slice(-14).map(([date, count]) => ({
    date: date.slice(5), leads: count
  }));

  const contentByPlatform = Object.entries(analytics.content.by_platform || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value
  }));

  const scheduleByPlatform = Object.entries(analytics.schedule.by_platform || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value
  }));

  return (
    <div className="pt-16 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <span className="mono-label mb-1 block">INTELLIGENCE</span>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Analytics <span className="text-primary">Dashboard</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track your leads, content, and campaign performance</p>
          </div>
          <Button data-testid="analytics-refresh-btn" variant="outline" onClick={fetchAnalytics} className="rounded-sm text-xs tracking-widest font-bold uppercase">
            <TrendingUp className="w-4 h-4 mr-2" /> REFRESH
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: Users, label: "TOTAL LEADS", val: analytics.leads.total, color: "text-blue-600" },
            { icon: TrendingUp, label: "CONVERSION", val: `${analytics.leads.conversion_rate}%`, color: "text-green-600" },
            { icon: FileText, label: "CONTENT CREATED", val: analytics.content.total_posts, color: "text-primary" },
            { icon: Zap, label: "CAMPAIGNS", val: analytics.campaigns.total, color: "text-purple-600" },
            { icon: Calendar, label: "SCHEDULED", val: analytics.schedule.by_status?.scheduled || 0, color: "text-sky-600" },
            { icon: Send, label: "PUBLISHED", val: analytics.schedule.by_status?.published || 0, color: "text-emerald-600" },
          ].map((kpi, i) => (
            <div key={i} data-testid={`analytics-kpi-${i}`} className="bg-card border border-border rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="mono-label text-[9px]">{kpi.label}</span>
              </div>
              <div className="stat-value text-2xl">{kpi.val}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Lead Pipeline */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-card border border-border rounded-sm p-6">
              <h3 className="text-sm font-bold tracking-widest uppercase mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>Lead Pipeline</h3>
              {leadStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={leadStatusData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "2px", fontSize: 12 }} />
                    <Bar dataKey="value" fill="#FF4F00" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No lead data yet</div>
              )}
            </div>
          </div>

          {/* Lead Status Breakdown */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-card border border-border rounded-sm p-6">
              <h3 className="text-sm font-bold tracking-widest uppercase mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>Lead Status</h3>
              <div className="space-y-3">
                {[
                  { status: "New", count: analytics.leads.by_status?.new || 0, color: "bg-blue-500" },
                  { status: "Contacted", count: analytics.leads.by_status?.contacted || 0, color: "bg-yellow-500" },
                  { status: "Qualified", count: analytics.leads.by_status?.qualified || 0, color: "bg-green-500" },
                  { status: "Closed", count: analytics.leads.by_status?.closed || 0, color: "bg-gray-400" },
                ].map((item, i) => {
                  const pct = analytics.leads.total > 0 ? Math.round((item.count / analytics.leads.total) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{item.status}</span>
                        <span className="text-muted-foreground">{item.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Leads Over Time */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-card border border-border rounded-sm p-6">
              <h3 className="text-sm font-bold tracking-widest uppercase mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>Leads Over Time</h3>
              {leadsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={leadsOverTime} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "2px", fontSize: 12 }} />
                    <Line type="monotone" dataKey="leads" stroke="#FF4F00" strokeWidth={2} dot={{ fill: "#FF4F00", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">No timeline data yet</div>
              )}
            </div>
          </div>

          {/* Content by Platform */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-card border border-border rounded-sm p-6">
              <h3 className="text-sm font-bold tracking-widest uppercase mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>Content by Platform</h3>
              {contentByPlatform.length > 0 ? (
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={contentByPlatform} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {contentByPlatform.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {contentByPlatform.map((item, i) => {
                      const Icon = PLATFORM_ICONS[item.name.toLowerCase()] || FileText;
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                          <Icon className="w-3 h-3" />
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">{item.value} posts</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No content data yet. Generate content to see analytics.</div>
              )}
            </div>
          </div>

          {/* Campaign Summary */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-card border border-border rounded-sm p-6">
              <h3 className="text-sm font-bold tracking-widest uppercase mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>Campaigns</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Draft", val: analytics.campaigns.by_status?.draft || 0, color: "text-gray-600" },
                  { label: "Generated", val: analytics.campaigns.by_status?.generated || 0, color: "text-green-600" },
                  { label: "Active", val: analytics.campaigns.by_status?.active || 0, color: "text-blue-600" },
                ].map((s, i) => (
                  <div key={i} className="text-center p-3 bg-muted/30 rounded-sm">
                    <div className={`stat-value text-xl ${s.color}`}>{s.val}</div>
                    <div className="mono-label text-[9px] mt-1">{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <Button
                data-testid="analytics-go-campaigns-btn"
                variant="outline"
                onClick={() => navigate("/campaigns")}
                className="w-full mt-4 rounded-sm text-xs tracking-widest uppercase"
              >
                <Zap className="w-3 h-3 mr-2" /> MANAGE CAMPAIGNS
              </Button>
            </div>
          </div>

          {/* Schedule Summary */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-card border border-border rounded-sm p-6">
              <h3 className="text-sm font-bold tracking-widest uppercase mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>Scheduled Posts</h3>
              {scheduleByPlatform.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={scheduleByPlatform} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "2px", fontSize: 12 }} />
                    <Bar dataKey="value" fill="#1A2B3C" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex flex-col items-center justify-center">
                  <Calendar className="w-8 h-8 text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">No scheduled posts yet</p>
                </div>
              )}
              <Button
                data-testid="analytics-go-calendar-btn"
                variant="outline"
                onClick={() => navigate("/calendar")}
                className="w-full mt-4 rounded-sm text-xs tracking-widest uppercase"
              >
                <Calendar className="w-3 h-3 mr-2" /> VIEW CALENDAR
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
