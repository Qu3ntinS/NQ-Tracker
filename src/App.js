import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfWeek, addDays, isSameDay, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import { Rnd } from "react-rnd";
import classNames from "classnames";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Settings } from "lucide-react";

const minuteHeight = 1.1; // px per minute
const minEntryDefault = 15;
const minEntryPixelHeight = 22;
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
  const [page, setPage] = useState("tracker");
  const [view, setView] = useState("day");
  const [date, setDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useState({ minEntryMinutes: minEntryDefault, dailyGoalHours: dailyGoalDefault, theme: "purple", themeCustom: "#8b4dff" });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [resizing, setResizing] = useState(false);
  const [draftEntry, setDraftEntry] = useState(null);
  const [appVersion, setAppVersion] = useState("?");
  const [showDatePick, setShowDatePick] = useState(false);
  const [datePickValue, setDatePickValue] = useState("");

  useEffect(() => {
    (async () => {
      const s = await api.init?.();
      if (s) setSettings(s);
      const projs = await api.listProjects();
      setProjects(projs);
    })();
  }, []);

  useEffect(() => {
    applyTheme(settings.theme, settings.themeCustom);
  }, [settings.theme, settings.themeCustom]);

  useEffect(() => {
    api.onUpdateStatus?.((msg) => {
      setUpdateStatus(msg);
      if (!msg) return;
      setTimeout(() => setUpdateStatus("") , 4000);
    });
  }, []);

  useEffect(() => {
    api.getVersion?.().then((v) => setAppVersion(v || "?"));
    const id = setInterval(() => {
      api.requestUpdateCheck?.();
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!resizing) return;
      const width = Math.max(260, Math.min(520, window.innerWidth - e.clientX));
      setSidebarWidth(width);
    };
    const stop = () => setResizing(false);
    if (resizing) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("mouseleave", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("mouseleave", stop);
      window.removeEventListener("blur", stop);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [resizing]);

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
      <div className="glass rounded-2xl p-4 mb-2 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-brand-600/30">
            <Clock3 size={18} className="text-brand-200" />
          </div>
          <div>
            <div className="text-sm text-purple-200/80">NQ Tracker</div>
            <div className="text-2xl font-semibold">Timetable</div>
          </div>
        </div>
        {page === "tracker" ? (
          <>
            <div className="flex items-center gap-2 relative">
              <button className={btnCls()} onClick={goPrev}><ChevronLeft size={16} /></button>
              <button className={btnCls()} onClick={goToday}>
                <CalendarDays size={16} className="mr-1" /> Heute
              </button>
              <button className={btnCls()} onClick={goNext}><ChevronRight size={16} /></button>
            </div>
            <div className="flex items-center gap-2">
              <button className={btnCls(view==="day")} onClick={() => setView("day")}>Day</button>
              <button className={btnCls(view==="week")} onClick={() => setView("week")}>Week</button>
            </div>
            <div className="text-sm text-purple-200/80 relative">
              <button className="hover:text-white" onClick={() => { setShowDatePick(v => !v); setDatePickValue(format(date, "yyyy-MM-dd")); }}>
                {format(date, "PPP")}
              </button>
              {showDatePick && (
                <div className="absolute top-full mt-2 right-0 bg-black/80 border border-white/10 rounded-lg p-2 z-50">
                  <input type="date" className="bg-white/10 rounded px-2 py-1" value={datePickValue} onChange={(e) => {
                    setDatePickValue(e.target.value);
                    if (e.target.value) setDate(new Date(e.target.value));
                    setShowDatePick(false);
                  }} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-purple-200/80">Einstellungen</div>
        )}
        <div className="flex items-center gap-2">
          <button className={btnCls(page === "tracker")} onClick={() => setPage("tracker")}>Tracker</button>
          <button className={btnCls(page === "settings")} onClick={() => setPage("settings")}>
            <Settings size={16} className="mr-1" /> Settings
          </button>
        </div>
      </div>
      {updateStatus && (
        <div className="fixed bottom-6 right-6 z-50 text-xs text-purple-200/90 bg-black/70 border border-white/10 rounded-lg px-3 py-2 shadow-lg backdrop-blur">
          {updateStatus}
        </div>
      )}

      {page === "settings" ? (
        <SettingsPage
          settings={settings}
          projects={projects}
          onAddProject={async (name, color) => {
            const p = await api.addProject(name, color);
            setProjects(prev => [...prev, p]);
          }}
          onUpdateProject={async (id, patch) => {
            const p = await api.updateProject(id, patch);
            setProjects(prev => prev.map(x => x.id === id ? p : x));
          }}
          onDeleteProject={async (id) => {
            await api.deleteProject(id);
            setProjects(prev => prev.filter(x => x.id !== id));
            setEntries(prev => prev.map(e => e.projectId === id ? { ...e, projectId: "default" } : e));
          }}
          onChange={async (patch) => {
            const s = await api.updateSettings(patch);
            setSettings(s);
          }}
        />
      ) : (
        <div className="flex gap-3">
          <div className="glass rounded-2xl p-4 flex-1 min-w-0">
            {view === "day" ? (
              <DayView
                date={date}
                entries={entries}
                settings={settings}
                projects={projects}
                onCreateRequest={(entry) => {
                  setDraftEntry(entry);
                }}
                onUpdate={(id, patch) => {
                  const next = entries.map(e => e.id === id ? { ...e, ...patch } : e).find(e => e.id === id);
                  if (next && !validateNoOverlap(next, entries.filter(e => e.id !== id))) return;
                  // optimistic update to avoid snap-back
                  setEntries(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x));
                  api.updateEntry(id, patch).then((e) => {
                    if (!e) return;
                    setEntries(prev => prev.map(x => x.id === id ? e : x));
                  });
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

          <div
            className={classNames("w-2 cursor-col-resize rounded-md", resizing ? "bg-brand-500/40" : "bg-white/5 hover:bg-white/10")}
            onMouseDown={() => setResizing(true)}
            title="Sidebar Größe ändern"
          />

          <div className="glass rounded-2xl p-4 space-y-4" style={{ width: sidebarWidth, minWidth: 260 }}>
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

            <ProjectSummary
              date={date}
              entries={entries}
              projects={projects}
            />
          </div>
        </div>
      )}

      {selectedEntry && (
        <EntryEditor
          entry={selectedEntry}
          projects={projects}
          settings={settings}
          onClose={() => setSelectedEntry(null)}
          onSave={async (patch) => {
            const e = await api.updateEntry(selectedEntry.id, patch);
            setEntries(prev => prev.map(x => x.id === e.id ? e : x));
            setSelectedEntry(e);
          }}
          onDelete={async () => {
            await api.deleteEntry(selectedEntry.id);
            setEntries(prev => prev.filter(x => x.id !== selectedEntry.id));
            setSelectedEntry(null);
          }}
        />
      )}

      <div className="fixed bottom-4 left-0 right-0 text-[11px] text-purple-200/50 text-center pointer-events-none">
        Version {appVersion}
      </div>

      {draftEntry && (
        <CreateEntryModal
          entry={draftEntry}
          projects={projects}
          settings={settings}
          onClose={() => setDraftEntry(null)}
          onCreate={async (entry) => {
            const ok = validateNoOverlap(entry, entries);
            if (!ok) return;
            const e = await api.createEntry(entry);
            setEntries(prev => [...prev, e]);
            setDraftEntry(null);
          }}
        />
      )}
    </div>
  );
}

function DayView({ date, entries, settings, projects, onCreateRequest, onUpdate, onSelect }) {
  const dayEntries = entries.filter(e => isSameDay(new Date(e.start), date));
  const topOffset = 12;
  const totalHeight = 1440 * minuteHeight + topOffset;
  const scrollerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const justInteractedRef = useRef(false);

  useEffect(() => {
    const now = new Date();
    if (!isSameDay(now, date)) return;
    const mins = now.getHours() * 60 + now.getMinutes();
    const y = mins * minuteHeight - 120;
    if (scrollerRef.current) scrollerRef.current.scrollTop = Math.max(0, y);
  }, [date]);

  const getMinutesFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    const raw = Math.round(y / minuteHeight / settings.minEntryMinutes) * settings.minEntryMinutes;
    return Math.max(0, Math.min(1440, raw));
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.entry-card')) return;
    const minutes = getMinutesFromEvent(e);
    setDragging(true);
    setDragStart(minutes);
    setDragCurrent(minutes);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setDragCurrent(getMinutesFromEvent(e));
  };

  const handleMouseUp = async () => {
    if (!dragging) return;
    setDragging(false);
    if (dragStart === null || dragCurrent === null) return;
    const startMin = Math.min(dragStart, dragCurrent);
    let endMin = Math.max(dragStart, dragCurrent);
    if (endMin <= startMin) endMin = startMin + settings.minEntryMinutes;
    endMin = Math.min(1440, endMin);
    const start = new Date(date);
    start.setHours(0, startMin, 0, 0);
    const end = new Date(date);
    end.setHours(0, endMin, 0, 0);
    onCreateRequest({ start: start.toISOString(), end: end.toISOString(), projectId: projects[0]?.id || "default", comment: "" });
    setDragStart(null);
    setDragCurrent(null);
  };

  const now = new Date();
  const isToday = isSameDay(now, date);
  const nowLineTop = (now.getHours() * 60 + now.getMinutes()) * minuteHeight + topOffset;
  const previewStart = dragStart !== null && dragCurrent !== null ? Math.min(dragStart, dragCurrent) : null;
  const previewEnd = dragStart !== null && dragCurrent !== null ? Math.max(dragStart, dragCurrent) : null;
  const previewHeightMinutes = previewStart === null || previewEnd === null
    ? 0
    : Math.max(settings.minEntryMinutes, previewEnd - previewStart || settings.minEntryMinutes);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-purple-200/70">Tagesansicht</div>
        <div className="text-xs text-purple-200/60">Klicken + Ziehen = Eintrag</div>
      </div>
      <div
        ref={scrollerRef}
        className="relative h-[calc(100vh-260px)] min-h-[520px] overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-black/10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{ height: totalHeight }} className="relative">
          {Array.from({ length: 48 }).map((_, i) => {
            const mins = i * 30;
            const top = mins * minuteHeight;
            const labelH = Math.floor(mins / 60).toString().padStart(2, "0");
            const labelM = (mins % 60).toString().padStart(2, "0");
            return (
              <div key={`t-${i}`} className="absolute left-0 w-12 text-[10px] text-purple-200/60 pointer-events-none" style={{ top: top + topOffset - 6 }}>
                {labelH}:{labelM}
              </div>
            );
          })}
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="absolute left-0 right-0 border-t border-white/5" style={{ top: h * 60 * minuteHeight + topOffset }}>
              <span className="absolute -left-2 -translate-x-full text-xs text-purple-200/40">{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}

          {isToday && (
            <div className="absolute left-14 right-2" style={{ top: nowLineTop }}>
              <div className="h-[1px] bg-brand-400" />
              <div className="text-[10px] text-brand-300">{format(now, "HH:mm")}</div>
            </div>
          )}

          {dragging && previewStart !== null && (
            <div
              className="absolute left-14 right-2 rounded-xl bg-brand-400/20 border border-brand-300/40"
              style={{ top: previewStart * minuteHeight + topOffset, height: previewHeightMinutes * minuteHeight }}
            >
              <div className="p-2 text-[10px] text-brand-100">Neuer Eintrag</div>
            </div>
          )}

          <div className="absolute top-0" style={{ left: 56, width: "calc(100% - 64px)", height: totalHeight, paddingTop: topOffset }}>
          {dayEntries.map((entry) => {
            const start = new Date(entry.start);
            const end = new Date(entry.end);
            const top = (start.getHours() * 60 + start.getMinutes()) * minuteHeight + topOffset;
            const durationMin = differenceInMinutes(end, start);
            const height = Math.max(minEntryPixelHeight, durationMin * minuteHeight);
            return (
              <Rnd
                key={entry.id}
                size={{ width: "100%", height }}
                position={{ x: 0, y: top }}
                bounds="parent"
                dragAxis="y"
                enableResizing={{ top: true, bottom: true, left: false, right: false }}
                grid={[1, settings.minEntryMinutes * minuteHeight]}
                minHeight={minEntryPixelHeight}
                onDragStart={() => { justInteractedRef.current = true; }}
                onDragStop={(_, d) => {
                  const mins = Math.round((d.y - topOffset) / minuteHeight / settings.minEntryMinutes) * settings.minEntryMinutes;
                  const ns = new Date(date); ns.setHours(0, mins, 0, 0);
                  const duration = differenceInMinutes(end, start);
                  const ne = new Date(ns); ne.setMinutes(ne.getMinutes() + duration);
                  onUpdate(entry.id, { start: ns.toISOString(), end: ne.toISOString() });
                  setTimeout(() => { justInteractedRef.current = false; }, 120);
                }}
                onResizeStart={() => { justInteractedRef.current = true; }}
                onResizeStop={(_, __, ref, ___, position) => {
                  const newHeight = ref.offsetHeight;
                  const mins = Math.round((position.y - topOffset) / minuteHeight / settings.minEntryMinutes) * settings.minEntryMinutes;
                  const step = settings.minEntryMinutes;
                  const dur = Math.max(settings.minEntryMinutes, Math.round(newHeight / minuteHeight / step) * step);
                  const ns = new Date(date); ns.setHours(0, mins, 0, 0);
                  const ne = new Date(ns); ne.setMinutes(ne.getMinutes() + dur);
                  onUpdate(entry.id, { start: ns.toISOString(), end: ne.toISOString() });
                  setTimeout(() => { justInteractedRef.current = false; }, 120);
                }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (justInteractedRef.current) return; onSelect(entry); }}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (entry.comment) navigator.clipboard?.writeText(entry.comment);
                  }
                }}
                className="entry-card rounded-xl bg-gradient-to-br from-brand-600/70 to-brand-800/60 border border-white/20 shadow-glass text-white"
              >
                <div className={classNames("p-2 text-xs", durationMin <= 15 && "py-1")}
                     title={`${projects.find(p => p.id === entry.projectId)?.name || "Projekt"} · ${format(start, "HH:mm")}–${format(end, "HH:mm")}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={classNames("font-medium truncate", durationMin <= 15 && "text-[11px]")}>{projects.find(p => p.id === entry.projectId)?.name || "Projekt"}</div>
                    <div className={classNames("text-[10px] text-white/80", durationMin <= 15 && "text-[10px]")}>{formatDuration(durationMin)}</div>
                  </div>
                  {durationMin >= 45 ? (
                    <div className="opacity-80 truncate">{format(start, "HH:mm")} – {format(end, "HH:mm")}</div>
                  ) : null}
                  {durationMin >= 60 && entry.comment && <div className="opacity-70 truncate">{entry.comment}</div>}
                </div>
              </Rnd>
            );
          })}
          </div>
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
    <div className="h-[calc(100vh-260px)] min-h-[520px] overflow-y-auto">
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


function ProjectSummary({ date, entries, projects }) {
  const dayEntries = entries.filter(e => isSameDay(new Date(e.start), date));
  const totals = dayEntries.reduce((acc, e) => {
    const mins = differenceInMinutes(new Date(e.end), new Date(e.start));
    acc[e.projectId] = (acc[e.projectId] || 0) + mins;
    return acc;
  }, {});
  const rows = Object.entries(totals)
    .map(([projectId, minutes]) => ({
      projectId,
      minutes,
      name: projects.find(p => p.id === projectId)?.name || "Projekt",
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return (
    <div>
      <div className="text-sm text-purple-200/70 mb-2 flex items-center justify-between">
        <span>Projektname</span>
        <span>⏱</span>
      </div>
      <div className="space-y-2 text-sm">
        {rows.length === 0 && (
          <div className="text-xs text-purple-200/60">Noch keine Einträge</div>
        )}
        {rows.map(r => (
          <div key={r.projectId} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <div className="truncate">{r.name}</div>
            <div className="text-xs text-purple-200/80">{formatDuration(r.minutes)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const label = {
    purple: "Purple",
    blue: "Blue",
    green: "Green",
    mono: "Mono",
    custom: "Custom",
  }[value] || "Purple";

  return (
    <div className="relative text-sm">
      <button className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded px-2 py-1" onClick={() => setOpen(!open)}>
        <span>{label}</span>
        <span className="text-purple-200/60">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-black/80 backdrop-blur p-1">
          {["purple","blue","green","mono","custom"].map((k) => (
            <button key={k} className={`w-full text-left px-2 py-1 rounded hover:bg-white/10 ${value===k?'bg-white/10':''}`} onClick={() => { onChange(k); setOpen(false); }}>
              {{purple:"Purple",blue:"Blue",green:"Green",mono:"Mono",custom:"Custom"}[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsPage({ settings, onChange, projects, onAddProject, onUpdateProject, onDeleteProject }) {
  return (
    <div className="glass rounded-2xl p-6 w-full max-w-none space-y-6">
      <div>
        <div className="text-lg font-semibold mb-4">Einstellungen</div>
        <div className="space-y-4 text-sm">
          <label className="flex items-center justify-between gap-4">
            <span>Min. Eintrag (Min)</span>
            <input
              className="bg-white/10 rounded px-2 py-1 w-24"
              type="number"
              value={settings.minEntryMinutes}
              onChange={(e) => onChange({ minEntryMinutes: Number(e.target.value || 0) })}
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Tagesziel (h)</span>
            <input
              className="bg-white/10 rounded px-2 py-1 w-24"
              type="number"
              value={settings.dailyGoalHours}
              onChange={(e) => onChange({ dailyGoalHours: Number(e.target.value || 0) })}
            />
          </label>
          <div className="text-xs text-purple-200/60">
            Änderungen werden direkt gespeichert.
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm text-purple-200/70 mb-2">Theme</div>
        <ThemeDropdown value={settings.theme} onChange={(v) => onChange({ theme: v })} />
        {settings.theme === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <input className="flex-1 bg-white/10 rounded px-2 py-1" value={settings.themeCustom || ""} onChange={(e) => onChange({ themeCustom: e.target.value })} placeholder="#8b4dff" />
            <input type="color" value={settings.themeCustom || "#8b4dff"} onChange={(e) => onChange({ themeCustom: e.target.value })} className="w-10 h-8 rounded" />
          </div>
        )}
      </div>

      <div>
        <div className="text-sm text-purple-200/70 mb-2">Updates</div>
        <button className="bg-white/10 rounded px-3 py-2 text-sm" onClick={() => window.nqApi?.requestUpdateCheck?.()}>
          Updates prüfen
        </button>
      </div>

      <div>
        <div className="text-sm text-purple-200/70 mb-2">Projekte</div>
        <div className="space-y-2">
          {projects.map(p => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <input type="color" value={p.color || "#8b4dff"} onChange={(e) => onUpdateProject(p.id, { color: e.target.value })} className="w-6 h-6 rounded" />
              <input className="flex-1 bg-white/10 rounded px-2 py-1" value={p.name} onChange={(e) => onUpdateProject(p.id, { name: e.target.value })} />
              {p.id !== "default" && (
                <button className="text-xs text-red-300" onClick={() => onDeleteProject(p.id)}>del</button>
              )}
            </div>
          ))}
          <button className="text-xs text-purple-200/70 hover:text-white" onClick={() => {
            const name = prompt("Projektname?");
            if (!name) return;
            onAddProject(name, "#8b4dff");
          }}>+ Projekt hinzufügen</button>
        </div>
      </div>
    </div>
  );
}

function CreateEntryModal({ entry, projects, settings, onClose, onCreate }) {
  const [draft, setDraft] = useState(entry);
  const start = new Date(draft.start);
  const end = new Date(draft.end);
  const durationMin = differenceInMinutes(end, start);

  const setTime = (key, value) => {
    const [h, m] = value.split(":").map(Number);
    const d = new Date(draft[key]);
    d.setHours(h || 0, m || 0, 0, 0);
    setDraft({ ...draft, [key]: d.toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Neuer Eintrag</div>
          <button className="text-xs text-purple-200/70" onClick={onClose}>schließen</button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="text-xs text-purple-200/70">
            {formatDuration(durationMin)}
          </div>
          <label className="block">
            Dauer
            <input className="mt-1 w-full bg-white/10 rounded px-2 py-1" value={durationToInput(durationMin)} onChange={(e) => {
              const mins = parseDurationInput(e.target.value);
              if (mins === null) return;
              const d = new Date(draft.start);
              const ne = new Date(d); ne.setMinutes(ne.getMinutes() + mins);
              setDraft({ ...draft, end: ne.toISOString() });
            }} />
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1">
              Start
              <input className="mt-1 w-full bg-white/10 rounded px-2 py-1" type="time" lang="de-DE" step={Math.max(60, settings.minEntryMinutes * 60)} value={format(start, "HH:mm")} onChange={(e) => setTime("start", e.target.value)} />
            </label>
            <label className="flex-1">
              Ende
              <input className="mt-1 w-full bg-white/10 rounded px-2 py-1" type="time" lang="de-DE" step={Math.max(60, settings.minEntryMinutes * 60)} value={format(end, "HH:mm")} onChange={(e) => setTime("end", e.target.value)} />
            </label>
          </div>
          <label className="block">
            Projekt
            <select className="mt-1 w-full bg-white/10 rounded px-2 py-1" value={draft.projectId} onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="block">
            Kommentar
            <input className="mt-1 w-full bg-white/10 rounded px-2 py-1" value={draft.comment || ""} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} />
          </label>
          <div className="flex items-center justify-between">
            <button className="text-xs text-purple-200/70" onClick={onClose}>abbrechen</button>
            <button className="bg-brand-600 px-3 py-1 rounded text-xs" onClick={() => onCreate(draft)}>speichern</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntryEditor({ entry, projects, settings, onClose, onSave, onDelete }) {
  const start = new Date(entry.start);
  const end = new Date(entry.end);
  const durationMin = differenceInMinutes(end, start);

  const setTime = (key, value) => {
    const [h, m] = value.split(":").map(Number);
    const d = new Date(entry[key]);
    d.setHours(h || 0, m || 0, 0, 0);
    onSave({ [key]: d.toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Eintrag bearbeiten</div>
          <button className="text-xs text-purple-200/70" onClick={onClose}>schließen</button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="text-xs text-purple-200/70">
            {formatDuration(durationMin)}
          </div>
          <label className="block">
            Dauer
            <input className="mt-1 w-full bg-white/10 rounded px-2 py-1" value={durationToInput(durationMin)} onChange={(e) => {
              const mins = parseDurationInput(e.target.value);
              if (mins === null) return;
              const d = new Date(entry.start);
              const ne = new Date(d); ne.setMinutes(ne.getMinutes() + mins);
              onSave({ end: ne.toISOString() });
            }} />
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1">
              Start
              <input className="mt-1 w-full bg-white/10 rounded px-2 py-1" type="time" lang="de-DE" step={Math.max(60, settings.minEntryMinutes * 60)} value={format(start, "HH:mm")} onChange={(e) => setTime("start", e.target.value)} />
            </label>
            <label className="flex-1">
              Ende
              <input className="mt-1 w-full bg-white/10 rounded px-2 py-1" type="time" lang="de-DE" step={Math.max(60, settings.minEntryMinutes * 60)} value={format(end, "HH:mm")} onChange={(e) => setTime("end", e.target.value)} />
            </label>
          </div>
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
          <div className="flex items-center justify-between">
            <button className="bg-brand-600 px-3 py-1 rounded text-xs" onClick={onDelete}>löschen</button>
            <button className="text-xs text-purple-200/70" onClick={onClose}>fertig</button>
          </div>
        </div>
      </div>
    </div>
  );
}


function applyTheme(theme, customHex) {
  const themes = {
    purple: "#8b4dff",
    blue: "#3b82f6",
    green: "#22c55e",
    mono: "#c7c7c7",
  };
  const hex = theme === "custom" ? (customHex || "#8b4dff") : themes[theme] || themes.purple;
  const rgb = hexToRgb(hex) || "139, 77, 255";
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent2", hex);
  root.style.setProperty("--accent-rgb", rgb);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function durationToInput(mins) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, "0")}`;
  }
  return String(mins);
}

function parseDurationInput(val) {
  if (!val) return null;
  const v = val.trim().toLowerCase();
  const hm = v.match(/^(\d+)\s*[:h]\s*(\d{1,2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
  const dotted = v.match(/^(\d+)\.(\d{1,2})$/);
  if (dotted) return parseInt(dotted[1], 10) * 60 + parseInt(dotted[2], 10);
  const hOnly = v.match(/^(\d+(?:[.,]\d+)?)\s*h$/);
  if (hOnly) return Math.round(parseFloat(hOnly[1].replace(',', '.')) * 60);
  const mOnly = v.match(/^(\d+)\s*m?$/);
  if (mOnly) return parseInt(mOnly[1], 10);
  return null;
}

function formatDuration(mins) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
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
