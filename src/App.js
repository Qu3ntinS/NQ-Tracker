import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfWeek, addDays, isSameDay, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import { Rnd } from "react-rnd";
import classNames from "classnames";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Trash2 } from "lucide-react";

const minuteHeight = 1.1; // px per minute
const minEntryDefault = 15;
const dailyGoalDefault = 8;

const localStore = (() => {
  const key = "nq-tracker-db";
  const load = () => JSON.parse(localStorage.getItem(key) || "{}");
  const save = (db) => localStorage.setItem(key, JSON.stringify(db));
  return {
    async init() {
      const db = load();
      if (!db.entries) db.entries = [];
      if (!db.projects) db.projects = [{ id: "default", name: "General", color: "#8b4dff" }];
      if (!db.settings) db.settings = { minEntryMinutes: minEntryDefault, dailyGoalHours: dailyGoalDefault };
      save(db);
      return db.settings;
    },
    async listEntries(from, to) {
      const db = load();
      return db.entries.filter(e => new Date(e.start) >= new Date(from) && new Date(e.start) <= new Date(to));
    },
    async createEntry(entry) {
      const db = load();
      const e = { ...entry, id: `e_${Date.now()}` };
      db.entries.push(e);
      save(db);
      return e;
    },
    async updateEntry(id, patch) {
      const db = load();
      db.entries = db.entries.map(e => e.id === id ? { ...e, ...patch } : e);
      save(db);
      return db.entries.find(e => e.id === id);
    },
    async deleteEntry(id) {
      const db = load();
      db.entries = db.entries.filter(e => e.id !== id);
      save(db);
      return true;
    },
    async listProjects() {
      return load().projects;
    },
    async addProject(name, color) {
      const db = load();
      const p = { id: `p_${Date.now()}`, name, color: color || "#8b4dff" };
      db.projects.push(p);
      save(db);
      return p;
    },
    async updateProject(id, patch) {
      const db = load();
      db.projects = db.projects.map(p => p.id === id ? { ...p, ...patch } : p);
      save(db);
      return db.projects.find(p => p.id === id);
    },
    async deleteProject(id) {
      const db = load();
      db.projects = db.projects.filter(p => p.id !== id);
      db.entries = db.entries.map(e => e.projectId === id ? { ...e, projectId: "default" } : e);
      save(db);
      return true;
    },
    async getSettings() { return load().settings; },
    async updateSettings(patch) {
      const db = load();
      db.settings = { ...db.settings, ...patch };
      save(db);
      return db.settings;
    }
  };
})();

const api = window.nqApi || localStore;

function App() {
  const [view, setView] = useState("day");
  const [date, setDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useState({ minEntryMinutes: minEntryDefault, dailyGoalHours: dailyGoalDefault });
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    (async () => {
      const s = await api.init?.();
      if (s) setSettings(s);
      const projs = await api.listProjects();
      setProjects(projs);
    })();
  }, []);

  const loadEntries = async (rangeStart, rangeEnd) => {
    const items = await api.listEntries(rangeStart, rangeEnd);
    setEntries(items);
  };

  useEffect(() => {
    if (view === "day") {
      loadEntries(startOfDay(date), endOfDay(date));
    } else {
      const ws = startOfWeek(date, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      loadEntries(startOfDay(ws), endOfDay(we));
    }
  }, [date, view]);

  const totalMinutesDay = useMemo(() => {
    const dayEntries = entries.filter(e => isSameDay(new Date(e.start), date));
    return dayEntries.reduce((sum, e) => sum + differenceInMinutes(new Date(e.end), new Date(e.start)), 0);
  }, [entries, date]);

  const goalReached = totalMinutesDay >= settings.dailyGoalHours * 60;

  const goPrev = () => setDate(d => addDays(d, view === "day" ? -1 : -7));
  const goNext = () => setDate(d => addDays(d, view === "day" ? 1 : 7));
  const goToday = () => setDate(new Date());

  return (
    <div className="min-h-screen p-6">
      <div className="glass rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-brand-600/30">
            <Clock3 size={18} className="text-brand-200" />
          </div>
          <div>
            <div className="text-sm text-purple-200/80">NQ Tracker</div>
            <div className="text-2xl font-semibold">Timetable</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className={btnCls()} onClick={goPrev}><ChevronLeft size={16} /></button>
          <button className={btnCls()} onClick={goToday}><CalendarDays size={16} className="mr-1" /> Heute</button>
          <button className={btnCls()} onClick={goNext}><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center gap-2">
          <button className={btnCls(view==="day")} onClick={() => setView("day")}>Day</button>
          <button className={btnCls(view==="week")} onClick={() => setView("week")}>Week</button>
        </div>
        <div className="text-sm text-purple-200/80">{format(date, "PPP")}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="glass rounded-2xl p-4">
          {view === "day" ? (
            <DayView
              date={date}
              entries={entries}
              settings={settings}
              projects={projects}
              onCreate={async (entry) => {
                const ok = validateNoOverlap(entry, entries);
                if (!ok) return;
                const e = await api.createEntry(entry);
                setEntries(prev => [...prev, e]);
              }}
              onUpdate={async (id, patch) => {
                const next = entries.map(e => e.id === id ? { ...e, ...patch } : e).find(e => e.id === id);
                if (next && !validateNoOverlap(next, entries.filter(e => e.id !== id))) return;
                const e = await api.updateEntry(id, patch);
                setEntries(prev => prev.map(x => x.id === id ? e : x));
              }}
              onSelect={setSelectedEntry}
            />
          ) : (
            <WeekView
              date={date}
              entries={entries}
              settings={settings}
              onSelectDay={(d) => { setDate(d); setView("day"); }}
            />
          )}
        </div>

        <div className="glass rounded-2xl p-4 space-y-4">
          <div>
            <div className="text-sm text-purple-200/70">Tagesziel</div>
            <div className={classNames("text-3xl font-semibold", goalReached ? "text-green-400" : "text-white")}>
              {Math.floor(totalMinutesDay/60)}h {totalMinutesDay%60}m
            </div>
            <div className="text-xs text-purple-200/60">Ziel: {settings.dailyGoalHours}h</div>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className={classNames("h-2", goalReached ? "bg-green-400" : "bg-brand-500")} style={{ width: `${Math.min(100, (totalMinutesDay/(settings.dailyGoalHours*60))*100)}%` }} />
            </div>
          </div>

          <ProjectManager
            projects={projects}
            onAdd={async (name, color) => {
              const p = await api.addProject(name, color);
              setProjects(prev => [...prev, p]);
            }}
            onUpdate={async (id, patch) => {
              const p = await api.updateProject(id, patch);
              setProjects(prev => prev.map(x => x.id === id ? p : x));
            }}
            onDelete={async (id) => {
              await api.deleteProject(id);
              setProjects(prev => prev.filter(x => x.id !== id));
              setEntries(prev => prev.map(e => e.projectId === id ? { ...e, projectId: "default" } : e));
            }}
          />

          <div>
            <div className="text-sm text-purple-200/70 mb-2">Einstellungen</div>
            <div className="space-y-2 text-sm">
              <label className="flex items-center justify-between">
                <span>Min. Eintrag (Min)</span>
                <input className="bg-white/10 rounded px-2 py-1 w-20" type="number" value={settings.minEntryMinutes} onChange={async (e) => {
                  const v = Number(e.target.value || 0);
                  const s = await api.updateSettings({ minEntryMinutes: v });
                  setSettings(s);
                }} />
              </label>
              <label className="flex items-center justify-between">
                <span>Tagesziel (h)</span>
                <input className="bg-white/10 rounded px-2 py-1 w-20" type="number" value={settings.dailyGoalHours} onChange={async (e) => {
                  const v = Number(e.target.value || 0);
                  const s = await api.updateSettings({ dailyGoalHours: v });
                  setSettings(s);
                }} />
              </label>
            </div>
          </div>

          {selectedEntry && (
            <EntryEditor entry={selectedEntry} projects={projects} onClose={() => setSelectedEntry(null)} onSave={async (patch) => {
              const e = await api.updateEntry(selectedEntry.id, patch);
              setEntries(prev => prev.map(x => x.id === e.id ? e : x));
              setSelectedEntry(e);
            }} onDelete={async () => {
              await api.deleteEntry(selectedEntry.id);
              setEntries(prev => prev.filter(x => x.id !== selectedEntry.id));
              setSelectedEntry(null);
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

function DayView({ date, entries, settings, projects, onCreate, onUpdate, onSelect }) {
  const dayEntries = entries.filter(e => isSameDay(new Date(e.start), date));
  const totalHeight = 1440 * minuteHeight;
  const scrollerRef = useRef(null);

  useEffect(() => {
    const now = new Date();
    if (!isSameDay(now, date)) return;
    const mins = now.getHours() * 60 + now.getMinutes();
    const y = mins * minuteHeight - 120;
    if (scrollerRef.current) scrollerRef.current.scrollTop = Math.max(0, y);
  }, [date]);

  const handleCreate = async (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    const minutes = Math.floor(y / minuteHeight / settings.minEntryMinutes) * settings.minEntryMinutes;
    const start = new Date(date);
    start.setHours(0, minutes, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + settings.minEntryMinutes);
    await onCreate({ start: start.toISOString(), end: end.toISOString(), projectId: projects[0]?.id || "default", comment: "" });
  };

  const now = new Date();
  const isToday = isSameDay(now, date);
  const nowLineTop = (now.getHours() * 60 + now.getMinutes()) * minuteHeight;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-purple-200/70">Tagesansicht</div>
        <div className="text-xs text-purple-200/60">Klicken = Eintrag</div>
      </div>
      <div ref={scrollerRef} className="relative h-[720px] overflow-y-auto rounded-xl border border-white/10 bg-black/10" onClick={handleCreate}>
        <div style={{ height: totalHeight }} className="relative">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="absolute left-0 right-0 border-t border-white/5" style={{ top: h * 60 * minuteHeight }}>
              <span className="absolute -left-2 -translate-x-full text-xs text-purple-200/40">{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}

          {isToday && (
            <div className="absolute left-10 right-2" style={{ top: nowLineTop }}>
              <div className="h-[1px] bg-brand-400" />
              <div className="text-[10px] text-brand-300">{format(now, "HH:mm")}</div>
            </div>
          )}

          {dayEntries.map((entry) => {
            const start = new Date(entry.start);
            const end = new Date(entry.end);
            const top = (start.getHours() * 60 + start.getMinutes()) * minuteHeight;
            const durationMin = differenceInMinutes(end, start);
            const height = Math.max(settings.minEntryMinutes * minuteHeight, durationMin * minuteHeight);
            return (
              <Rnd
                key={entry.id}
                size={{ width: "92%", height }}
                position={{ x: 40, y: top }}
                bounds="parent"
                dragAxis="y"
                enableResizing={{ top: true, bottom: true, left: false, right: false }}
                grid={[1, settings.minEntryMinutes * minuteHeight]}
                onDragStop={(_, d) => {
                  const mins = Math.round(d.y / minuteHeight / settings.minEntryMinutes) * settings.minEntryMinutes;
                  const ns = new Date(date); ns.setHours(0, mins, 0, 0);
                  const duration = differenceInMinutes(end, start);
                  const ne = new Date(ns); ne.setMinutes(ne.getMinutes() + duration);
                  onUpdate(entry.id, { start: ns.toISOString(), end: ne.toISOString() });
                }}
                onResizeStop={(_, __, ref, ___, position) => {
                  const newHeight = ref.offsetHeight;
                  const mins = Math.round(position.y / minuteHeight / settings.minEntryMinutes) * settings.minEntryMinutes;
                  const dur = Math.max(settings.minEntryMinutes, Math.round(newHeight / minuteHeight / settings.minEntryMinutes) * settings.minEntryMinutes);
                  const ns = new Date(date); ns.setHours(0, mins, 0, 0);
                  const ne = new Date(ns); ne.setMinutes(ne.getMinutes() + dur);
                  onUpdate(entry.id, { start: ns.toISOString(), end: ne.toISOString() });
                }}
                onClick={(e) => { e.stopPropagation(); onSelect(entry); }}
                className="rounded-xl bg-gradient-to-br from-brand-600/70 to-brand-800/60 border border-white/20 shadow-glass text-white"
              >
                <div className="p-2 text-xs">
                  <div className="font-medium">{projects.find(p => p.id === entry.projectId)?.name || "Projekt"}</div>
                  <div className="opacity-80">{format(start, "HH:mm")} – {format(end, "HH:mm")} · {durationMin}m</div>
                  {entry.comment && <div className="opacity-70 truncate">{entry.comment}</div>}
                </div>
              </Rnd>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekView({ date, entries, settings, onSelectDay }) {
  const ws = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(ws, i));
  const totalByDay = (d) => entries.filter(e => isSameDay(new Date(e.start), d))
    .reduce((sum, e) => sum + differenceInMinutes(new Date(e.end), new Date(e.start)), 0);

  return (
    <div>
      <div className="text-sm text-purple-200/70 mb-2">Wochenansicht</div>
      <div className="grid grid-cols-7 gap-2">
        {days.map(d => {
          const mins = totalByDay(d);
          const reached = mins >= settings.dailyGoalHours * 60;
          return (
            <button key={d.toISOString()} onClick={() => onSelectDay(d)} className="text-left rounded-xl p-3 bg-white/5 border border-white/10 hover:border-white/20">
              <div className="text-xs text-purple-200/60">{format(d, "EEE dd")}</div>
              <div className={classNames("text-lg font-semibold", reached ? "text-green-400" : "text-white")}>
                {Math.floor(mins/60)}h {mins%60}m
              </div>
              <div className="h-1 mt-2 rounded bg-white/10">
                <div className={classNames("h-1 rounded", reached ? "bg-green-400" : "bg-brand-500")} style={{ width: `${Math.min(100, (mins/(settings.dailyGoalHours*60))*100)}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EntryEditor({ entry, projects, onClose, onSave, onDelete }) {
  return (
    <div className="rounded-xl p-3 border border-white/10 bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Eintrag bearbeiten</div>
        <button className="text-xs text-purple-200/70" onClick={onClose}>schließen</button>
      </div>
      <div className="space-y-2 text-sm">
        <label className="block">
          Projekt
          <select className="mt-1 w-full bg-white/10 rounded px-2 py-1" value={entry.projectId} onChange={(e) => onSave({ projectId: e.target.value })}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="block">
          Kommentar
          <input className="mt-1 w-full bg-white/10 rounded px-2 py-1" value={entry.comment || ""} onChange={(e) => onSave({ comment: e.target.value })} />
        </label>
        <div className="flex gap-2">
          <button className="bg-brand-600 px-3 py-1 rounded text-xs" onClick={onDelete}>löschen</button>
        </div>
      </div>
    </div>
  );
}

function ProjectManager({ projects, onAdd, onUpdate, onDelete }) {
  return (
    <div>
      <div className="text-sm text-purple-200/70 mb-2">Projekte</div>
      <div className="space-y-2">
        {projects.map(p => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <input type="color" value={p.color} onChange={(e) => onUpdate(p.id, { color: e.target.value })} className="w-6 h-6 rounded" />
            <input className="flex-1 bg-white/10 rounded px-2 py-1" value={p.name} onChange={(e) => onUpdate(p.id, { name: e.target.value })} />
            {p.id !== "default" && (
              <button className="text-xs text-red-300" onClick={() => onDelete(p.id)}><Trash2 size={14} /></button>
            )}
          </div>
        ))}
        <button className="text-xs text-purple-200/70 hover:text-white flex items-center gap-1" onClick={() => {
          const name = prompt("Projektname?");
          if (!name) return;
          onAdd(name, "#8b4dff");
        }}><Plus size={14} /> Projekt hinzufügen</button>
      </div>
    </div>
  );
}

function validateNoOverlap(candidate, entries) {
  const cStart = new Date(candidate.start).getTime();
  const cEnd = new Date(candidate.end).getTime();
  const overlap = entries.some(e => {
    const s = new Date(e.start).getTime();
    const en = new Date(e.end).getTime();
    return cStart < en && cEnd > s;
  });
  if (overlap) {
    alert("Eintrag überschneidet sich mit einem anderen.");
    return false;
  }
  return true;
}

function btnCls(active) {
  return classNames(
    "px-3 py-1 rounded-lg text-sm inline-flex items-center justify-center gap-1",
    active ? "bg-brand-600 text-white shadow-glow" : "bg-white/10 text-purple-200/80"
  );
}

export default App;
