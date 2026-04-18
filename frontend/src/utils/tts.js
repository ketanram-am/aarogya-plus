/**
 * tts.js — Robust Text-to-Speech utility for Aarogya+
 * Handles language mapping, voice selection, and initialization.
 */

const LANG_MAP = {
  en: "en-US",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  es: "es-ES",
  fr: "fr-FR"
};

/**
 * Prime the speech synthesis engine.
 * Useful for mobile browsers and Chrome.
 */
export function initTTS() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}

/**
 * Robustly find the best voice for a given language.
 */
async function getBestVoice(langCode) {
  const synth = window.speechSynthesis;
  
  return new Promise((resolve) => {
    let voices = synth.getVoices();
    
    const findVoice = () => {
      const bcp47 = LANG_MAP[langCode] || "en-US";
      const langPrefix = bcp47.split("-")[0];
      
      const matchedVoices = voices.filter(v => 
        v.lang.toLowerCase().replace("_", "-").startsWith(langPrefix)
      );

      if (matchedVoices.length === 0) return null;

      // Prefer "Natural", "Google", or "Online" voices for better quality
      const natural = matchedVoices.find(v => 
        v.name.toLowerCase().includes("natural") || 
        v.name.toLowerCase().includes("google") || 
        v.name.toLowerCase().includes("online")
      );

      return natural || matchedVoices[0];
    };

    if (voices.length > 0) {
      resolve(findVoice());
    } else {
      // Wait for voices to be loaded
      synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        resolve(findVoice());
      };
      
      // Safety timeout
      setTimeout(() => resolve(null), 1000);
    }
  });
}

/**
 * Speak text in a specified language.
 */
export async function speakText(text, lang, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const synth = window.speechSynthesis;
  synth.cancel(); // Stop any current speech

  if (!text) return null;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_MAP[lang] || "en-US";
  utterance.rate = 0.95; // Slightly slower for elderly friendly experience
  utterance.pitch = 1.0;

  const voice = await getBestVoice(lang);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.error("SpeechSynthesis Error:", e);
    if (onEnd) onEnd();
  };

  synth.speak(utterance);
  return utterance;
}

/**
 * Stop any ongoing speech.
 */
export function stopSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
