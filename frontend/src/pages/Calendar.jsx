import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

function monthMatrix(year, month) {
  // month: 0-indexed
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [rentals, setRentals] = useState([]);
  const [maint, setMaint] = useState([]);
  const [bookings, setBookings] = useState([]);
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  useEffect(() => {
    api.get("/rentals").then(({ data }) => setRentals(data));
    api.get("/maintenance").then(({ data }) => setMaint(data));
    api.get("/bookings").then(({ data }) => setBookings(data));
  }, []);

  function eventsForDay(d) {
    if (!d) return [];
    const iso = isoDate(d);
    const items = [];
    rentals.forEach((r) => {
      if (r.start_date === iso) items.push({ type: "start", label: `OUT: ${r.equipment_name}`, color: "bg-blue-600" });
      if (r.due_date === iso && r.status === "active") items.push({ type: "due", label: `DUE: ${r.equipment_name}`, color: "bg-orange-600" });
      if (r.return_date === iso) items.push({ type: "return", label: `BACK: ${r.equipment_name}`, color: "bg-green-600" });
    });
    maint.forEach((m) => {
      if (m.next_service_date === iso) items.push({ type: "maint", label: `SVC: ${m.equipment_name || "equipment"}`, color: "bg-yellow-500" });
    });
    bookings.forEach((b) => {
      if (b.status !== "tentative") return;
      if (b.tentative_start_date === iso) {
        const prefix = b.is_delivery ? "DELIVER" : "TENT";
        items.push({ type: "booking", label: `${prefix}: ${b.customer_name}`, color: "bg-purple-600", dashed: true });
      }
    });
    return items;
  }

  const cells = monthMatrix(cursor.year, cursor.month);
  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleString("default", { month: "long", year: "numeric" });
  const todayIso = isoDate(today);

  function prev() {
    setCursor((c) => {
      const m = c.month - 1;
      return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m };
    });
  }
  function next() {
    setCursor((c) => {
      const m = c.month + 1;
      return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
    });
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1500px]" data-testid="calendar-page">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label-eyebrow">Schedule</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-zinc-900 mt-2">Availability Calendar</h1>
          <p className="text-zinc-500 mt-1 text-sm">Rental check-outs, returns, and upcoming service.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-2 border border-zinc-200 hover:bg-zinc-100 rounded-sm" data-testid="cal-prev"><CaretLeft size={16} weight="bold" /></button>
          <div className="font-display font-bold text-xl text-zinc-900 min-w-[200px] text-center">{monthName}</div>
          <button onClick={next} className="p-2 border border-zinc-200 hover:bg-zinc-100 rounded-sm" data-testid="cal-next"><CaretRight size={16} weight="bold" /></button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 text-xs flex-wrap">
        <Legend color="bg-blue-600" label="Check-out" />
        <Legend color="bg-orange-600" label="Due back" />
        <Legend color="bg-green-600" label="Returned" />
        <Legend color="bg-yellow-500" label="Service due" />
        <Legend color="bg-purple-600" label="Tentative booking" dashed />
      </div>

      <div className="border border-zinc-200">
        <div className="grid grid-cols-7 bg-zinc-100 border-b border-zinc-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="p-2 font-display font-bold uppercase tracking-wider text-xs text-zinc-700 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const events = eventsForDay(d);
            const iso = d ? isoDate(d) : "";
            const isToday = iso === todayIso;
            return (
              <div
                key={i}
                className={`min-h-[100px] p-2 border-b border-r border-zinc-100 ${!d ? "bg-zinc-50/60" : "bg-white"} ${isToday ? "ring-2 ring-orange-600 ring-inset z-10" : ""}`}
                data-testid={d ? `cal-day-${iso}` : undefined}
              >
                {d && (
                  <>
                    <div className={`text-xs font-display ${isToday ? "text-orange-600 font-bold" : "text-zinc-500"}`}>
                      {d.getDate()}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {events.slice(0, 3).map((e, idx) => (
                        <div
                          key={idx}
                          className={`text-[10px] text-white ${e.color} px-1 py-0.5 truncate ${e.dashed ? "border border-dashed border-white/60" : ""}`}
                          title={e.label}
                        >
                          {e.label}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <div className="text-[10px] text-zinc-500">+{events.length - 3} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 ${color} ${dashed ? "border border-dashed border-zinc-900/40" : ""}`} />
      <span className="text-zinc-700">{label}</span>
    </div>
  );
}
