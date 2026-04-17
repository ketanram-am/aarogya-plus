import React from "react";
import { Mic, MicOff } from "lucide-react";
import { t } from "../translations";

export function SpeakButton({ text, lang }) {
  const [speaking, setSpeaking] = React.useState(false);
  const synth = window.speechSynthesis;

  React.useEffect(() => {
    return () => synth.cancel();
  }, [synth]);

  const toggleSpeak = () => {
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    
    if (!text) return;

    synth.cancel(); // stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set appropriate BCP-47 language code for TTS
    const langMap = {
      en: "en-US", hi: "hi-IN", ta: "ta-IN", te: "te-IN",
      kn: "kn-IN", es: "es-ES", fr: "fr-FR"
    };
    utterance.lang = langMap[lang] || "en-US";
    utterance.rate = 0.9; // Slightly slower for elderly users

    // Try to find a specific voice for the language if available
    const voices = synth.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
    if (targetVoice) utterance.voice = targetVoice;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    synth.speak(utterance);
    setSpeaking(true);
  };

  return (
    <button className="btn btn-sm btn-ghost" onClick={toggleSpeak} style={{ margin: "8px 0" }}>
      {speaking ? <MicOff size={16} /> : <Mic size={16} />} 
      {speaking ? t('stop_audio', lang) : t('listen_advice', lang)}
    </button>
  );
}
