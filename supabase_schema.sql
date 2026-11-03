-- ============================================================================
-- PULSEWAY: EMERGENCY COORDINATION & DISPATCH SYSTEM
-- Complete Idempotent Supabase PostgreSQL Schema & Seed Migration
-- Project ID: pciocooxhpsvrvpqoykb
-- Project URL: https://pciocooxhpsvrvpqoykb.supabase.co
-- ============================================================================

-- Enable UUID generation extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. CITIZEN ACCOUNTS TABLE (Separate Citizen Login & Personal Medical Profile)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.citizen_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile TEXT UNIQUE NOT NULL,
  email TEXT,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  dob TEXT,
  age INTEGER,
  sex TEXT,
  height TEXT,
  weight TEXT,
  blood_group TEXT NOT NULL,
  allergies JSONB DEFAULT '[]'::jsonb,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  permanent_address TEXT,
  gps_consent_confirmed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. HOSPITAL ACCOUNTS TABLE (Separate Hospital Login & Live Capacity Counters)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hospital_accounts (
  id TEXT PRIMARY KEY,
  hospital_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT NOT NULL,
  officer_name TEXT NOT NULL,
  reg_id TEXT DEFAULT 'REG-77490-KMC',
  governance TEXT DEFAULT 'Private Hospital',
  address TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Multi-Specialty Trauma Level 1',
  facilities JSONB DEFAULT '["ICU (Intensive Care)", "Trauma Centre", "Cardiac Cath Lab"]'::jsonb,
  total_ambulances INTEGER DEFAULT 8,
  icu_beds_available INTEGER DEFAULT 6,
  trauma_beds_available INTEGER DEFAULT 11,
  general_beds_available INTEGER DEFAULT 42,
  ventilators_available INTEGER DEFAULT 14,
  medical_staff_available INTEGER DEFAULT 38,
  avg_response_minutes DOUBLE PRECISION DEFAULT 4.2,
  latitude DOUBLE PRECISION DEFAULT 12.9592,
  longitude DOUBLE PRECISION DEFAULT 77.6476,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if hospital_accounts was created by an older migration
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS reg_id TEXT DEFAULT 'REG-77490-KMC';
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS governance TEXT DEFAULT 'Private Hospital';
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS ventilators_available INTEGER DEFAULT 14;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS medical_staff_available INTEGER DEFAULT 38;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS avg_response_minutes DOUBLE PRECISION DEFAULT 4.2;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT 12.9592;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT 77.6476;

-- ----------------------------------------------------------------------------
-- 3. EMERGENCY INCIDENTS TABLE (REAL-TIME SYNCHRONIZED DISPATCHES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_incidents (
  id TEXT PRIMARY KEY,
  citizen_mobile TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'BROADCASTING',
  severity TEXT NOT NULL DEFAULT 'CRITICAL',
  patient_name TEXT NOT NULL,
  patient_age INTEGER DEFAULT 30,
  patient_blood TEXT DEFAULT 'O+',
  patient_cause TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  assigned_hospital_id TEXT,
  assigned_hospital_name TEXT,
  ambulance_vehicle_no TEXT,
  pre_arrival_bed TEXT,
  pre_arrival_doctor TEXT,
  raw_incident JSONB DEFAULT '{}'::jsonb
);

-- ----------------------------------------------------------------------------
-- 4. CITIZEN CHAT & SOLVED EMERGENCY HISTORY TABLE (Per-User Private History)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.citizen_chat_history (
  id TEXT PRIMARY KEY,
  citizen_mobile TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  user_query TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'CRITICAL',
  response_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'AI_CHAT',
  hospital_name TEXT,
  ambulance_no TEXT,
  allotted_bed TEXT,
  patient_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citizen_chat_history_mobile
  ON public.citizen_chat_history (citizen_mobile);

-- ----------------------------------------------------------------------------
-- 5. AI TRIAGE LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_triage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_mobile TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  emergency_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  summary_report TEXT,
  triage_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) & POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.citizen_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_triage_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first so script can be re-run safely without errors
DROP POLICY IF EXISTS "Allow anon and authenticated full access to citizen_accounts" ON public.citizen_accounts;
DROP POLICY IF EXISTS "Allow anon and authenticated full access to hospital_accounts" ON public.hospital_accounts;
DROP POLICY IF EXISTS "Allow anon and authenticated full access to emergency_incidents" ON public.emergency_incidents;
DROP POLICY IF EXISTS "Allow anon and authenticated full access to citizen_chat_history" ON public.citizen_chat_history;
DROP POLICY IF EXISTS "Allow anon and authenticated full access to ai_triage_logs" ON public.ai_triage_logs;

CREATE POLICY "Allow anon and authenticated full access to citizen_accounts"
  ON public.citizen_accounts
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated full access to hospital_accounts"
  ON public.hospital_accounts
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated full access to emergency_incidents"
  ON public.emergency_incidents
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated full access to citizen_chat_history"
  ON public.citizen_chat_history
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated full access to ai_triage_logs"
  ON public.ai_triage_logs
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 7. REALTIME PUBLICATION CONFIGURATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'emergency_incidents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_incidents;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'hospital_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_accounts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'citizen_chat_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.citizen_chat_history;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. SEED DEFAULT HOSPITALS & DEMO CITIZEN ACCOUNT
-- ----------------------------------------------------------------------------
INSERT INTO public.hospital_accounts (
  id, hospital_code, name, email, password, phone, officer_name, reg_id, governance, address, type, facilities,
  total_ambulances, icu_beds_available, trauma_beds_available, general_beds_available,
  ventilators_available, medical_staff_available, avg_response_minutes, latitude, longitude
) VALUES
(
  'hosp-manipal-blr',
  'HOSP-BLR-8841',
  'Manipal Super Specialty & Trauma Institute',
  'emergency.desk@manipalhospitals.com',
  'Hospital@123',
  '+91 80 2502 4444',
  'Dr. Vikram Adiga, MS',
  'REG-77490-KMC',
  'Private Hospital',
  '98 HAL Old Airport Rd, Kodihalli, Bengaluru 560017',
  'Level-1 Tertiary Trauma & Cardiac Center',
  '["ICU (Intensive Care)", "Trauma Centre", "Cardiac Cath Lab", "Neuro Emergency", "Obstetric NICU"]'::jsonb,
  8, 6, 11, 42, 14, 38, 4.2, 12.9592, 77.6476
),
(
  'hosp-victoria-blr',
  'HOSP-BLR-0112',
  'Victoria Govt. Medical College & Trauma Hub',
  'emergency@victoriahospital.gov.in',
  'Hospital@123',
  '+91 80 2670 1150',
  'Dr. Siddharth Gowda, MD',
  'REG-11024-KMC',
  'Government Hospital',
  'Fort Rd, Near City Market, Chamrajpet, Bengaluru 560002',
  'Government Regional Trauma & Emergency Hub',
  '["ICU (Intensive Care)", "Trauma Centre", "Burn ICU", "Maternal Emergency Ward"]'::jsonb,
  12, 9, 18, 85, 22, 64, 4.8, 12.9635, 77.5741
),
(
  'hosp-apollo-blr',
  'HOSP-BLR-1024',
  'Apollo Hospital & Heart Center',
  'dispatch@apollohospitals.com',
  'Hospital@123',
  '+91 80 2630 4050',
  'Dr. Ananya Rao, DM',
  'REG-55821-KMC',
  'Private Hospital',
  '154/11 Bannerghatta Main Rd, Bengaluru 560076',
  'Multi-Specialty Acute Care & Stroke Center',
  '["ICU (Intensive Care)", "Cardiac Cath Lab", "Stroke Resuscitation", "Orthopedics Bay"]'::jsonb,
  6, 5, 9, 38, 11, 29, 3.9, 12.8958, 77.5986
)
ON CONFLICT (hospital_code) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  phone = EXCLUDED.phone,
  officer_name = EXCLUDED.officer_name,
  reg_id = EXCLUDED.reg_id,
  governance = EXCLUDED.governance,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

INSERT INTO public.citizen_accounts (
  mobile, email, password, full_name, dob, age, sex, height, weight, blood_group,
  allergies, emergency_contacts, permanent_address, gps_consent_confirmed
) VALUES (
  '9845012345',
  'arjun.kumar@pulseway.in',
  'User@123',
  'Arjun Kumar',
  '1994-06-15',
  32,
  'Male',
  '176 cm',
  '72 kg',
  'O+',
  '["Penicillin", "Sulfa Drugs"]'::jsonb,
  '[
    {"name": "Mom (Lakshmi K)", "relation": "Mother", "phone": "9845098765"},
    {"name": "Dad (Ramesh K)", "relation": "Father", "phone": "9845054321"}
  ]'::jsonb,
  'Flat 402, Indiranagar 100 Feet Road, HAL 2nd Stage, Bengaluru 560038',
  true
)
ON CONFLICT (mobile) DO NOTHING;
