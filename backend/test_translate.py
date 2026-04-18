from main import translate_list

meds = [
  {
    "medicine_name": "AZITHROMYCIN",
    "dosage": "1-0-1",
    "schedule": "1-0-1",
    "duration": "3 Days",
    "food_instruction": "After Meal",
    "purpose": "It fights off bacterial infections in lungs."
  }
]

print(translate_list(meds, "kn")) # Kannada
