import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { toast } from "sonner";
import { Plus, Receipt, ArrowUUpLeft } from "@phosphor-icons/react";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};

const statusColors = {
  active: "bg-blue-100 text-blue-800 border-blue-300",
  returned: "bg-green-100 text-green-800 border-green-300",
  lost: "bg-red-100 text-red-800 border-red-300",
  overdue: "bg-red-100 text-red-800 border-red-300",
};

export default function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [retOpen, setRetOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);
  const [custOpen, setCustOpen] = useState(false);

  const [form, setForm] = useState({
    customer_id: "", equipment_id: "", quantity: 1,
    start_date: today(), due_date: plusDays(14),
    deposit: 0, notes: "",
  });
  const [retForm, setRetForm] = useState({ return_date: today(), condition_on_return: "good", damage_fee: 0, notes: "" });
  const [custForm, setCustForm] = useState({ name: "", company: "", phone: "", email: "", address: "" });

  async function load() {
    const [r, e, c] = await Promise.all([
      api.get("/rentals"),
      api.get("/equipment"),
      api.get("/customers"),
    ]);
    setRentals(r.data);
    setEquipment(e.data);
    setCustomers(c.data);
  }
  useEffect(() => { load(); }, []);

  async function createRental(ev) {
    ev.preventDefault();
    try {
      await api.post("/rentals", {
        ...form,
        quantity: Number(form.quantity),
        deposit: Number(form.deposit),
      });
      toast.success("Rental created");
      setOpen(false);
      setForm({ customer_id: "", equipment_id: "", quantity: 1, start_date: today(), due_date: plusDays(14), deposit: 0, notes: "" });
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Failed");
    }
  }

  async function processReturn(ev) {
    ev.preventDefault();
    try {
      await api.post(`/rentals/${returnTarget.id}/return`, {
        ...retForm,
        damage_fee: Number(retForm.damage_fee),
      });
      toast.success("Return processed");
      setRetOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Failed");
    }
  }

  async function createCustomer(ev) {
    ev.preventDefault();
    try {
      await api.post("/customers", custForm);
      toast.success("Customer added");
      setCustOpen(false);
      setCustForm({ name: "", company: "", phone: "", email: "", address: "" });
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Failed");
    }
  }

  function openReturn(r) {
    setReturnTarget(r);
    setRetForm({ return_date: today(), condition_on_return: "good", damage_fee: 0, notes: "" });
    setRetOpen(true);
  }

  const activeRentals = rentals.filter((r) => r.status === "active");
  const closedRentals = rentals.filter((r) => r.status !== "active");
  const todayStr = today();

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1500px]" data-testid="rentals-page">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label-eyebrow">Rental Ops</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-zinc-900 mt-2">Rentals</h1>
          <p className="text-zinc-500 mt-1 text-sm">{activeRentals.length} active · {closedRentals.length} closed</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={custOpen} onOpenChange={setCustOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-customer-btn" variant="outline" className="rounded-sm font-display uppercase tracking-wider gap-2">
                <Plus size={14} weight="bold" /> Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm">
              <DialogHeader><DialogTitle className="font-display font-bold text-2xl">New customer</DialogTitle></DialogHeader>
              <form onSubmit={createCustomer} className="space-y-3" data-testid="customer-form">
                <div>
                  <Label className="label-eyebrow">Name *</Label>
                  <Input required value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} className="rounded-sm mt-1" data-testid="cust-name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="label-eyebrow">Company</Label>
                    <Input value={custForm.company} onChange={(e) => setCustForm({ ...custForm, company: e.target.value })} className="rounded-sm mt-1" />
                  </div>
                  <div>
                    <Label className="label-eyebrow">Phone</Label>
                    <Input value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} className="rounded-sm mt-1" />
                  </div>
                  <div>
                    <Label className="label-eyebrow">Email</Label>
                    <Input type="email" value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} className="rounded-sm mt-1" />
                  </div>
                  <div>
                    <Label className="label-eyebrow">Address</Label>
                    <Input value={custForm.address} onChange={(e) => setCustForm({ ...custForm, address: e.target.value })} className="rounded-sm mt-1" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider" data-testid="cust-submit">Add customer</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-rental-btn"
                className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider gap-2">
                <Plus size={14} weight="bold" /> New Rental
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm max-w-lg">
              <DialogHeader><DialogTitle className="font-display font-bold text-2xl">New rental</DialogTitle></DialogHeader>
              <form onSubmit={createRental} className="space-y-3" data-testid="rental-form">
                <div>
                  <Label className="label-eyebrow">Customer</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger className="rounded-sm mt-1" data-testid="rental-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Equipment</Label>
                  <Select value={form.equipment_id} onValueChange={(v) => setForm({ ...form, equipment_id: v })}>
                    <SelectTrigger className="rounded-sm mt-1" data-testid="rental-equipment"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                    <SelectContent>
                      {equipment.map((e) => (
                        <SelectItem key={e.id} value={e.id} disabled={e.available === 0}>
                          {e.name} — {e.available} avail @ ${e.daily_rate}/day
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="label-eyebrow">Quantity</Label>
                    <Input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-sm mt-1" data-testid="rental-qty" />
                  </div>
                  <div>
                    <Label className="label-eyebrow">Deposit $</Label>
                    <Input type="number" min="0" step="1" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} className="rounded-sm mt-1" data-testid="rental-deposit" />
                  </div>
                  <div>
                    <Label className="label-eyebrow">Start</Label>
                    <Input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="rounded-sm mt-1" data-testid="rental-start" />
                  </div>
                  <div>
                    <Label className="label-eyebrow">Due</Label>
                    <Input type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="rounded-sm mt-1" data-testid="rental-due" />
                  </div>
                </div>
                <div>
                  <Label className="label-eyebrow">Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-sm mt-1" />
                </div>
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider" data-testid="rental-submit">
                  Create rental
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="rounded-sm bg-zinc-100 mb-4">
          <TabsTrigger value="active" data-testid="tab-active" className="rounded-sm font-display uppercase tracking-wider text-xs">Active ({activeRentals.length})</TabsTrigger>
          <TabsTrigger value="closed" data-testid="tab-closed" className="rounded-sm font-display uppercase tracking-wider text-xs">Closed ({closedRentals.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <RentalTable rentals={activeRentals} onReturn={openReturn} todayStr={todayStr} />
        </TabsContent>
        <TabsContent value="closed">
          <RentalTable rentals={closedRentals} onReturn={null} todayStr={todayStr} />
        </TabsContent>
      </Tabs>

      {/* Return dialog */}
      <Dialog open={retOpen} onOpenChange={setRetOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-2xl">Return equipment</DialogTitle>
          </DialogHeader>
          {returnTarget && (
            <form onSubmit={processReturn} className="space-y-3" data-testid="return-form">
              <div className="border border-zinc-200 p-3 bg-zinc-50 text-sm">
                <div className="label-eyebrow">Rental</div>
                <div className="font-display font-medium text-zinc-900 mt-1">{returnTarget.equipment_name} × {returnTarget.quantity}</div>
                <div className="text-xs text-zinc-500">{returnTarget.customer_name} · due {returnTarget.due_date}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="label-eyebrow">Return date</Label>
                  <Input type="date" required value={retForm.return_date} onChange={(e) => setRetForm({ ...retForm, return_date: e.target.value })} className="rounded-sm mt-1" data-testid="ret-date" />
                </div>
                <div>
                  <Label className="label-eyebrow">Condition</Label>
                  <Select value={retForm.condition_on_return} onValueChange={(v) => setRetForm({ ...retForm, condition_on_return: v })}>
                    <SelectTrigger className="rounded-sm mt-1" data-testid="ret-cond"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["excellent", "good", "fair", "poor", "damaged", "lost"].map((c) =>
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Damage / loss fee $</Label>
                  <Input type="number" min="0" value={retForm.damage_fee} onChange={(e) => setRetForm({ ...retForm, damage_fee: e.target.value })} className="rounded-sm mt-1" data-testid="ret-fee" />
                </div>
                <div>
                  <Label className="label-eyebrow">Notes</Label>
                  <Input value={retForm.notes} onChange={(e) => setRetForm({ ...retForm, notes: e.target.value })} className="rounded-sm mt-1" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider" data-testid="ret-submit">
                Process return
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RentalTable({ rentals, onReturn, todayStr }) {
  if (rentals.length === 0) {
    return (
      <div className="border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
        <Receipt size={48} className="mx-auto mb-3 text-zinc-300" weight="duotone" />
        No rentals here.
      </div>
    );
  }
  return (
    <div className="border border-zinc-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100">
          <tr>
            {["Customer", "Equipment", "Qty", "Start", "Due", "Status", "Deposit", "Actions"].map((h) => (
              <th key={h} className="text-left p-3 font-display font-bold uppercase tracking-wider text-xs text-zinc-700 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rentals.map((r, i) => {
            const isOverdue = r.status === "active" && r.due_date < todayStr;
            const displayStatus = isOverdue ? "overdue" : r.status;
            return (
              <tr key={r.id} className={i % 2 ? "bg-zinc-50" : "bg-white"} data-testid={`rental-row-${r.id}`}>
                <td className="p-3 font-display font-medium text-zinc-900">{r.customer_name}</td>
                <td className="p-3 text-zinc-700">{r.equipment_name}</td>
                <td className="p-3 font-mono text-zinc-900">{r.quantity}</td>
                <td className="p-3 font-mono text-zinc-700">{r.start_date}</td>
                <td className={`p-3 font-mono ${isOverdue ? "text-red-600 font-bold" : "text-zinc-700"}`}>{r.due_date}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-display font-semibold border ${statusColors[displayStatus] || statusColors.active}`}>
                    {displayStatus}
                  </span>
                </td>
                <td className="p-3 font-mono text-zinc-900">${r.deposit}</td>
                <td className="p-3">
                  {onReturn && (
                    <Button size="sm" variant="outline" onClick={() => onReturn(r)} data-testid={`return-${r.id}`}
                      className="rounded-sm font-display uppercase tracking-wider text-xs gap-1 h-8">
                      <ArrowUUpLeft size={12} weight="bold" /> Return
                    </Button>
                  )}
                  {!onReturn && r.condition_on_return && (
                    <span className="text-xs text-zinc-500 capitalize">→ {r.condition_on_return}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
