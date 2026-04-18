import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, CheckCircle2, AlertTriangle, X,
  Clock, Activity, TrendingUp, Users, Loader2,
  CircleAlert, BadgeCheck
} from "lucide-react";
import { t } from "../translations";

async function fetchDashboard(lang) {
  try {
    const [remRes, folRes] = await Promise.all([
      fetch(`/api/reminders?lang=${lang}`),
      fetch(`/api/followup?lang=${lang}`)
    ]);
    const rems = await remRes.json();
    const fol  = await folRes.json();

    const now = new Date();
    const currentStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    let takenCount = 0;
    const reminders = (Array.isArray(rems) ? rems : []).map(r => {
      let status = "Upcoming";
      if (r.taken) {
        status = "Taken";
        takenCount++;
      } else if (r.time < currentStr) {
        status = "Missed";
      } else {
        status = "Pending";
      }
      return { ...r, status };
    });

    const total = reminders.length;
    const pct = total === 0 ? 0 : Math.round((takenCount / total) * 100);
    
    let level = t("poor", lang);
    if (pct >= 80) level = t("excellent", lang);
    else if (pct >= 50) level = t("good", lang);
    else if (pct >= 30) level = t("stable", lang);

    const missed_summary = {};
    reminders.filter(r => r.status === "Missed").forEach(r => {
        const [h, m] = r.time.split(':').map(Number);
        const diffHrs = (now.getHours() - h) + (now.getMinutes() - m) / 60;
        if (!missed_summary[r.medicine_name]) {
            missed_summary[r.medicine_name] = { count: 0, delay: 0 };
        }
        missed_summary[r.medicine_name].count++;
        missed_summary[r.medicine_name].delay = Math.max(missed_summary[r.medicine_name].delay, diffHrs);
    });

    const missed_arr = Object.keys(missed_summary).map(key => {
        const risk = missed_summary[key].delay > 2 ? "High Risk" : "Warning";
        return { medicine_name: key, missed_count: missed_summary[key].count, risk };
    });

    return {
      reminders,
      missed_summary: missed_arr,
      followups: Array.isArray(fol) ? fol : [],
      adherence: { adherence_percent: pct, level, taken_doses: takenCount, total_doses: total }
    };
  } catch (e) {
    console.warn(e);
    throw new Error("Failed to load dashboard data");
  }
}

function StatusBadge({ status, lang }) {
  const cfg = {
    Taken:    { cls: "b-sage",   icon: "✓", labelKey: "stat_taken" },
    Missed:   { cls: "b-red",    icon: "✗", labelKey: "stat_missed" },
    Pending:  { cls: "b-amber",  icon: "…", labelKey: "stat_pending" },
    Upcoming: { cls: "b-gray",   icon: "○", labelKey: "stat_upcoming" },
  };
  const { cls, icon, labelKey } = cfg[status] || { cls: "b-gray", icon: "○", labelKey: "" };
  const label = labelKey ? t(labelKey, lang) : status;
  return <span className={`badge ${cls}`}>{icon} {label}</span>;
}

export default function FamilyDashboard({ lang = "en" }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);
  const [refreshing, setRf]   = useState(false);

  const load = useCallback(async (silent = false) => {
    silent ? setRf(true) : setLoading(true);
    setErr(null);
    try { setData(await fetchDashboard(lang)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); setRf(false); }
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ padding: "36px 0", textAlign: "center", color: "var(--indigo)" }}>
      <Loader2 size={32} className="spin-icon" />
      <div style={{ marginTop: 10, fontSize: 14, color: "var(--t2)", fontWeight: 600 }}>
        {t("please_wait", lang)}
      </div>
    </div>
  );

  if (err) return (
    <div className="box-warn mt16">
      <AlertTriangle size={20} style={{ color: "var(--red)", flexShrink: 0 }} />
      <div>
        <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 15 }}>Dashboard unavailable</div>
        <div style={{ fontSize: 14, color: "#8B2F2F", marginTop: 4 }}>{err}</div>
      </div>
    </div>
  );

  if (!data) return null;

  const { reminders = [], missed_summary = [], followups = [], adherence = {} } = data;
  const pct = adherence.adherence_percent ?? 0;
  const ringColor = pct >= 80 ? "var(--sage)" : pct >= 50 ? "var(--amber)" : "var(--red)";
  const ringBg    = pct >= 80 ? "var(--sage-lt)" : pct >= 50 ? "var(--amber-lt)" : "var(--red-lt)";
  const circ = 2 * Math.PI * 26;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Adherence ring */}
      <div style={{
        background: ringBg, borderRadius: "var(--r-sm)",
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
      }}>
        <svg width="68" height="68" viewBox="0 0 68 68" style={{ flexShrink: 0 }}>
          <circle cx="34" cy="34" r="26" fill="none" stroke="var(--cream-border)" strokeWidth="7" />
          <circle cx="34" cy="34" r="26" fill="none" stroke={ringColor} strokeWidth="7"
            strokeDasharray={`${(pct / 100) * circ} ${circ - (pct / 100) * circ}`}
            strokeLinecap="round" transform="rotate(-90 34 34)"
            style={{ transition: "stroke-dasharray .8s ease" }} />
          <text x="34" y="39" textAnchor="middle"
            style={{ fontSize: 12, fontWeight: 800, fill: ringColor, fontFamily: "var(--font)" }}>
            {pct}%
          </text>
        </svg>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)" }}>
            {t("daily_adherence", lang)}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: ringColor, margin: "3px 0 2px" }}>
            {adherence.level ?? ""}
          </div>
          <div style={{ fontSize: 12, color: "var(--t2)" }}>
            {adherence.taken_doses ?? 0} {t("at", lang)} {adherence.total_doses ?? 0} {t("doses_today_format", lang)}
          </div>
        </div>
      </div>

      {/* Live status table */}
      <div className="card card-sm">
        <div className="section-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Activity size={12} /> {t("live_status", lang)}
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 62px 1fr", gap: 8,
          background: "var(--sage-lt)", borderRadius: 8, padding: "7px 10px", marginBottom: 4,
        }}>
          {[t("table_medicine", lang), t("time_label", lang), t("table_status", lang)].map((h, idx) => (
            <span key={h} style={{ 
              fontSize: 9, fontWeight: 800, textTransform: "uppercase", 
              letterSpacing: .5, color: "var(--sage-dk)",
              textAlign: idx === 1 ? "center" : idx === 2 ? "right" : "left"
            }}>{h}</span>
          ))}
        </div>
        {reminders.map((item, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1fr 62px 1fr", gap: 8,
            alignItems: "center", padding: "9px 10px",
            borderBottom: i < reminders.length - 1 ? "1px solid var(--cream-border)" : "none",
          }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{item.medicine_name}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, background: "var(--indigo-lt)",
              color: "var(--indigo)", borderRadius: 6, padding: "3px 7px", textAlign: "center",
            }}>{item.time}</span>
            <div style={{ textAlign: "right" }}>
              <StatusBadge status={item.status} lang={lang} />
            </div>
          </div>
        ))}
      </div>

      {/* Missed dose alert */}
      {missed_summary.length > 0 && (
        <div className="card card-sm">
          <div className="section-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CircleAlert size={12} /> {t("missed_dose_alert", lang)}
          </div>
          {missed_summary.map((item, i) => {
            const hi = item.risk === "High Risk";
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: 10, marginBottom: i < missed_summary.length - 1 ? 7 : 0,
                background: hi ? "var(--red-lt)" : "var(--cream-dk)",
                border: `1px solid ${hi ? "#FBBCBC" : "var(--cream-border)"}`,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.medicine_name}</div>
                  <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>
                    {t("stat_missed", lang)} {item.missed_count} {item.missed_count === 1 ? t("time_label", lang).toLowerCase() : t("times_label", lang)}
                  </div>
                </div>
                <span className={`badge ${hi ? "b-red" : "b-sage"}`}>
                  {hi ? <><AlertTriangle size={10} /> {t("risk_high", lang)}</> : <><BadgeCheck size={10} /> {t("stable", lang)}</>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Refill Summary */}
      {followups.length > 0 && (
        <div className="card card-sm">
          <div className="section-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <TrendingUp size={12} /> {t("follow_up", lang)}
          </div>
          {followups.map((item, i) => {
            const dr = item.days_remaining;
            // Create a progress percentage assuming a typical max cache of 30 days
            const pct = Math.min(100, Math.max(0, (dr / 30) * 100));
            const color = dr > 5 ? "var(--sage)" : dr <= 1 ? "var(--red)" : "var(--amber)";
            
            return (
              <div key={i} style={{ marginBottom: i < followups.length - 1 ? 12 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  <span>{item.medicine_name}</span>
                  <span style={{ color }}>{dr} {t("days_left", lang)}</span>
                </div>
                <div style={{ background: "var(--cream-dk)", border: "1px solid var(--cream-border)", height: 8, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 4, textAlign: "right", fontWeight: 600 }}>
                  {t("ends", lang)}: {item.end_date}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}