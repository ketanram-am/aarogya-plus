import React, { useState, useRef } from "react";
import { Camera, Upload, Loader2, PackageCheck, CheckCircle2, Save, AlertCircle } from "lucide-react";
import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";
import { MedCard } from "../components/MedCard";

export function ScanScreen({ lang, onScanned }) {
  const [file, setFile] = useState(null);
  const [preview, setPrev] = useState(null);
  const [loading, setLoad] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const fileRef = useRef(null);

  const pick = f => {
    if (!f) return;
    setFile(f); setPrev(URL.createObjectURL(f)); setResult(null); setErr(null); setSaveMsg(null);
  };

  const submit = async () => {
    if (!file) return;
    setLoad(true); setErr(null); setSaveMsg(null);
    try {
      const d = await api.scan(file, lang);
      d.error ? setErr(d.error) : (setResult(d), onScanned?.(d.medicines || []));
    } catch (e) { setErr(e.message); }
    finally { setLoad(false); }
  };

  const saveToHistory = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      const res = await api.savePrescription();
      if (res.duplicate) {
        setSaveMsg({ type: "warn", text: res.message });
      } else if (res.error) {
        setSaveMsg({ type: "error", text: res.error });
      } else {
        setSaveMsg({ type: "success", text: res.message || "Saved to medical history!" });
      }
    } catch (e) {
      setSaveMsg({ type: "error", text: e.message });
    }
    finally { setSaving(false); }
  };

  return (
    <div className="screen">
      <div style={{ marginBottom: 20 }}>
        <div className="sh-eyebrow">{t("prescription_scanner", lang)}</div>
        <div className="sh-title">{t("scan_prescription", lang)}</div>
        <div className="sh-sub">{t("upload_photo", lang)}</div>
      </div>

      <div
        className="upload"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={e => pick(e.target.files[0])} />
        {preview
          ? <img src={preview} alt="prescription" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 12, objectFit: "contain" }} />
          : (
            <div>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--indigo-lt)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Upload size={28} style={{ color: "var(--indigo)" }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--indigo)" }}>{t("tap_to_upload", lang)}</div>
              <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 6 }}>{t("jpg_png_photo", lang)}</div>
            </div>
          )
        }
      </div>

      {file && (
        <button className="btn btn-primary btn-full mt12" onClick={submit} disabled={loading}>
          {loading
            ? <><Loader2 size={18} className="spin-icon" /> {t("reading_prescription", lang)}</>
            : <><Camera size={18} /> {t("extract_medicines", lang)}</>
          }
        </button>
      )}

      {loading && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}

      {result?.medicines && (
        <div className="mt20">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--t1)" }}>
              {result.medicines.length}  {t("medicines_found", lang)}
            </div>
            <PackageCheck size={20} style={{ color: "var(--sage)" }} />
          </div>
          {result.message && (
            <div className="box-good" style={{ marginBottom: 14 }}>
              <CheckCircle2 size={18} style={{ color: "var(--sage)", flexShrink: 0 }} />
              <div style={{ fontSize: 14, color: "var(--sage-dk)", fontWeight: 600 }}>{result.message}</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {result.medicines.map((m, i) => <MedCard key={i} m={m} lang={lang} />)}
          </div>

          {/* Save to Medical History Button */}
          {result.can_save && !saveMsg?.type?.match(/success/) && (
            <button 
              className="btn btn-full mt12" 
              onClick={saveToHistory} 
              disabled={saving}
              style={{ 
                background: "var(--indigo)", color: "#fff", border: "none",
                fontSize: 15, fontWeight: 700, padding: "14px 20px", borderRadius: 12
              }}
            >
              {saving
                ? <><Loader2 size={18} className="spin-icon" /> Saving...</>
                : <><Save size={18} /> Save to Medical History</>
              }
            </button>
          )}
          
          {/* Save Result Message */}
          {saveMsg && (
            <div style={{ marginTop: 12 }} className={saveMsg.type === "success" ? "box-good" : saveMsg.type === "warn" ? "box-amber" : "box-warn"}>
              {saveMsg.type === "success" 
                ? <CheckCircle2 size={18} style={{ color: "var(--sage)", flexShrink: 0 }} />
                : <AlertCircle size={18} style={{ color: saveMsg.type === "warn" ? "var(--amber)" : "var(--red)", flexShrink: 0 }} />
              }
              <div style={{ fontSize: 14, fontWeight: 600 }}>{saveMsg.text}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
