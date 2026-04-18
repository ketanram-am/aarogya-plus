import React, { useState } from "react";
import { Clock, Leaf, ChevronUp, ChevronDown, Pill } from "lucide-react";
import { t } from "../translations";
import { SCHED_LABELS } from "../constants";
import { SpeakButton } from "./SpeakButton";

export function MedCard({ m, lang = "en" }) {
  const [open, setOpen] = useState(false);
  const hasPurpose = m.purpose && !m.purpose.startsWith("Not found");
  return (
    <div className="card card-sm">
      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--t1)" }}>{m.medicine_name}</div>
          <span className="badge b-indigo mt8">{m.dosage}</span>
        </div>
        <span className="badge b-sage">{m.duration}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "var(--cream)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 800, textTransform: "uppercase", letterSpacing: .6, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={10} /> {t("schedule_caps", lang)}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: "var(--t1)" }}>{SCHED_LABELS[m.schedule] || m.schedule}</div>
        </div>
        <div style={{ background: "var(--amber-lt)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--amber)", fontWeight: 800, textTransform: "uppercase", letterSpacing: .6, display: "flex", alignItems: "center", gap: 4 }}>
            <Leaf size={10} /> {t("food_caps", lang)}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)", marginTop: 4 }}>{m.food_instruction}</div>
        </div>
      </div>
      {hasPurpose ? (
        <>
          <button onClick={() => setOpen(v => !v)}
            style={{
              marginTop: 12, background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, color: "var(--indigo)",
              display: "flex", alignItems: "center", gap: 5, padding: 0
            }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {open ? t("hide_purpose", lang) : t("why_this_medicine", lang)}
          </button>
          {open && (
            <div className="purpose-box">
              <div className="purpose-lbl"><Pill size={10} style={{ display: "inline" }} /> {t("purpose", lang)}</div>
              <div className="purpose-text">{m.purpose}</div>
              <SpeakButton text={`${m.medicine_name}: ${m.purpose}`} lang={lang} />
            </div>
          )}
        </>
      ) : (
        <span className="badge b-gray mt8" style={{ fontSize: 11 }}>{t("purpose_not_found", lang)}</span>
      )}
    </div>
  );
}
