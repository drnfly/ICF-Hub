import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Wrench } from "@phosphor-icons/react";

const today = () => new Date().toISOString().slice(0, 10);

export default function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    equipment_id: "", service_date: today(), service_type: "inspection",
    performed_by: "", cost: 0, next_service_date: "", notes: "",
  });

  async function load() {
    const [m, e] = await Promise.all([api.get("/maintenance"), api.get("/equipment")]);
    setLogs(m.data);
    setEquipment(e.data);
  }
  useEffect(() => { load(); }, []);

  async function submit(ev) {
    ev.preventDefault();
    try {
      await api.post("/maintenance", {
        ...form,
        cost: Number(form.cost),
        next_service_date: form.next_service_date || undefined,
      });
      toast.success("Service log saved");
      setOpen(false);
      setForm({ equipment_id: "", service_date: today(), service_type: "inspection", performed_by: "", cost: 0, next_service_date: "", notes: "" });
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Failed");
    }
  }

  const todayStr = today();
  const due = logs.filter((l) => l.next_service_date && l.next_service_date <= todayStr);

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1500px]" data-testid="maintenance-page">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label-eyebrow">Service Log</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-zinc-900 mt-2">Maintenance</h1>
          <p className="text-zinc-500 mt-1 text-sm">{logs.length} log{logs.length !== 1 ? "s" : ""} · {due.length} due now</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-service-btn"
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider gap-2">
              <Plus size={14} weight="bold" /> Log Service
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm">
            <DialogHeader><DialogTitle className="font-display font-bold text-2xl">Log service</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3" data-testid="service-form">
              <div>
                <Label className="label-eyebrow">Equipment</Label>
                <Select value={form.equipment_id} onValueChange={(v) => setForm({ ...form, equipment_id: v })}>
                  <SelectTrigger className="rounded-sm mt-1" data-testid="svc-equipment"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent>
                    {equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="label-eyebrow">Service date</Label>
                  <Input type="date" required value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} className="rounded-sm mt-1" data-testid="svc-date" />
                </div>
                <div>
                  <Label className="label-eyebrow">Type</Label>
                  <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                    <SelectTrigger className="rounded-sm mt-1" data-testid="svc-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["inspection", "repair", "cleaning", "replacement", "other"].map((t) =>
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Performed by</Label>
                  <Input value={form.performed_by} onChange={(e) => setForm({ ...form, performed_by: e.target.value })} className="rounded-sm mt-1" data-testid="svc-by" />
                </div>
                <div>
                  <Label className="label-eyebrow">Cost $</Label>
                  <Input type="number" min="0" step="1" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="rounded-sm mt-1" data-testid="svc-cost" />
                </div>
                <div className="col-span-2">
                  <Label className="label-eyebrow">Next service due</Label>
                  <Input type="date" value={form.next_service_date} onChange={(e) => setForm({ ...form, next_service_date: e.target.value })} className="rounded-sm mt-1" data-testid="svc-next" />
                </div>
                <div className="col-span-2">
                  <Label className="label-eyebrow">Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-sm mt-1" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-sm font-display uppercase tracking-wider" data-testid="svc-submit">
                Save log
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {logs.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
          <Wrench size={48} className="mx-auto mb-3 text-zinc-300" weight="duotone" />
          No service logs yet.
        </div>
      ) : (
        <div className="border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100">
              <tr>
                {["Date", "Equipment", "Type", "By", "Cost", "Next Due", "Notes"].map((h) => (
                  <th key={h} className="text-left p-3 font-display font-bold uppercase tracking-wider text-xs text-zinc-700 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => {
                const isDue = l.next_service_date && l.next_service_date <= todayStr;
                return (
                  <tr key={l.id} className={i % 2 ? "bg-zinc-50" : "bg-white"} data-testid={`svc-row-${l.id}`}>
                    <td className="p-3 font-mono text-zinc-700">{l.service_date}</td>
                    <td className="p-3 font-display font-medium text-zinc-900">{l.equipment_name}</td>
                    <td className="p-3 capitalize text-zinc-700">{l.service_type}</td>
                    <td className="p-3 text-zinc-700">{l.performed_by || "—"}</td>
                    <td className="p-3 font-mono text-zinc-900">${l.cost}</td>
                    <td className={`p-3 font-mono ${isDue ? "text-red-600 font-bold" : "text-zinc-700"}`}>{l.next_service_date || "—"}</td>
                    <td className="p-3 text-zinc-600 max-w-xs truncate">{l.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
