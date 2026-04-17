import React from "react";
import { Mic, Thermometer, Stethoscope, Heart, CircleAlert } from "lucide-react";
import { t } from "../translations";
import { SevBadge } from "./SevBadge";
import { probColor } from "../utils/helpers";

export function SymptomResults({ data, lang = "en" }) {
  if (!data) return null;
  const { symptoms = [], conditions = [], advice, warning, transcript } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
      {transcript && (
        <div className="card card-sm">
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
            <Mic size={12} /> Transcript
          </div>
          <div style={{ fontSize: 17, fontStyle: "italic", fontFamily: "var(--serif)", lineHeight: 1.65, color: "var(--t1)" }}>"{transcript}"</div>
        </div>
      )}
      {symptoms.length > 0 && (
        <div className="card card-sm">
          <div className="row between" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t2)", display: "flex", alignItems: "center", gap: 6 }}>
               <Thermometer size={15} /> {t("detected_symptoms", lang)}
            </div>
            <span className="badge b-amber">{symptoms.length} {t("found", lang)}</span>
          </div>
          <div className="chips">
            {symptoms.map((s, i) => <span key={i} className="chip-sym">{s}</span>)}
          </div>
        </div>
      )}
      {conditions.length > 0 && (
        <div className="card card-sm">
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t2)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Stethoscope size={15} /> {t("possible_conditions", lang)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {conditions.map((c, i) => {
              const pct = Math.round((c.probability || 0) * 100);
              return (
                <div key={i} className="cond-card">
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                    <div className="row gap8">
                      <SevBadge p={c.probability || 0} lang={lang} />
                      <span style={{ fontSize: 15, fontWeight: 800, color: probColor(c.probability || 0) }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="prog-wrap">
                    <div className="prog-fill" style={{ width: `${pct}%`, background: probColor(c.probability || 0) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {advice && (
        <div className="box-good">
          <Heart size={20} style={{ color: "var(--sage)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--sage-dk)" }}>{t("advice", lang)}</div>
            <div style={{ fontSize: 14, color: "var(--sage-dk)", marginTop: 4, lineHeight: 1.6 }}>{advice}</div>
          </div>
        </div>
      )}
      {warning && (
        <div className="box-warn">
          <CircleAlert size={20} style={{ color: "var(--red)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--red)" }}>{t("warning", lang)}</div>
            <div style={{ fontSize: 14, color: "#8B2F2F", marginTop: 4, lineHeight: 1.6 }}>{warning}</div>
          </div>
        </div>
      )}
    </div>
  );
}
