import React, { useState } from "react";
import { Mic, MicOff, Info } from "lucide-react";
import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";
import { SymptomResults } from "../components/SymptomResults";

export function AudioScreen({ lang }) {
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [status, setStatus] = useState(t("tap_mic_start", lang));
  const [transcript, setTranscript] = useState("");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startListening = () => {
    if (!SpeechRecognition) { setErr("Speech recognition not supported in this browser"); return; }
    const recognition = new SpeechRecognition();
    const rLang = {en: "en-US", hi: "hi-IN", ta: "ta-IN", te: "te-IN", kn: "kn-IN", es: "es-ES", fr: "fr-FR"}; recognition.lang = rLang[lang] || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    setListening(true); setStatus(t("listening", lang)); setErr(null); setResult(null);
    recognition.start();
    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text); setListening(false); setLoading(true); setStatus(t("analyzing_symptoms", lang));
      try {
        const res = await api.analyze(text, lang);
        res.error ? (setErr(res.error), setStatus(t("something_wrong", lang))) : (setResult(res), setStatus(t("done_results", lang)));
      } catch (e) { setErr("Server not responding"); setStatus(t("connection_failed", lang)); }
      setLoading(false);
    };
    recognition.onerror = (event) => { setListening(false); setStatus(t("recognition_failed", lang)); setErr(t("could_not_understand", lang) + " (Error: " + event.error + ")"); };
    recognition.onend = () => setListening(false);
  };

  return (
    <div className="screen">
      <div style={{ marginBottom: 20 }}>
        <div className="sh-eyebrow">{t("voice_input", lang)}</div>
        <div className="sh-title">{t("speak_symptoms_title", lang)}</div>
        <div className="sh-sub">{t("just_talk", lang)}</div>
      </div>

      <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
        <button
          className={`rec-btn ${listening ? "live" : "idle"}`}
          onClick={startListening}
          disabled={loading}
        >
          {listening ? <MicOff size={34} /> : <Mic size={34} />}
        </button>
        <div style={{ marginTop: 18, fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>{status}</div>
        <div style={{ marginTop: 6, fontSize: 13, color: "var(--t2)" }}>
          {listening ? t("tap_to_stop", lang) : t("tap_to_speak", lang)}
        </div>
      </div>

      {transcript && (
        <div className="card card-sm mt16">
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: .6, display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <Mic size={11} /> {t("you_said", lang)}
          </div>
          <div style={{ fontSize: 16, fontStyle: "italic", fontFamily: "var(--serif)", lineHeight: 1.6 }}>"{transcript}"</div>
        </div>
      )}

      <div className="box-amber mt12">
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--amber)", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={14} /> {t("tip_best_results", lang)}
        </div>
        <div style={{ fontSize: 14, color: "#7A5412", lineHeight: 1.6 }}>
          {t("speak_clearly", lang)}
        </div>
      </div>

      {loading && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}
      {result && <SymptomResults data={result} lang={lang} />}
    </div>
  );
}
