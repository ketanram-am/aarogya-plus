import React from "react";
import { Loader2 } from "lucide-react";
import { t } from "../translations";

export function Spinner({ lang = "en" }) {
  return (
    <div style={{ padding: "36px 0", textAlign: "center", color: "var(--indigo)" }}>
      <Loader2 size={32} className="spin-icon" />
      <div style={{ marginTop: 10, fontSize: 14, color: "var(--t2)", fontWeight: 600 }}>{t('please_wait', lang)}</div>
    </div>
  );
}
