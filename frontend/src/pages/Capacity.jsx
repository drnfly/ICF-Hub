import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Package, MagnifyingGlass, Warning, Plus, Trash, CaretRight, CalendarPlus,
} from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Cell } from "recharts";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};

export default function Capacity() {
  const [equipment, setEquipment] = useState([]);
  const [items, setItems] = useState([{ equipment_id: "", qty: 100 }]);
  const [start, setStart] = useState(plusDays(7));
  const [end, setEnd] = useState(plusDays(21));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({
    customer_name: "",
    contact: "",
    is_delivery: false,
    delivery_address: "",
    probability: "warm",
    notes: "",
    estimated_value: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/equipment").then(({ data }) => {
      setEquipment(data);
      if (data.length && !items[0].equipment_id) {
        setItems([{ equipment_id: data[0].id, qty: 100 }]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setItem(idx, patch) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addRow() {
    // pick a SKU not already used
    const used = new Set(items.map((i) => i.equipment_id));
    const next = equipment.find((e) => !used.has(e.id));
    setItems((arr) => [...arr, { equipment_id: next?.id || "", qty: 50 }]);
  }
  function removeRow(idx) {
    setItems((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr));
  }

  async function check(e) {
    e?.preventDefault();
    const payload = items
      .filter((i) => i.equipment_id && Number(i.qty) > 0)
      .map((i) => ({ equipment_id: i.equipment_id, qty: Number(i.qty) }));
    if (payload.length === 0) {
      toast.error("Add at least one SKU with a quantity");
      return;
    }
    const ids = new Set();
    for (const it of payload) {
      if (ids.has(it.equipment_id)) {
        toast.error("Same SKU appears twice — merge the rows");
        return;
      }
      ids.add(it.equipment_id);
    }
    setLoading(true);
    try {
      const { data } = await api.post("/capacity/check", { start, end, items: payload });
      setResult(data);
      if (data.overall_ok) {
        toast.success(`Yes — all ${data.items_count} SKU${data.items_count > 1 ? "s" : ""} available`);
      } else {
        toast.warning(`Short on: ${data.blocked_skus.join(", ")}`);
      }
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Check failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveAsBookings(e) {
    e.preventDefault();
    if (!result?.results?.length) return;
    setSaving(true);
    try {
      const valuePerSku = result.results.length > 0
        ? Number(saveForm.estimated_value) / result.results.length
        : 0;
      const bookings = result.results.map((r) => ({
        customer_name: saveForm.customer_name,
        contact: saveForm.contact || null,
        equipment_id: r.equipment_id,
        quantity: r.qty_requested,
        tentative_start_date: result.start,
        tentative_end_date: result.end,
        is_delivery: saveForm.is_delivery,
        delivery_address: saveForm.is_delivery ? saveForm.delivery_address : null,
        estimated_value: valuePerSku,
        probability: saveForm.probability,
        notes: saveForm.notes,
      }));
      const { data } = await api.post("/bookings/bulk", { bookings });
      if (data.error_count > 0) {
        toast.warning(`${data.created_count} created · ${data.error_count} failed`);
      } else {
        toast.success(`${data.created_count} booking${data.created_count !== 1 ? "s" : ""} created`);
      }
      setSaveOpen(false);
      setSaveForm({
        customer_name: "",
        contact: "",
        is_delivery: false,
        delivery_address: "",
        probability: "warm",
        notes: "",
        estimated_value: 0,
      });
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1500px]" data-testid="capacity-page">
      <div className="mb-6">
        <div className="label-eyebrow">Capacity Check · Multi-SKU</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-zinc-900 mt-2">
          Can I rent it?
        </h1>
        <p className="text-zinc-500 mt-1 text-sm max-w-2xl">
          Add as many SKU + quantity rows as your job needs. The engine scans every active rental and tentative booking and tells you, per-SKU and per-day, whether the numbers pencil out.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* INPUT FORM */}
        <form
          onSubmit={check}
          className="lg:col-span-2 border border-zinc-200 bg-white p-6 self-start space-y-4"
          data-testid="capacity-form"
        >
          <div className="flex items-center gap-2 mb-2">
            <MagnifyingGlass size={20} weight="fill" className="text-orange-600" />
            <h2 className="font-display font-bold text-xl">Request</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="label-eyebrow">Start date</Label>
              <Input type="date" required value={start} onChange={(e) => setStart(e.target.value)}
                className="rounded-sm mt-1" data-testid="cap-start" />
            </div>
            <div>
              <Label className="label-eyebrow">End date</Label>
              <Input type="date" required value={end} onChange={(e) => setEnd(e.target.value)}
                className="rounded-sm mt-1" data-testid="cap-end" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="label-eyebrow">SKUs needed</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}
                disabled={items.length >= equipment.length}
                data-testid="cap-add-row"
                className="rounded-sm font-display uppercase tracking-wider text-xs gap-1 h-8">
                <Plus size={12} weight="bold" /> Add SKU
              </Button>
            </div>
            {items.map((it, idx) => {
              const eqSel = equipment.find((e) => e.id === it.equipment_id);
              return (
                <div key={idx} className="border border-zinc-200 p-3 rounded-sm bg-zinc-50/40 space-y-2" data-testid={`cap-row-${idx}`}>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <Select value={it.equipment_id} onValueChange={(v) => setItem(idx, { equipment_id: v })}>
                      <SelectTrigger className="rounded-sm" data-testid={`cap-eq-${idx}`}>
                        <SelectValue placeholder="Select equipment" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipment.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name} — {e.quantity} total
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min="1" required
                      value={it.qty}
                      onChange={(e) => setItem(idx, { qty: e.target.value })}
                      className="rounded-sm w-24 text-center font-mono"
                      data-testid={`cap-qty-${idx}`}
                      placeholder="qty"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={items.length <= 1}
                      className="p-2 hover:bg-red-100 text-red-700 rounded-sm disabled:opacity-30 disabled:cursor-not-allowed"
                      data-testid={`cap-remove-${idx}`}
                      aria-label="Remove row"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                  {eqSel && (
                    <div className="text-[11px] text-zinc-500 font-mono pl-1">
                      fleet {eqSel.quantity} · avail now {eqSel.available}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button type="submit" disabled={loading} data-testid="capacity-submit"
            className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display font-bold uppercase tracking-wider gap-2">
            <MagnifyingGlass size={16} weight="bold" />
            {loading ? "Checking…" : "Check availability"}
          </Button>

          <div className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100 pt-3">
            Engine includes: <span className="font-mono">active rentals</span> + <span className="font-mono">tentative bookings</span>. Returned rentals and cancelled bookings are excluded.
          </div>
        </form>

        {/* RESULT */}
        <div className="lg:col-span-3">
          {!result ? (
            <div className="border border-dashed border-zinc-300 bg-zinc-50 grid-paper p-10 text-center min-h-[400px] flex flex-col items-center justify-center">
              <Package size={48} className="text-zinc-300 mb-4" weight="duotone" />
              <div className="font-display font-bold text-zinc-700 text-lg">Add your SKUs and date range</div>
              <div className="text-sm text-zinc-500 mt-1 max-w-md">
                Try mixing wafer + strongback + walers for a real-job feasibility check.
              </div>
            </div>
          ) : (
            <div className="space-y-4" data-testid="capacity-result">
              {/* Overall verdict */}
              <div
                className={`border-l-4 p-5 ${
                  result.overall_ok ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"
                }`}
                data-testid="capacity-verdict"
              >
                <div className="flex items-start gap-3">
                  {result.overall_ok ? (
                    <CheckCircle size={32} weight="fill" className="text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={32} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className={`font-display font-black text-2xl tracking-tight ${result.overall_ok ? "text-green-900" : "text-red-900"}`}>
                      {result.overall_ok
                        ? `YES — all ${result.items_count} SKU${result.items_count > 1 ? "s" : ""} fit.`
                        : `NO — short on ${result.blocked_skus.length} of ${result.items_count} SKU${result.items_count > 1 ? "s" : ""}.`}
                    </div>
                    <div className={`text-sm mt-1 ${result.overall_ok ? "text-green-800" : "text-red-800"}`}>
                      {result.overall_ok ? (
                        <>Window: <strong>{result.start}</strong> → <strong>{result.end}</strong></>
                      ) : (
                        <>Blocked: <strong>{result.blocked_skus.join(", ")}</strong> across <strong>{result.total_blocked_days}</strong> distinct day{result.total_blocked_days > 1 ? "s" : ""}.</>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save as bookings */}
              <div className="flex items-center justify-end gap-2">
                <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      data-testid="save-as-bookings-btn"
                      className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm font-display uppercase tracking-wider gap-2"
                    >
                      <CalendarPlus size={14} weight="bold" />
                      Save as {result.items_count} booking{result.items_count > 1 ? "s" : ""}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-sm max-w-lg max-h-[90vh] overflow-y-auto" data-testid="save-bookings-dialog">
                    <DialogHeader>
                      <DialogTitle className="font-display font-bold text-2xl flex items-center gap-2">
                        <CalendarPlus size={22} weight="fill" className="text-orange-600" />
                        Save as bookings
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={saveAsBookings} className="space-y-3" data-testid="save-bookings-form">
                      <div className="border border-zinc-200 p-3 bg-zinc-50 text-sm">
                        <div className="label-eyebrow mb-1">Window</div>
                        <div className="font-mono text-zinc-900">{result.start} → {result.end}</div>
                        <div className="label-eyebrow mt-2 mb-1">SKUs ({result.items_count})</div>
                        <ul className="text-xs space-y-0.5">
                          {result.results.map((r) => (
                            <li key={r.equipment_id} className="font-mono text-zinc-700">
                              {r.equipment_name} × {r.qty_requested}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <Label className="label-eyebrow">Customer / lead name</Label>
                        <Input
                          required
                          value={saveForm.customer_name}
                          onChange={(e) => setSaveForm({ ...saveForm, customer_name: e.target.value })}
                          className="rounded-sm mt-1"
                          data-testid="save-customer"
                          placeholder="Big Sky Concrete or new lead"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="label-eyebrow">Contact</Label>
                          <Input
                            value={saveForm.contact}
                            onChange={(e) => setSaveForm({ ...saveForm, contact: e.target.value })}
                            className="rounded-sm mt-1"
                            data-testid="save-contact"
                            placeholder="phone or email"
                          />
                        </div>
                        <div>
                          <Label className="label-eyebrow">Est. value $ (total)</Label>
                          <Input
                            type="number" min="0" step="1"
                            value={saveForm.estimated_value}
                            onChange={(e) => setSaveForm({ ...saveForm, estimated_value: e.target.value })}
                            className="rounded-sm mt-1"
                            data-testid="save-value"
                          />
                          <div className="text-[10px] text-zinc-500 mt-0.5">split across SKUs</div>
                        </div>
                      </div>

                      <div>
                        <Label className="label-eyebrow">Probability</Label>
                        <Select value={saveForm.probability} onValueChange={(v) => setSaveForm({ ...saveForm, probability: v })}>
                          <SelectTrigger className="rounded-sm mt-1" data-testid="save-prob"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hot">Hot — verbal yes / PO ready</SelectItem>
                            <SelectItem value="warm">Warm — strong interest</SelectItem>
                            <SelectItem value="cold">Cold — just exploring</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="border border-zinc-200 p-3 rounded-sm bg-zinc-50/60">
                        <div className="flex items-center justify-between">
                          <Label className="label-eyebrow cursor-pointer" htmlFor="save_delivery">Delivery required</Label>
                          <Switch
                            id="save_delivery"
                            checked={saveForm.is_delivery}
                            onCheckedChange={(v) => setSaveForm({ ...saveForm, is_delivery: v })}
                            data-testid="save-delivery"
                          />
                        </div>
                        {saveForm.is_delivery && (
                          <div className="mt-2">
                            <Input
                              value={saveForm.delivery_address}
                              onChange={(e) => setSaveForm({ ...saveForm, delivery_address: e.target.value })}
                              className="rounded-sm"
                              placeholder="Delivery address"
                              data-testid="save-address"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="label-eyebrow">Notes</Label>
                        <Input
                          value={saveForm.notes}
                          onChange={(e) => setSaveForm({ ...saveForm, notes: e.target.value })}
                          className="rounded-sm mt-1"
                          placeholder="Job name, source, special handling…"
                        />
                      </div>

                      <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setSaveOpen(false)} className="rounded-sm font-display uppercase tracking-wider">
                          Cancel
                        </Button>
                        <Button type="submit" disabled={saving}
                          className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider gap-2"
                          data-testid="save-bookings-submit">
                          <CalendarPlus size={14} weight="bold" />
                          {saving ? "Saving…" : `Save ${result.items_count} booking${result.items_count > 1 ? "s" : ""}`}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Per-SKU breakdown */}
              {result.results.map((r, i) => <SkuResult key={r.equipment_id} r={r} qty={r.qty_requested} idx={i} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkuResult({ r, qty, idx }) {
  const ok = r.overall_ok;
  const [open, setOpen] = useState(idx === 0 || !ok);
  return (
    <div className={`border ${ok ? "border-zinc-200" : "border-red-300"} bg-white`} data-testid={`sku-result-${r.equipment_id}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors text-left"
        data-testid={`sku-toggle-${r.equipment_id}`}
      >
        <div className="flex items-center gap-3">
          {ok ? (
            <CheckCircle size={20} weight="fill" className="text-green-600 shrink-0" />
          ) : (
            <XCircle size={20} weight="fill" className="text-red-600 shrink-0" />
          )}
          <div>
            <div className="font-display font-bold text-zinc-900">{r.equipment_name}</div>
            <div className="text-xs text-zinc-500">
              Need <span className="font-mono font-bold">{qty}</span> · min avail <span className={`font-mono font-bold ${ok ? "text-green-700" : "text-red-700"}`}>{r.min_available}</span> · {r.blocked_dates.length} short day{r.blocked_dates.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <CaretRight size={16} weight="bold" className={`text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          {/* Chart */}
          <div className="border border-zinc-100 p-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={r.days} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid stroke="#E4E4E7" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#52525B" fontSize={9} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#52525B" fontSize={10} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-zinc-200 p-2 text-xs shadow-md">
                        <div className="font-mono font-bold">{d.date} · {d.weekday}</div>
                        <div className="text-zinc-700 mt-1">Available: <span className="font-mono font-bold">{d.available}</span></div>
                        <div className="text-zinc-500">On rent: {d.on_rent} · On hold: {d.on_hold}</div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={qty} stroke="#EA580C" strokeDasharray="4 4" label={{ value: `Need ${qty}`, fontSize: 9, fill: "#EA580C", position: "insideTopRight" }} />
                <Bar dataKey="available">
                  {r.days.map((d, i) => (
                    <Cell key={i} fill={d.sufficient ? "#16A34A" : "#DC2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Blocked dates list */}
          {r.blocked_dates.length > 0 && (
            <div className="border-l-2 border-red-500 bg-red-50/60 px-3 py-2 text-xs">
              <div className="label-eyebrow text-red-700 mb-1">Short days</div>
              <div className="flex flex-wrap gap-1">
                {r.blocked_dates.map((d) => (
                  <span key={d} className="font-mono bg-white border border-red-200 px-1.5 py-0.5 text-red-700">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Conflicts */}
          {(r.conflicting_rentals.length > 0 || r.conflicting_bookings.length > 0) && (
            <div className="border border-zinc-200">
              <div className="flex items-center gap-2 p-2 bg-zinc-50 border-b border-zinc-200">
                <Warning size={14} className="text-orange-600" weight="fill" />
                <div className="font-display font-bold text-xs uppercase tracking-wider text-zinc-700">Tying up the fleet</div>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {r.conflicting_rentals.map((c) => (
                    <tr key={`r-${c.id}`} className="border-b border-zinc-100 last:border-0">
                      <td className="p-2 font-display font-medium text-zinc-900">{c.customer_name}</td>
                      <td className="p-2 font-mono text-zinc-700">{c.quantity}×</td>
                      <td className="p-2 font-mono text-zinc-500">{c.start_date} → {c.due_date}</td>
                      <td className="p-2 text-[10px] uppercase tracking-wider font-display font-semibold text-blue-700">Rental</td>
                    </tr>
                  ))}
                  {r.conflicting_bookings.map((c) => (
                    <tr key={`b-${c.id}`} className="border-b border-zinc-100 last:border-0">
                      <td className="p-2 font-display font-medium text-zinc-900">{c.customer_name}</td>
                      <td className="p-2 font-mono text-zinc-700">{c.quantity}×</td>
                      <td className="p-2 font-mono text-zinc-500">{c.start_date} → {c.end_date}</td>
                      <td className="p-2 text-[10px] uppercase tracking-wider font-display font-semibold text-purple-700">Booking · {c.probability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
