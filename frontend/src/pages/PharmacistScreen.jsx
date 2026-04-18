import React, { useState, useEffect } from "react";
import { 
  ShieldPlus, Calendar, Pill, Printer, Clock, User, Stethoscope, 
  ChevronDown, ChevronUp, Activity, Heart, Image as ImageIcon,
  ClipboardList, Search, SortAsc, Trash2, X, ArrowUpDown
} from "lucide-react";
import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";

/* ── Lightbox Modal ── */
function ImageLightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }} onClick={onClose}>
      <button onClick={onClose} style={{
        position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)",
        border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <X size={22} style={{ color: "#fff" }} />
      </button>
      <img src={src} alt="Prescription" style={{
        maxWidth: "95%", maxHeight: "90vh", borderRadius: 10, objectFit: "contain"
      }} onClick={e => e.stopPropagation()} />
    </div>
  );
}

export function PharmacistScreen({ lang }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoad] = useState(true);
  const [err, setErr] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Search & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
    api.prescriptions(lang)
      .then(d => { setHistory(Array.isArray(d) ? d : []); setLoad(false); })
      .catch(e => { setErr(e.message); setLoad(false); });
  }, [lang]);

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!detailData[id]) {
      setLoadingDetail(id);
      try {
        const detail = await api.prescription(id, lang);
        setDetailData(prev => ({ ...prev, [id]: detail }));
      } catch (e) { console.error("Detail fetch failed:", e); }
      setLoadingDetail(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this prescription from history?")) return;
    try {
      await api.deletePrescription(id);
      setHistory(prev => prev.filter(rx => rx.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (e) { alert("Delete failed: " + e.message); }
  };

  // ── Filter logic ──
  const q = searchQuery.toLowerCase().trim();
  const filtered = history.filter(rx => {
    if (!q) return true;
    const meds = (rx.prescription_medicines || []).map(m => m.medicine_name?.toLowerCase() || "").join(" ");
    return (
      (rx.doctor_name || "").toLowerCase().includes(q) ||
      (rx.patient_name || "").toLowerCase().includes(q) ||
      (rx.diagnosis || "").toLowerCase().includes(q) ||
      meds.includes(q)
    );
  });

  // ── Sort logic ──
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "date_asc": return new Date(a.scan_date) - new Date(b.scan_date);
      case "doctor": return (a.doctor_name || "").localeCompare(b.doctor_name || "");
      case "diagnosis": return (a.diagnosis || "").localeCompare(b.diagnosis || "");
      case "meds": return (b.prescription_medicines?.length || 0) - (a.prescription_medicines?.length || 0);
      default: return new Date(b.scan_date) - new Date(a.scan_date); // date_desc
    }
  });

  const totalMeds = history.reduce((sum, rx) => sum + (rx.prescription_medicines?.length || 0), 0);

  return (
    <div className="screen">
      {/* Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header Band */}
      <div className="rx-band">
        <div style={{ fontSize: 11, fontWeight: 800, opacity: .7, textTransform: "uppercase", letterSpacing: 1 }}>
          {t("pharmacist_portal_title", lang) || "Medical Records"}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginTop: 6 }}>
          <ClipboardList size={22} style={{ display: "inline", marginBottom: -4, marginRight: 6 }} />
          {t("prescription_history", lang)}
        </div>
        <div style={{ fontSize: 13, opacity: .8, marginTop: 5 }}>
          {history.length} {history.length === 1 ? t("visit", lang) : t("visits", lang)} · {totalMeds} {t("medicines_tracked", lang)}
        </div>
        <div style={{ fontSize: 12, opacity: .6, marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
          <Calendar size={12} /> {today}
        </div>
      </div>

      {loading && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}

      {/* Search & Sort Bar */}
      {!loading && history.length > 0 && (
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--t3)" }} />
            <input
              className="input"
              placeholder={t("search_history", lang)}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, fontSize: 14, background: "var(--cream-bg)", border: "1px solid var(--cream-border)" }}
            />
          </div>
          <div className="row gap8" style={{ flexWrap: "wrap" }}>
            <ArrowUpDown size={14} style={{ color: "var(--t3)" }} />
            {[
              { key: "date_desc", label: t("sort_newest", lang) },
              { key: "date_asc", label: t("sort_oldest", lang) },
              { key: "doctor", label: t("sort_doctor", lang) },
              { key: "diagnosis", label: t("sort_diagnosis", lang) },
              { key: "meds", label: t("sort_meds", lang) },
            ].map(s => (
              <button key={s.key}
                onClick={() => setSortBy(s.key)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, cursor: "pointer",
                  border: sortBy === s.key ? "2px solid var(--indigo)" : "1px solid var(--cream-border)",
                  background: sortBy === s.key ? "var(--indigo-lt)" : "transparent",
                  color: sortBy === s.key ? "var(--indigo)" : "var(--t2)"
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && sorted.length === 0 && !err && (
        <div className="empty">
          <div className="empty-icon"><ShieldPlus size={46} /></div>
          <div className="empty-text">{q ? t("no_matching", lang) : t("no_past_visits", lang)}</div>
          <div className="empty-sub">{q ? t("try_different_search", lang) : t("scan_first_come_back", lang)}</div>
        </div>
      )}

      {/* Visit Cards */}
      {!loading && sorted.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sorted.map((rx, idx) => {
            const isExp = expandedId === rx.id;
            const meds = rx.prescription_medicines || [];
            const detail = detailData[rx.id];
            const dateStr = rx.scan_date 
              ? new Date(rx.scan_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) 
              : "Unknown Date";
            
            return (
              <div key={rx.id} className="card" style={{ 
                padding: 0, overflow: "hidden", 
                border: isExp ? "2px solid var(--indigo)" : "1px solid var(--cream-border)",
                transition: "all 0.2s ease"
              }}>
                
                {/* Header — always visible */}
                <div style={{ padding: "14px 16px", cursor: "pointer", background: isExp ? "var(--indigo-lt)" : "transparent" }}
                     onClick={() => toggleExpand(rx.id)}>
                  <div className="row between">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ 
                        width: 34, height: 34, borderRadius: 9, 
                        background: "var(--indigo-lt)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        <Stethoscope size={16} style={{ color: "var(--indigo)" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--t1)" }}>{rx.doctor_name || "Doctor"}</div>
                        {rx.doctor_speciality && <div style={{ fontSize: 11, color: "var(--t3)" }}>{rx.doctor_speciality}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="badge b-indigo" style={{ fontSize: 10 }}>{dateStr}</span>
                      {isExp ? <ChevronUp size={15} style={{color: "var(--t3)"}}/> : <ChevronDown size={15} style={{color: "var(--t3)"}}/>}
                    </div>
                  </div>

                  {!isExp && (
                    <div className="row gap8" style={{ marginTop: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 16, background: "var(--sage-lt)", color: "var(--sage)", fontWeight: 700 }}>
                        {meds.length} med{meds.length !== 1 ? "s" : ""}
                      </span>
                      {rx.diagnosis && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 16, background: "#FFF3E0", color: "#E65100", fontWeight: 600 }}>
                          {rx.diagnosis}
                        </span>
                      )}
                      {rx.patient_name && rx.patient_name !== "Unknown Patient" && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 16, background: "#E8F5E9", color: "#2E7D32", fontWeight: 600 }}>
                          {rx.patient_name}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Detail */}
                {isExp && (
                  <div style={{ padding: "0 16px 16px" }}>
                    {loadingDetail === rx.id && <Spinner lang={lang} />}

                    {/* Patient & Doctor Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, background: "var(--cream-bg)", borderRadius: 8, padding: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>
                          <User size={10} style={{ display: "inline", marginBottom: -1, marginRight: 3 }} /> Patient
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>{rx.patient_name || "—"}</div>
                        <div style={{ fontSize: 12, color: "var(--t2)" }}>{[rx.patient_age, rx.patient_gender].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>
                          <Stethoscope size={10} style={{ display: "inline", marginBottom: -1, marginRight: 3 }} /> Doctor
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>{rx.doctor_name || "—"}</div>
                        <div style={{ fontSize: 12, color: "var(--t2)" }}>{rx.doctor_speciality}</div>
                        {rx.doctor_reg_id && <div style={{ fontSize: 11, color: "var(--t3)" }}>Reg: {rx.doctor_reg_id}</div>}
                      </div>
                    </div>

                    {/* Diagnosis */}
                    {rx.diagnosis && (
                      <div style={{ background: "#FFF3E0", borderRadius: 8, padding: "10px 14px", marginBottom: 14, border: "1px solid #FFE0B2" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#E65100", textTransform: "uppercase", letterSpacing: .5, marginBottom: 3 }}>
                          <Activity size={10} style={{ display: "inline", marginBottom: -1, marginRight: 3 }} /> Diagnosis
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#BF360C" }}>{rx.diagnosis}</div>
                        {rx.description && <div style={{ fontSize: 12, color: "#8D6E63", marginTop: 2, fontStyle: "italic" }}>{rx.description}</div>}
                      </div>
                    )}

                    {/* ── Medicines (ON TOP) ── */}
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>
                      <Pill size={10} style={{ display: "inline", marginBottom: -1, marginRight: 3 }} /> Prescribed Medicines ({meds.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {meds.map((m, i) => (
                        <div key={i} style={{ background: "var(--cream-bg)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--cream-border)" }}>
                          <div className="row between" style={{ marginBottom: 4 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)" }}>
                              {m.medicine_name} <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 500 }}>{m.dosage}</span>
                            </div>
                            <span className="badge b-sage" style={{ fontSize: 10 }}>{m.duration}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--t2)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} />{m.schedule} · {m.food_instruction}
                          </div>
                          {m.purpose && (
                            <div style={{ fontSize: 11, color: "var(--indigo)", background: "var(--indigo-lt)", padding: "3px 8px", borderRadius: 4, fontStyle: "italic", marginTop: 4 }}>
                              <Heart size={10} style={{ display: "inline", marginBottom: -1, marginRight: 3 }} />{m.purpose}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* ── Prescription Image (AT BOTTOM — thumbnail) ── */}
                    {detail?.image_data && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>
                          <ImageIcon size={10} style={{ display: "inline", marginBottom: -1, marginRight: 3 }} /> {t("original_prescription", lang)}
                        </div>
                        <div 
                          onClick={() => setLightboxSrc(detail.image_data)}
                          style={{ 
                            cursor: "pointer", borderRadius: 8, overflow: "hidden", 
                            border: "1px solid var(--cream-border)", background: "#fff", padding: 6,
                            maxHeight: 120, display: "flex", alignItems: "center", justifyContent: "center",
                            position: "relative"
                          }}
                        >
                          <img src={detail.image_data} alt="Prescription" style={{ maxHeight: 110, maxWidth: "100%", borderRadius: 4, objectFit: "contain", opacity: 0.85 }} />
                          <div style={{
                            position: "absolute", bottom: 8, right: 8, background: "var(--indigo)", color: "#fff",
                            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 12
                          }}>{t("tap_to_view_full", lang)}</div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="row gap8">
                      <button className="btn btn-outline btn-sm no-print" style={{ flex: 1 }} onClick={() => window.print()}>
                        <Printer size={14} /> {t("print", lang)}
                      </button>
                      <button className="btn btn-sm no-print" style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" }} onClick={() => handleDelete(rx.id)}>
                        <Trash2 size={14} /> {t("delete", lang)}
                      </button>
                    </div>
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
