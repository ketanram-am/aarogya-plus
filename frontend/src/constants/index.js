import { 
  Home, Stethoscope, Camera, Bell, MapPin, ShieldPlus 
} from "lucide-react";
import { t } from "../translations";

export const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
  { code: "te", label: "తెలుగు", flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

export const NAV = (lang) => [
  { id: "home",       icon: Home,       label: t("nav_home", lang) },
  { id: "symptoms",   icon: Stethoscope,label: t("nav_symptoms", lang) },
  { id: "scan",       icon: Camera,     label: t("nav_scan", lang) },
  { id: "reminders",  icon: Bell,       label: t("nav_reminders", lang) },
  { id: "locator",    icon: MapPin,     label: t("nav_locate", lang) },
  { id: "pharmacist", icon: ShieldPlus, label: t("nav_portal", lang) },
];

export const SCHED_LABELS = {
  "1-0-0": "Morning only", "0-1-0": "Afternoon only",
  "0-0-1": "Night only", "1-1-0": "Morning & Afternoon",
  "1-0-1": "Morning & Night", "0-1-1": "Afternoon & Night",
  "1-1-1": "Three times daily",
};
