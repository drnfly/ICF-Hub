import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Facebook, Linkedin, Twitter, Instagram, Video,
  Link2, Unlink, Loader2, ExternalLink, Check, Shield, ArrowRight
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_ICONS = {
  facebook: Facebook, instagram: Instagram, linkedin: Linkedin, x: Twitter, tiktok: Video
};

const PLATFORM_STYLES = {
  facebook: { bg: "bg-blue-50", border: "border-blue-200", accent: "text-blue-600", ring: "ring-blue-300" },
  instagram: { bg: "bg-pink-50", border: "border-pink-200", accent: "text-pink-600", ring: "ring-pink-300" },
  linkedin: { bg: "bg-sky-50", border: "border-sky-200", accent: "text-sky-600", ring: "ring-sky-300" },
  x: { bg: "bg-gray-50", border: "border-gray-300", accent: "text-gray-700", ring: "ring-gray-300" },
  tiktok: { bg: "bg-violet-50", border: "border-violet-200", accent: "text-violet-600", ring: "ring-violet-300" },
};

const HELP_TEXT = {
  facebook: "Connect your Facebook Page to auto-publish posts. You'll need a Page Access Token from the Facebook Developer portal.",
  instagram: "Connect your Instagram Business account via Facebook's Graph API. Requires a connected Facebook Page.",
  linkedin: "Connect your LinkedIn profile or company page. Generate an access token from LinkedIn Developer portal.",
  x: "Connect your X (Twitter) account. Create a developer app and generate API keys.",
  tiktok: "Connect your TikTok account. Register as a TikTok developer and create an app.",
};

export default function SocialSettings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("icf_token");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [expandedPlatform, setExpandedPlatform] = useState(null);
  const [connectForm, setConnectForm] = useState({ account_name: "", access_token: "", page_id: "" });

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }
    fetchAccounts();
  }, [token, navigate]);

  const fetchAccounts = async () => {
    try {
      const { data } = await axios.get(`${API}/social-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(data);
    } catch {} finally { setLoading(false); }
  };

  const connectAccount = async (platform) => {
    if (!connectForm.account_name) {
      toast.error("Account name/handle is required");
      return;
    }
    setConnecting(platform);
    try {
      const { data } = await axios.post(`${API}/social-accounts/connect`, {
        platform,
        account_name: connectForm.account_name,
        access_token: connectForm.access_token,
        page_id: connectForm.page_id
      }, { headers: { Authorization: `Bearer ${token}` } });
      setAccounts(prev => prev.map(a => a.platform === platform ? { ...a, connected: true, account_name: data.account_name } : a));
      setExpandedPlatform(null);
      setConnectForm({ account_name: "", access_token: "", page_id: "" });
      toast.success(`${data.platform_name} connected successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to connect");
    } finally { setConnecting(null); }
  };

  const disconnectAccount = async (platform) => {
    try {
      await axios.post(`${API}/social-accounts/disconnect`, { platform }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(prev => prev.map(a => a.platform === platform ? { ...a, connected: false, account_name: "" } : a));
      toast.success("Account disconnected");
    } catch { toast.error("Failed to disconnect"); }
  };

  const connectedCount = accounts.filter(a => a.connected).length;

  if (loading) return <div className="pt-16 min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="pt-16 min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        <div className="mb-8">
          <span className="mono-label mb-1 block">SETTINGS</span>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Connected <span className="text-primary">Accounts</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Link your social media accounts to auto-publish content from the Content Calendar
          </p>
        </div>

        {/* Connection Summary */}
        <div className="bg-card border border-border rounded-sm p-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
              <Link2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                {connectedCount} of {accounts.length} Platforms Connected
              </h3>
              <p className="text-xs text-muted-foreground">
                {connectedCount === 0
                  ? "Connect your accounts to enable auto-publishing"
                  : connectedCount === accounts.length
                    ? "All platforms connected. Auto-publishing is fully active."
                    : "Connect more platforms to maximize your reach"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {accounts.map(a => {
              const Icon = PLATFORM_ICONS[a.platform] || Link2;
              const style = PLATFORM_STYLES[a.platform] || {};
              return (
                <div
                  key={a.platform}
                  className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                    a.connected ? `${style.bg} ${style.accent}` : "bg-muted text-muted-foreground/30"
                  }`}
                  title={`${a.platform_name || a.platform}: ${a.connected ? "Connected" : "Not connected"}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform Cards */}
        <div className="space-y-4">
          {accounts.map((account, idx) => {
            const Icon = PLATFORM_ICONS[account.platform] || Link2;
            const style = PLATFORM_STYLES[account.platform] || {};
            const isExpanded = expandedPlatform === account.platform;

            return (
              <div
                key={account.platform}
                data-testid={`social-card-${account.platform}`}
                className={`bg-card border rounded-sm overflow-hidden transition-all ${
                  account.connected ? `${style.border}` : "border-border"
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${
                        account.connected ? `${style.bg} ${style.accent}` : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                            {account.platform_name || account.platform}
                          </h3>
                          {account.connected ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] tracking-wider uppercase rounded-sm border">
                              <Check className="w-3 h-3 mr-1" /> CONNECTED
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] tracking-wider uppercase rounded-sm text-muted-foreground">
                              NOT CONNECTED
                            </Badge>
                          )}
                        </div>
                        {account.connected && account.account_name && (
                          <p className="text-sm text-muted-foreground mt-0.5">@{account.account_name}</p>
                        )}
                        {!account.connected && (
                          <p className="text-xs text-muted-foreground mt-0.5">{HELP_TEXT[account.platform]}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {account.connected ? (
                        <Button
                          data-testid={`social-disconnect-${account.platform}`}
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectAccount(account.platform)}
                          className="rounded-sm text-xs tracking-widest uppercase text-red-500 hover:text-red-600 hover:border-red-300"
                        >
                          <Unlink className="w-3 h-3 mr-1" /> DISCONNECT
                        </Button>
                      ) : (
                        <Button
                          data-testid={`social-connect-${account.platform}`}
                          size="sm"
                          onClick={() => {
                            setExpandedPlatform(isExpanded ? null : account.platform);
                            setConnectForm({ account_name: "", access_token: "", page_id: "" });
                          }}
                          className={`rounded-sm text-xs tracking-widest font-bold uppercase ${style.ring ? `focus:${style.ring}` : ""}`}
                        >
                          <Link2 className="w-3 h-3 mr-1" /> CONNECT
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Connect Form */}
                {isExpanded && !account.connected && (
                  <div className="border-t border-border p-6 bg-muted/10">
                    <div className="max-w-lg space-y-4">
                      <div>
                        <Label className="mono-label mb-2 block">ACCOUNT NAME / HANDLE *</Label>
                        <Input
                          data-testid={`social-account-name-${account.platform}`}
                          value={connectForm.account_name}
                          onChange={e => setConnectForm(p => ({ ...p, account_name: e.target.value }))}
                          placeholder={`e.g., your${account.platform}handle`}
                          className="rounded-sm bg-card border-border"
                        />
                      </div>
                      <div>
                        <Label className="mono-label mb-2 block">ACCESS TOKEN</Label>
                        <Input
                          data-testid={`social-token-${account.platform}`}
                          type="password"
                          value={connectForm.access_token}
                          onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))}
                          placeholder="Paste your API access token"
                          className="rounded-sm bg-card border-border"
                        />
                      </div>
                      {account.platform === "facebook" && (
                        <div>
                          <Label className="mono-label mb-2 block">PAGE ID</Label>
                          <Input
                            data-testid={`social-pageid-${account.platform}`}
                            value={connectForm.page_id}
                            onChange={e => setConnectForm(p => ({ ...p, page_id: e.target.value }))}
                            placeholder="Your Facebook Page ID"
                            className="rounded-sm bg-card border-border"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield className="w-3 h-3" />
                        <span>Tokens are stored securely and only used for publishing.</span>
                      </div>
                      {account.auth_url && (
                        <a
                          href={account.auth_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Get your access token from {account.platform_name} Developer Portal
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <div className="flex gap-3 pt-2">
                        <Button
                          data-testid={`social-save-${account.platform}`}
                          onClick={() => connectAccount(account.platform)}
                          disabled={connecting === account.platform}
                          className="rounded-sm text-xs tracking-widest font-bold uppercase hard-shadow"
                        >
                          {connecting === account.platform && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                          CONNECT {account.platform_name?.toUpperCase()}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setExpandedPlatform(null)}
                          className="rounded-sm text-xs tracking-widest uppercase"
                        >
                          CANCEL
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-card border border-dashed border-border rounded-sm p-6">
          <h3 className="text-sm font-bold tracking-widest uppercase mb-3" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            How Auto-Publishing Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Connect", desc: "Link your social media accounts by providing API access tokens from each platform's developer portal." },
              { step: "02", title: "Generate & Schedule", desc: "Use AI Content Generator to create posts, then schedule them on the Content Calendar." },
              { step: "03", title: "Auto-Publish", desc: "When you hit 'Publish' on a scheduled post, it automatically posts to your connected account." },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="stat-value text-2xl text-primary/20">{s.step}</span>
                <div>
                  <h4 className="text-sm font-semibold mb-1">{s.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
