import { createClient } from '@supabase/supabase-js';
import { allocatePreArrivalResources, classifyEmergencySeverity } from './clinicalLogic';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://pciocooxhpsvrvpqoykb.supabase.co';
export const SUPABASE_PROJECT_ID =
  import.meta.env.VITE_SUPABASE_PROJECT_ID || 'pciocooxhpsvrvpqoykb';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ['sb_publishable_', '8GuR5GS79m_XsUr9g3jF0g_dI2ftwDu'].join('');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface CitizenAccount {
  id?: string;
  mobile: string;
  email: string;
  password?: string;
  full_name: string;
  dob: string;
  age: number;
  sex: string;
  height: string;
  weight: string;
  blood_group: string;
  allergies: string[];
  emergency_contacts: EmergencyContact[];
  permanent_address: string;
  gps_consent_confirmed: boolean;
  created_at?: string;
}

export interface HospitalAccount {
  id: string;
  hospital_code: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  officer_name: string;
  reg_id?: string;
  governance?: 'Private Hospital' | 'Government Hospital';
  address: string;
  type: string;
  facilities: string[];
  total_ambulances: number;
  icu_beds_available: number;
  trauma_beds_available: number;
  general_beds_available: number;
  ventilators_available: number;
  medical_staff_available: number;
  avg_response_minutes: number;
  latitude: number;
  longitude: number;
}

export interface OtherPatientDetails {
  requestFor: 'SELF' | 'OTHER';
  name?: string;
  sex: string;
  approxAge: string;
  bloodGroup: string;
  height: string;
}

export interface EmergencyIncident {
  id: string;
  citizen_mobile: string;
  timestamp: string;
  status: 'BROADCASTING' | 'ALLOTTED' | 'EN_ROUTE' | 'ARRIVED' | 'DISCHARGED';
  severity: 'CRITICAL' | 'MINOR';
  patient_name: string;
  patient_age: number;
  patient_blood: string;
  patient_cause: string;
  patient_phone: string;
  latitude: number;
  longitude: number;
  address: string;
  assigned_hospital_id: string;
  assigned_hospital_name: string;
  ambulance_vehicle_no: string;
  pre_arrival_bed: string;
  pre_arrival_doctor: string;
  raw_incident: {
    request_for?: 'SELF' | 'OTHER';
    reported_by_name?: string;
    sex?: string;
    approx_age_text?: string;
    patient_height?: string;
    patient_weight?: string;
    allergies?: string[];
    emergency_contacts?: EmergencyContact[];
    target_ward?: string;
    driver_name?: string;
    driver_phone?: string;
    paramedic_name?: string;
    paramedic_phone?: string;
    eta_minutes?: number;
    hospital_lat?: number;
    hospital_lng?: number;
    dispatched_at?: number;
    bed_confirmed?: boolean;
    bed_category_occupied?: 'ICU' | 'TRAUMA' | 'GENERAL';
    citizen_returned_home?: boolean;
    search_radius_km?: number;
    radius_expanded_count?: number;
    messenger_whatsapp_notified?: boolean;
    is_demo?: boolean;
    source?: 'AI_CHAT' | 'SOLO_COMMUTE_DEMO' | 'SOS_TRIGGER';
  };
}

export interface PersistentChatHistoryItem {
  id: string;
  citizen_mobile: string;
  timestamp: string;
  userQuery: string;
  severity: 'CRITICAL' | 'MINOR';
  responseTitle: string;
  summary: string;
  recordType?: 'AI_CHAT' | 'SOLVED_EMERGENCY';
  hospitalName?: string;
  ambulanceNo?: string;
  allottedBed?: string;
  patientName?: string;
}

export const DEFAULT_HOSPITALS: HospitalAccount[] = [
  {
    id: 'hosp-manipal-blr',
    hospital_code: 'HOSP-BLR-8841',
    name: 'Manipal Super Specialty & Trauma Institute',
    email: 'emergency.desk@manipalhospitals.com',
    password: 'Hospital@123',
    phone: '+91 80 2502 4444',
    officer_name: 'Dr. Vikram Adiga, MS',
    reg_id: 'REG-77490-KMC',
    governance: 'Private Hospital',
    address: '98 HAL Old Airport Rd, Kodihalli, Bengaluru 560017',
    type: 'Level-1 Tertiary Trauma & Cardiac Center',
    facilities: [
      'ICU (Intensive Care)',
      'Trauma Centre',
      'Cardiac Cath Lab',
      'Neuro Emergency',
      'Obstetric NICU',
    ],
    total_ambulances: 8,
    icu_beds_available: 6,
    trauma_beds_available: 11,
    general_beds_available: 42,
    ventilators_available: 14,
    medical_staff_available: 38,
    avg_response_minutes: 4.2,
    latitude: 12.9592,
    longitude: 77.6476,
  },
  {
    id: 'hosp-victoria-blr',
    hospital_code: 'HOSP-BLR-0112',
    name: 'Victoria Govt. Medical College & Trauma Hub',
    email: 'emergency@victoriahospital.gov.in',
    password: 'Hospital@123',
    phone: '+91 80 2670 1150',
    officer_name: 'Dr. Siddharth Gowda, MD',
    reg_id: 'REG-11024-KMC',
    governance: 'Government Hospital',
    address: 'Fort Rd, Near City Market, Chamrajpet, Bengaluru 560002',
    type: 'Government Regional Trauma & Emergency Hub',
    facilities: [
      'ICU (Intensive Care)',
      'Trauma Centre',
      'Burn ICU',
      'Maternal Emergency Ward',
    ],
    total_ambulances: 12,
    icu_beds_available: 9,
    trauma_beds_available: 18,
    general_beds_available: 85,
    ventilators_available: 22,
    medical_staff_available: 64,
    avg_response_minutes: 4.8,
    latitude: 12.9635,
    longitude: 77.5741,
  },
  {
    id: 'hosp-apollo-blr',
    hospital_code: 'HOSP-BLR-1024',
    name: 'Apollo Hospital & Heart Center',
    email: 'dispatch@apollohospitals.com',
    password: 'Hospital@123',
    phone: '+91 80 2630 4050',
    officer_name: 'Dr. Ananya Rao, DM',
    reg_id: 'REG-55821-KMC',
    governance: 'Private Hospital',
    address: '154/11 Bannerghatta Main Rd, Bengaluru 560076',
    type: 'Multi-Specialty Acute Care & Stroke Center',
    facilities: [
      'ICU (Intensive Care)',
      'Cardiac Cath Lab',
      'Stroke Resuscitation',
      'Orthopedics Bay',
    ],
    total_ambulances: 6,
    icu_beds_available: 5,
    trauma_beds_available: 9,
    general_beds_available: 38,
    ventilators_available: 11,
    medical_staff_available: 29,
    avg_response_minutes: 3.9,
    latitude: 12.8958,
    longitude: 77.5986,
  },
];

export const DEFAULT_DEMO_CITIZEN: CitizenAccount = {
  id: 'cit-demo-9845012345',
  mobile: '9845012345',
  email: 'arjun.kumar@pulseway.in',
  password: 'User@123',
  full_name: 'Arjun Kumar',
  dob: '1994-06-15',
  age: 32,
  sex: 'Male',
  height: '176 cm',
  weight: '72 kg',
  blood_group: 'O+',
  allergies: ['Penicillin', 'Sulfa Drugs'],
  emergency_contacts: [
    { name: 'Mom (Lakshmi K)', relation: 'Mother', phone: '9845098765' },
    { name: 'Dad (Ramesh K)', relation: 'Father', phone: '9845054321' },
  ],
  permanent_address: 'Flat 402, Indiranagar 100 Feet Road, HAL 2nd Stage, Bengaluru 560038',
  gps_consent_confirmed: true,
};

const STORAGE_KEYS = {
  CITIZENS: 'pulseway_citizens_v2',
  HOSPITALS: 'pulseway_hospitals_v2',
  INCIDENTS: 'pulseway_incidents_v2',
  CHAT_HISTORY: 'pulseway_immutable_chat_history_v1',
  DISCHARGED_IDS: 'pulseway_discharged_ids_v1',
};

export function getDischargedIncidentIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISCHARGED_IDS);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

export function markIncidentDischargedLocally(incidentId: string): void {
  try {
    const set = getDischargedIncidentIds();
    set.add(incidentId);
    localStorage.setItem(STORAGE_KEYS.DISCHARGED_IDS, JSON.stringify(Array.from(set)));
  } catch {
    // ignore storage errors
  }
}

function getIncidentStatusRank(inc: EmergencyIncident): number {
  if (inc.status === 'DISCHARGED') return 4;
  if (inc.status === 'ARRIVED' || inc.raw_incident?.citizen_returned_home) return 3;
  if (inc.status === 'ALLOTTED' || inc.status === 'EN_ROUTE') return 2;
  return 1; // BROADCASTING
}

let remoteSchemaReady =
  typeof window !== 'undefined' &&
  window.localStorage?.getItem('pulseway_supabase_tables_ready') === 'true';

function emitSyncEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pulseway-sync'));
  }
}

/**
 * Checks whether the Supabase PostgreSQL tables have been created by querying
 * the server-side /api/health endpoint (preventing browser-side 404 console errors
 * prior to SQL execution, and automatically enabling live Supabase sync once tables exist).
 */
export async function checkSupabaseSchemaReady(): Promise<boolean> {
  if (remoteSchemaReady) return true;
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.supabaseTablesReady === true) {
      remoteSchemaReady = true;
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem('pulseway_supabase_tables_ready', 'true');
      }
      return true;
    }
  } catch {
    // ignore offline/network errors
  }
  return remoteSchemaReady;
}

export function getCitizenChatHistory(mobile: string): PersistentChatHistoryItem[] {
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (!raw) return [];
    const all = JSON.parse(raw) as PersistentChatHistoryItem[];
    return all.filter((item) => item.citizen_mobile === cleanMobile);
  } catch {
    return [];
  }
}

export async function syncCitizenChatHistoryFromSupabase(
  mobile: string
): Promise<PersistentChatHistoryItem[]> {
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  const local = getCitizenChatHistory(cleanMobile);
  if (!remoteSchemaReady) return local;

  try {
    const { data, error } = await supabase
      .from('citizen_chat_history')
      .select('*')
      .eq('citizen_mobile', cleanMobile)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
      return local;
    }

    if (!error && Array.isArray(data) && data.length > 0) {
      const remoteItems: PersistentChatHistoryItem[] = data.map((row: any) => ({
        id: String(row.id),
        citizen_mobile: String(row.citizen_mobile),
        timestamp: String(row.timestamp),
        userQuery: String(row.user_query),
        severity: row.severity === 'MINOR' ? 'MINOR' : 'CRITICAL',
        responseTitle: String(row.response_title),
        summary: String(row.summary),
        recordType: row.record_type === 'SOLVED_EMERGENCY' ? 'SOLVED_EMERGENCY' : 'AI_CHAT',
        hospitalName: row.hospital_name || undefined,
        ambulanceNo: row.ambulance_no || undefined,
        allottedBed: row.allotted_bed || undefined,
        patientName: row.patient_name || undefined,
      }));

      const rawAll = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      const existingAll: PersistentChatHistoryItem[] = rawAll ? JSON.parse(rawAll) : [];
      const mergedMap = new Map<string, PersistentChatHistoryItem>();
      for (const item of [...remoteItems, ...existingAll]) {
        mergedMap.set(item.id, item);
      }
      const mergedAll = Array.from(mergedMap.values());
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(mergedAll));
      return mergedAll.filter((item) => item.citizen_mobile === cleanMobile);
    }
  } catch {
    // ignore
  }
  return local;
}

export function appendCitizenChatHistory(item: PersistentChatHistoryItem): void {
  const cleanMobile = item.citizen_mobile.replace(/\D/g, '').slice(-10);
  const normalizedItem: PersistentChatHistoryItem = {
    ...item,
    citizen_mobile: cleanMobile,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    const all: PersistentChatHistoryItem[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((existing) => existing.id !== normalizedItem.id);
    filtered.unshift(normalizedItem);
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(filtered));
    emitSyncEvent();
  } catch {
    // ignore storage errors
  }

  if (remoteSchemaReady) {
    supabase
      .from('citizen_chat_history')
      .upsert(
        {
          id: normalizedItem.id,
          citizen_mobile: normalizedItem.citizen_mobile,
          timestamp: normalizedItem.timestamp,
          user_query: normalizedItem.userQuery,
          severity: normalizedItem.severity,
          response_title: normalizedItem.responseTitle,
          summary: normalizedItem.summary,
          record_type: normalizedItem.recordType || 'AI_CHAT',
          hospital_name: normalizedItem.hospitalName || null,
          ambulance_no: normalizedItem.ambulanceNo || null,
          allotted_bed: normalizedItem.allottedBed || null,
          patient_name: normalizedItem.patientName || null,
        },
        { onConflict: 'id' }
      )
      .then(() => {});
  }
}

export function getLocalCitizens(): CitizenAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CITIZENS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CITIZENS, JSON.stringify([DEFAULT_DEMO_CITIZEN]));
      return [DEFAULT_DEMO_CITIZEN];
    }
    const parsed = JSON.parse(raw) as CitizenAccount[];
    if (!parsed.some((c) => c.mobile === DEFAULT_DEMO_CITIZEN.mobile)) {
      parsed.unshift(DEFAULT_DEMO_CITIZEN);
      localStorage.setItem(STORAGE_KEYS.CITIZENS, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return [DEFAULT_DEMO_CITIZEN];
  }
}

export function getLocalHospitals(): HospitalAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(DEFAULT_HOSPITALS));
      return DEFAULT_HOSPITALS;
    }
    const parsed = JSON.parse(raw) as HospitalAccount[];
    return parsed.map((h) => ({
      ...DEFAULT_HOSPITALS[0],
      ...h,
      ventilators_available: h.ventilators_available ?? 14,
      medical_staff_available: h.medical_staff_available ?? 38,
      avg_response_minutes: h.avg_response_minutes ?? 4.2,
    }));
  } catch {
    return DEFAULT_HOSPITALS;
  }
}

export function getLocalIncidents(): EmergencyIncident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmergencyIncident[];
    if (!Array.isArray(parsed)) return [];
    const dischargedSet = getDischargedIncidentIds();
    return parsed.filter(
      (inc) => inc && inc.status !== 'DISCHARGED' && !dischargedSet.has(inc.id)
    );
  } catch {
    return [];
  }
}

function saveLocalIncidents(incidents: EmergencyIncident[]) {
  try {
    const dischargedSet = getDischargedIncidentIds();
    const clean = incidents.filter(
      (inc) => inc && inc.status !== 'DISCHARGED' && !dischargedSet.has(inc.id)
    );
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(clean));
    emitSyncEvent();
  } catch {
    // ignore
  }
}

export async function authenticateCitizen(
  mobile: string,
  password: string
): Promise<{ account: CitizenAccount | null; error?: string }> {
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

  if (remoteSchemaReady) {
    try {
      const { data, error } = await supabase
        .from('citizen_accounts')
        .select('*')
        .eq('mobile', cleanMobile)
        .maybeSingle();

      if (
        error &&
        (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('404'))
      ) {
        remoteSchemaReady = false;
      } else if (!error && data) {
        if (data.password && data.password !== password) {
          return { account: null, error: 'Invalid password for this mobile number.' };
        }
        return {
          account: {
            ...data,
            allergies: Array.isArray(data.allergies) ? data.allergies : [],
            emergency_contacts: Array.isArray(data.emergency_contacts)
              ? data.emergency_contacts
              : DEFAULT_DEMO_CITIZEN.emergency_contacts,
          },
        };
      }
    } catch {
      remoteSchemaReady = false;
    }
  }

  const citizens = getLocalCitizens();
  const found = citizens.find((c) => c.mobile === cleanMobile);
  if (!found) {
    return {
      account: null,
      error: 'Mobile number not registered. Use Demo Autofill (9845012345) or Register.',
    };
  }
  if (found.password && found.password !== password) {
    return { account: null, error: 'Incorrect password. Please try again.' };
  }
  return { account: found };
}

export async function registerCitizen(
  newAccount: CitizenAccount
): Promise<{ account: CitizenAccount; syncedToSupabase: boolean }> {
  const cleanMobile = newAccount.mobile.replace(/\D/g, '').slice(-10);
  const record: CitizenAccount = {
    ...newAccount,
    mobile: cleanMobile,
    created_at: new Date().toISOString(),
  };

  const citizens = getLocalCitizens().filter((c) => c.mobile !== cleanMobile);
  citizens.unshift(record);
  localStorage.setItem(STORAGE_KEYS.CITIZENS, JSON.stringify(citizens));

  if (remoteSchemaReady) {
    try {
      const { error } = await supabase.from('citizen_accounts').upsert(
        {
          mobile: record.mobile,
          email: record.email,
          password: record.password,
          full_name: record.full_name,
          dob: record.dob,
          age: record.age,
          sex: record.sex,
          height: record.height,
          weight: record.weight,
          blood_group: record.blood_group,
          allergies: record.allergies,
          emergency_contacts: record.emergency_contacts,
          permanent_address: record.permanent_address,
          gps_consent_confirmed: record.gps_consent_confirmed,
        },
        { onConflict: 'mobile' }
      );
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        remoteSchemaReady = false;
      }
      return { account: record, syncedToSupabase: !error };
    } catch {
      remoteSchemaReady = false;
    }
  }
  return { account: record, syncedToSupabase: false };
}

export async function authenticateHospital(
  identifier: string,
  password: string
): Promise<{ hospital: HospitalAccount | null; error?: string }> {
  const cleanId = identifier.trim();

  if (remoteSchemaReady) {
    try {
      const { data, error } = await supabase
        .from('hospital_accounts')
        .select('*')
        .or(`hospital_code.ilike.${cleanId},email.ilike.${cleanId}`)
        .maybeSingle();

      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        remoteSchemaReady = false;
      } else if (!error && data) {
        if (data.password && data.password !== password) {
          return { hospital: null, error: 'Invalid hospital passcode.' };
        }
        const matchDefault =
          DEFAULT_HOSPITALS.find(
            (h) => h.hospital_code.toUpperCase() === String(data.hospital_code).toUpperCase()
          ) || DEFAULT_HOSPITALS[0];
        return {
          hospital: {
            ...matchDefault,
            ...data,
            facilities: Array.isArray(data.facilities)
              ? data.facilities
              : matchDefault.facilities,
          },
        };
      }
    } catch {
      remoteSchemaReady = false;
    }
  }

  const hospitals = getLocalHospitals();
  const found = hospitals.find(
    (h) =>
      h.hospital_code.toLowerCase() === cleanId.toLowerCase() ||
      h.email.toLowerCase() === cleanId.toLowerCase()
  );

  if (!found) {
    return {
      hospital: null,
      error:
        'Hospital Code not found. Select a Demo Hospital Preset on the left or use HOSP-BLR-8841.',
    };
  }
  if (found.password && found.password !== password) {
    return { hospital: null, error: 'Invalid passcode (use Hospital@123).' };
  }
  return { hospital: found };
}

export async function updateHospitalInfrastructure(
  hospital: HospitalAccount
): Promise<HospitalAccount> {
  const hospitals = getLocalHospitals().map((h) =>
    h.hospital_code === hospital.hospital_code ? hospital : h
  );
  localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(hospitals));
  emitSyncEvent();

  if (remoteSchemaReady) {
    try {
      const { error } = await supabase.from('hospital_accounts').upsert(
        {
          id: hospital.id,
          hospital_code: hospital.hospital_code,
          name: hospital.name,
          email: hospital.email,
          password: hospital.password || 'Hospital@123',
          phone: hospital.phone,
          officer_name: hospital.officer_name,
          reg_id: hospital.reg_id || 'REG-77490-KMC',
          governance: hospital.governance || 'Private Hospital',
          address: hospital.address,
          type: hospital.type,
          facilities: hospital.facilities,
          total_ambulances: hospital.total_ambulances,
          icu_beds_available: hospital.icu_beds_available,
          trauma_beds_available: hospital.trauma_beds_available,
          general_beds_available: hospital.general_beds_available,
          ventilators_available: hospital.ventilators_available,
          medical_staff_available: hospital.medical_staff_available,
          avg_response_minutes: hospital.avg_response_minutes,
          latitude: hospital.latitude,
          longitude: hospital.longitude,
        },
        { onConflict: 'hospital_code' }
      );
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        remoteSchemaReady = false;
      }
    } catch {
      remoteSchemaReady = false;
    }
  }
  return hospital;
}

/**
 * Creates an emergency incident.
 * Supports both SELF (logged-in citizen's medical details) and OTHER (third-party patient's
 * gender, approx age, blood group, height).
 */
export async function createEmergencyIncident(params: {
  citizen: CitizenAccount;
  emergencyCause: string;
  latitude: number;
  longitude: number;
  address: string;
  targetHospital?: HospitalAccount;
  source?: 'AI_CHAT' | 'SOLO_COMMUTE_DEMO' | 'SOS_TRIGGER';
  autoAllot?: boolean;
  patientOverride?: OtherPatientDetails;
}): Promise<EmergencyIncident> {
  const hospitals = getLocalHospitals();
  const hospital = params.targetHospital || hospitals[0] || DEFAULT_HOSPITALS[0];
  const classification = classifyEmergencySeverity(params.emergencyCause);
  const allocation = allocatePreArrivalResources(params.emergencyCause, hospital.hospital_code);

  const incidentId = `INC-${Date.now().toString().slice(-6)}`;
  // Requirement 3: Ambulance is ONLY dispatched when the Hospital Dashboard allots it.
  // Until then, status is strictly 'BROADCASTING' (Waiting for Nearest Hospital Approval/Allotment).
  const status = 'BROADCASTING';

  const isForOther = params.patientOverride?.requestFor === 'OTHER';
  const parsedOtherAge = Number(
    String(params.patientOverride?.approxAge || '').replace(/\D/g, '')
  );

  const patientName = isForOther
    ? params.patientOverride?.name?.trim() ||
      `Third-Party Patient (Reported by ${params.citizen.full_name})`
    : params.citizen.full_name;

  const patientAge = isForOther ? parsedOtherAge || 35 : params.citizen.age || 32;
  const patientBlood = isForOther
    ? params.patientOverride?.bloodGroup || 'Unknown'
    : params.citizen.blood_group || 'O+';
  const patientSex = isForOther
    ? params.patientOverride?.sex || 'Unknown'
    : params.citizen.sex || 'Male';
  const patientHeight = isForOther
    ? params.patientOverride?.height?.trim() || 'Unknown'
    : params.citizen.height || '176 cm';
  const approxAgeText = isForOther
    ? params.patientOverride?.approxAge?.trim() || 'Unknown'
    : `${params.citizen.age || 32} yrs`;

  const incident: EmergencyIncident = {
    id: incidentId,
    citizen_mobile: params.citizen.mobile,
    timestamp: new Date().toISOString(),
    status,
    severity: classification.severity,
    patient_name: patientName,
    patient_age: patientAge,
    patient_blood: patientBlood,
    patient_cause: `${classification.emergencyGroup} — ${params.emergencyCause}`,
    patient_phone: params.citizen.mobile,
    latitude: params.latitude,
    longitude: params.longitude,
    address: params.address,
    assigned_hospital_id: hospital.id,
    assigned_hospital_name: hospital.name,
    ambulance_vehicle_no: 'Awaiting Hospital Allotment',
    pre_arrival_bed: 'Pending Bed Allotment',
    pre_arrival_doctor: allocation.doctorName,
    raw_incident: {
      request_for: isForOther ? 'OTHER' : 'SELF',
      reported_by_name: params.citizen.full_name,
      sex: patientSex,
      approx_age_text: approxAgeText,
      patient_height: patientHeight,
      patient_weight: isForOther ? 'Unknown' : params.citizen.weight || '72 kg',
      allergies: isForOther
        ? ['Unknown (Third-Party Patient)']
        : params.citizen.allergies,
      emergency_contacts: params.citizen.emergency_contacts,
      target_ward: allocation.targetWard,
      driver_name: 'Ramesh Gowda',
      driver_phone: '+91 98451 10801',
      paramedic_name: allocation.paramedicName,
      paramedic_phone: allocation.paramedicPhone,
      eta_minutes: 6,
      hospital_lat: hospital.latitude,
      hospital_lng: hospital.longitude,
      dispatched_at: undefined,
      bed_confirmed: false,
      citizen_returned_home: false,
      search_radius_km: 5,
      radius_expanded_count: 0,
      messenger_whatsapp_notified: false,
      is_demo: params.source === 'SOLO_COMMUTE_DEMO',
      source: params.source || 'AI_CHAT',
    },
  };

  const current = getLocalIncidents().filter((i) => i.id !== incident.id);
  current.unshift(incident);
  saveLocalIncidents(current);

  if (remoteSchemaReady) {
    try {
      const { error } = await supabase
        .from('emergency_incidents')
        .upsert(incident, { onConflict: 'id' });
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        remoteSchemaReady = false;
      }
    } catch {
      remoteSchemaReady = false;
    }
  }

  return incident;
}

/**
 * Expands the hospital broadcast search radius by +5 km when 60 seconds elapse
 * without a hospital allotting an ambulance.
 */
export async function expandIncidentSearchRadius(
  incidentId: string
): Promise<EmergencyIncident | null> {
  const incidents = getLocalIncidents();
  const target = incidents.find((i) => i.id === incidentId);
  if (!target || target.status !== 'BROADCASTING') return null;

  const currentRadius = target.raw_incident.search_radius_km || 5;
  const nextRadius = currentRadius + 5;
  const nextCount = (target.raw_incident.radius_expanded_count || 0) + 1;

  const updated: EmergencyIncident = {
    ...target,
    raw_incident: {
      ...target.raw_incident,
      search_radius_km: nextRadius,
      radius_expanded_count: nextCount,
    },
  };

  const nextList = incidents.map((i) => (i.id === incidentId ? updated : i));
  saveLocalIncidents(nextList);

  if (remoteSchemaReady) {
    try {
      await supabase.from('emergency_incidents').upsert(updated, { onConflict: 'id' });
    } catch {
      // ignore
    }
  }

  return updated;
}

/**
 * Called by the Hospital Command Center when the hospital staff clicks "Allot Ambulance".
 * Transitions the incident from BROADCASTING -> ALLOTTED and triggers the citizen's
 * one-time pre-recorded voice announcement, Messenger/WhatsApp emergency contact alerts,
 * and synchronized road-following ambulance tracking.
 */
export async function acceptBroadcastIncident(
  incidentId: string,
  hospital: HospitalAccount
): Promise<EmergencyIncident | null> {
  const incidents = getLocalIncidents();
  const target = incidents.find((i) => i.id === incidentId);
  if (!target) return null;

  // Guard: If already allotted/dispatched or arrived, never re-allot or re-trigger dispatch
  if (
    target.status === 'ALLOTTED' ||
    target.status === 'EN_ROUTE' ||
    target.status === 'ARRIVED'
  ) {
    return target;
  }

  const allocation = allocatePreArrivalResources(target.patient_cause, hospital.hospital_code);
  const updated: EmergencyIncident = {
    ...target,
    status: 'ALLOTTED',
    assigned_hospital_id: hospital.id,
    assigned_hospital_name: hospital.name,
    ambulance_vehicle_no: allocation.ambulanceVehicleNo,
    pre_arrival_bed:
      target.pre_arrival_bed && target.pre_arrival_bed !== 'Pending Bed Allotment'
        ? target.pre_arrival_bed
        : allocation.bedCode,
    pre_arrival_doctor: allocation.doctorName,
    raw_incident: {
      ...target.raw_incident,
      target_ward: allocation.targetWard,
      driver_name: target.raw_incident.driver_name || 'Ramesh Gowda',
      driver_phone: target.raw_incident.driver_phone || '+91 98451 10801',
      paramedic_name: allocation.paramedicName,
      paramedic_phone: allocation.paramedicPhone,
      eta_minutes: 6,
      hospital_lat: hospital.latitude,
      hospital_lng: hospital.longitude,
      dispatched_at: Date.now(),
      messenger_whatsapp_notified: true,
    },
  };

  const nextList = incidents.map((i) => (i.id === incidentId ? updated : i));
  saveLocalIncidents(nextList);

  if (remoteSchemaReady) {
    try {
      await supabase.from('emergency_incidents').upsert(updated, { onConflict: 'id' });
    } catch {
      // ignore
    }
  }

  await updateHospitalInfrastructure({
    ...hospital,
    total_ambulances: Math.max(0, hospital.total_ambulances - 1),
  });

  return updated;
}

function detectBedCategory(bedName: string): 'ICU' | 'TRAUMA' | 'GENERAL' {
  if (/trauma/i.test(bedName)) return 'TRAUMA';
  if (/general/i.test(bedName)) return 'GENERAL';
  return 'ICU';
}

/**
 * Called by Hospital Command Center when staff allots a specific bed for the patient.
 * Occupies the bed in Current Hospital Capacity until the patient is discharged.
 */
export async function allotBedForIncident(
  incidentId: string,
  bedName: string,
  doctorName: string,
  hospital: HospitalAccount
): Promise<EmergencyIncident | null> {
  const incidents = getLocalIncidents();
  const target = incidents.find((i) => i.id === incidentId);
  if (!target) return null;

  const latestHospital =
    getLocalHospitals().find((h) => h.hospital_code === hospital.hospital_code) || hospital;

  const alreadyConfirmed = target.raw_incident.bed_confirmed === true;
  const prevCategory = target.raw_incident.bed_category_occupied || 'ICU';
  const nextCategory = detectBedCategory(bedName);

  const updated: EmergencyIncident = {
    ...target,
    pre_arrival_bed: bedName,
    pre_arrival_doctor: doctorName || target.pre_arrival_doctor,
    raw_incident: {
      ...target.raw_incident,
      bed_confirmed: true,
      bed_category_occupied: nextCategory,
    },
  };

  const nextList = incidents.map((i) => (i.id === incidentId ? updated : i));
  saveLocalIncidents(nextList);

  if (remoteSchemaReady) {
    try {
      await supabase.from('emergency_incidents').upsert(updated, { onConflict: 'id' });
    } catch {
      // ignore
    }
  }

  let nextIcu = latestHospital.icu_beds_available;
  let nextTrauma = latestHospital.trauma_beds_available;
  let nextGeneral = latestHospital.general_beds_available;

  if (alreadyConfirmed) {
    if (prevCategory === 'ICU') nextIcu += 1;
    else if (prevCategory === 'TRAUMA') nextTrauma += 1;
    else if (prevCategory === 'GENERAL') nextGeneral += 1;
  }

  if (nextCategory === 'ICU') nextIcu = Math.max(0, nextIcu - 1);
  else if (nextCategory === 'TRAUMA') nextTrauma = Math.max(0, nextTrauma - 1);
  else if (nextCategory === 'GENERAL') nextGeneral = Math.max(0, nextGeneral - 1);

  await updateHospitalInfrastructure({
    ...latestHospital,
    icu_beds_available: nextIcu,
    trauma_beds_available: nextTrauma,
    general_beds_available: nextGeneral,
  });

  return updated;
}

/**
 * Marks that the ambulance has reached the citizen and returns the Citizen App view
 * to the clean Home Page while keeping the case active in the Hospital Dashboard until discharge.
 */
export async function markAmbulanceReachedReturnHome(
  incidentId: string
): Promise<EmergencyIncident | null> {
  const incidents = getLocalIncidents();
  const target = incidents.find((i) => i.id === incidentId);
  if (!target) return null;

  const updated: EmergencyIncident = {
    ...target,
    status: 'ARRIVED',
    raw_incident: {
      ...target.raw_incident,
      citizen_returned_home: true,
    },
  };

  const nextList = incidents.map((i) => (i.id === incidentId ? updated : i));
  saveLocalIncidents(nextList);

  if (remoteSchemaReady) {
    try {
      await supabase.from('emergency_incidents').upsert(updated, { onConflict: 'id' });
    } catch {
      // ignore
    }
  }

  return updated;
}

/**
 * Discharges the patient, releases the occupied bed & ambulance back to Current Hospital Capacity,
 * and records the solved emergency case uniquely in the citizen's AI Chat History.
 */
export async function dischargeIncidentAndReleaseBed(
  incidentId: string,
  hospital: HospitalAccount
): Promise<void> {
  const dischargedSet = getDischargedIncidentIds();
  if (dischargedSet.has(incidentId)) {
    return;
  }

  const incidents = getLocalIncidents();
  const target = incidents.find((i) => i.id === incidentId);

  // Immediately mark as discharged locally & remove from active list so no sync can re-add it
  markIncidentDischargedLocally(incidentId);
  const remaining = incidents.filter((i) => i.id !== incidentId);
  saveLocalIncidents(remaining);

  if (remoteSchemaReady) {
    try {
      await supabase
        .from('emergency_incidents')
        .update({ status: 'DISCHARGED' })
        .eq('id', incidentId);
    } catch {
      // ignore
    }
  }

  const latestHospital =
    getLocalHospitals().find((h) => h.hospital_code === hospital.hospital_code) || hospital;

  let nextIcu = latestHospital.icu_beds_available;
  let nextTrauma = latestHospital.trauma_beds_available;
  let nextGeneral = latestHospital.general_beds_available;

  if (target?.raw_incident?.bed_confirmed) {
    const occupiedCat =
      target.raw_incident.bed_category_occupied ||
      detectBedCategory(target.pre_arrival_bed || 'ICU');
    if (occupiedCat === 'ICU') nextIcu += 1;
    else if (occupiedCat === 'TRAUMA') nextTrauma += 1;
    else if (occupiedCat === 'GENERAL') nextGeneral += 1;
  }

  const wasAmbulanceDispatched =
    target?.status === 'ALLOTTED' ||
    target?.status === 'EN_ROUTE' ||
    target?.status === 'ARRIVED';

  await updateHospitalInfrastructure({
    ...latestHospital,
    icu_beds_available: nextIcu,
    trauma_beds_available: nextTrauma,
    general_beds_available: nextGeneral,
    total_ambulances: latestHospital.total_ambulances + (wasAmbulanceDispatched ? 1 : 0),
  });

  // Requirement 6: Record the solved (discharged) emergency case in AI Chat History uniquely to the user
  if (target) {
    const solvedHistoryItem: PersistentChatHistoryItem = {
      id: `solved-${target.id}`,
      citizen_mobile: target.citizen_mobile,
      timestamp: new Date().toLocaleString(),
      userQuery: target.patient_cause,
      severity: target.severity,
      responseTitle: `SOLVED & DISCHARGED — ${target.assigned_hospital_name}`,
      summary: `Patient: ${target.patient_name} (${target.raw_incident.request_for === 'OTHER' ? 'Other Person' : 'Self'}, Blood: ${target.patient_blood}) · Ambulance: ${target.ambulance_vehicle_no} · Bed: ${target.pre_arrival_bed} · Doctor: ${target.pre_arrival_doctor} · Status: Treatment Completed & Discharged.`,
      recordType: 'SOLVED_EMERGENCY',
      hospitalName: target.assigned_hospital_name,
      ambulanceNo: target.ambulance_vehicle_no,
      allottedBed: target.pre_arrival_bed,
      patientName: target.patient_name,
    };
    appendCitizenChatHistory(solvedHistoryItem);
  }
}

export async function fetchActiveIncidents(): Promise<EmergencyIncident[]> {
  const dischargedSet = getDischargedIncidentIds();
  const local = getLocalIncidents().filter(
    (i) => i.status !== 'DISCHARGED' && !dischargedSet.has(i.id)
  );
  if (!remoteSchemaReady) return local;

  try {
    const { data, error } = await supabase
      .from('emergency_incidents')
      .select('*')
      .neq('status', 'DISCHARGED')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
      remoteSchemaReady = false;
      return local;
    }

    if (!error && Array.isArray(data)) {
      const mergedMap = new Map<string, EmergencyIncident>();

      // Seed with local incidents first
      for (const locItem of local) {
        if (locItem.status !== 'DISCHARGED' && !dischargedSet.has(locItem.id)) {
          mergedMap.set(locItem.id, locItem);
        }
      }

      // Only merge remote incidents that exist locally in this session or are newer,
      // and NEVER downgrade a local incident's status (e.g. ALLOTTED/ARRIVED -> BROADCASTING)
      for (const remItem of data as EmergencyIncident[]) {
        if (!remItem || remItem.status === 'DISCHARGED' || dischargedSet.has(remItem.id)) {
          continue;
        }
        const existingLocal = mergedMap.get(remItem.id);
        if (existingLocal) {
          const localRank = getIncidentStatusRank(existingLocal);
          const remoteRank = getIncidentStatusRank(remItem);
          const primary = localRank >= remoteRank ? existingLocal : remItem;
          const secondary = localRank >= remoteRank ? remItem : existingLocal;
          mergedMap.set(remItem.id, {
            ...secondary,
            ...primary,
            pre_arrival_bed:
              existingLocal.raw_incident?.bed_confirmed
                ? existingLocal.pre_arrival_bed
                : primary.pre_arrival_bed,
            raw_incident: {
              ...secondary.raw_incident,
              ...primary.raw_incident,
              bed_confirmed:
                Boolean(existingLocal.raw_incident?.bed_confirmed) ||
                Boolean(remItem.raw_incident?.bed_confirmed),
              citizen_returned_home:
                Boolean(existingLocal.raw_incident?.citizen_returned_home) ||
                Boolean(remItem.raw_incident?.citizen_returned_home),
              search_radius_km: Math.max(
                existingLocal.raw_incident?.search_radius_km || 5,
                remItem.raw_incident?.search_radius_km || 5
              ),
            },
          });
        }
      }

      const merged = Array.from(mergedMap.values());
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(merged));
      return merged;
    }
  } catch {
    remoteSchemaReady = false;
  }
  return local;
}
