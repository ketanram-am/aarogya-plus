import React, { useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { t } from "../translations";
import { speakText, stopSpeech } from "../utils/tts";

export function SpeakButton({ text, lang }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }
    
    if (!text) return;

    speakText(text, lang, () => setSpeaking(false));
    setSpeaking(true);
  };

  return (
    <button className="btn btn-sm btn-ghost" onClick={toggleSpeak} style={{ margin: "8px 0" }}>
      {speaking ? <MicOff size={16} /> : <Mic size={16} />} 
      {speaking ? t('stop_audio', lang) : t('listen_advice', lang)}
    </button>
  );
}
