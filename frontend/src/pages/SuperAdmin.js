import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, DollarSign, MessageSquare, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ leads: [], users: [], payments: [], stats: {} });
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState("");

  const checkAuth = () => {
    if (password === "admin123") { // Simple protection for demo
      setAuth(true);
      fetchData();
    } else {
      toast.error("Invalid Password");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, usersRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/admin/leads`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/payments`)
      ]);
      
      setData({
        leads: leadsRes.data,
        users: usersRes.data,
        payments: paymentsRes.data,
        stats: {
          totalRevenue: paymentsRes.data.reduce((acc, p) => acc + (p.amount || 0), 0),
          activeLeads: leadsRes.data.filter(l => l.status === 'pending_match').length,
          proContractors: usersRes.data.filter(u => u.plan === 'pro').length
        }
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  if (!auth) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-secondary/30" data-testid="admin-login-page">
        <Card className="w-full max-w-sm" data-testid="admin-login-card">
          <CardHeader>
            <CardTitle className="text-center" data-testid="admin-login-title">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <Input 
              type="password" 
              placeholder="Enter Admin Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mb-4"
              data-testid="admin-login-password-input"
            />
            <Button className="w-full" onClick={checkAuth} data-testid="admin-login-submit-button">Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-secondary/30 p-6" data-testid="admin-dashboard-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-8" data-testid="admin-dashboard-header">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }} data-testid="admin-dashboard-title">
            Super Admin <span className="text-primary">Dashboard</span>
          </h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" data-testid="admin-inventory-portal-button">
              <a href="https://inventory-app-nine-kappa.vercel.app/" target="_blank" rel="noopener noreferrer">
                Open Inventory Portal
              </a>
            </Button>
            <Button variant="outline" onClick={() => setAuth(false)} data-testid="admin-logout-button">Logout</Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.stats.totalRevenue?.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leads</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.activeLeads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pro Contractors</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.proContractors}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="leads" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="leads">Intake Leads</TabsTrigger>
            <TabsTrigger value="users">Users & Contractors</TabsTrigger>
            <TabsTrigger value="payments">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{lead.name || "Anonymous"}</TableCell>
                      <TableCell className="max-w-md truncate">{lead.chat_summary || "No summary"}</TableCell>
                      <TableCell>
                        <Badge variant={lead.status === 'connected' ? "default" : "secondary"}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{lead.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company / Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.company_name || u.name || "Unknown"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.company_name ? "Contractor" : "Homeowner"}</TableCell>
                      <TableCell>
                        {u.plan === 'pro' && <Badge>PRO</Badge>}
                        {u.plan === 'free' && <Badge variant="outline">FREE</Badge>}
                      </TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>${p.amount}</TableCell>
                      <TableCell>
                        <Badge variant={p.payment_status === 'paid' ? "default" : "destructive"}>
                          {p.payment_status || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{p.plan_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
