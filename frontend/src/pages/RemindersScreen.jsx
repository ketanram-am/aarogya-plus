import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, AlarmClock, Calendar, Pill, CheckCircle2, Sun, Sunset, Moon, AlertTriangle
} from "lucide-react";
import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";
import { SpeakButton } from "../components/SpeakButton";

/* Deterministic Helper for Medicine Color & Image */
const MED_IMAGES = [
  "https://images.unsplash.com/photo-1584308666744-24d5e478ac6b?w=100&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550572017-edb30d359b85?w=100&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=100&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=100&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=100&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1631549448353-471b053bfc3b?w=100&q=80&auto=format&fit=crop"
];

const MED_COLORS = [
  { bg: "#E8F5E9", border: "#4CAF50" }, // Green
  { bg: "#E3F2FD", border: "#2196F3" }, // Blue
  { bg: "#FFF3E0", border: "#FF9800" }, // Orange
  { bg: "#FCE4EC", border: "#E91E63" }, // Pink
  { bg: "#F3E5F5", border: "#9C27B0" }, // Purple
  { bg: "#E0F7FA", border: "#00BCD4" }  // Cyan
];

const getMedData = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  hash = Math.abs(hash);
  return {
    image: MED_IMAGES[hash % MED_IMAGES.length],
    color: MED_COLORS[hash % MED_COLORS.length]
  };
};

export function RemindersScreen({ lang }) {
  const [tab, setTab] = useState("today");
  const [rems, setRems] = useState([]);
  const [fup, setFup] = useState([]);
  const [loading, setLoad] = useState(true);
  const [err, setErr] = useState(null);
  const [taken, setTaken] = useState(new Set());
  const [refreshing, setRf] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    silent ? setRf(true) : setLoad(true);
    setErr(null);
    try {
      const [r, f] = await Promise.all([api.reminders(lang), api.followup(lang)]);
      const remList = Array.isArray(r) ? r : [];
      const fupList = Array.isArray(f) ? f : [];
      setRems(remList); setFup(fupList);
      const init = new Set();
      remList.forEach(x => { if (x.taken) init.add(`${x.medicine_name}_${x.time}`); });
      setTaken(init);
    } catch (e) { setErr(e.message); }
    finally { setLoad(false); setRf(false); }
  }, [lang]);

  useEffect(() => { loadData(); }, [loadData]);

  const markTaken = async (name, time) => {
    try {
      await api.taken(name, time);
      setTaken(prev => new Set([...prev, `${name}_${time}`]));
    } catch { alert("Could not connect to server. Is the backend running?"); }
  };

  const slotIcons = { Morning: AlarmClock, Afternoon: Sun, Evening: Sunset, Night: Moon };
  const doneCount = rems.filter(r => taken.has(`${r.medicine_name}_${r.time}`)).length;

  return (
    <div className="screen">
      <div className="row between" style={{ marginBottom: 20 }}>
        <div>
          <div className="sh-eyebrow">{t("schedule", lang)}</div>
          <div className="sh-title">Medicine {t("schedule", lang)}</div>
        </div>
        <button className="btn btn-outline btn-sm no-print" onClick={() => loadData(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} />
          {refreshing ? "…" : "Refresh"}
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "today" ? "active" : ""}`} onClick={() => setTab("today")}>
          <AlarmClock size={14} /> {t("today", lang)} {rems.length > 0 ? `(${doneCount}/${rems.length})` : ""}
        </button>
        <button className={`tab ${tab === "followup" ? "active" : ""}`} onClick={() => setTab("followup")}>
          <Calendar size={14} /> {t("follow_up", lang)} {fup.length > 0 ? `(${fup.length})` : ""}
        </button>
      </div>

      {loading && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}

      {!loading && tab === "today" && (
        rems.length === 0
          ? <div className="empty">
            <div className="empty-icon"><Pill size={46} /></div>
            <div className="empty-text">{t("no_reminders_today", lang)}</div>
            <div className="empty-sub">{t("scan_to_get_started", lang)}</div>
          </div>
          : <>
            <div className="stat-strip" style={{ marginBottom: 16, background: doneCount === rems.length ? "var(--sage-lt)" : "var(--indigo-lt)", display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="row between" style={{ width: '100%' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: doneCount === rems.length ? "var(--sage-dk)" : "var(--indigo)" }}>
                  {doneCount === rems.length ? t("all_doses_taken", lang) : `${rems.length - doneCount} ${rems.length - doneCount !== 1 ? t("doses_remaining", lang) : t("dose_remaining", lang)}`}
                </div>
                <span className="badge b-indigo">{doneCount}/{rems.length}</span>
              </div>
              <div style={{ alignSelf: 'flex-start' }}>
                <SpeakButton text={rems.map(r => `${r.medicine_name} at ${r.time}`).join(". ")} lang={lang} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rems.map((r, i) => {
                const key = `${r.medicine_name}_${r.time}`;
                const done = taken.has(key);
                const SlotIcon = slotIcons[r.slot] || Pill;
                const medData = getMedData(r.medicine_name);

                return (
                  <div key={i} className={`rem-card ${done ? "done" : ""}`}>

                    {/* Time */}
                    <div className="time-badge">
                      <SlotIcon size={18} style={{ margin: "0 auto 3px", color: done ? "inherit" : medData.color.border }} />
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{r.time}</div>
                    </div>

                    {/* 🔥 IMAGE/ICON + TEXT */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>

                      {/* Image/Icon Container */}
                      <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        backgroundColor: done ? "var(--bg)" : medData.color.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `2px solid ${done ? "var(--cream-border)" : medData.color.border}`,
                        flexShrink: 0,
                        overflow: "hidden",
                        position: "relative"
                      }}>
                        <img 
                          src={medData.image} 
                          alt="" 
                          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", opacity: done ? 0.4 : 1 }}
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        <Pill size={28} color={done ? "var(--t3)" : medData.color.border} fill={done ? "none" : medData.color.bg} strokeWidth={2} style={{ position: "relative", zIndex: 0 }} />
                      </div>

                      {/* Text */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 18, color: done ? "var(--t2)" : "var(--t1)" }}>{r.medicine_name}</div>
                        <div style={{ fontSize: 14, color: done ? "var(--t3)" : "var(--t2)", marginTop: 4, fontWeight: 500 }}>
                          {r.slot} · {r.food_instruction}
                        </div>
                      </div>

                    </div>

                    {/* Action */}
                    {done
                      ? <span className="badge b-sage"><CheckCircle2 size={12} /> {t("taken", lang)}</span>
                      : <button className="btn btn-sage btn-sm" onClick={() => markTaken(r.medicine_name, r.time)}>
                        <CheckCircle2 size={16} /> {t("mark_taken", lang)}
                      </button>
                    }

                  </div>
                );
              })}
            </div>
          </>
      )}

      {!loading && tab === "followup" && (
        fup.length === 0
          ? <div className="empty">
            <div className="empty-icon"><Calendar size={46} /></div>
            <div className="empty-text">{t("no_followups", lang)}</div>
            <div className="empty-sub">{t("scan_track_progress", lang)}</div>
          </div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fup.map((f, i) => {
              const maxDays = 30;
              const pct = Math.max(0, Math.min(100, ((maxDays - (f.days_remaining || 0)) / maxDays) * 100));
              const urgent = f.days_remaining <= 2;
              const warn = f.days_remaining <= 5;
              const color = urgent ? "var(--red)" : warn ? "var(--amber)" : "var(--sage)";
              return (
                <div key={i} className="card card-sm" style={{ borderLeft: `4px solid ${color}`, borderRadius: "var(--r-sm)" }}>
                  <div className="row between" style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 18 }}>{f.medicine_name}</div>
                    <span className={`badge ${urgent ? "b-red" : warn ? "b-amber" : "b-sage"}`}>
                      {f.days_remaining} {t("days_left", lang)}
                    </span>
                  </div>
                  <div className="prog-wrap" style={{ marginBottom: 10 }}>
                    <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="row between" style={{ fontSize: 13 }}>
                    <span style={{ color: "var(--t2)" }}>
                      {t("progress", lang)}: <strong style={{ color: "var(--t1)" }}>{Math.round(pct)}%</strong>
                    </span>
                    <span style={{ color: "var(--t2)" }}>
                      {t("ends", lang)}: <strong style={{ color: "var(--t1)" }}>{f.end_date}</strong>
                    </span>
                  </div>
                  {urgent && (
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "var(--red)", display: "flex", alignItems: "center", gap: 5 }}>
                      <AlertTriangle size={13} /> {t("refill_immediate", lang)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      )}
    </div>
  );
}