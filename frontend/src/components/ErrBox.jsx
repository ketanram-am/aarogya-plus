import React from "react";
import { AlertTriangle } from "lucide-react";
import { t } from "../translations";

export function ErrBox({ msg, lang = "en" }) {
  const isConn = !msg || typeof msg !== "string" || msg.toLowerCase().includes("failed to fetch");
  return (
    <div className="box-warn mt16">
      <AlertTriangle size={20} style={{ color: "var(--red)", flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 15 }}>
          {isConn ? t("connection_error", lang) : t("something_wrong", lang)}
        </div>
        <div style={{ fontSize: 14, color: "#8B2F2F", marginTop: 4, lineHeight: 1.5 }}>
          {msg || t("make_sure_backend", lang)}
        </div>
      </div>
    </div>
  );
}
