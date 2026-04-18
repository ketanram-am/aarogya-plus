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


def _encode_image_base64(image_path: str) -> str:
    """Read image file and return base64-encoded data URI string."""
    try:
        if not image_path or not os.path.exists(image_path):
            return ""
        
        mime_type, _ = mimetypes.guess_type(image_path)
        mime_type = mime_type or "image/jpeg"
        
        with open(image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        
        return f"data:{mime_type};base64,{b64}"
    except Exception as e:
        print(f"❌ Image encode failed: {e}")
        return ""


def save_prescription(patient_meta: dict, medicines: list, image_path: str) -> str:
    """Save the full prescription data + image to Supabase DB."""
    if not supabase_client:
        print("❌ Supabase client not initialized — skipping DB save.")
        return None

    try:
        # 1. Encode image as base64 data URI
        image_data = _encode_image_base64(image_path)
        if image_data:
            print(f"✅ Image encoded ({len(image_data) // 1024} KB)")
        else:
            print("⚠️ No image data to save")
        
        # 2. Insert into `prescriptions`
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
        
        # 3. Insert into `prescription_medicines`
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
