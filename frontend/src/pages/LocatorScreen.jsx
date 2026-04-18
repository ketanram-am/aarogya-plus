import React, { useState, useRef, useEffect } from "react";
import { 
  MapPin, Loader2, Navigation, Building2, Phone, Clock, 
  RefreshCw, CheckCircle2, XCircle, Circle, Star 
} from "lucide-react";

import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";

function OpenBadge({ isOpen }) {
  if (isOpen === true) return (
    <span className="badge" style={{ background: "#EBF2EE", color: "#3D5C4E", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <CheckCircle2 size={14} />
      Open now
    </span>
  );

  if (isOpen === false) return (
    <span className="badge" style={{ background: "#FDEEEE", color: "#B03A3A", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <XCircle size={14} />
      Closed
    </span>
  );

  return (
    <span className="badge b-gray" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <Circle size={14} />
      Hours unknown
    </span>
  );
}

export function LocatorScreen({ lang = "en" }) {
  const [loading, setLoad] = useState(false);
  const [locating, setLoc] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const posRef = useRef({ lat: 12.9716, lng: 77.5946 });

  const getPos = () => new Promise(res => {
    setLoc(true);
    navigator.geolocation?.getCurrentPosition(
      p => {
        posRef.current = { lat: p.coords.latitude, lng: p.coords.longitude };
        setLoc(false);
        res(posRef.current);
      },
      () => {
        setLoc(false);
        res(posRef.current);
      },
      { timeout: 6000 }
    );
  });

  const search = async () => {
    setLoad(true);
    setErr(null);
    setResult(null);

    const pos = await getPos();

    try {
      const d = await api.locate("", pos.lat, pos.lng);
      setResult(d);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoad(false);
    }
  };

  useEffect(() => {
    search();
  }, []);

  return (
    <div className="screen">

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div className="sh-eyebrow">{t("nearby_pharmacies", lang)}</div>
        <div className="sh-title">{t("find_medicine", lang)}</div>
        <div className="sh-sub">{t("search_medicine_desc", lang)}</div>
      </div>

      {/* Refresh */}
      <div className="card" style={{ textAlign: "center", padding: 20 }}>
        <button
          className="btn btn-primary btn-full"
          style={{ fontSize: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
          onClick={search}
          disabled={loading || locating}
        >
          {locating
            ? <><Loader2 size={16} className="spin-icon" /> {t("getting_location", lang)}</>
            : loading
              ? <><Loader2 size={16} className="spin-icon" /> {t("searching", lang)}</>
              : <><RefreshCw size={16} /> Refresh Nearby Pharmacies</>
          }
        </button>
      </div>

      {/* Location Info */}
      <div className="box-info mt12">
        <MapPin size={16} style={{ color: "var(--indigo)" }} />
        <div style={{ fontSize: 13 }}>
          {t("using_location", lang)}
        </div>
      </div>

      {(loading || locating) && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}

      {/* Results */}
      {result && (
        <div className="mt20">
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, marginBottom: 14 }}>
            {t("pharmacies_near_you", lang)}
          </div>

          {!result.results || result.results.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><Building2 size={46} /></div>
              <div className="empty-text">{t("no_pharmacies_found", lang)}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {result.results.map((p, i) => (
                <PharmCard key={i} p={p} rank={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PharmCard({ p, rank }) {
  return (
    <div className="pharm" style={{
      borderLeft: rank === 0 ? "4px solid var(--indigo)" : "4px solid var(--cream-border)"
    }}>
      <div className="row between">
        <div style={{ fontWeight: 800 }}>{p.name}</div>
        <OpenBadge isOpen={p.is_open_now} />
      </div>

      <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
        <MapPin size={12} /> {p.address}
      </div>

      <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
        <Clock size={13} /> {p.opening_hours_display}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {p.distance_km?.toFixed(1)} km
        {rank === 0 && <Star size={14} style={{ color: "#E0A800" }} />}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <a href={`tel:${p.phone}`}>
          <button className="btn btn-sage" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Phone size={14} />
            Call
          </button>
        </a>

        <a href={p.maps_link} target="_blank">
          <button className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Navigation size={14} />
            Directions
          </button>
        </a>
      </div>
    </div>
  );
}