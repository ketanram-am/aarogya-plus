import React from "react";
import { 
  Mic, PenLine, Camera, Pill, ChevronRight, Building2, ClipboardList 
} from "lucide-react";
import { t } from "../translations";

export function HomeScreen({ go, lang = "en" }) {
  const h = new Date().getHours();
  const greet = h < 12 ? t("good_morning", lang) : h < 17 ? t("good_afternoon", lang) : t("good_evening", lang);
  const timeLabel = h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";

  const cards = [
    {
      icon: Mic, bg: "var(--indigo)", iconColor: "#fff",
      title: t('speak_symptoms', lang),
      desc: t('speak_desc', lang) + " / " + t('type_desc', lang),
      screen: "symptoms"
    },
    {
      icon: Camera, bg: "var(--amber-lt)", iconColor: "var(--amber)",
      title: t('scan_prescription', lang),
      desc: t('scan_desc', lang),
      screen: "scan"
    },
    {
      icon: Pill, bg: "var(--terra-lt)", iconColor: "var(--terracotta)",
      title: t('view_medicines', lang),
      desc: t('view_medicines_desc', lang),
      screen: "reminders"
    },
    {
      icon: ClipboardList, bg: "var(--sage-lt)", iconColor: "var(--sage)",
      title: t('medical_history', lang),
      desc: t('medical_history_desc', lang),
      screen: "pharmacist"
    },
  ];

  return (
    <div className="screen">
      <div className="greet-band">
        <div className="greet-time">{timeLabel}</div>
        <div className="greet-msg">
          {greet}, {t("dadi_ji", lang)}
        </div>
        <div className="greet-sub">{t("how_feeling", lang)}</div>
      </div>

      <div className="section-label">{t("quick_actions", lang)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.screen}
              onClick={() => go(c.screen)}
              style={{
                background: "var(--surface)", borderRadius: "var(--r)",
                border: "1px solid var(--cream-border)", padding: "20px 16px",
                cursor: "pointer", transition: "all .2s", position: "relative"
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--indigo)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "var(--cream-border)"; }}
              onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
              onMouseUp={e => { e.currentTarget.style.transform = ""; }}
            >
              <ChevronRight size={16} style={{ position: "absolute", top: 14, right: 14, color: "var(--t3)" }} />
              <div style={{ width: 46, height: 46, borderRadius: 13, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Icon size={22} style={{ color: c.iconColor }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t1)", lineHeight: 1.3 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 3, lineHeight: 1.4 }}>{c.desc}</div>
            </div>
          );
        })}
      </div>

      <div
        className="card"
        style={{ cursor: "pointer", background: "var(--sage-lt)", border: "1px solid #C3DCCC", marginBottom: 12 }}
        onClick={() => go("locator")}
      >
        <div className="row gap12">
          <div style={{ width: 46, height: 46, borderRadius: 13, background: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Building2 size={22} style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--sage-dk)" }}>{t("find_pharmacy", lang)}</div>
            <div style={{ fontSize: 13, color: "var(--sage)", marginTop: 2 }}>{t("find_pharmacy_desc", lang)}</div>
          </div>
          <ChevronRight size={20} style={{ color: "var(--sage)" }} />
        </div>
      </div>
    </div>
  );
}
