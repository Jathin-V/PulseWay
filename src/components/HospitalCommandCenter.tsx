import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  BedDouble,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  HeartPulse,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  PhoneCall,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Wind,
} from 'lucide-react';
import {
  acceptBroadcastIncident,
  allotBedForIncident,
  authenticateHospital,
  DEFAULT_HOSPITALS,
  dischargeIncidentAndReleaseBed,
  updateHospitalInfrastructure,
  type EmergencyIncident,
  type HospitalAccount,
} from '../utils/supabase';
import { calculateHaversineDistanceKm, type LanguageCode } from '../utils/clinicalLogic';
import { LiveMap } from './LiveMap';

interface HospitalCommandCenterProps {
  hospital: HospitalAccount | null;
  onHospitalChange: (hospital: HospitalAccount | null) => void;
  incidents: EmergencyIncident[];
  onIncidentsChange: () => void;
}

const HOSP_TRANSLATIONS: Record<
  LanguageCode,
  {
    headerTitle: string;
    dashboardTab: string;
    settingsTab: string;
    logoutBtn: string;
    loginBtn: string;
    activeAlerts: string;
    ambulancesReady: string;
    bedsAvailable: string;
    avgResponseTime: string;
    liveFeedTitle: string;
    capacityTitle: string;
    allotAmbulanceBtn: string;
    allotBedBtn: string;
    callPatientBtn: string;
    confirmDischargeBtn: string;
    noEmergenciesTitle: string;
    noEmergenciesSub: string;
  }
> = {
  en: {
    headerTitle: 'Hospital Emergency Command Center',
    dashboardTab: 'Dashboard',
    settingsTab: 'Settings',
    logoutBtn: 'Logout',
    loginBtn: 'Login',
    activeAlerts: 'Active Alerts',
    ambulancesReady: 'Ambulances Ready',
    bedsAvailable: 'Beds Available',
    avgResponseTime: 'Average Response Time',
    liveFeedTitle: 'Emergency Live Feed',
    capacityTitle: 'Current Hospital Capacity',
    allotAmbulanceBtn: 'Allot Ambulance Now',
    allotBedBtn: 'Allot Bed',
    callPatientBtn: 'Call Patient',
    confirmDischargeBtn: 'Confirm Treatment Done & Discharge',
    noEmergenciesTitle: 'No Active Emergency Requests',
    noEmergenciesSub:
      'Real-time dispatch feed is armed. Incoming citizen ambulance requests will appear here immediately for ambulance and bed allotment.',
  },
  kn: {
    headerTitle: 'Hospital Emergency Command Center',
    dashboardTab: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ (Dashboard)',
    settingsTab: 'ಸೆಟ್ಟಿಂಗ್ಸ್ (Settings)',
    logoutBtn: 'ಲಾಗ್ ಔಟ್ (Logout)',
    loginBtn: 'ಲಾಗಿನ್ (Login)',
    activeAlerts: 'ಸಕ್ರಿಯ ತುರ್ತು ಕರೆಗಳು (Active Alerts)',
    ambulancesReady: 'ಸಿದ್ಧವಿರುವ ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗಳು',
    bedsAvailable: 'ಲಭ್ಯವಿರುವ ಒಟ್ಟು ಬೆಡ್‌ಗಳು',
    avgResponseTime: 'ಸರಾಸರಿ ಪ್ರತಿಕ್ರಿಯೆ ಸಮಯ',
    liveFeedTitle: 'ತುರ್ತು ನೇರ ಪ್ರಸಾರ (Emergency Live Feed)',
    capacityTitle: 'ಆಸ್ಪತ್ರೆಯ ಪ್ರಸ್ತುತ ಸಾಮರ್ಥ್ಯ (Current Capacity)',
    allotAmbulanceBtn: 'ಆಂಬ್ಯುಲೆನ್ಸ್ ನಿಯೋಜಿಸಿ (Allot Ambulance)',
    allotBedBtn: 'ಬೆಡ್ ನಿಯೋಜಿಸಿ (Allot Bed)',
    callPatientBtn: 'ರೋಗಿಗೆ ಕರೆ ಮಾಡಿ',
    confirmDischargeBtn: 'ಚಿಕಿತ್ಸೆ ಪೂರ್ಣಗೊಂಡಿದೆ ಮತ್ತು ಡಿಸ್ಚಾರ್ಜ್ ಮಾಡಿ',
    noEmergenciesTitle: 'ಪ್ರಸ್ತುತ ಯಾವುದೇ ತುರ್ತು ಕರೆಗಳಿಲ್ಲ',
    noEmergenciesSub:
      'ನಾಗರಿಕ ಆಪ್‌ನಿಂದ ಆಂಬ್ಯುಲೆನ್ಸ್ ವಿನಂತಿ ಬಂದ ತಕ್ಷಣ ಇಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತದೆ.',
  },
  hi: {
    headerTitle: 'Hospital Emergency Command Center',
    dashboardTab: 'डैशबोर्ड (Dashboard)',
    settingsTab: 'सेटिंग्स (Settings)',
    logoutBtn: 'लॉग आउट (Logout)',
    loginBtn: 'लॉगिन (Login)',
    activeAlerts: 'सक्रिय अलर्ट (Active Alerts)',
    ambulancesReady: 'तैयार एम्बुलेंस (Ambulances Ready)',
    bedsAvailable: 'उपलब्ध बेड (Beds Available)',
    avgResponseTime: 'औसत प्रतिक्रिया समय',
    liveFeedTitle: 'इमरजेंसी लाइव फीड (Emergency Live Feed)',
    capacityTitle: 'अस्पताल की वर्तमान क्षमता (Current Capacity)',
    allotAmbulanceBtn: 'एम्बुलेंस आवंटित करें (Allot Ambulance)',
    allotBedBtn: 'बेड आवंटित करें (Allot Bed)',
    callPatientBtn: 'मरीज को कॉल करें',
    confirmDischargeBtn: 'उपचार पूर्ण एवं डिस्चार्ज की पुष्टि करें',
    noEmergenciesTitle: 'कोई सक्रिय आपातकालीन अनुरोध नहीं',
    noEmergenciesSub:
      'नागरिक ऐप से एम्बुलेंस अनुरोध आते ही यहाँ तुरंत दिखाई देगा।',
  },
};

const AVAILABLE_BED_OPTIONS = [
  'ICU Bed #04 (Cardiac & Trauma Ready)',
  'Trauma Resuscitation Bay #01',
  'Maternal OBG-ICU Bed #02 (NICU Ready)',
  'Neuro-Stroke ICU Bed #03',
  'Respiratory MICU Bed #06 (Ventilator)',
  'General Emergency Ward Bed #14',
];

export const HospitalCommandCenter: React.FC<HospitalCommandCenterProps> = ({
  hospital,
  onHospitalChange,
  incidents,
  onIncidentsChange,
}) => {
  const [lang, setLang] = useState<LanguageCode>('en');
  const t = HOSP_TRANSLATIONS[lang];

  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SETTINGS'>('DASHBOARD');

  // Login Form State
  const [facilityName, setFacilityName] = useState('Manipal Super Specialty & Trauma Institute');
  const [hospitalCode, setHospitalCode] = useState('HOSP-BLR-8841');
  const [officerName, setOfficerName] = useState('Dr. Vikram Adiga, MS');
  const [email, setEmail] = useState('emergency.desk@manipalhospitals.com');
  const [passcode, setPasscode] = useState('Hospital@123');
  const [loginError, setLoginError] = useState('');

  // Per-incident Bed Selection State
  const [selectedBeds, setSelectedBeds] = useState<Record<string, string>>({});
  const [bedSavedNotice, setBedSavedNotice] = useState<string | null>(null);

  // Settings Capacity Form State
  const [capForm, setCapForm] = useState({
    icu_beds_available: hospital?.icu_beds_available ?? 6,
    general_beds_available: hospital?.general_beds_available ?? 42,
    trauma_beds_available: hospital?.trauma_beds_available ?? 11,
    ventilators_available: hospital?.ventilators_available ?? 14,
    medical_staff_available: hospital?.medical_staff_available ?? 38,
    total_ambulances: hospital?.total_ambulances ?? 8,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handlePresetAutofill = (preset: HospitalAccount) => {
    setFacilityName(preset.name);
    setHospitalCode(preset.hospital_code);
    setOfficerName(preset.officer_name);
    setEmail(preset.email);
    setPasscode('Hospital@123');
    setLoginError('');
  };

  const handleHospitalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const { hospital: matched, error } = await authenticateHospital(hospitalCode, passcode);
    if (error || !matched) {
      setLoginError(error || 'Authentication failed.');
      return;
    }
    const customized: HospitalAccount = {
      ...matched,
      name: facilityName.trim() || matched.name,
      officer_name: officerName.trim() || matched.officer_name,
      email: email.trim() || matched.email,
    };
    setCapForm({
      icu_beds_available: customized.icu_beds_available,
      general_beds_available: customized.general_beds_available,
      trauma_beds_available: customized.trauma_beds_available,
      ventilators_available: customized.ventilators_available,
      medical_staff_available: customized.medical_staff_available,
      total_ambulances: customized.total_ambulances,
    });
    onHospitalChange(customized);
    setActiveTab('DASHBOARD');
  };

  const handleAllotAmbulance = async (incidentId: string) => {
    if (!hospital) return;
    await acceptBroadcastIncident(incidentId, hospital);
    onIncidentsChange();
  };

  const handleAllotBed = async (incident: EmergencyIncident) => {
    if (!hospital) return;
    const chosenBed =
      selectedBeds[incident.id] ||
      (incident.pre_arrival_bed !== 'Pending Bed Allotment'
        ? incident.pre_arrival_bed
        : AVAILABLE_BED_OPTIONS[0]);
    await allotBedForIncident(incident.id, chosenBed, hospital.officer_name, hospital);
    setBedSavedNotice(incident.id);
    setTimeout(() => setBedSavedNotice(null), 2500);
    onIncidentsChange();
  };

  const handleDischarge = async (incidentId: string) => {
    if (!hospital) return;
    await dischargeIncidentAndReleaseBed(incidentId, hospital);
    onIncidentsChange();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital) return;
    const updated = await updateHospitalInfrastructure({
      ...hospital,
      icu_beds_available: Number(capForm.icu_beds_available),
      general_beds_available: Number(capForm.general_beds_available),
      trauma_beds_available: Number(capForm.trauma_beds_available),
      ventilators_available: Number(capForm.ventilators_available),
      medical_staff_available: Number(capForm.medical_staff_available),
      total_ambulances: Number(capForm.total_ambulances),
    });
    onHospitalChange(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  // ============================================================================
  // RENDER 1: CLEAN, PREMIUM HOSPITAL LOGIN PAGE (Requirement 10 & 11.1)
  // ============================================================================
  if (!hospital) {
    return (
      <div
        className="w-full bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col"
        data-testid="hospital-auth-screen"
      >
        {/* Header with Login Option when Logged Out (Requirement 11.1) */}
        <div className="px-6 py-4 bg-[#0A1120] text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-serif-display font-bold text-white">
                {t.headerTitle}
              </h1>
              <p className="text-xs text-slate-400">
                Institutional Clinical Gateway &amp; Fleet Dispatch Authentication
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 border border-white/15">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <select
                aria-label="Hospital Language"
                value={lang}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                className="text-xs font-semibold bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value="en" className="text-slate-900">
                  English
                </option>
                <option value="kn" className="text-slate-900">
                  ಕನ್ನಡ
                </option>
                <option value="hi" className="text-slate-900">
                  हिंदी
                </option>
              </select>
            </div>

            <span className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5" />
              {t.loginBtn}
            </span>
          </div>
        </div>

        {/* Clean, Minimal Hospital Portal Sign-In Card */}
        <div className="p-6 sm:p-8 max-w-2xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-blue-600 font-semibold">
                CLINICAL OPERATOR VERIFICATION
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif-display font-bold text-[#0A1120] mt-1">
                Hospital Emergency Portal
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Clinical Operations &amp; Fleet Dispatch Desk
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-[#0A1120] text-white text-xs font-mono font-semibold">
              Verified Access
            </span>
          </div>

          {/* Quick Institutional Presets */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Select Accredited Hospital Facility
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {DEFAULT_HOSPITALS.map((preset) => {
                const isSelected = hospitalCode === preset.hospital_code;
                return (
                  <button
                    key={preset.hospital_code}
                    type="button"
                    onClick={() => handlePresetAutofill(preset)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0A1120] text-white border-emerald-500 shadow-sm'
                        : 'bg-slate-50 text-[#0A1120] border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-mono font-bold text-emerald-500">
                        {preset.hospital_code}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {preset.governance === 'Government Hospital' ? 'Government' : 'Private'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold truncate mt-1">{preset.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleHospitalLogin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0A1120] mb-1.5">
                  Hospital Facility Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#0A1120] focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A1120] mb-1.5">
                  Hospital System ID / Code *
                </label>
                <input
                  type="text"
                  value={hospitalCode}
                  onChange={(e) => setHospitalCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-[#0A1120] focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A1120] mb-1.5">
                  Emergency In-Charge Officer *
                </label>
                <div className="relative">
                  <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#0A1120] focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A1120] mb-1.5">
                  Official Clinical Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#0A1120] focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0A1120] mb-1.5">
                Authentication Passcode *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#0A1120] focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
              <button
                type="button"
                onClick={() => handlePresetAutofill(DEFAULT_HOSPITALS[0])}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Autofill Verified Hospital Details
              </button>

              <button
                type="submit"
                className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors cursor-pointer"
              >
                Access Emergency Command Center →
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER 2: HOSPITAL EMERGENCY COMMAND CENTER DASHBOARD (Requirement 11)
  // ============================================================================
  const totalAvailableBeds =
    hospital.icu_beds_available +
    hospital.trauma_beds_available +
    hospital.general_beds_available;

  const capacityItems = [
    {
      label: 'ICU Beds',
      available: hospital.icu_beds_available,
      total: 12,
      icon: HeartPulse,
      color: 'bg-emerald-600',
    },
    {
      label: 'General Beds',
      available: hospital.general_beds_available,
      total: 60,
      icon: BedDouble,
      color: 'bg-blue-600',
    },
    {
      label: 'Trauma Beds',
      available: hospital.trauma_beds_available,
      total: 18,
      icon: Activity,
      color: 'bg-emerald-600',
    },
    {
      label: 'Ventilators',
      available: hospital.ventilators_available ?? 14,
      total: 20,
      icon: Wind,
      color: 'bg-blue-600',
    },
    {
      label: 'Available Medical Staff',
      available: hospital.medical_staff_available ?? 38,
      total: 45,
      icon: Users,
      color: 'bg-[#0A1120]',
    },
  ];

  return (
    <div
      className="w-full bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col"
      data-testid="hospital-command-console"
    >
      {/* 1. HEADER: Title "Hospital Emergency Command Center", Hospital Name, Dashboard, Settings, Change Language, Logout */}
      <div className="px-6 py-4 bg-[#0A1120] text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              {hospital.hospital_code} · {hospital.officer_name}
            </div>
            <h1 className="text-lg sm:text-xl font-serif-display font-bold text-white truncate">
              {t.headerTitle} — {hospital.name}
            </h1>
          </div>
        </div>

        {/* Header Navigation Options: Dashboard, Settings, Change Language, Logout */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'DASHBOARD'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
          >
            {t.dashboardTab}
          </button>

          <button
            type="button"
            onClick={() => {
              setCapForm({
                icu_beds_available: hospital.icu_beds_available,
                general_beds_available: hospital.general_beds_available,
                trauma_beds_available: hospital.trauma_beds_available,
                ventilators_available: hospital.ventilators_available ?? 14,
                medical_staff_available: hospital.medical_staff_available ?? 38,
                total_ambulances: hospital.total_ambulances,
              });
              setActiveTab('SETTINGS');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'SETTINGS'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t.settingsTab}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 border border-white/15">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <select
              aria-label="Change Hospital Language"
              value={lang}
              onChange={(e) => setLang(e.target.value as LanguageCode)}
              className="text-xs font-semibold bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="en" className="text-slate-900">
                English
              </option>
              <option value="kn" className="text-slate-900">
                ಕನ್ನಡ
              </option>
              <option value="hi" className="text-slate-900">
                हिंदी
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => onHospitalChange(null)}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.logoutBtn}</span>
          </button>
        </div>
      </div>

      {/* 2. EMERGENCY OVERVIEW: 4 Attractive Status Cards Below Header (Requirement 11.2) */}
      <div className="p-5 bg-[#F8FAFC] border-b border-slate-200">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Card 1: Active Alerts */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">{t.activeAlerts}</div>
              <div
                className={`text-2xl font-mono font-extrabold mt-1 ${
                  incidents.length > 0 ? 'text-rose-600' : 'text-[#0A1120]'
                }`}
              >
                {incidents.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Ongoing emergencies</div>
            </div>
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                incidents.length > 0
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Ambulances Ready */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">{t.ambulancesReady}</div>
              <div className="text-2xl font-mono font-extrabold text-emerald-700 mt-1">
                {hospital.total_ambulances}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">ALS units on standby</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Ambulance className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Beds Available */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">{t.bedsAvailable}</div>
              <div className="text-2xl font-mono font-extrabold text-[#0A1120] mt-1">
                {totalAvailableBeds}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                ICU ({hospital.icu_beds_available}) · Trauma ({hospital.trauma_beds_available})
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Average Response Time */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">{t.avgResponseTime}</div>
              <div className="text-2xl font-mono font-extrabold text-[#0A1120] mt-1">
                {hospital.avg_response_minutes ?? 4.2} <span className="text-xs font-normal">min</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Green Corridor Sync
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-[#0A1120] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN BODY: DASHBOARD VIEW vs SETTINGS VIEW */}
      {activeTab === 'SETTINGS' ? (
        <div className="p-6 max-w-2xl mx-auto w-full space-y-5">
          <div>
            <h2 className="text-xl font-serif-display font-bold text-[#0A1120]">
              2. Infrastructure &amp; Active Capacity Setup
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Update real-time ICU beds, trauma beds, general beds, ventilators, medical staff, and ALS ambulance fleet.
            </p>
          </div>

          {settingsSaved && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              Hospital capacity and fleet counters updated.
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ICU Beds Available
                </label>
                <input
                  type="number"
                  min={0}
                  value={capForm.icu_beds_available}
                  onChange={(e) =>
                    setCapForm({ ...capForm, icu_beds_available: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trauma Beds Available
                </label>
                <input
                  type="number"
                  min={0}
                  value={capForm.trauma_beds_available}
                  onChange={(e) =>
                    setCapForm({ ...capForm, trauma_beds_available: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  General Beds Available
                </label>
                <input
                  type="number"
                  min={0}
                  value={capForm.general_beds_available}
                  onChange={(e) =>
                    setCapForm({ ...capForm, general_beds_available: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ventilators Available
                </label>
                <input
                  type="number"
                  min={0}
                  value={capForm.ventilators_available}
                  onChange={(e) =>
                    setCapForm({ ...capForm, ventilators_available: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medical Staff On-Duty
                </label>
                <input
                  type="number"
                  min={1}
                  value={capForm.medical_staff_available}
                  onChange={(e) =>
                    setCapForm({ ...capForm, medical_staff_available: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ALS Ambulances Ready
                </label>
                <input
                  type="number"
                  min={0}
                  value={capForm.total_ambulances}
                  onChange={(e) =>
                    setCapForm({ ...capForm, total_ambulances: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('DASHBOARD')}
                className="px-5 py-2.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Back to Dashboard
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                Save Hospital Capacity
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-5 flex-1 overflow-y-auto">
          {/* Requirement 2: Emergency Live Feed and Current Hospital Capacity Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT 8 COLUMNS: 3. EMERGENCY LIVE FEED */}
            <div className="lg:col-span-8 space-y-3.5" data-testid="hospital-live-feed-column">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif-display font-bold text-[#0A1120]">
                    {t.liveFeedTitle}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Incoming citizen emergency requests, ambulance allotment, bed assignment, and live route tracking
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shrink-0">
                  Live Sync Active
                </span>
              </div>

              {incidents.length === 0 ? (
                <div
                  className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3"
                  data-testid="hospital-zero-cases-state"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-serif-display font-bold text-[#0A1120]">
                      {t.noEmergenciesTitle}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      {t.noEmergenciesSub}
                    </p>
                  </div>
                  <div className="max-w-lg mx-auto pt-2">
                    <LiveMap
                      patientLat={hospital.latitude}
                      patientLng={hospital.longitude}
                      patientLabel={`${hospital.name} Command Base`}
                      hospitalLat={hospital.latitude}
                      hospitalLng={hospital.longitude}
                      hospitalLabel={hospital.name}
                      isAmbulanceAllotted={false}
                      heightClass="h-44"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {incidents.map((inc) => {
                    const isCritical = inc.severity === 'CRITICAL';
                    const isAllotted =
                      inc.status === 'ALLOTTED' ||
                      inc.status === 'EN_ROUTE' ||
                      inc.status === 'ARRIVED';
                    const distanceKm = calculateHaversineDistanceKm(
                      hospital.latitude,
                      hospital.longitude,
                      inc.latitude,
                      inc.longitude
                    );
                    const reportedTime = new Date(inc.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <div
                        key={inc.id}
                        className={`rounded-2xl border p-4 space-y-3.5 transition-all ${
                          isCritical
                            ? 'bg-rose-50/30 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                        data-testid="hospital-incident-card"
                      >
                        {/* Top Row: Severity, Emergency Type, Reported Time, Status, Call Patient & Allot Ambulance */}
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                  isCritical
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {isCritical ? 'CRITICAL EMERGENCY' : 'NON-CRITICAL'}
                              </span>

                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                                  isAllotted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {inc.status === 'ARRIVED'
                                  ? `AMBULANCE REACHED (${inc.ambulance_vehicle_no})`
                                  : isAllotted
                                    ? `AMBULANCE ALLOTTED (${inc.ambulance_vehicle_no})`
                                    : 'AWAITING HOSPITAL AMBULANCE ALLOTMENT'}
                              </span>

                              {inc.raw_incident.request_for === 'OTHER' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                                  FOR OTHER PERSON (REPORTED BY{' '}
                                  {inc.raw_incident.reported_by_name || 'CITIZEN'})
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                                  FOR SELF (CITIZEN)
                                </span>
                              )}

                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-[#0A1120]">
                                Radius: {inc.raw_incident.search_radius_km || 5} km
                              </span>

                              {inc.raw_incident.is_demo && (
                                <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[10px] font-bold">
                                  DEMO
                                </span>
                              )}

                              <span className="text-[11px] font-mono text-slate-500">
                                Reported: {reportedTime}
                              </span>
                            </div>

                            <h3 className="text-base font-serif-display font-bold text-[#0A1120]">
                              {inc.patient_cause}
                            </h3>
                          </div>

                          {/* Action Buttons: Call Patient + Allot Ambulance (if not yet allotted) */}
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`tel:${inc.patient_phone}`}
                              className="px-3.5 py-2 rounded-full bg-[#0A1120] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                {t.callPatientBtn} ({inc.patient_phone})
                              </span>
                            </a>

                            {!isAllotted && (
                              <button
                                type="button"
                                onClick={() => handleAllotAmbulance(inc.id)}
                                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                <Ambulance className="w-4 h-4" />
                                <span>{t.allotAmbulanceBtn}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Middle Grid: Patient Medical Info & Location + Synchronized Live Ambulance Map */}
                        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-3.5 items-stretch">
                          {/* Left 6 Columns: Patient Medical Info, Location, and Bed Allotment */}
                          <div className="2xl:col-span-6 min-w-0 flex flex-col justify-between space-y-2.5">
                            {/* Patient Medical Info Card */}
                            <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                                  Patient Medical Profile (
                                  {inc.raw_incident.request_for === 'OTHER'
                                    ? 'Other Person'
                                    : 'Self'}
                                  )
                                </span>
                                <span className="text-[10px] font-mono text-emerald-700 font-bold">
                                  Driver: {inc.raw_incident.driver_name || 'Ramesh Gowda'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 text-xs">
                                <div>
                                  <span className="text-slate-500">Patient:</span>{' '}
                                  <strong className="text-[#0A1120]">{inc.patient_name}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-500">Gender:</span>{' '}
                                  <strong className="text-[#0A1120]">
                                    {inc.raw_incident.sex || 'Unknown'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500">Approx Age:</span>{' '}
                                  <strong className="text-[#0A1120]">
                                    {inc.raw_incident.approx_age_text || `${inc.patient_age} yrs`}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500">Blood Group:</span>{' '}
                                  <strong className="font-mono text-rose-600">
                                    {inc.patient_blood || 'Unknown'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500">Height:</span>{' '}
                                  <strong className="text-[#0A1120]">
                                    {inc.raw_incident.patient_height || '176 cm'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500">Allergies:</span>{' '}
                                  <strong className="text-[#0A1120]">
                                    {inc.raw_incident.allergies?.join(', ') || 'None'}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {/* Location Card */}
                            <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                                <span>Emergency Location</span>
                                <span className="text-emerald-700">{distanceKm} km away</span>
                              </div>
                              <div className="text-xs font-semibold text-[#0A1120] flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                <span>{inc.address}</span>
                              </div>
                            </div>

                            {/* Allot a Bed for the Particular Patient (Occupies bed in Current Hospital Capacity until Discharge) */}
                            <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <label
                                  htmlFor={`bed-select-${inc.id}`}
                                  className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold"
                                >
                                  Allot Hospital Bed for {inc.patient_name}
                                </label>
                                {inc.raw_incident.bed_confirmed && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    Occupied: {inc.pre_arrival_bed}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                                <select
                                  id={`bed-select-${inc.id}`}
                                  value={
                                    selectedBeds[inc.id] ||
                                    (inc.pre_arrival_bed !== 'Pending Bed Allotment'
                                      ? inc.pre_arrival_bed
                                      : AVAILABLE_BED_OPTIONS[0])
                                  }
                                  onChange={(e) =>
                                    setSelectedBeds({
                                      ...selectedBeds,
                                      [inc.id]: e.target.value,
                                    })
                                  }
                                  className="flex-1 min-w-0 w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#0A1120]"
                                >
                                  {AVAILABLE_BED_OPTIONS.map((bedOpt) => (
                                    <option key={bedOpt} value={bedOpt}>
                                      {bedOpt}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAllotBed(inc)}
                                  className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                                >
                                  {t.allotBedBtn}
                                </button>
                              </div>
                              {bedSavedNotice === inc.id && (
                                <div className="text-[11px] text-emerald-700 font-semibold">
                                  ✓ Bed occupied in Hospital Capacity &amp; synced to Citizen App.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right 6 Columns: Live Synchronized Road-Following Ambulance Tracking */}
                          <div className="2xl:col-span-6 min-w-0 flex flex-col justify-between space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#0A1120] flex items-center gap-1.5">
                                <Ambulance className="w-4 h-4 text-emerald-600" />
                                Live Ambulance Tracking
                              </span>
                              <span className="font-mono text-[11px] text-slate-500">
                                {isAllotted
                                  ? `Unit ${inc.ambulance_vehicle_no}`
                                  : 'Awaiting Allotment'}
                              </span>
                            </div>

                            <LiveMap
                              patientLat={inc.latitude}
                              patientLng={inc.longitude}
                              patientLabel={`Patient: ${inc.patient_name}`}
                              hospitalLat={hospital.latitude}
                              hospitalLng={hospital.longitude}
                              hospitalLabel={hospital.name}
                              ambulanceLabel={`ALS Unit ${inc.ambulance_vehicle_no}`}
                              isAmbulanceAllotted={isAllotted}
                              dispatchedAt={inc.raw_incident.dispatched_at}
                              heightClass="h-52"
                            />

                            {/* Bottom Row: Confirm Treatment Done & Discharge Button */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="text-[11px] text-slate-600">
                                Attending:{' '}
                                <strong className="text-[#0A1120]">
                                  {inc.pre_arrival_doctor.split('(')[0]}
                                </strong>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDischarge(inc.id)}
                                className="px-4 py-2 rounded-full bg-[#0A1120] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{t.confirmDischargeBtn}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT 4 COLUMNS: 4. CURRENT HOSPITAL CAPACITY (Side-by-Side with Emergency Live Feed) */}
            <div
              className="lg:col-span-4 p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3.5 sticky top-4"
              data-testid="hospital-capacity-column"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-serif-display font-bold text-[#0A1120]">
                    {t.capacityTitle}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Live resource availability &amp; active bed occupancy
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('SETTINGS')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline shrink-0 cursor-pointer"
                >
                  Update
                </button>
              </div>

              <div className="space-y-2.5">
                {capacityItems.map((item) => {
                  const IconComponent = item.icon;
                  const pct = Math.min(100, Math.round((item.available / item.total) * 100));
                  const occupied = Math.max(0, item.total - item.available);
                  return (
                    <div
                      key={item.label}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <IconComponent className="w-3.5 h-3.5 text-emerald-600" />
                          {item.label}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-slate-500">
                          Occupied: {occupied}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-mono font-extrabold text-[#0A1120]">
                          {item.available}{' '}
                          <span className="text-[11px] font-normal text-slate-500">available</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          / {item.total} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${item.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Occupied Beds List (Released only after Patient Discharge) */}
              {incidents.some((i) => i.raw_incident.bed_confirmed) && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-rose-700 font-bold">
                    Currently Occupied Patient Beds
                  </div>
                  {incidents
                    .filter((i) => i.raw_incident.bed_confirmed)
                    .map((i) => (
                      <div
                        key={i.id}
                        className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center justify-between gap-2"
                        data-testid="occupied-bed-badge"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#0A1120] truncate">
                            {i.pre_arrival_bed}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">
                            Patient: {i.patient_name} (Released on Discharge)
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-bold shrink-0">
                          OCCUPIED
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
