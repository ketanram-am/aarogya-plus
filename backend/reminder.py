"""
reminder.py - In-memory medicine reminder scheduler
Drives: /api/reminders, /api/taken, /api/followup
"""

import re
import threading
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

import schedule

# -----------------------------------------------------------------------------
# CONFIG
# -----------------------------------------------------------------------------

# Maps "M-A-N" notation to (morning, afternoon, night) boolean tuple
SCHEDULE_MAP: dict[str, tuple[bool, bool, bool]] = {
    "1-0-0": (True,  False, False),
    "0-1-0": (False, True,  False),
    "0-0-1": (False, False, True),
    "1-1-0": (True,  True,  False),
    "1-0-1": (True,  False, True),
    "0-1-1": (False, True,  True),
    "1-1-1": (True,  True,  True),
}

DOSE_TIMES = {
    "morning":   "08:00",
    "afternoon": "14:00",
    "night":     "21:00",
}


# -----------------------------------------------------------------------------
# TTS (optional - degrades gracefully if pyttsx3 not installed)
# -----------------------------------------------------------------------------

try:
    import pyttsx3
    _tts_engine = pyttsx3.init()

    def speak(text: str) -> None:
        print(f"AUDIO {text}")
        try:
            _tts_engine.say(text)
            _tts_engine.runAndWait()
        except Exception:
            pass

except Exception:
    def speak(text: str) -> None:  # type: ignore[misc]
        print(f"AUDIO (TTS unavailable) {text}")


# -----------------------------------------------------------------------------
# GLOBAL STATE
# -----------------------------------------------------------------------------

MEDS: list[dict]                   = []   # original medicine dicts from pipeline
SCHEDULE_MAP_DAILY: dict           = {}   # date -> list of dose dicts
TAKEN: dict[str, bool]             = {}   # "MedName_HH:MM" -> True/False
MISSED_COUNT: dict[str, int]       = {}
_SCHEDULER_STARTED: bool           = False
_LOCK = threading.Lock()


# -----------------------------------------------------------------------------
# DATA MODEL
# -----------------------------------------------------------------------------

@dataclass
class Medicine:
    medicine_name: str
    dosage: str
    schedule: str
    duration: str
    food_instruction: str
    purpose: str = ""

    # derived
    num_days: int          = field(init=False)
    slots: tuple           = field(init=False)

    def __post_init__(self):
        self.num_days = self._parse_duration()
        self.slots    = SCHEDULE_MAP.get(self.schedule.strip(), (True, False, True))

    def _parse_duration(self) -> int:
        match = re.search(r"\d+", self.duration or "")
        return int(match.group()) if match else 1


# -----------------------------------------------------------------------------
# PUBLIC: INITIALIZE
# -----------------------------------------------------------------------------

def initialize(meds_json: list[dict]) -> None:
    """
    Called after a prescription scan.
    Builds the daily schedule and starts the background scheduler.
    """
    global MEDS, SCHEDULE_MAP_DAILY, TAKEN, MISSED_COUNT, _SCHEDULER_STARTED

    with _LOCK:
        MEDS              = meds_json
        TAKEN             = {}
        MISSED_COUNT      = {}
        SCHEDULE_MAP_DAILY = {}

        today     = date.today()
        medicines = [Medicine(**{k: v for k, v in m.items() if k in Medicine.__dataclass_fields__})
                     for m in meds_json]

        for med in medicines:
            for d in range(med.num_days):
                day = today + timedelta(days=d)
                if day not in SCHEDULE_MAP_DAILY:
                    SCHEDULE_MAP_DAILY[day] = []

                for slot_name, active in zip(["morning", "afternoon", "night"], med.slots):
                    if active:
                        SCHEDULE_MAP_DAILY[day].append({
                            "medicine_name":   med.medicine_name,
                            "time":            DOSE_TIMES[slot_name],
                            "slot":            slot_name.capitalize(),
                            "food_instruction": med.food_instruction,
                        })

    _start_scheduler()


# -----------------------------------------------------------------------------
# PUBLIC: API FUNCTIONS
# -----------------------------------------------------------------------------

def get_today() -> list[dict]:
    """Return today's dose schedule with taken status."""
    today = date.today()
    doses = SCHEDULE_MAP_DAILY.get(today, [])
    result = []
    for dose in doses:
        key = f"{dose['medicine_name']}_{dose['time']}"
        result.append({**dose, "taken": TAKEN.get(key, False)})
    return result


def mark_taken(medicine_name: str, time: str) -> None:
    """Mark a dose as taken and announce via TTS."""
    key = f"{medicine_name}_{time}"
    TAKEN[key] = True
    speak(f"{medicine_name} marked as taken.")


def get_followup() -> list[dict]:
    """Return days-remaining and end date for each active medicine."""
    today  = date.today()
    result = []
    for med in MEDS:
        raw_dur = med.get("duration", "1 Day")
        match   = re.search(r"\d+", raw_dur)
        days    = int(match.group()) if match else 1
        end_dt  = today + timedelta(days=days - 1)
        remaining = max(0, (end_dt - today).days)
        result.append({
            "medicine_name": med.get("medicine_name", ""),
            "days_remaining": remaining,
            "end_date":       str(end_dt),
        })
    return result


# -----------------------------------------------------------------------------
# INTERNAL: SCHEDULER
# -----------------------------------------------------------------------------

def _trigger(dose: dict) -> None:
    key = f"{dose['medicine_name']}_{dose['time']}"
    if not TAKEN.get(key):
        speak(f"Reminder: Time to take {dose['medicine_name']}.")


def _check_missed() -> None:
    now   = datetime.now().strftime("%H:%M")
    today = date.today()
    for dose in SCHEDULE_MAP_DAILY.get(today, []):
        key = f"{dose['medicine_name']}_{dose['time']}"
        if dose["time"] < now and not TAKEN.get(key):
            MISSED_COUNT[key] = MISSED_COUNT.get(key, 0) + 1
            if MISSED_COUNT[key] == 1:
                speak(f"You missed your dose of {dose['medicine_name']}.")
            elif MISSED_COUNT[key] >= 3:
                print(f"ALERT: CAREGIVER ALERT: {dose['medicine_name']} missed {MISSED_COUNT[key]} times.")
                speak(f"Alert: {dose['medicine_name']} has been missed multiple times. Please check on the patient.")


def _start_scheduler() -> None:
    global _SCHEDULER_STARTED
    if _SCHEDULER_STARTED:
        return

    schedule.clear()
    today = date.today()
    for dose in SCHEDULE_MAP_DAILY.get(today, []):
        schedule.every().day.at(dose["time"]).do(_trigger, dose)

    schedule.every(10).minutes.do(_check_missed)

    def _run():
        while True:
            schedule.run_pending()
            time.sleep(30)

    threading.Thread(target=_run, daemon=True, name="AarogyaScheduler").start()
    _SCHEDULER_STARTED = True
    print("OK Reminder scheduler started.")
