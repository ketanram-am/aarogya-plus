import React from "react";
import { AlertTriangle, Activity, BadgeCheck } from "lucide-react";
import { t } from "../translations";

export function SevBadge({ p, lang = "en" }) {
  if (p >= 0.7) return <span className="sev sev-high"><AlertTriangle size={10} /> {t("high", lang)}</span>;
  if (p >= 0.4) return <span className="sev sev-mid"><Activity size={10} /> {t("moderate", lang)}</span>;
  return <span className="sev sev-low"><BadgeCheck size={10} /> {t("low", lang)}</span>;
}
