import React, { useState, useEffect } from "react";
import { 
  ShieldPlus, Calendar, Pencil, Pill, Printer, AlertTriangle, Info 
} from "lucide-react";
import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";

export function PharmacistScreen({ lang }) {
  const [fup, setFup] = useState([]);
  const [loading, setLoad] = useState(true);
  const [err, setErr] = useState(null);
  const [patient, setPatient] = useState("Patient");
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState("Patient");

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
    api.followup(lang)
      .then(d => { setFup(Array.isArray(d) ? d : []); setLoad(false); })
      .catch(e => { setErr(e.message); setLoad(false); });
  }, [lang]);

  const saveName = () => { setPatient(nameVal); setEditing(false); };

  return (
    <div className="screen">
      <div className="rx-band">
        <div style={{ fontSize: 11, fontWeight: 800, opacity: .7, textTransform: "uppercase", letterSpacing: 1 }}>
          {t("pharmacist_portal_title", lang)}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginTop: 6 }}>{t("prescription_report", lang)}</div>
        <div style={{ fontSize: 13, opacity: .8, marginTop: 5 }}>{t("dispensing_verification", lang)}</div>
        <div style={{ fontSize: 12, opacity: .6, marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
          <Calendar size={12} /> {today}
        </div>
      </div>

      <div className="card card-sm" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>{t("patient_info", lang)}</div>
        {editing
          ? <div className="row gap8">
            <input className="input" style={{ fontSize: 15, padding: "9px 13px" }}
              value={nameVal} onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveName()} />
            <button className="btn btn-primary btn-sm" onClick={saveName}>{t("save", lang)}</button>
          </div>
          : <div className="row between">
            <div style={{ fontFamily: "var(--serif)", fontSize: 20 }}>{patient}</div>
            <button className="btn btn-outline btn-sm no-print" onClick={() => setEditing(true)}>
              <Pencil size={13} /> {t("edit", lang)}
            </button>
          </div>
        }
      </div>

      {loading && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}

      {!loading && fup.length === 0 && !err && (
        <div className="empty">
          <div className="empty-icon"><ShieldPlus size={46} /></div>
          <div className="empty-text">{t("no_active_prescriptions", lang)}</div>
          <div className="empty-sub">{t("scan_first_come_back", lang)}</div>
        </div>
      )}

      {!loading && fup.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 7 }}>
                <Pill size={16} style={{ color: "var(--sage)" }} /> {t("prescribed_medicines", lang)}
              </div>
              <span className="badge b-sage">{fup.length}  {fup.length !== 1 ? t("items", lang) : t("item", lang)}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 6, background: "var(--sage-lt)", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
              {[t("table_medicine", lang), t("table_days_left", lang), t("table_ends", lang), t("table_status", lang)].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "var(--sage)", textTransform: "uppercase", letterSpacing: .5 }}>{h}</div>
              ))}
            </div>

            {fup.map((m, i) => {
              const urgent = m.days_remaining <= 2;
              const warn = m.days_remaining <= 5;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 6, alignItems: "center", padding: "12px 0", borderBottom: i < fup.length - 1 ? "1px solid var(--cream-border)" : "none" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{m.medicine_name}</div>
                  <span className="badge b-indigo" style={{ fontSize: 11, justifySelf: "start" }}>{m.days_remaining}d</span>
                  <div style={{ fontSize: 12, color: "var(--t2)" }}>{m.end_date}</div>
                  <span className={`badge ${urgent ? "b-red" : warn ? "b-amber" : "b-sage"}`} style={{ fontSize: 11, justifySelf: "start" }}>
                    {urgent ? t("status_refill_now", lang) : warn ? t("status_refill_soon", lang) : t("status_active", lang)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="box-amber" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Info size={15} /> {t("dispensing_notes", lang)}
            </div>
            <div style={{ fontSize: 13, color: "#7A5412", lineHeight: 1.85 }}>
              · {t("dispensing_note_1", lang)}<br />
              · {t("dispensing_note_2", lang)}<br />
              · {t("dispensing_note_3", lang)}<br />
              · {t("dispensing_note_4", lang)}<br />
              · {t("dispensing_note_5", lang)}
            </div>
          </div>

          {fup.some(m => m.days_remaining <= 5) && (
            <div className="box-warn" style={{ marginBottom: 14 }}>
              <AlertTriangle size={20} style={{ color: "var(--red)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--red)" }}>{t("refill_alert", lang)}</div>
                <div style={{ fontSize: 13, color: "#8B2F2F", marginTop: 4, lineHeight: 1.5 }}>
                  {fup.filter(m => m.days_remaining <= 5).map(m => m.medicine_name).join(", ")} — {t("running_low", lang)}
                </div>
              </div>
            </div>
          )}

          <button className="btn btn-sage btn-full no-print" onClick={() => window.print()}>
            <Printer size={18} /> {t("print_report", lang)}
          </button>

          <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: "var(--t3)" }} className="no-print">
            {t("generated_by", lang)} · {today}<br />
            {t("auto_generated_verify", lang)}
          </div>
        </>
      )}
    </div>
  );
}
