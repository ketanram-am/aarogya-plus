import React, { useState, useEffect } from "react";
import {
  MapPin, Loader2, Navigation, Building2, Phone, Clock,
  RefreshCw, CheckCircle2, XCircle, Circle, Star
} from "lucide-react";

import { t } from "../translations";
import { api } from "../services/api";
import { Spinner } from "../components/Spinner";
import { ErrBox } from "../components/ErrBox";

const DEFAULT_LOCATION = { lat: 12.9716, lng: 77.5946 }; // Bangalore fallback

function OpenBadge({ isOpen }) {
  if (isOpen === true) return (
    <span className="badge" style={{ background: "#EBF2EE", color: "#3D5C4E", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <CheckCircle2 size={14} /> Open now
    </span>
  );

  if (isOpen === false) return (
    <span className="badge" style={{ background: "#FDEEEE", color: "#B03A3A", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <XCircle size={14} /> Closed
    </span>
  );

  return (
    <span className="badge b-gray" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <Circle size={14} /> Hours unknown
    </span>
  );
}

export function LocatorScreen({ lang = "en" }) {
  const [loading, setLoad] = useState(false);
  const [locating, setLoc] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  // ✅ FIXED LOCATION (never returns null)
  const getPos = () =>
    new Promise((res) => {
      setLoc(true);

      if (!navigator.geolocation) {
        setLoc(false);
        return res(DEFAULT_LOCATION);
      }

      navigator.geolocation.getCurrentPosition(
        (p) => {
          const coords = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
          };

          console.log("📍 REAL LOCATION:", coords);
          setLoc(false);
          res(coords);
        },
        () => {
          console.log("⚠️ Using fallback location");
          setLoc(false);
          res(DEFAULT_LOCATION); // 🔥 KEY FIX
        },
        { timeout: 6000 }
      );
    });

  const search = async () => {
    setLoad(true);
    setErr(null);
    setResult(null);

    const pos = await getPos();

    console.log("🚀 Sending to API:", pos);

    try {
      const d = await api.locate("", pos.lat, pos.lng);

      if (d.error) {
        setErr(d.error);
      } else {
        setResult(d);
      }

    } catch (e) {
      setErr(e.message || "Something went wrong");
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
          onClick={search}
          disabled={loading || locating}
        >
          {locating
            ? <><Loader2 size={16} className="spin-icon" /> Getting location</>
            : loading
              ? <><Loader2 size={16} className="spin-icon" /> Searching</>
              : <><RefreshCw size={16} /> Refresh Nearby Pharmacies</>
          }
        </button>
      </div>

      {/* Info */}
      <div className="box-info mt12">
        <MapPin size={16} />
        <div style={{ fontSize: 13 }}>
          Using your current location
        </div>
      </div>

      {(loading || locating) && <Spinner lang={lang} />}
      {err && <ErrBox msg={err} lang={lang} />}

      {/* Results */}
      {result && (
        <div className="mt20">
          <div style={{ fontSize: 20, marginBottom: 14 }}>
            Pharmacies near you
          </div>

          {!result.results?.length ? (
            <div className="empty">
              <Building2 size={46} />
              <div>No pharmacies found nearby</div>
            </div>
          ) : (
            result.results.map((p, i) => (
              <PharmCard key={i} p={p} rank={i} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
function PharmCard({ p, rank }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 16,
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        border: rank === 0 ? "2px solid #4F46E5" : "1px solid #eee",
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          {p.name}
        </div>
        <OpenBadge isOpen={p.is_open_now} />
      </div>

      {/* Address */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#555", fontSize: 13 }}>
        <MapPin size={14} />
        {p.address}
      </div>

      {/* Time */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#555", fontSize: 13 }}>
        <Clock size={14} />
        {p.opening_hours_display}
      </div>

      {/* Distance */}
      <div style={{ fontSize: 13, fontWeight: 500 }}>
        {p.distance_km?.toFixed(1)} km {rank === 0 && <Star size={14} style={{ color: "#E0A800" }} />}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>

        {/* Call Button */}
        <a href={`tel:${p.phone}`} style={{ flex: 1 }}>
          <button
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              background: "#4F46E5",
              color: "#fff",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer"
            }}
          >
            <Phone size={16} />
            Call
          </button>
        </a>

        {/* Directions Button */}
        <a href={p.maps_link} target="_blank" style={{ flex: 1 }}>
          <button
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer"
            }}
          >
            <Navigation size={16} />
            Directions
          </button>
        </a>

      </div>
    </div>
  );
}