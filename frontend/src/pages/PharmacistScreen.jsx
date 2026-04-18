import React, { useState, useEffect } from "react";
import { 
  ShieldPlus, Calendar, Pill, Printer, Clock, User, Stethoscope, 
  ChevronDown, ChevronUp, FileText, Activity, Heart, Image as ImageIcon,
  ClipboardList
} from "lucide-react";
import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";

export function PharmacistScreen({ lang }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoad] = useState(true);
  const [err, setErr] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
    api.prescriptions(lang)
      .then(d => { setHistory(Array.isArray(d) ? d : []); setLoad(false); })
      .catch(e => { setErr(e.message); setLoad(false); });
  }, [lang]);

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    
    // Fetch full detail (with image) if not already cached
    if (!detailData[id]) {
      setLoadingDetail(id);
      try {
        const detail = await api.prescription(id, lang);
        setDetailData(prev => ({ ...prev, [id]: detail }));
      } catch (e) {
        console.error("Detail fetch failed:", e);
      }
      setLoadingDetail(null);
    }
  };

  return (
    <div className="screen">
      {/* Header Band */}
      <div className="rx-band">
        <div style={{ fontSize: 11, fontWeight: 800, opacity: .7, textTransform: "uppercase", letterSpacing: 1 }}>
          {t("pharmacist_portal_title", lang) || "Medical Records"}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginTop: 6 }}>
          <ClipboardList size={22} style={{ display: "inline", marginBottom: -4, marginRight: 6 }} />
          Prescription History
        </div>
        <div style={{ fontSize: 13, opacity: .8, marginTop: 5 }}>All past doctor visits and prescriptions</div>
        <div style={{ fontSize: 12, opacity: .6, marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
          <Calendar size={12} /> {today} · {history.length} visit{history.length !== 1 ? "s" : ""} recorded
        </div>
      </div>

      {loading && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}

      {/* Empty State */}
      {!loading && history.length === 0 && !err && (
        <div className="empty">
          <div className="empty-icon"><ShieldPlus size={46} /></div>
          <div className="empty-text">No past visits yet</div>
          <div className="empty-sub">{t("scan_first_come_back", lang) || "Scan a prescription to begin tracking your medical history"}</div>
        </div>
      )}

      {/* Visit Cards */}
      {!loading && history.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {history.map((rx, idx) => {
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
                
                {/* Collapsed Header — always visible */}
                <div style={{ padding: "16px 18px", cursor: "pointer", background: isExp ? "var(--indigo-lt)" : "transparent" }}
                     onClick={() => toggleExpand(rx.id)}>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ 
                        width: 36, height: 36, borderRadius: 10, 
                        background: "var(--indigo-lt)", display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <Stethoscope size={18} style={{ color: "var(--indigo)" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)" }}>
                          {rx.doctor_name || "Unknown Doctor"}
                        </div>
                        {rx.doctor_speciality && (
                          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>{rx.doctor_speciality}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className="badge b-indigo" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                        <Calendar size={11}/> {dateStr}
                      </span>
                      {isExp ? <ChevronUp size={16} style={{color: "var(--t3)"}}/> : <ChevronDown size={16} style={{color: "var(--t3)"}}/>}
                    </div>
                  </div>

                  {/* Summary chips — only when collapsed */}
                  {!isExp && (
                    <div className="row gap8" style={{ marginTop: 8, flexWrap: "wrap" }}>
                      <span style={{ 
                        fontSize: 12, padding: "3px 10px", borderRadius: 20,
                        background: "var(--sage-lt)", color: "var(--sage)", fontWeight: 700
                      }}>
                        <Pill size={11} style={{ display: "inline", marginBottom: -2, marginRight: 3 }} />
                        {meds.length} Medicine{meds.length !== 1 ? "s" : ""}
                      </span>
                      {rx.diagnosis && (
                        <span style={{ 
                          fontSize: 12, padding: "3px 10px", borderRadius: 20,
                          background: "#FFF3E0", color: "#E65100", fontWeight: 600
                        }}>
                          <Activity size={11} style={{ display: "inline", marginBottom: -2, marginRight: 3 }} />
                          {rx.diagnosis}
                        </span>
                      )}
                      {rx.patient_name && rx.patient_name !== "Unknown Patient" && (
                        <span style={{ 
                          fontSize: 12, padding: "3px 10px", borderRadius: 20,
                          background: "#E8F5E9", color: "#2E7D32", fontWeight: 600
                        }}>
                          <User size={11} style={{ display: "inline", marginBottom: -2, marginRight: 3 }} />
                          {rx.patient_name}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Detail View */}
                {isExp && (
                  <div style={{ padding: "0 18px 18px 18px" }}>
                    
                    {loadingDetail === rx.id && <Spinner lang={lang} />}

                    {/* Patient & Doctor Info Grid */}
                    <div style={{ 
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16,
                      background: "var(--cream-bg)", borderRadius: 10, padding: 14
                    }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                          <User size={11} /> Patient
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>{rx.patient_name || "—"}</div>
                        <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 2 }}>
                          {[rx.patient_age, rx.patient_gender].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                          <Stethoscope size={11} /> Doctor
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>{rx.doctor_name || "—"}</div>
                        <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 2 }}>{rx.doctor_speciality || "—"}</div>
                        {rx.doctor_reg_id && (
                          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>Reg: {rx.doctor_reg_id}</div>
                        )}
                      </div>
                    </div>

                    {/* Diagnosis Badge */}
                    {rx.diagnosis && (
                      <div style={{ 
                        background: "#FFF3E0", borderRadius: 10, padding: "12px 16px", marginBottom: 16,
                        border: "1px solid #FFE0B2"
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#E65100", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <Activity size={11} /> Diagnosis
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#BF360C" }}>{rx.diagnosis}</div>
                        {rx.description && (
                          <div style={{ fontSize: 13, color: "#8D6E63", marginTop: 4, fontStyle: "italic" }}>{rx.description}</div>
                        )}
                      </div>
                    )}

                    {/* Prescription Image */}
                    {detail?.image_data && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                          <ImageIcon size={11}/> Original Prescription
                        </div>
                        <div style={{ 
                          borderRadius: 10, overflow: "hidden", border: "1px solid var(--cream-border)", 
                          background: "#fff", padding: 8
                        }}>
                          <img 
                            src={detail.image_data} 
                            alt="Prescription" 
                            style={{ width: "100%", borderRadius: 6, objectFit: "contain" }} 
                          />
                        </div>
                      </div>
                    )}

                    {/* Medicines List */}
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                      <Pill size={11} /> Prescribed Medicines ({meds.length})
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {meds.map((m, i) => (
                        <div key={i} style={{ 
                          background: "var(--cream-bg)", padding: "12px 14px", borderRadius: 10, 
                          border: "1px solid var(--cream-border)"
                        }}>
                          <div className="row between" style={{ marginBottom: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--t1)" }}>
                              {m.medicine_name}
                              <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 500, marginLeft: 6 }}>{m.dosage}</span>
                            </div>
                            <span className="badge b-sage" style={{ fontSize: 11 }}>{m.duration}</span>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: m.purpose ? 6 : 0, display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={12} style={{ flexShrink: 0 }} />
                            {m.schedule} · {m.food_instruction}
                          </div>
                          {m.purpose && (
                            <div style={{ 
                              fontSize: 12, color: "var(--indigo)", background: "var(--indigo-lt)", 
                              padding: "5px 10px", borderRadius: 6, fontStyle: "italic", marginTop: 4
                            }}>
                              <Heart size={11} style={{ display: "inline", marginBottom: -2, marginRight: 4 }} />
                              {m.purpose}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Print Button */}
                    <button className="btn btn-outline btn-full no-print" style={{ marginTop: 16 }} onClick={() => window.print()}>
                      <Printer size={16} /> Print This Record
                    </button>

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
