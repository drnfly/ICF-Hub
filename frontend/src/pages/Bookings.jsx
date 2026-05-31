import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { Plus, CalendarPlus, Truck, CheckCircle, X as XIcon, Fire, Snowflake, Drop } from "@phosphor-icons/react";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};

const EMPTY = {
  customer_name: "",
  customer_id: "",
  contact: "",
  equipment_id: "",
  quantity: 1,
  tentative_start_date: plusDays(7),
  tentative_end_date: plusDays(21),
  is_delivery: false,
  delivery_address: "",
  estimated_value: 0,
  probability: "warm",
  notes: "",
};

const probColors = {
  hot: "bg-red-100 text-red-800 border-red-300",
  warm: "bg-orange-100 text-orange-800 border-orange-300",
  cold: "bg-blue-100 text-blue-800 border-blue-300",
};

const probIcons = { hot: Fire, warm: Drop, cold: Snowflake };

const statusColors = {
  tentative: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-zinc-100 text-zinc-600 border-zinc-300",
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [b, e, c] = await Promise.all([
        api.get("/bookings"),
        api.get("/equipment"),
        api.get("/customers"),
      ]);
      setBookings(b.data);
      setEquipment(e.data);
      setCustomers(c.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(b) {
    setEditing(b);
    setForm({
      customer_name: b.customer_name || "",
      customer_id: b.customer_id || "",
      contact: b.contact || "",
      equipment_id: b.equipment_id || "",
      quantity: b.quantity || 1,
      tentative_start_date: b.tentative_start_date,
      tentative_end_date: b.tentative_end_date,
      is_delivery: !!b.is_delivery,
      delivery_address: b.delivery_address || "",
      estimated_value: b.estimated_value || 0,
      probability: b.probability || "warm",
      notes: b.notes || "",
    });
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        estimated_value: Number(form.estimated_value),
        customer_id: form.customer_id || null,
      };
      if (editing) {
        await api.patch(`/bookings/${editing.id}`, payload);
        toast.success("Booking updated");
      } else {
        await api.post("/bookings", payload);
        toast.success("Booking added to pipeline");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Failed");
    }
  }

  async function confirmBooking(b) {
    if (!confirm(`Confirm booking for ${b.customer_name}? This will create a rental and reserve ${b.quantity} × ${b.equipment_name}.`)) return;
    try {
      const { data } = await api.post(`/bookings/${b.id}/confirm`);
      toast.success(`Rental created for ${b.customer_name}`);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Confirm failed");
    }
  }

  async function cancelBooking(b) {
    if (!confirm(`Cancel booking for ${b.customer_name}?`)) return;
    try {
      await api.delete(`/bookings/${b.id}`);
      toast.success("Booking cancelled");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Cancel failed");
    }
  }

  const tentative = bookings.filter((b) => b.status === "tentative");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const totalValue = tentative.reduce((s, b) => s + (b.estimated_value || 0), 0);
  const hotCount = tentative.filter((b) => b.probability === "hot").length;

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1500px]" data-testid="bookings-page">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label-eyebrow">Pipeline</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-zinc-900 mt-2">Bookings & Deliveries</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Tentative inquiries and scheduled deliveries — confirm to convert into a live rental.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="new-booking-btn"
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display font-semibold uppercase tracking-wider gap-2">
              <CalendarPlus size={16} weight="bold" /> New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm max-w-lg max-h-[90vh] overflow-y-auto" data-testid="booking-dialog">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-2xl">
                {editing ? "Edit booking" : "New booking"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3" data-testid="booking-form">
              <div>
                <Label className="label-eyebrow">Customer / Lead name</Label>
                <Input required value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="rounded-sm mt-1" data-testid="bk-customer-name"
                  placeholder="Big Sky Concrete or new lead" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="label-eyebrow">Link existing customer</Label>
                  <Select value={form.customer_id || "none"} onValueChange={(v) => {
                    if (v === "none") {
                      setForm({ ...form, customer_id: "" });
                    } else {
                      const c = customers.find((x) => x.id === v);
                      setForm({ ...form, customer_id: v, customer_name: c?.name || form.customer_name });
                    }
                  }}>
                    <SelectTrigger className="rounded-sm mt-1" data-testid="bk-customer-select"><SelectValue placeholder="(new lead)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">(new lead — not in DB)</SelectItem>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Contact (phone/email)</Label>
                  <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    className="rounded-sm mt-1" data-testid="bk-contact"
                    placeholder="555-0100 or x@y.com" />
                </div>
              </div>

              <div>
                <Label className="label-eyebrow">Equipment</Label>
                <Select value={form.equipment_id} onValueChange={(v) => setForm({ ...form, equipment_id: v })}>
                  <SelectTrigger className="rounded-sm mt-1" data-testid="bk-equipment"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent>
                    {equipment.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} — {e.available} avail
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="label-eyebrow">Quantity</Label>
                  <Input type="number" min="1" required value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="rounded-sm mt-1" data-testid="bk-qty" />
                </div>
                <div>
                  <Label className="label-eyebrow">Est. value $</Label>
                  <Input type="number" min="0" step="1" value={form.estimated_value}
                    onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
                    className="rounded-sm mt-1" data-testid="bk-value" />
                </div>
                <div>
                  <Label className="label-eyebrow">Tentative start</Label>
                  <Input type="date" required value={form.tentative_start_date}
                    onChange={(e) => setForm({ ...form, tentative_start_date: e.target.value })}
                    className="rounded-sm mt-1" data-testid="bk-start" />
                </div>
                <div>
                  <Label className="label-eyebrow">Tentative end</Label>
                  <Input type="date" required value={form.tentative_end_date}
                    onChange={(e) => setForm({ ...form, tentative_end_date: e.target.value })}
                    className="rounded-sm mt-1" data-testid="bk-end" />
                </div>
              </div>

              <div>
                <Label className="label-eyebrow">Probability</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { v: "hot", label: "Hot", desc: "Verbal yes / PO ready", icon: Fire, c: "red" },
                    { v: "warm", label: "Warm", desc: "Strong interest", icon: Drop, c: "orange" },
                    { v: "cold", label: "Cold", desc: "Just exploring", icon: Snowflake, c: "blue" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setForm({ ...form, probability: opt.v })}
                      data-testid={`bk-prob-${opt.v}`}
                      className={`text-left p-2 border rounded-sm transition-all ${
                        form.probability === opt.v
                          ? `border-${opt.c}-500 bg-${opt.c}-50 ring-1 ring-${opt.c}-500`
                          : "border-zinc-200 bg-white hover:border-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <opt.icon size={14} weight="fill" className={form.probability === opt.v ? `text-${opt.c}-600` : "text-zinc-400"} />
                        <span className={`font-display font-bold text-xs uppercase tracking-wider ${form.probability === opt.v ? `text-${opt.c}-700` : "text-zinc-700"}`}>{opt.label}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-zinc-200 p-3 rounded-sm bg-zinc-50/60">
                <div className="flex items-center justify-between">
                  <Label className="label-eyebrow flex items-center gap-2 cursor-pointer" htmlFor="is_delivery">
                    <Truck size={14} className="text-orange-600" weight="bold" />
                    Delivery required
                  </Label>
                  <Switch
                    id="is_delivery"
                    checked={form.is_delivery}
                    onCheckedChange={(v) => setForm({ ...form, is_delivery: v })}
                    data-testid="bk-is-delivery"
                  />
                </div>
                {form.is_delivery && (
                  <div className="mt-3">
                    <Label className="label-eyebrow">Delivery address</Label>
                    <Input value={form.delivery_address}
                      onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                      className="rounded-sm mt-1" data-testid="bk-address"
                      placeholder="Job site street, city" />
                  </div>
                )}
              </div>

              <div>
                <Label className="label-eyebrow">Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-sm mt-1" data-testid="bk-notes"
                  placeholder="Job name, special handling, source of lead…" />
              </div>

              <DialogFooter>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider" data-testid="bk-submit">
                  {editing ? "Save changes" : "Add to pipeline"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryStat label="Tentative" value={tentative.length} hint="in pipeline" />
        <SummaryStat label="Pipeline value" value={`$${totalValue.toLocaleString()}`} hint="open opportunities" />
        <SummaryStat label="Hot leads" value={hotCount} hint="ready to close" accent="text-red-600" />
        <SummaryStat label="Confirmed" value={confirmed.length} hint="→ became rentals" accent="text-green-600" />
      </div>

      <Tabs defaultValue="tentative" className="w-full">
        <TabsList className="rounded-sm bg-zinc-100 mb-4">
          <TabsTrigger value="tentative" data-testid="tab-tentative" className="rounded-sm font-display uppercase tracking-wider text-xs">Tentative ({tentative.length})</TabsTrigger>
          <TabsTrigger value="confirmed" data-testid="tab-confirmed" className="rounded-sm font-display uppercase tracking-wider text-xs">Confirmed ({confirmed.length})</TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled" className="rounded-sm font-display uppercase tracking-wider text-xs">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="tentative">
          <BookingsTable rows={tentative} onConfirm={confirmBooking} onCancel={cancelBooking} onEdit={openEdit} loading={loading} />
        </TabsContent>
        <TabsContent value="confirmed">
          <BookingsTable rows={confirmed} loading={loading} />
        </TabsContent>
        <TabsContent value="cancelled">
          <BookingsTable rows={cancelled} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryStat({ label, value, hint, accent }) {
  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="label-eyebrow">{label}</div>
      <div className={`font-display font-black text-3xl tracking-tight leading-none mt-2 ${accent || "text-zinc-900"}`}>{value}</div>
      {hint && <div className="text-xs text-zinc-500 mt-1">{hint}</div>}
    </div>
  );
}

function BookingsTable({ rows, onConfirm, onCancel, onEdit, loading }) {
  if (loading) return <div className="text-zinc-500 text-sm py-8">Loading…</div>;
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
        <CalendarPlus size={48} className="mx-auto mb-3 text-zinc-300" weight="duotone" />
        No bookings here yet.
      </div>
    );
  }
  return (
    <div className="border border-zinc-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100">
          <tr>
            {["Customer", "Equipment", "Qty", "Start", "End", "Heat", "Value", "Mode", "Actions"].map((h) => (
              <th key={h} className="text-left p-3 font-display font-bold uppercase tracking-wider text-xs text-zinc-700 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => {
            const ProbIcon = probIcons[b.probability] || Drop;
            return (
              <tr key={b.id} className={i % 2 ? "bg-zinc-50" : "bg-white"} data-testid={`booking-row-${b.id}`}>
                <td className="p-3">
                  <div className="font-display font-medium text-zinc-900">{b.customer_name}</div>
                  {b.contact && <div className="text-xs text-zinc-500">{b.contact}</div>}
                </td>
                <td className="p-3 text-zinc-700">{b.equipment_name}</td>
                <td className="p-3 font-mono text-zinc-900">{b.quantity}</td>
                <td className="p-3 font-mono text-zinc-700">{b.tentative_start_date}</td>
                <td className="p-3 font-mono text-zinc-700">{b.tentative_end_date}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-display font-semibold border ${probColors[b.probability]}`}>
                    <ProbIcon size={10} weight="fill" /> {b.probability}
                  </span>
                </td>
                <td className="p-3 font-mono text-zinc-900">${b.estimated_value}</td>
                <td className="p-3">
                  {b.is_delivery ? (
                    <span className="inline-flex items-center gap-1 text-orange-700 text-xs font-display font-semibold uppercase tracking-wider">
                      <Truck size={12} weight="bold" /> Delivery
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Pickup</span>
                  )}
                </td>
                <td className="p-3 flex gap-1">
                  {onConfirm && (
                    <Button size="sm" onClick={() => onConfirm(b)} data-testid={`confirm-${b.id}`}
                      className="rounded-sm font-display uppercase tracking-wider text-xs gap-1 h-8 bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle size={12} weight="bold" /> Confirm
                    </Button>
                  )}
                  {onEdit && (
                    <Button size="sm" variant="outline" onClick={() => onEdit(b)} data-testid={`edit-bk-${b.id}`}
                      className="rounded-sm font-display uppercase tracking-wider text-xs h-8">
                      Edit
                    </Button>
                  )}
                  {onCancel && (
                    <Button size="sm" variant="outline" onClick={() => onCancel(b)} data-testid={`cancel-bk-${b.id}`}
                      className="rounded-sm font-display uppercase tracking-wider text-xs h-8 hover:bg-red-50 hover:text-red-700 hover:border-red-300">
                      <XIcon size={12} weight="bold" />
                    </Button>
                  )}
                  {b.converted_rental_id && (
                    <span className="text-xs text-green-700 italic self-center">→ rental</span>
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
