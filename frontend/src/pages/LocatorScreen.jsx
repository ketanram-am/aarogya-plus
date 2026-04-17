import React, { useState, useRef } from "react";
import { Search, MapPin, Loader2, Navigation, Building2, CheckCircle2, X } from "lucide-react";
import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";

export function LocatorScreen({ lang = "en" }) {
  const [q, setQ] = useState("");
  const [loading, setLoad] = useState(false);
  const [locating, setLoc] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const posRef = useRef({ lat: 12.9716, lng: 77.5946 });

  const getPos = () => new Promise(res => {
    setLoc(true);
    navigator.geolocation?.getCurrentPosition(
      p => { posRef.current = { lat: p.coords.latitude, lng: p.coords.longitude }; setLoc(false); res(posRef.current); },
      () => { setLoc(false); res(posRef.current); },
      { timeout: 6000 }
    );
  });

  const search = async () => {
    if (!q.trim()) return;
    setLoad(true); setErr(null); setResult(null);
    const pos = await getPos();
    try {
      const d = await api.locate(q, pos.lat, pos.lng);
      setResult(d);
    } catch (e) { setErr(e.message); }
    finally { setLoad(false); }
  };

  return (
    <div className="screen">
      <div style={{ marginBottom: 20 }}>
        <div className="sh-eyebrow">{t("nearby_pharmacies", lang)}</div>
        <div className="sh-title">{t("find_medicine", lang)}</div>
        <div className="sh-sub">{t("search_medicine_desc", lang)}</div>
      </div>

      <div className="card">
        <label className="label">{t("medicine_name", lang)}</label>
        <div style={{ position: "relative" }}>
          <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--t3)" }} />
          <input
            className="input"
            style={{ paddingLeft: 42 }}
            type="text"
            placeholder={t("medicine_placeholder", lang)}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
          />
        </div>
        <button className="btn btn-primary btn-full mt12" onClick={search} disabled={loading || locating || !q.trim()}>
          {locating
            ? <><Loader2 size={18} className="spin-icon" /> {t("getting_location", lang)}</>
            : loading
              ? <><Loader2 size={18} className="spin-icon" /> {t("searching", lang)}</>
              : <><Navigation size={18} /> {t("find_nearby", lang)}</>
          }
        </button>
      </div>

      <div className="box-info mt12">
        <MapPin size={16} style={{ color: "var(--indigo)", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: "var(--indigo-dk)" }}>
          {t("using_location", lang)}
        </div>
      </div>

      {(loading || locating) && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}

      {result && (
        <div className="mt20">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20 }}>
              {t("pharmacies_near_you", lang)}
            </div>
            {result.medicine && <span className="badge b-indigo">{result.medicine}</span>}
          </div>
          {(!result.results || result.results.length === 0)
            ? <div className="empty">
              <div className="empty-icon"><Building2 size={46} /></div>
              <div className="empty-text">{t("no_pharmacies_found", lang)}</div>
              <div className="empty-sub">{t("try_different_search", lang)}</div>
            </div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.results.map((p, i) => (
                <div key={i} className={`pharm ${p.available ? "avail" : "unavail"}`}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</div>
                    <span className={`badge ${p.available ? "b-sage" : "b-red"}`}>
                      {p.available ? <><CheckCircle2 size={11} /> {t("available", lang)}</> : <><X size={11} /> {t("unavailable", lang)}</>}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 12 }}>{p.address}</div>
                  <div className="row between">
                    {p.distance_km != null && (
                      <span className="badge b-indigo">
                        <MapPin size={11} /> {typeof p.distance_km === "number" ? p.distance_km.toFixed(1) : p.distance_km} km
                      </span>
                    )}
                    {p.maps_link && (
                      <a href={p.maps_link} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 13, fontWeight: 700, color: "var(--indigo)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                        <Navigation size={13} /> {t("directions", lang)}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}
    </div>
  );
}
