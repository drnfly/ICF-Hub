import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Minus, Package, PencilSimple, Trash, ArrowsClockwise } from "@phosphor-icons/react";

const CATS = ["brace", "waler", "strongback", "alignment", "scaffold", "tool", "other"];
const CONDS = ["excellent", "good", "fair", "poor", "retired"];

const EMPTY = {
  name: "",
  category: "brace",
  serial: "",
  condition: "good",
  location: "",
  daily_rate: 0,
  quantity: 1,
  notes: "",
};

const condColors = {
  excellent: "bg-green-100 text-green-800 border-green-300",
  good: "bg-blue-100 text-blue-800 border-blue-300",
  fair: "bg-yellow-100 text-yellow-800 border-yellow-300",
  poor: "bg-orange-100 text-orange-800 border-orange-300",
  retired: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

export default function Equipment() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/equipment");
      setItems(data);
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
  function openEdit(item) {
    setEditing(item);
    setForm({ ...item, serial: item.serial || "", location: item.location || "", notes: item.notes || "" });
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        daily_rate: Number(form.daily_rate),
        quantity: Number(form.quantity),
      };
      if (editing) {
        await api.patch(`/equipment/${editing.id}`, payload);
        toast.success("Equipment updated");
      } else {
        await api.post("/equipment", payload);
        toast.success("Equipment added");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Save failed");
    }
  }

  async function remove(item) {
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
      await api.delete(`/equipment/${item.id}`);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Delete failed");
    }
  }

  const [adjOpen, setAdjOpen] = useState(false);
  const [adjTarget, setAdjTarget] = useState(null);
  const [adjDelta, setAdjDelta] = useState(1);
  const [adjReason, setAdjReason] = useState("Restock");

  function openAdjust(item, presetDelta) {
    setAdjTarget(item);
    setAdjDelta(presetDelta);
    setAdjReason(presetDelta > 0 ? "Restock" : "Write-off / lost");
    setAdjOpen(true);
  }

  async function quickAdjust(item, delta) {
    // optimistic +1/-1 with single click
    try {
      await api.post(`/equipment/${item.id}/adjust`, { delta, reason: delta > 0 ? "Quick +1" : "Quick -1" });
      toast.success(`${item.name}: ${delta > 0 ? "+" : ""}${delta}`);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Adjust failed");
    }
  }

  async function submitAdjust(e) {
    e.preventDefault();
    try {
      await api.post(`/equipment/${adjTarget.id}/adjust`, {
        delta: Number(adjDelta),
        reason: adjReason,
      });
      toast.success(`${adjTarget.name}: ${adjDelta > 0 ? "+" : ""}${adjDelta} units`);
      setAdjOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Adjust failed");
    }
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1500px]" data-testid="equipment-page">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label-eyebrow">Inventory</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-zinc-900 mt-2">Equipment</h1>
          <p className="text-zinc-500 mt-1 text-sm">{items.length} SKU{items.length !== 1 ? "s" : ""} · {items.reduce((s, i) => s + i.quantity, 0)} total units · Use <span className="inline-flex items-center gap-0.5 font-mono"><Minus size={10} weight="bold"/> / <Plus size={10} weight="bold"/></span> on a row to quick-adjust stock</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="add-equipment-btn"
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display font-semibold uppercase tracking-wider gap-2">
              <Plus size={16} weight="bold" /> Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-2xl">
                {editing ? "Edit equipment" : "Add equipment"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3" data-testid="equipment-form">
              <div>
                <Label className="label-eyebrow">Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-sm mt-1" data-testid="eq-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="label-eyebrow">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="rounded-sm mt-1" data-testid="eq-category"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Condition</Label>
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                    <SelectTrigger className="rounded-sm mt-1" data-testid="eq-condition"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Quantity</Label>
                  <Input type="number" min="1" required value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="rounded-sm mt-1" data-testid="eq-quantity" />
                </div>
                <div>
                  <Label className="label-eyebrow">Daily rate $</Label>
                  <Input type="number" step="0.25" min="0" value={form.daily_rate}
                    onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
                    className="rounded-sm mt-1" data-testid="eq-rate" />
                </div>
                <div>
                  <Label className="label-eyebrow">Serial</Label>
                  <Input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })}
                    className="rounded-sm mt-1" data-testid="eq-serial" />
                </div>
                <div>
                  <Label className="label-eyebrow">Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="rounded-sm mt-1" data-testid="eq-location" />
                </div>
              </div>
              <div>
                <Label className="label-eyebrow">Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-sm mt-1" data-testid="eq-notes" />
              </div>
              <Button type="submit" data-testid="eq-submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider">
                {editing ? "Save changes" : "Add to inventory"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
          <Package size={48} className="mx-auto mb-3 text-zinc-300" weight="duotone" />
          No equipment yet. Add your first item.
        </div>
      ) : (
        <div className="border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 sticky top-0">
              <tr>
                {["Name", "Category", "Cond.", "Qty", "Avail.", "Rate/day", "Location", "Actions"].map((h) => (
                  <th key={h} className="text-left p-3 font-display font-bold uppercase tracking-wider text-xs text-zinc-700 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={i % 2 ? "bg-zinc-50" : "bg-white"} data-testid={`eq-row-${item.id}`}>
                  <td className="p-3 font-display font-medium text-zinc-900">{item.name}</td>
                  <td className="p-3 capitalize text-zinc-700">{item.category}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-display font-semibold border ${condColors[item.condition]}`}>
                      {item.condition}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-zinc-900">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => quickAdjust(item, -1)}
                        className="w-6 h-6 flex items-center justify-center border border-zinc-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-sm transition-colors"
                        data-testid={`qty-minus-${item.id}`}
                        aria-label="Decrease quantity"
                        disabled={item.quantity <= 0}
                      >
                        <Minus size={12} weight="bold" />
                      </button>
                      <button
                        onClick={() => openAdjust(item, 0)}
                        className="font-mono font-bold min-w-[2.5rem] text-center hover:bg-zinc-100 rounded-sm px-1.5 py-0.5 transition-colors"
                        data-testid={`qty-bulk-${item.id}`}
                        title="Bulk adjust"
                      >
                        {item.quantity}
                      </button>
                      <button
                        onClick={() => quickAdjust(item, 1)}
                        className="w-6 h-6 flex items-center justify-center border border-zinc-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700 rounded-sm transition-colors"
                        data-testid={`qty-plus-${item.id}`}
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} weight="bold" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3 font-mono">
                    <span className={item.available === 0 ? "text-red-600 font-bold" : item.available < item.quantity / 2 ? "text-orange-600 font-bold" : "text-green-700"}>
                      {item.available}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-zinc-900">${item.daily_rate}</td>
                  <td className="p-3 text-zinc-600">{item.location || "—"}</td>
                  <td className="p-3 flex gap-1">
                    <button onClick={() => openAdjust(item, 1)} className="p-1.5 hover:bg-orange-100 text-orange-700 rounded-sm" data-testid={`adjust-${item.id}`} aria-label="Adjust stock" title="Bulk adjust stock">
                      <ArrowsClockwise size={14} />
                    </button>
                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-zinc-100 rounded-sm" data-testid={`edit-${item.id}`} aria-label="Edit">
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => remove(item)} className="p-1.5 hover:bg-red-100 text-red-700 rounded-sm" data-testid={`delete-${item.id}`} aria-label="Delete">
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk adjust dialog */}
      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent className="rounded-sm" data-testid="adjust-dialog">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-2xl">Adjust stock</DialogTitle>
          </DialogHeader>
          {adjTarget && (
            <form onSubmit={submitAdjust} className="space-y-4" data-testid="adjust-form">
              <div className="border border-zinc-200 p-3 bg-zinc-50">
                <div className="label-eyebrow">Item</div>
                <div className="font-display font-medium text-zinc-900 mt-1">{adjTarget.name}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  Current: <span className="font-mono font-bold">{adjTarget.quantity}</span> total ·{" "}
                  <span className="font-mono font-bold">{adjTarget.available}</span> available
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={adjDelta > 0 ? "default" : "outline"}
                  onClick={() => setAdjDelta(Math.abs(Number(adjDelta) || 1))}
                  data-testid="adj-mode-add"
                  className={`rounded-sm font-display uppercase tracking-wider gap-2 ${adjDelta > 0 ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}>
                  <Plus size={14} weight="bold" /> Add stock
                </Button>
                <Button type="button" variant={adjDelta < 0 ? "default" : "outline"}
                  onClick={() => setAdjDelta(-Math.abs(Number(adjDelta) || 1))}
                  data-testid="adj-mode-remove"
                  className={`rounded-sm font-display uppercase tracking-wider gap-2 ${adjDelta < 0 ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}>
                  <Minus size={14} weight="bold" /> Remove
                </Button>
              </div>

              <div>
                <Label className="label-eyebrow">Quantity</Label>
                <Input
                  type="number"
                  required
                  value={Math.abs(adjDelta) || ""}
                  onChange={(e) => {
                    const v = Math.max(0, Number(e.target.value || 0));
                    setAdjDelta(adjDelta < 0 ? -v : v);
                  }}
                  className="rounded-sm mt-1 text-lg font-mono"
                  data-testid="adj-qty"
                  autoFocus
                />
                <div className="text-xs text-zinc-500 mt-2">
                  New total will be:{" "}
                  <span className="font-mono font-bold text-zinc-900">
                    {adjTarget.quantity + Number(adjDelta || 0)}
                  </span>
                </div>
              </div>

              <div>
                <Label className="label-eyebrow">Reason</Label>
                <Select value={adjReason} onValueChange={setAdjReason}>
                  <SelectTrigger className="rounded-sm mt-1" data-testid="adj-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Restock">Restock — bought more</SelectItem>
                    <SelectItem value="Returned from vendor">Returned from vendor</SelectItem>
                    <SelectItem value="Write-off / lost">Write-off / lost</SelectItem>
                    <SelectItem value="Damaged / retired">Damaged / retired</SelectItem>
                    <SelectItem value="Stolen">Stolen</SelectItem>
                    <SelectItem value="Inventory recount">Inventory recount</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setAdjOpen(false)} className="rounded-sm font-display uppercase tracking-wider">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!adjDelta || Number(adjDelta) === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider"
                  data-testid="adj-submit"
                >
                  Apply {adjDelta > 0 ? "+" : ""}{adjDelta || 0}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
