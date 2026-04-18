import os
import uuid
import base64
import mimetypes
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase_client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase configured successfully.")
    except Exception as e:
        print(f"⚠️ Could not initialize Supabase: {e}")
else:
    print("⚠️ Supabase credentials missing from .env")


def _check_duplicate(patient_meta: dict, medicines: list) -> bool:
    """
    Check if a prescription with IDENTICAL fields already exists in DB.
    Matches: doctor_name + patient_name + diagnosis + exact medicine names.
    """
    if not supabase_client:
        return False

    try:
        doctor = (patient_meta.get("doctor_name") or "").strip().lower()
        patient = (patient_meta.get("patient_name") or "").strip().lower()
        diagnosis = (patient_meta.get("diagnosis") or "").strip().lower()

        if not doctor and not patient:
            return False  # Can't deduplicate without identifying info

        # Find prescriptions with matching doctor + patient + diagnosis
        query = supabase_client.table("prescriptions").select("id, prescription_medicines(medicine_name)")

        if doctor:
            query = query.ilike("doctor_name", f"%{doctor}%")
        if patient:
            query = query.ilike("patient_name", f"%{patient}%")
        if diagnosis:
            query = query.ilike("diagnosis", f"%{diagnosis}%")

        res = query.execute()

        if not res.data:
            return False

        # Compare medicine lists exactly
        new_meds = sorted([m.get("medicine_name", "").strip().lower() for m in medicines])

        for existing_rx in res.data:
            existing_meds = sorted([
                m.get("medicine_name", "").strip().lower()
                for m in (existing_rx.get("prescription_medicines") or [])
            ])
            if existing_meds == new_meds:
                print(f"🔁 Duplicate detected: matches prescription {existing_rx['id']}")
                return True

        return False

    except Exception as e:
        print(f"⚠️ Duplicate check failed (proceeding with save): {e}")
        return False


def save_prescription(patient_meta: dict, medicines: list, image_b64: str = "") -> str:
    """
    Save prescription to Supabase DB.
    Returns prescription_id on success, 'DUPLICATE' if already exists, None on failure.
    """
    if not supabase_client:
        print("❌ Supabase client not initialized — skipping DB save.")
        return None

    # Check for duplicates first
    if _check_duplicate(patient_meta, medicines):
        return "DUPLICATE"

    try:
        # Build image data URI if base64 was provided
        image_data = ""
        if image_b64:
            image_data = f"data:image/jpeg;base64,{image_b64}"
            print(f"✅ Image encoded ({len(image_data) // 1024} KB)")
        
        # Insert into `prescriptions`
        rx_data = {
            "patient_name": patient_meta.get("patient_name") or "Unknown Patient",
            "patient_age": str(patient_meta.get("patient_age", "")),
            "patient_gender": patient_meta.get("patient_gender", ""),
            "doctor_name": patient_meta.get("doctor_name") or "Unknown Doctor",
            "doctor_speciality": patient_meta.get("doctor_speciality", ""),
            "doctor_reg_id": patient_meta.get("doctor_reg_id", ""),
            "diagnosis": patient_meta.get("diagnosis") or "",
            "description": patient_meta.get("description", ""),
            "image_url": "",
            "image_data": image_data,
        }
        
        print(f"📝 Saving: {rx_data['patient_name']} / {rx_data['doctor_name']} / {rx_data['diagnosis']}")
        
        rx_res = supabase_client.table("prescriptions").insert(rx_data).execute()
        
        if not rx_res.data:
            raise Exception("Failed to insert prescription row.")
            
        prescription_id = rx_res.data[0]["id"]
        print(f"✅ Prescription saved: {prescription_id}")
        
        # Insert into `prescription_medicines`
        meds_data = []
        for med in medicines:
            meds_data.append({
                "prescription_id": prescription_id,
                "medicine_name": med.get("medicine_name", ""),
                "dosage": med.get("dosage", ""),
                "schedule": med.get("schedule", ""),
                "duration": med.get("duration", ""),
                "food_instruction": med.get("food_instruction", ""),
                "purpose": med.get("purpose", "")
            })
            
        if meds_data:
            supabase_client.table("prescription_medicines").insert(meds_data).execute()
            print(f"✅ {len(meds_data)} medicine(s) saved.")

        return prescription_id
    except Exception as e:
        print(f"❌ DB save failed: {e}")
        return None


def get_all_prescriptions() -> list:
    """Fetch all history descending. Excludes image_data for list view performance."""
    if not supabase_client:
        return []
        
    try:
        res = supabase_client.table("prescriptions") \
            .select("id, patient_name, patient_age, patient_gender, doctor_name, doctor_speciality, doctor_reg_id, diagnosis, description, scan_date, prescription_medicines(*)") \
            .order("scan_date", desc=True) \
            .execute()
            
        return res.data or []
    except Exception as e:
        print(f"❌ DB fetch failed: {e}")
        return []


def get_prescription_by_id(pid: str) -> dict:
    """Fetch a single prescription WITH image_data for detail view."""
    if not supabase_client:
        return None
    try:
        res = supabase_client.table("prescriptions") \
            .select("*, prescription_medicines(*)") \
            .eq("id", pid) \
            .execute()
        if res.data:
            return res.data[0]
        return None
    except Exception as e:
        print(f"❌ DB fetch failed: {e}")
        return None


def delete_prescription(pid: str):
    """Delete a prescription and its medicines from Supabase."""
    if not supabase_client:
        return
    try:
        # Medicines cascade-delete via FK, but delete explicitly for safety
        supabase_client.table("prescription_medicines").delete().eq("prescription_id", pid).execute()
        supabase_client.table("prescriptions").delete().eq("id", pid).execute()
        print(f"🗑️ Deleted prescription {pid}")
    except Exception as e:
        print(f"❌ Delete failed: {e}")
        raise e
