/**
 * UI.jsx — Aarogya+ React Frontend (Refactored)
 * Modular structure · Elderly-friendly design · Lucide icons
 */


import React, { useState, useEffect } from "react";
import { 
  ShieldPlus, ChevronDown,CheckCircle2 
} from "lucide-react";

// Styles
import "./styles/UI.css";

// Constants & Services
import { LANGS, NAV } from "./constants";
import { initTTS } from "./utils/tts";

// Pages
import { HomeScreen } from "./pages/HomeScreen";
import { SymptomsScreen } from "./pages/SymptomsScreen";
import { ScanScreen } from "./pages/ScanScreen";
import { RemindersScreen } from "./pages/RemindersScreen";
import { LocatorScreen } from "./pages/LocatorScreen";
import { PharmacistScreen } from "./pages/PharmacistScreen";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [lang, setLang] = useState("en");
  const [showLang, setShowLang] = useState(false);
  const [scanned, setScanned] = useState([]);

  useEffect(() => {
    initTTS();
  }, []);

  const curLang = LANGS.find(l => l.code === lang);

  const renderScreen = () => {
    switch (screen) {
      case "home":       return <HomeScreen go={setScreen} lang={lang} />;
      case "symptoms":   
      case "audio":      return <SymptomsScreen lang={lang} />;
      case "scan":       return <ScanScreen lang={lang} onScanned={setScanned} />;
      case "reminders":  return <RemindersScreen lang={lang} />;
      case "locator":    return <LocatorScreen lang={lang} />;
      case "pharmacist": return <PharmacistScreen lang={lang} scanned={scanned} />;
      default:           return <HomeScreen go={setScreen} lang={lang} />;
    }
  };

  return (
    <div className="shell">
      {/* Top bar */}
      <div className="topbar">
        <div className="logo" onClick={() => setScreen("home")}>
          <ShieldPlus size={20} style={{ color: "var(--indigo)" }} />
          Aarogya<span className="logo-dot">+</span>
        </div>
        <div className="lang-pill" onClick={() => setShowLang(v => !v)}>
          <span>{curLang?.flag}</span>
          <span>{curLang?.label}</span>
          <ChevronDown size={12} />
        </div>
      </div>

      {/* Language dropdown */}
      {showLang && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 150 }} onClick={() => setShowLang(false)} />
          <div className="lang-dropdown">
            {LANGS.map(l => (
              <div key={l.code} className={`lang-opt ${l.code === lang ? "sel" : ""}`}
                onClick={() => { setLang(l.code); setShowLang(false); }}>
                <span>{l.flag} {l.label}</span>
                {l.code === lang && <CheckCircle2 size={14} style={{ color: "var(--indigo)" }} />}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Screen */}
      <div key={screen}>{renderScreen()}</div>

      {/* Bottom nav */}
      <div className="botnav">
        {NAV(lang).map(n => {
          const Icon = n.icon;
          return (
            <div key={n.id} className={`navitem ${screen === n.id || (n.id === "symptoms" && screen === "audio") ? "active" : ""}`}
              onClick={() => setScreen(n.id)}>
              <Icon size={20} />
              <span className="navlabel">{n.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}