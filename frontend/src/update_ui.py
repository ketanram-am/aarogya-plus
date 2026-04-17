import os

file_path = "UI.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure to pass lang to components!
# First add import and SpeakButton component
header_insert = """
import { t } from "./translations";

// ─────────────────────────────────────────────────────────────────────────────
// SPEAK BUTTON COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function SpeakButton({ text, lang }) {
  const [speaking, setSpeaking] = React.useState(false);
  const synth = window.speechSynthesis;

  React.useEffect(() => {
    return () => synth.cancel();
  }, [synth]);

  const toggleSpeak = () => {
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    
    if (!text) return;

    synth.cancel(); // stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set appropriate BCP-47 language code for TTS
    const langMap = {
      en: "en-US", hi: "hi-IN", ta: "ta-IN", te: "te-IN",
      kn: "kn-IN", es: "es-ES", fr: "fr-FR"
    };
    utterance.lang = langMap[lang] || "en-US";
    utterance.rate = 0.9; // Slightly slower for elderly users

    // Try to find a specific voice for the language if available
    const voices = synth.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
    if (targetVoice) utterance.voice = targetVoice;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    synth.speak(utterance);
    setSpeaking(true);
  };

  return (
    <button className="btn btn-sm btn-ghost" onClick={toggleSpeak} style={{ margin: "8px 0" }}>
      {speaking ? <MicOff size={16} /> : <Mic size={16} />} 
      {speaking ? t('stop_audio', lang) : t('listen_advice', lang)}
    </button>
  );
}

"""

if "import { t }" not in content:
    content = content.replace('import {', 'import React, {', 1) # Make sure React is available
    content = content.replace('// ─────────────────────────────────────────────────────────────────────────────\n// GLOBAL STYLES', header_insert + '// ─────────────────────────────────────────────────────────────────────────────\n// GLOBAL STYLES')

# 1. Update component signatures to accept lang
content = content.replace('function ErrBox({ msg }) {', 'function ErrBox({ msg, lang = "en" }) {')
content = content.replace('function SymptomResults({ data }) {', 'function SymptomResults({ data, lang = "en" }) {')
content = content.replace('function MedCard({ m }) {', 'function MedCard({ m, lang = "en" }) {')
content = content.replace('function HomeScreen({ go }) {', 'function HomeScreen({ go, lang = "en" }) {')
content = content.replace('function LocatorScreen() {', 'function LocatorScreen({ lang = "en" }) {')
content = content.replace('function Spinner() {', 'function Spinner({ lang = "en" }) {')


# 2. Update calls to pass lang
content = content.replace('<SymptomResults data={result} />', '<SymptomResults data={result} lang={lang} />')
content = content.replace('<MedCard key={i} m={m} />', '<MedCard key={i} m={m} lang={lang} />')
content = content.replace('<HomeScreen go={setScreen} />', '<HomeScreen go={setScreen} lang={lang} />')
content = content.replace('<LocatorScreen />', '<LocatorScreen lang={lang} />')
content = content.replace('<ErrBox msg={err} />', '<ErrBox msg={err} lang={lang} />')
content = content.replace('<Spinner />', '<Spinner lang={lang} />')

# Let's do string replacements carefully

# --- Spinner ---
content = content.replace('Please wait…', "{t('please_wait', lang)}")

# --- ErrBox ---
content = content.replace('{isConn ? "Connection error" : "Something went wrong"}', '{isConn ? t("connection_error", lang) : t("something_wrong", lang)}')
content = content.replace('Make sure the Flask backend is running on port 5000.', '{t("make_sure_backend", lang)}')

# --- SevBadge ---
content = content.replace('High</span>', '{t("high", lang)}</span>')
content = content.replace('Moderate</span>', '{t("moderate", lang)}</span>')
content = content.replace('Low</span>', '{t("low", lang)}</span>')

# --- SymptomResults ---
content = content.replace('Detected Symptoms', '{t("detected_symptoms", lang)}')
content = content.replace('found</span>', '{t("found", lang)}</span>')
content = content.replace('Possible Conditions', '{t("possible_conditions", lang)}')
content = content.replace('Advice</div>', '{t("advice", lang)}</div>')
content = content.replace('Warning</div>', '{t("warning", lang)}</div>')

# Inject SpeakButton into SymptomResults
symptom_speak_inject = """{advice && (
        <div className="box-good" style={{position: 'relative'}}>
          <Heart size={20} style={{ color: "var(--sage)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--sage-dk)" }}>{t("advice", lang)}</div>
            <div style={{ fontSize: 14, color: "var(--sage-dk)", marginTop: 4, lineHeight: 1.6 }}>{advice}</div>
            <SpeakButton text={advice + (warning ? ". " + warning : "")} lang={lang} />
          </div>
        </div>
      )}"""
import re
content = re.sub(r'\{advice && \([\s\S]*?className="box-good"[\s\S]*?Advice</div>[\s\S]*?\{advice\}</div>\s*</div>\s*</div>\s*\)\}', symptom_speak_inject, content)

# --- MedCard ---
content = content.replace('Schedule\n          </div>', '{t("schedule_caps", lang)}\n          </div>')
content = content.replace('Food\n          </div>', '{t("food_caps", lang)}\n          </div>')
content = content.replace('{open ? "Hide purpose" : "Why this medicine?"}', '{open ? t("hide_purpose", lang) : t("why_this_medicine", lang)}')
content = content.replace('Purpose</div>', '{t("purpose", lang)}</div>')
content = content.replace('Purpose: not in FDA database', '{t("purpose_not_found", lang)}')

# --- HomeScreen ---
content = content.replace('title: "Speak Symptoms"', "title: t('speak_symptoms', lang)")
content = content.replace('desc: "Talk about how you feel"', "desc: t('speak_desc', lang)")
content = content.replace('title: "Type Symptoms"', "title: t('type_symptoms', lang)")
content = content.replace('desc: "Describe in your words"', "desc: t('type_desc', lang)")
content = content.replace('title: "Scan Prescription"', "title: t('scan_prescription', lang)")
content = content.replace('desc: "Upload a doctor\'s note"', "desc: t('scan_desc', lang)")
content = content.replace('title: "View Medicines"', "title: t('view_medicines', lang)")
content = content.replace('desc: "Today\'s dose schedule"', "desc: t('view_medicines_desc', lang)")

content = content.replace('Good Morning', '{t("good_morning", lang)}')
content = content.replace('Good Afternoon', '{t("good_afternoon", lang)}')
content = content.replace('Good Evening', '{t("good_evening", lang)}')
content = content.replace(', Dadi Ji', ', {t("dadi_ji", lang)}')
content = content.replace('How are you feeling today?', '{t("how_feeling", lang)}')
content = content.replace('Quick Actions</div>', '{t("quick_actions", lang)}</div>')

content = content.replace('Find a Pharmacy</div>', '{t("find_pharmacy", lang)}</div>')
content = content.replace('Locate medicines near you</div>', '{t("find_pharmacy_desc", lang)}</div>')
content = content.replace('Pharmacist Portal</div>', '{t("pharmacist_portal", lang)}</div>')
content = content.replace('Generate prescription report</div>', '{t("pharmacist_desc", lang)}</div>')

# --- SymptomsScreen ---
content = content.replace('Describe Symptoms</div>', '{t("describe_symptoms", lang)}</div>')
content = content.replace('How are you feeling?</div>', '{t("how_feeling_title", lang)}</div>')
content = content.replace('Write about what\'s bothering you, in your own words.</div>', '{t("write_bothering", lang)}</div>')
content = content.replace('What\'s bothering you?</label>', '{t("whats_bothering", lang)}</label>')
content = content.replace('placeholder="e.g. I have had a headache and mild fever since yesterday morning…"', 'placeholder={t("symptoms_placeholder", lang)}')
content = content.replace('Analyze Symptoms</>', '{t("analyze_symptoms", lang)}</>')
content = content.replace('Analyzing…</>', '{t("analyzing", lang)}</>')

# --- AudioScreen ---
content = content.replace('recognition.lang = lang === "hi" ? "hi-IN" : lang === "kn" ? "kn-IN" : lang === "ta" ? "ta-IN" : lang === "te" ? "te-IN" : "en-US";',
                        'const rLang = {en: "en-US", hi: "hi-IN", ta: "ta-IN", te: "te-IN", kn: "kn-IN", es: "es-ES", fr: "fr-FR"}; recognition.lang = rLang[lang] || "en-US";')

content = content.replace('setStatus("Listening… Speak now")', 'setStatus(t("listening", lang))')
content = content.replace('setStatus("Analyzing your symptoms…")', 'setStatus(t("analyzing_symptoms", lang))')
content = content.replace('setStatus("Something went wrong")', 'setStatus(t("something_wrong", lang))')
content = content.replace('setStatus("Done! See results below")', 'setStatus(t("done_results", lang))')
content = content.replace('setStatus("Connection failed")', 'setStatus(t("connection_failed", lang))')
content = content.replace('setStatus("Recognition failed")', 'setStatus(t("recognition_failed", lang))')
content = content.replace('setErr("Could not understand. Please try again.")', 'setErr(t("could_not_understand", lang))')
content = content.replace('useState("Tap the microphone to start")', 'useState(t("tap_mic_start", lang))')

content = content.replace('Voice Input</div>', '{t("voice_input", lang)}</div>')
content = content.replace('Speak Symptoms</div>', '{t("speak_symptoms_title", lang)}</div>')
content = content.replace('Just talk — we\'ll understand and analyse for you.</div>', '{t("just_talk", lang)}</div>')
content = content.replace('{listening ? "Tap to stop" : "Tap to speak"}', '{listening ? t("tap_to_stop", lang) : t("tap_to_speak", lang)}')
content = content.replace('You said\n          </div>', '{t("you_said", lang)}\n          </div>')
content = content.replace('Tip for best results\n        </div>', '{t("tip_best_results", lang)}\n        </div>')
content = content.replace('Speak clearly and mention when your symptoms started, how severe they are, and any changes you\'ve noticed.', '{t("speak_clearly", lang)}')

# --- ScanScreen ---
content = content.replace('Prescription Scanner</div>', '{t("prescription_scanner", lang)}</div>')
content = content.replace('Scan Prescription</div>', '{t("scan_prescription", lang)}</div>')
content = content.replace('Upload a photo of your doctor\'s note to extract medicines.</div>', '{t("upload_photo", lang)}</div>')
content = content.replace('Tap to upload prescription</div>', '{t("tap_to_upload", lang)}</div>')
content = content.replace('JPG or PNG · or take a photo</div>', '{t("jpg_png_photo", lang)}</div>')
content = content.replace('Reading prescription…</>', '{t("reading_prescription", lang)}</>')
content = content.replace('Extract Medicines</>', '{t("extract_medicines", lang)}</>')
content = content.replace('Medicine{result.medicines.length !== 1 ? "s" : ""} Found', ' {t("medicines_found", lang)}')
content = re.sub(r'\{result\.medicines\.length\} Medicine.*? Found', '{result.medicines.length} {t("medicines_found", lang)}', content)

# Inject SpeakButton into ScanScreen results
scan_speak_inject = """<div className="row between" style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--t1)" }}>
              {result.medicines.length} {t("medicines_found", lang)}
            </div>
            <PackageCheck size={20} style={{ color: "var(--sage)" }} />
          </div>
          <SpeakButton 
            text={result.medicines.map(m => `${m.medicine_name}. ${m.purpose || ''}`).join(". ")} 
            lang={lang} 
          />"""
content = content.replace("""<div className="row between" style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--t1)" }}>
              {result.medicines.length} Medicine{result.medicines.length !== 1 ? "s" : ""} Found
            </div>
            <PackageCheck size={20} style={{ color: "var(--sage)" }} />
          </div>""", scan_speak_inject)

# --- RemindersScreen ---
content = content.replace('Schedule</div>', '{t("schedule", lang)}</div>')
content = content.replace('Medicine Schedule</div>', '{t("medicine_schedule", lang)}</div>')
content = content.replace('Refresh</>', '{t("refresh", lang)}</>')
content = content.replace('Today {rems.length > 0', '{t("today", lang)} {rems.length > 0')
content = content.replace('Follow-up {fup.length > 0', '{t("follow_up", lang)} {fup.length > 0')

content = content.replace('No reminders today</div>', '{t("no_reminders_today", lang)}</div>')
content = content.replace('Scan a prescription to get started</div>', '{t("scan_to_get_started", lang)}</div>')
content = content.replace('All doses taken today!', '{t("all_doses_taken", lang)}')
content = content.replace('dose${rems.length - doneCount !== 1 ? "s" : ""} remaining', ' ${rems.length - doneCount !== 1 ? t("doses_remaining", lang) : t("dose_remaining", lang)}')
content = content.replace('Mark Taken\n                      </button>', '{t("mark_taken", lang)}\n                      </button>')
content = content.replace('Taken</span>', '{t("taken", lang)}</span>')

content = content.replace('No follow-ups yet</div>', '{t("no_followups", lang)}</div>')
content = content.replace('Scan a prescription to track your progress</div>', '{t("scan_track_progress", lang)}</div>')
content = content.replace('d left</span>', ' {t("days_left", lang)}</span>')
content = content.replace('Refill immediately — critically low\n                    </div>', '{t("refill_immediate", lang)}\n                    </div>')
content = content.replace('Progress: ', '{t("progress", lang)}: ')
content = content.replace('Ends: ', '{t("ends", lang)}: ')

# Inject SpeakButton into RemindersScreen
reminders_speak_inject = """<div className="stat-strip" style={{ marginBottom: 16, background: doneCount === rems.length ? "var(--sage-lt)" : "var(--indigo-lt)", display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="row between" style={{width: '100%'}}>
                <div style={{ fontSize: 14, fontWeight: 700, color: doneCount === rems.length ? "var(--sage-dk)" : "var(--indigo)" }}>
                  {doneCount === rems.length ? t("all_doses_taken", lang) : `${rems.length - doneCount} ${rems.length - doneCount !== 1 ? t("doses_remaining", lang) : t("dose_remaining", lang)}`}
                </div>
                <span className="badge b-indigo">{doneCount}/{rems.length}</span>
              </div>
              <div style={{alignSelf: 'flex-start'}}>
                <SpeakButton text={rems.map(r => `${r.medicine_name} at ${r.time}`).join(". ")} lang={lang} />
              </div>
            </div>"""
content = re.sub(r'<div className="stat-strip"[\s\S]*?</div>\s*<span className="badge b-indigo">\{doneCount\}/\{rems.length\}</span>\s*</div>', reminders_speak_inject, content)

# --- LocatorScreen ---
content = content.replace('Nearby Pharmacies</div>', '{t("nearby_pharmacies", lang)}</div>')
content = content.replace('Find Medicine</div>', '{t("find_medicine", lang)}</div>')
content = content.replace('Search for a medicine and we\'ll find pharmacies near you.</div>', '{t("search_medicine_desc", lang)}</div>')
content = content.replace('Medicine name</label>', '{t("medicine_name", lang)}</label>')
content = content.replace('placeholder="e.g. Paracetamol, Metformin…"', 'placeholder={t("medicine_placeholder", lang)}')
content = content.replace('Getting location…</>', '{t("getting_location", lang)}</>')
content = content.replace('Searching…</>', '{t("searching", lang)}</>')
content = content.replace('Find Nearby</>', '{t("find_nearby", lang)}</>')
content = content.replace('Using your current location. Falls back to Bengaluru if location is unavailable.\n        </div>', '{t("using_location", lang)}\n        </div>')

content = content.replace('Pharmacies near you\n            </div>', '{t("pharmacies_near_you", lang)}\n            </div>')
content = content.replace('No pharmacies found</div>', '{t("no_pharmacies_found", lang)}</div>')
content = content.replace('Try a different search term</div>', '{t("try_different_search", lang)}</div>')
content = content.replace('Available</>', '{t("available", lang)}</>')
content = content.replace('Unavailable</>', '{t("unavailable", lang)}</>')
content = content.replace('Directions\n                      </a>', '{t("directions", lang)}\n                      </a>')

# --- PharmacistScreen ---
content = content.replace('Aarogya+ · Pharmacist Portal\n        </div>', '{t("pharmacist_portal_title", lang)}\n        </div>')
content = content.replace('Prescription Report</div>', '{t("prescription_report", lang)}</div>')
content = content.replace('For dispensing & verification</div>', '{t("dispensing_verification", lang)}</div>')

content = content.replace('Patient Information</div>', '{t("patient_info", lang)}</div>')
content = content.replace('Edit\n            </button>', '{t("edit", lang)}\n            </button>')
content = content.replace('Save</button>', '{t("save", lang)}</button>')
content = content.replace('No active prescriptions</div>', '{t("no_active_prescriptions", lang)}</div>')
content = content.replace('Scan a prescription first, then come back here to generate a report.</div>', '{t("scan_first_come_back", lang)}</div>')

content = content.replace('Prescribed Medicines\n              </div>', '{t("prescribed_medicines", lang)}\n              </div>')
content = content.replace('item{fup.length !== 1 ? "s" : ""}', ' {fup.length !== 1 ? t("items", lang) : t("item", lang)}')

content = content.replace('["Medicine", "Days Left", "Ends", "Status"]', '[t("table_medicine", lang), t("table_days_left", lang), t("table_ends", lang), t("table_status", lang)]')

content = content.replace('"Refill Now" : warn ? "Refill Soon" : "Active"', 't("status_refill_now", lang) : warn ? t("status_refill_soon", lang) : t("status_active", lang)')

content = content.replace('Dispensing Notes\n            </div>', '{t("dispensing_notes", lang)}\n            </div>')
content = content.replace('· Verify patient identity before dispensing<br />', '· {t("dispensing_note_1", lang)}<br />')
content = content.replace('· Check for drug-drug interactions<br />', '· {t("dispensing_note_2", lang)}<br />')
content = content.replace('· Counsel patient on food instructions and dose timing<br />', '· {t("dispensing_note_3", lang)}<br />')
content = content.replace('· Provide written schedule for complex regimens<br />', '· {t("dispensing_note_4", lang)}<br />')
content = content.replace('· Flag medicines with &lt; 3 days remaining for refill counselling', '· {t("dispensing_note_5", lang)}')

content = content.replace('Refill Alert</div>', '{t("refill_alert", lang)}</div>')
content = content.replace('— running low. Advise patient to refill promptly.', '— {t("running_low", lang)}')

content = content.replace('Print Report\n          </button>', '{t("print_report", lang)}\n          </button>')
content = content.replace('Generated by <strong>Aarogya+</strong>', '{t("generated_by", lang)}')
content = content.replace('Auto-generated — verify with a licensed pharmacist before dispensing.', '{t("auto_generated_verify", lang)}')

# --- Root App ---
content = content.replace('const NAV = [\n  { id: "home",       icon: Home,       label: "Home" },\n  { id: "symptoms",   icon: Stethoscope,label: "Symptoms" },\n  { id: "scan",       icon: Camera,     label: "Scan" },\n  { id: "reminders",  icon: Bell,       label: "Medicines" },\n  { id: "locator",    icon: MapPin,     label: "Locate" },\n  { id: "pharmacist", icon: ShieldPlus, label: "Portal" },\n];',
                          'const NAV = (lang) => [\n  { id: "home",       icon: Home,       label: t("nav_home", lang) },\n  { id: "symptoms",   icon: Stethoscope,label: t("nav_symptoms", lang) },\n  { id: "scan",       icon: Camera,     label: t("nav_scan", lang) },\n  { id: "reminders",  icon: Bell,       label: t("nav_reminders", lang) },\n  { id: "locator",    icon: MapPin,     label: t("nav_locate", lang) },\n  { id: "pharmacist", icon: ShieldPlus, label: t("nav_portal", lang) },\n];')

content = content.replace('NAV.map(', 'NAV(lang).map(')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replacement complete.")
