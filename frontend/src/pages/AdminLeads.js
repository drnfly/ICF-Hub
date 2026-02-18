import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await axios.get(`${API}/admin/leads`);
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (leadId, contractorId) => {
    setConnecting(leadId);
    try {
      await axios.post(`${API}/admin/connect`, {
        lead_id: leadId,
        contractor_id: contractorId
      });
      toast.success("Lead connected successfully!");
      fetchLeads(); // Refresh list
    } catch (err) {
      toast.error("Connection failed");
    } finally {
      setConnecting(null);
    }
  };

  if (loading) return <div className="pt-24 text-center">Loading leads...</div>;

  return (
    <div className="pt-24 min-h-screen bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-12">
          <span className="mono-label mb-3 block">ADMIN DASHBOARD</span>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Connection <span className="text-primary">Control Center</span>
          </h1>
          <p className="text-muted-foreground">
            Review AI-qualified leads and connect them with the perfect contractor.
          </p>
        </div>

        <div className="space-y-6">
          {leads.length === 0 ? (
            <div className="bg-card border border-border p-12 text-center rounded-sm">
              <p className="text-muted-foreground">No pending leads to review.</p>
            </div>
          ) : (
            leads.map(lead => (
              <div key={lead.id} className="bg-card border border-border rounded-sm p-6 shadow-sm">
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-12 lg:col-span-7">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        PENDING MATCH
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">New Lead Intake</h3>
                    <div className="bg-muted/50 p-4 rounded-sm text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                      {lead.chat_summary || "No summary available."}
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-5 border-l border-border pl-8">
                    <h4 className="font-bold mb-4 text-sm tracking-wider text-muted-foreground">AI RECOMMENDED MATCHES</h4>
                    <div className="space-y-3">
                      {lead.ai_matches?.map((contractor, i) => (
                        <div key={contractor.id || i} className="flex items-center justify-between p-3 bg-secondary rounded-sm border border-border/50">
                          <div>
                            <div className="font-semibold">{contractor.company_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {contractor.city}, {contractor.state}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleConnect(lead.id, contractor.id)}
                            disabled={connecting === lead.id}
                            className="text-xs uppercase font-bold tracking-wider"
                          >
                            {connecting === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Connect"}
                          </Button>
                        </div>
                      ))}
                      {(!lead.ai_matches || lead.ai_matches.length === 0) && (
                        <div className="text-sm text-muted-foreground italic">No automatic matches found.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
