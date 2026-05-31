import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Package, PencilSimple, Trash } from "@phosphor-icons/react";

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

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1500px]" data-testid="equipment-page">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label-eyebrow">Inventory</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-zinc-900 mt-2">Equipment</h1>
          <p className="text-zinc-500 mt-1 text-sm">{items.length} SKU{items.length !== 1 ? "s" : ""} · {items.reduce((s, i) => s + i.quantity, 0)} total units</p>
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
                  <td className="p-3 font-mono text-zinc-900">{item.quantity}</td>
                  <td className="p-3 font-mono">
                    <span className={item.available === 0 ? "text-red-600 font-bold" : item.available < item.quantity / 2 ? "text-orange-600 font-bold" : "text-green-700"}>
                      {item.available}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-zinc-900">${item.daily_rate}</td>
                  <td className="p-3 text-zinc-600">{item.location || "—"}</td>
                  <td className="p-3 flex gap-1">
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
    </div>
  );
}
