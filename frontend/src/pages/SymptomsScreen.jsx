import React, { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";
import { SymptomResults } from "../components/SymptomResults";

export function SymptomsScreen({ lang }) {
  const [text, setText] = useState("");
  const [loading, setLoad] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!text.trim()) return;
    setLoad(true); setErr(null); setResult(null);
    try {
      const d = await api.analyze(text, lang);
      d.error ? setErr(d.error) : setResult(d);
    } catch (e) { setErr(e.message); }
    finally { setLoad(false); }
  };

  return (
    <div className="screen">
      <div style={{ marginBottom: 20 }}>
        <div className="sh-eyebrow">{t("describe_symptoms", lang)}</div>
        <div className="sh-title">{t("how_feeling_title", lang)}</div>
        <div className="sh-sub">{t("write_bothering", lang)}</div>
      </div>
      <div className="card">
        <label className="label">{t("whats_bothering", lang)}</label>
        <textarea
          className="input" rows={5}
          placeholder={t("symptoms_placeholder", lang)}
          value={text} onChange={e => setText(e.target.value)}
        />
        <button className="btn btn-primary btn-full mt16" onClick={submit} disabled={loading || !text.trim()}>
          {loading
            ? <><Loader2 size={18} className="spin-icon" /> {t("analyzing", lang)}</>
            : <><Search size={18} /> {t("analyze_symptoms", lang)}</>
          }
        </button>
      </div>
      {loading && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}
      {result && <SymptomResults data={result} lang={lang} />}
    </div>
  );
}
