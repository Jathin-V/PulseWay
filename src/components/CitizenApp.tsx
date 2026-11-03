import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Ambulance,
  BedDouble,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  History,
  Home,
  Lock,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  PhoneCall,
  Pill,
  Radar,
  Send,
  Settings,
  ShieldAlert,
  Siren,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import {
  appendCitizenChatHistory,
  authenticateCitizen,
  createEmergencyIncident,
  DEFAULT_DEMO_CITIZEN,
  expandIncidentSearchRadius,
  getCitizenChatHistory,
  markAmbulanceReachedReturnHome,
  registerCitizen,
  syncCitizenChatHistoryFromSupabase,
  type CitizenAccount,
  type EmergencyIncident,
  type OtherPatientDetails,
  type PersistentChatHistoryItem,
} from '../utils/supabase';
import { evaluateEmergencyChat } from '../utils/gemini';
import type { LanguageCode, TriageEvaluation } from '../utils/clinicalLogic';
import {
  playPreRecordedCitizenAnnouncementOnce,
  SURVIVAL_PROTOCOLS,
  UI_TRANSLATIONS,
} from '../utils/translations';
import { LiveMap } from './LiveMap';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text?: string;
  evaluation?: TriageEvaluation;
  rawSymptoms?: string;
  timestamp: string;
}

type PopupStage = 'NONE' | 'WHO_FOR' | 'OTHER_DETAILS' | 'CONFIRM_1' | 'CONFIRM_2';

interface CitizenAppProps {
  citizen: CitizenAccount | null;
  onCitizenChange: (citizen: CitizenAccount | null) => void;
  liveGps: { lat: number; lng: number; accuracy: number; address: string };
  onRecalibrateGps: () => void;
  activeIncident: EmergencyIncident | null;
  onIncidentCreated: (incident: EmergencyIncident) => void;
}

export const CitizenApp: React.FC<CitizenAppProps> = ({
  citizen,
  onCitizenChange,
  liveGps,
  activeIncident,
  onIncidentCreated,
}) => {
  const [lang, setLang] = useState<LanguageCode>('en');
  const t = UI_TRANSLATIONS[lang];

  // Auth State
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // 4-Step Registration State
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1);
  const [regForm, setRegForm] = useState({
    full_name: '',
    mobile: '',
    email: '',
    password: '',
    dob: '1996-04-12',
    age: 29,
    sex: 'Female',
    blood_group: 'O+',
    height: '165 cm',
    weight: '62 kg',
    allergiesText: 'None',
    contact1Name: 'Mom',
    contact1Phone: '9845098765',
    contact2Name: 'Dad',
    contact2Phone: '9845054321',
    permanent_address: '',
    gps_consent_confirmed: false,
  });

  // Top-Left Hamburger Menu Drawer State
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [activeDrawerSection, setActiveDrawerSection] = useState<
    'NONE' | 'SURVIVAL' | 'HISTORY' | 'SETTINGS'
  >('NONE');

  // Survival Guide State (inside Hamburger Menu)
  const [survivalIndex, setSurvivalIndex] = useState(0);
  const [survivalMode, setSurvivalMode] = useState<'alone' | 'assisted'>('alone');

  // Immutable Chat History State (Not Deletable)
  const [chatHistoryList, setChatHistoryList] = useState<PersistentChatHistoryItem[]>([]);

  // Account Settings Edit State
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');

  // Minimal Multilingual AI Chat State
  const [selectedSuggestion, setSelectedSuggestion] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Multi-Stage Ambulance Request Popups:
  // WHO_FOR -> (OTHER_DETAILS if For Others) -> CONFIRM_1 -> CONFIRM_2
  const [popupStage, setPopupStage] = useState<PopupStage>('NONE');
  const [patientTargetMode, setPatientTargetMode] = useState<'SELF' | 'OTHER'>('SELF');
  const [otherPatientForm, setOtherPatientForm] = useState<{
    name: string;
    sex: string;
    approxAge: string;
    bloodGroup: string;
    height: string;
  }>({
    name: '',
    sex: 'Male',
    approxAge: '38',
    bloodGroup: 'Unknown',
    height: '170 cm',
  });

  const [pendingDispatchPayload, setPendingDispatchPayload] = useState<{
    cause: string;
    source: 'AI_CHAT' | 'SOLO_COMMUTE_DEMO';
    autoAllot: boolean;
  } | null>(null);

  // Demo Mode: Solo Commute Crash Detector & 60s Auto-Ambulance Timer at Top of Citizen App
  const [demoCommuteActive, setDemoCommuteActive] = useState(false);
  const [vehicleVelocityKmh, setVehicleVelocityKmh] = useState<number>(62);
  const [lastCruisingVelocityKmh, setLastCruisingVelocityKmh] = useState<number>(62);
  const [crashCountdownSec, setCrashCountdownSec] = useState<number>(60);
  const sirenCtxRef = useRef<AudioContext | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);
  const sirenTimerRef = useRef<number | null>(null);
  const autoDispatchTriggeredRef = useRef<boolean>(false);

  // Pre-recorded Voice Announcement Status (Played Strictly Once when Hospital Dispatches)
  const [voiceAnnouncedForId, setVoiceAnnouncedForId] = useState<string | null>(null);

  // 60-Second Hospital Response Timer & Auto +5km Radius Expansion State
  const [hospitalWaitSeconds, setHospitalWaitSeconds] = useState<number>(60);

  // Live ETA Countdown when Ambulance is Allotted
  const [etaRemainingSeconds, setEtaRemainingSeconds] = useState<number>(360);

  const myIncident =
    citizen && activeIncident && activeIncident.citizen_mobile === citizen.mobile
      ? activeIncident
      : null;

  // Play pre-recorded local audio file (/assets/reassurance_voice.wav)
  // EXCLUSIVELY in Citizen App, STRICTLY ONCE when hospital dispatches ambulance (status === 'ALLOTTED')
  useEffect(() => {
    if (
      citizen &&
      myIncident &&
      (myIncident.status === 'ALLOTTED' || myIncident.status === 'EN_ROUTE')
    ) {
      playPreRecordedCitizenAnnouncementOnce(myIncident.id);
      setVoiceAnnouncedForId(myIncident.id);
    }
  }, [citizen, myIncident?.id, myIncident?.status]);

  // 60-Second Countdown while Waiting for Hospital Response (status === 'BROADCASTING')
  // Automatically increases search radius by +5 km every 60 seconds if hospital has not responded
  useEffect(() => {
    if (!myIncident || myIncident.status !== 'BROADCASTING') {
      setHospitalWaitSeconds(60);
      return;
    }

    const interval = window.setInterval(() => {
      setHospitalWaitSeconds((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => {
            expandIncidentSearchRadius(myIncident.id);
          }, 0);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [myIncident?.id, myIncident?.status]);

  // Live ETA countdown when ambulance is allotted
  useEffect(() => {
    if (!myIncident || myIncident.status === 'BROADCASTING') {
      setEtaRemainingSeconds(360);
      return;
    }

    const updateEta = () => {
      const dispatchedAt = myIncident.raw_incident.dispatched_at || Date.now();
      const elapsedSec = Math.floor((Date.now() - dispatchedAt) / 1000);
      const totalSec = (myIncident.raw_incident.eta_minutes || 6) * 60;
      setEtaRemainingSeconds(Math.max(30, totalSec - elapsedSec));
    };

    updateEta();
    const timer = window.setInterval(updateEta, 1000);
    return () => window.clearInterval(timer);
  }, [myIncident?.id, myIncident?.status, myIncident?.raw_incident?.dispatched_at]);

  // Load immutable chat & solved emergency history when citizen logs in, opens History drawer, or when hospital discharges patient
  useEffect(() => {
    if (!citizen) {
      setChatHistoryList([]);
      return;
    }
    const refreshHistory = () => {
      setChatHistoryList(getCitizenChatHistory(citizen.mobile));
      syncCitizenChatHistoryFromSupabase(citizen.mobile).then((synced) => {
        setChatHistoryList(synced);
      });
    };
    refreshHistory();
    window.addEventListener('pulseway-sync', refreshHistory);
    return () => window.removeEventListener('pulseway-sync', refreshHistory);
  }, [citizen, activeDrawerSection, activeIncident?.status]);

  // Continuous 600-1000 Hz Emergency Siren for Solo Commute Demo Mode
  const startContinuousSiren = () => {
    stopContinuousSiren();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      sirenCtxRef.current = ctx;
      sirenOscRef.current = osc;

      let high = true;
      sirenTimerRef.current = window.setInterval(() => {
        if (!sirenOscRef.current || !sirenCtxRef.current) return;
        const now = sirenCtxRef.current.currentTime;
        sirenOscRef.current.frequency.linearRampToValueAtTime(
          high ? 1000 : 600,
          now + 0.45
        );
        high = !high;
      }, 480);
    } catch {
      // Ignore browser audio autoplay restrictions
    }
  };

  const stopContinuousSiren = () => {
    if (sirenTimerRef.current) {
      window.clearInterval(sirenTimerRef.current);
      sirenTimerRef.current = null;
    }
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
      } catch {
        // ignore
      }
      sirenOscRef.current = null;
    }
    if (sirenCtxRef.current) {
      try {
        sirenCtxRef.current.close();
      } catch {
        // ignore
      }
      sirenCtxRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopContinuousSiren();
  }, []);

  // Automatically request an ambulance when the 60-second Solo Commute Crash Timer reaches 0s without user response
  const triggerAutomaticCrashAmbulanceRequest = async () => {
    if (autoDispatchTriggeredRef.current) return;
    autoDispatchTriggeredRef.current = true;
    stopContinuousSiren();
    setDemoCommuteActive(false);
    setVehicleVelocityKmh(62);
    setCrashCountdownSec(60);

    const activeCitizen = citizen || DEFAULT_DEMO_CITIZEN;
    const patientOverride: OtherPatientDetails = {
      requestFor: 'SELF',
      name: activeCitizen.full_name,
      sex: activeCitizen.sex,
      approxAge: String(activeCitizen.age || 32),
      bloodGroup: activeCitizen.blood_group,
      height: activeCitizen.height || '176 cm',
    };

    const incident = await createEmergencyIncident({
      citizen: activeCitizen,
      emergencyCause: `AUTO CRASH DISPATCH: Sudden Velocity Drop (${lastCruisingVelocityKmh} km/h → 0 km/h · 8.4G Impact) — No User Response in 60s`,
      latitude: liveGps.lat,
      longitude: liveGps.lng,
      address: liveGps.address,
      source: 'SOLO_COMMUTE_DEMO',
      autoAllot: false,
      patientOverride,
    });
    setMessages([]);
    setSelectedSuggestion('');
    setHospitalWaitSeconds(60);
    onIncidentCreated(incident);
  };

  // 60-Second Solo Commute Crash Countdown Timer
  // When velocity drops suddenly to 0 km/h, counts down 60s -> 0s
  useEffect(() => {
    if (!demoCommuteActive) {
      setCrashCountdownSec(60);
      autoDispatchTriggeredRef.current = false;
      return;
    }

    const interval = window.setInterval(() => {
      setCrashCountdownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [demoCommuteActive]);

  // Trigger automatic ambulance request as soon as the 60-second crash timer hits 0
  useEffect(() => {
    if (demoCommuteActive && crashCountdownSec === 0) {
      triggerAutomaticCrashAmbulanceRequest();
    }
  }, [demoCommuteActive, crashCountdownSec]);

  const handleActivateDemoCommute = () => {
    const preCrashSpeed = vehicleVelocityKmh > 0 ? vehicleVelocityKmh : 62;
    setLastCruisingVelocityKmh(preCrashSpeed);
    setVehicleVelocityKmh(0);
    setCrashCountdownSec(60);
    autoDispatchTriggeredRef.current = false;
    setDemoCommuteActive(true);
    startContinuousSiren();
  };

  const handleVelocitySliderChange = (nextSpeed: number) => {
    // If vehicle was moving (>= 20 km/h) and velocity drops suddenly to 0 km/h -> Trigger Crash Detector & 60s Timer!
    if (vehicleVelocityKmh >= 20 && nextSpeed === 0) {
      setLastCruisingVelocityKmh(vehicleVelocityKmh);
      setVehicleVelocityKmh(0);
      setCrashCountdownSec(60);
      autoDispatchTriggeredRef.current = false;
      setDemoCommuteActive(true);
      startContinuousSiren();
      return;
    }
    setVehicleVelocityKmh(nextSpeed);
    if (nextSpeed > 0) {
      setLastCruisingVelocityKmh(nextSpeed);
    }
  };

  const handleStopDemoCommute = () => {
    setDemoCommuteActive(false);
    setVehicleVelocityKmh(62);
    setCrashCountdownSec(60);
    autoDispatchTriggeredRef.current = false;
    stopContinuousSiren();
  };

  // Start Popup Flow:
  // Step 0A: Ask if ambulance is For Myself (Self) or For Others
  const initiateAmbulanceConfirmationFlow = (
    cause: string,
    source: 'AI_CHAT' | 'SOLO_COMMUTE_DEMO',
    autoAllot: boolean
  ) => {
    setPendingDispatchPayload({ cause, source, autoAllot });
    setPatientTargetMode('SELF');
    setPopupStage('WHO_FOR');
  };

  const handleSelectForSelf = () => {
    setPatientTargetMode('SELF');
    setPopupStage('CONFIRM_1');
  };

  const handleSelectForOther = () => {
    setPatientTargetMode('OTHER');
    setPopupStage('OTHER_DETAILS');
  };

  const handleOtherDetailsContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setPopupStage('CONFIRM_1');
  };

  const handleConfirmStep1Yes = () => {
    setPopupStage('CONFIRM_2');
  };

  const handleConfirmStep2Yes = async () => {
    if (!pendingDispatchPayload) return;
    setPopupStage('NONE');
    stopContinuousSiren();
    setDemoCommuteActive(false);

    const activeCitizen = citizen || DEFAULT_DEMO_CITIZEN;
    const patientOverride: OtherPatientDetails =
      patientTargetMode === 'OTHER'
        ? {
            requestFor: 'OTHER',
            name: otherPatientForm.name.trim() || undefined,
            sex: otherPatientForm.sex || 'Unknown',
            approxAge: otherPatientForm.approxAge.trim() || 'Unknown',
            bloodGroup: otherPatientForm.bloodGroup || 'Unknown',
            height: otherPatientForm.height.trim() || 'Unknown',
          }
        : {
            requestFor: 'SELF',
            name: activeCitizen.full_name,
            sex: activeCitizen.sex,
            approxAge: String(activeCitizen.age || 32),
            bloodGroup: activeCitizen.blood_group,
            height: activeCitizen.height || '176 cm',
          };

    const incident = await createEmergencyIncident({
      citizen: activeCitizen,
      emergencyCause: pendingDispatchPayload.cause,
      latitude: liveGps.lat,
      longitude: liveGps.lng,
      address: liveGps.address,
      source: pendingDispatchPayload.source,
      autoAllot: pendingDispatchPayload.autoAllot,
      patientOverride,
    });
    setPendingDispatchPayload(null);
    setMessages([]);
    setSelectedSuggestion('');
    setHospitalWaitSeconds(60);
    onIncidentCreated(incident);
  };

  const handleCancelConfirmation = () => {
    setPopupStage('NONE');
    setPendingDispatchPayload(null);
  };

  const handleManualExpandRadius = async () => {
    if (!myIncident) return;
    await expandIncidentSearchRadius(myIncident.id);
    setHospitalWaitSeconds(60);
  };

  const handleDemoAutofill = () => {
    setLoginMobile('9845012345');
    setLoginPassword('User@123');
    setAuthError('');
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const cleaned = loginMobile.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!loginPassword.trim()) {
      setAuthError('Please enter your password.');
      return;
    }

    setAuthLoading(true);
    const { account, error } = await authenticateCitizen(cleaned, loginPassword);
    setAuthLoading(false);

    if (error || !account) {
      setAuthError(error || 'Authentication failed.');
      return;
    }
    setMessages([]);
    onCitizenChange(account);
  };

  const handleRegisterNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (regStep === 1) {
      if (
        !regForm.full_name.trim() ||
        regForm.mobile.replace(/\D/g, '').length !== 10 ||
        !regForm.password.trim()
      ) {
        setAuthError('Please complete Full Name, 10-digit Mobile Number, and Password.');
        return;
      }
      setRegStep(2);
      return;
    }
    if (regStep === 2) {
      setRegStep(3);
      return;
    }
    if (regStep === 3) {
      if (!regForm.contact1Name.trim() || !regForm.contact1Phone.trim()) {
        setAuthError('Please provide at least 1 emergency SOS contact.');
        return;
      }
      setRegStep(4);
      return;
    }

    if (!regForm.permanent_address.trim()) {
      setAuthError('Please enter your residential address.');
      return;
    }
    if (!regForm.gps_consent_confirmed) {
      setAuthError('Please confirm emergency location consent.');
      return;
    }

    setAuthLoading(true);
    const newCitizen: CitizenAccount = {
      mobile: regForm.mobile.replace(/\D/g, '').slice(-10),
      email: regForm.email || `${regForm.mobile}@pulseway.in`,
      password: regForm.password,
      full_name: regForm.full_name.trim(),
      dob: regForm.dob,
      age: Number(regForm.age) || 29,
      sex: regForm.sex,
      height: regForm.height,
      weight: regForm.weight,
      blood_group: regForm.blood_group,
      allergies: regForm.allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      emergency_contacts: [
        { name: regForm.contact1Name, relation: 'SOS Contact 1', phone: regForm.contact1Phone },
        {
          name: regForm.contact2Name || 'Dad',
          relation: 'SOS Contact 2',
          phone: regForm.contact2Phone || '9845054321',
        },
      ],
      permanent_address: regForm.permanent_address.trim(),
      gps_consent_confirmed: true,
    };

    const { account } = await registerCitizen(newCitizen);
    setAuthLoading(false);
    setMessages([]);
    onCitizenChange(account);
  };

  const handleSendChatMessage = async (textOverride?: string) => {
    const promptText = (textOverride ?? chatInput).trim();
    if (!promptText || isEvaluating) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: promptText,
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setSelectedSuggestion('');
    setIsEvaluating(true);

    const evaluation = await evaluateEmergencyChat(promptText, lang, {
      name: citizen?.full_name,
      age: citizen?.age,
      blood_group: citizen?.blood_group,
    });

    const aiMsg: ChatMessage = {
      id: `msg-${Date.now()}-ai`,
      sender: 'ai',
      evaluation,
      rawSymptoms: promptText,
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsEvaluating(false);

    // Save to Non-Deletable AI Chat History
    if (citizen) {
      const historyItem: PersistentChatHistoryItem = {
        id: `hist-${Date.now()}`,
        citizen_mobile: citizen.mobile,
        timestamp: new Date().toLocaleString(),
        userQuery: promptText,
        severity: evaluation.severity,
        responseTitle: evaluation.responseTitle,
        summary: evaluation.clinicalSummary,
      };
      appendCitizenChatHistory(historyItem);
      setChatHistoryList(getCitizenChatHistory(citizen.mobile));
    }
  };

  // ============================================================================
  // RENDER 1: MOBILE CITIZEN AUTHENTICATION SCREEN
  // ============================================================================
  if (!citizen) {
    return (
      <div
        className="w-full max-w-[420px] mx-auto bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col min-h-[720px]"
        data-testid="citizen-auth-screen"
      >
        {/* Mobile App Dark Navy Header */}
        <div className="px-5 py-4 bg-[#0A1120] text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
              CITIZEN MOBILE PORTAL
            </div>
            <h2 className="text-lg font-serif-display font-bold text-white leading-tight mt-0.5">
              {t.citizenPortalTitle}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 border border-white/15">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <select
              aria-label="Citizen App Language"
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
        </div>

        {/* Legal Warning Banner Below Header */}
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] font-medium text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{t.falseReportWarning}</span>
        </div>

        {/* Auth Mode Switcher */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setAuthTab('signin');
                setAuthError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                authTab === 'signin'
                  ? 'bg-[#0A1120] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Citizen Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setAuthError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                authTab === 'register'
                  ? 'bg-[#0A1120] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              New Registration
            </button>
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {authError}
            </div>
          )}

          {authTab === 'signin' ? (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <h3 className="text-xl font-serif-display font-bold text-[#0A1120]">
                  Citizen Emergency Access
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sign in with your registered 10-digit mobile number
                </p>
              </div>

              <div>
                <label
                  htmlFor="citizen-mobile-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Registered Mobile Number *
                </label>
                <input
                  id="citizen-mobile-input"
                  type="tel"
                  maxLength={10}
                  value={loginMobile}
                  onChange={(e) => setLoginMobile(e.target.value)}
                  placeholder="9845012345"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-[#0A1120] focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="citizen-password-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Authentication Passcode *
                </label>
                <input
                  id="citizen-password-input"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#0A1120] focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleDemoAutofill}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Autofill Demo Citizen
                </button>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors cursor-pointer"
              >
                {authLoading ? 'Signing In...' : 'Sign In to Citizen App →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterNext} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0A1120]">
                  Registration Step {regStep} of 4
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0A1120] text-white text-[11px] font-mono">
                  Step {regStep}/4
                </span>
              </div>

              {regStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={regForm.full_name}
                      onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                      placeholder="Arjun Kumar"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        10-Digit Mobile *
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={regForm.mobile}
                        onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                        placeholder="9845011122"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Passcode *
                      </label>
                      <input
                        type="password"
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        placeholder="••••••"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                      <input
                        type="number"
                        value={regForm.age}
                        onChange={(e) => setRegForm({ ...regForm, age: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sex</label>
                      <select
                        value={regForm.sex}
                        onChange={(e) => setRegForm({ ...regForm, sex: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {regStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Blood Group *
                    </label>
                    <select
                      value={regForm.blood_group}
                      onChange={(e) => setRegForm({ ...regForm, blood_group: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Allergies / Medical Notes
                    </label>
                    <input
                      type="text"
                      value={regForm.allergiesText}
                      onChange={(e) => setRegForm({ ...regForm, allergiesText: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              )}

              {regStep === 3 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Contact 1 Name &amp; Phone
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={regForm.contact1Name}
                        onChange={(e) => setRegForm({ ...regForm, contact1Name: e.target.value })}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      />
                      <input
                        type="tel"
                        value={regForm.contact1Phone}
                        onChange={(e) => setRegForm({ ...regForm, contact1Phone: e.target.value })}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {regStep === 4 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Residential Address *
                    </label>
                    <textarea
                      rows={2}
                      value={regForm.permanent_address}
                      onChange={(e) =>
                        setRegForm({ ...regForm, permanent_address: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.gps_consent_confirmed}
                      onChange={(e) =>
                        setRegForm({ ...regForm, gps_consent_confirmed: e.target.checked })
                      }
                      className="mt-0.5"
                    />
                    <span>I consent to sharing live location during emergency ambulance requests.</span>
                  </label>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                {regStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setRegStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
                    className="px-4 py-2.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer"
                >
                  {regStep < 4 ? 'Continue →' : 'Complete Registration →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER 2: AUTHENTICATED MOBILE CITIZEN APPLICATION
  // ============================================================================
  const currentProtocol = SURVIVAL_PROTOCOLS[survivalIndex] || SURVIVAL_PROTOCOLS[0];
  const protocolSteps =
    survivalMode === 'alone'
      ? currentProtocol.aloneSteps[lang]
      : currentProtocol.assistedSteps[lang];

  const etaMinutes = Math.floor(etaRemainingSeconds / 60);
  const etaSeconds = etaRemainingSeconds % 60;
  const currentRadiusKm = myIncident?.raw_incident.search_radius_km || 5;
  const isBedConfirmed = myIncident?.raw_incident.bed_confirmed === true;

  return (
    <div
      className="w-full max-w-[420px] mx-auto bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col min-h-[740px] relative"
      data-testid="citizen-main-screen"
    >
      {/* 1. MOBILE HEADER WITH TOP-LEFT HAMBURGER MENU & LANGUAGE SELECTOR */}
      <div className="px-4 py-3.5 bg-[#0A1120] text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setHamburgerOpen(true);
              if (activeDrawerSection === 'NONE') setActiveDrawerSection('SURVIVAL');
            }}
            aria-label="Open Navigation Menu"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs font-bold text-white leading-tight">
              {t.citizenPortalTitle}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium">
              {citizen.full_name} · Blood {citizen.blood_group}
            </div>
          </div>
        </div>

        {/* Multilingual Selector */}
        <div className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1 border border-white/15">
          <Globe className="w-3 h-3 text-emerald-400" />
          <select
            aria-label="Select Citizen Language"
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
      </div>

      {/* 2. SMALL LEGAL WARNING BELOW HEADER */}
      <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 text-[11px] font-medium text-amber-900 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
        <span>{t.falseReportWarning}</span>
      </div>

      {/* 3. SOLO COMMUTE CRASH MONITOR (LIVE VELOCITY TELEMETRY + SUDDEN 0 KM/H DROP + 60S AUTO-DISPATCH TIMER) */}
      <div
        className="px-3.5 py-2.5 bg-slate-900 text-white border-b border-slate-800"
        data-testid="solo-commute-crash-monitor"
      >
        {!demoCommuteActive ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold shrink-0">
                  CRASH DETECTOR
                </span>
                <span className="text-xs font-medium text-slate-200 truncate">
                  Solo Commute Crash Monitor
                </span>
              </div>
              <div
                className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-emerald-400 shrink-0"
                data-testid="commute-live-velocity"
              >
                Velocity: {vehicleVelocityKmh} km/h · 1.0G
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex-1 flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
                <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                  Speed:
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={vehicleVelocityKmh}
                  aria-label="Vehicle Velocity km/h"
                  data-testid="commute-velocity-slider"
                  onChange={(e) => handleVelocitySliderChange(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5"
                />
                <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap">
                  0 km/h = Crash
                </span>
              </div>

              <button
                type="button"
                onClick={handleActivateDemoCommute}
                data-testid="simulate-sudden-crash-btn"
                className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Drop to 0 km/h (Crash)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-0.5" data-testid="demo-commute-active-box">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <Siren className="w-4 h-4 shrink-0 animate-bounce" />
                <span>
                  CRASH DETECTED: {lastCruisingVelocityKmh} km/h → 0 km/h (8.4G Impact)
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[11px] font-extrabold shrink-0"
                data-testid="crash-countdown-timer"
              >
                {crashCountdownSec}s left
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              Sudden velocity drop to <strong>0 km/h</strong> detected! If you do not respond within{' '}
              <strong className="text-amber-300 font-mono">{crashCountdownSec}s</strong>, an
              ambulance request will be sent <strong>automatically</strong> to the nearest hospital.
            </p>

            {/* 60-Second Countdown Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${Math.max(0, (crashCountdownSec / 60) * 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleStopDemoCommute}
                data-testid="crash-cancel-btn"
                className="py-1.5 px-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-[11px] cursor-pointer"
              >
                I Am Safe (Cancel)
              </button>
              <button
                type="button"
                onClick={() => setCrashCountdownSec(2)}
                data-testid="crash-fast-forward-btn"
                className="py-1.5 px-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-mono font-bold text-[11px] cursor-pointer"
              >
                Skip to 2s (Test)
              </button>
              <button
                type="button"
                onClick={triggerAutomaticCrashAmbulanceRequest}
                data-testid="crash-dispatch-now-btn"
                className="py-1.5 px-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
              >
                Dispatch Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN MOBILE SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#F8FAFC]">
        {/* ACTIVE INCIDENT STATUS: WAITING FOR HOSPITAL APPROVAL vs AMBULANCE ALLOTTED */}
        {myIncident && !myIncident.raw_incident.citizen_returned_home ? (
          <div
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
            data-testid="citizen-active-dispatch-panel"
          >
            {myIncident.status === 'BROADCASTING' ? (
              /* Requirement 3: Until Hospital Dashboard allots ambulance, show Waiting for Nearest Hospital's Approval/Allotment */
              <div className="space-y-3" data-testid="citizen-waiting-hospital-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5">
                    <Radar className="w-3.5 h-3.5 text-amber-600" />
                    WAITING FOR HOSPITAL&apos;S APPROVAL
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#0A1120] bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Radius: {currentRadiusKm} km
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#0A1120]">
                    Waiting for Nearest Hospital ({myIncident.assigned_hospital_name}) Approval &amp; Ambulance Allotment
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                    Patient ({myIncident.patient_name}) medical profile &amp; live coordinates have been transmitted. The ambulance will be dispatched only when the hospital allots a unit. If no hospital responds within{' '}
                    <strong className="font-mono text-rose-600">{hospitalWaitSeconds}s</strong>, search radius automatically expands by <strong>+5 km</strong> (next: {currentRadiusKm + 5} km).
                  </p>
                </div>

                {/* 60-Second Countdown Progress Bar & Radius Status */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">
                      Current Hospital Search Ring: <strong>{currentRadiusKm} km</strong>
                    </span>
                    <span className="font-mono font-bold text-amber-700">
                      Next +5 km expansion in {hospitalWaitSeconds}s
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${Math.round((hospitalWaitSeconds / 60) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-slate-500">
                      For: {myIncident.raw_incident.request_for === 'OTHER' ? 'Other Person' : 'Self'} · Blood {myIncident.patient_blood}
                    </span>
                    <button
                      type="button"
                      onClick={handleManualExpandRadius}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      Simulate 60s Timeout (+5 km)
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Location sent: {myIncident.address}</span>
                </div>
              </div>
            ) : (
              /* Hospital has Allotted Ambulance -> Complete Post-Allotment Citizen Page (Hides Emergency Chat) */
              <div className="space-y-3" data-testid="citizen-allotted-tracking-card">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    {myIncident.raw_incident.is_demo && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">
                        DEMO
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold">
                      AMBULANCE ALLOTTED &amp; EN ROUTE
                    </span>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-emerald-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ETA: {etaMinutes}m {String(etaSeconds).padStart(2, '0')}s
                  </span>
                </div>

                {/* 1. Automated Voice Played Once Indicator */}
                {voiceAnnouncedForId === myIncident.id && (
                  <div
                    className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2 font-medium"
                    data-testid="citizen-voice-once-badge"
                  >
                    <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Automated Voice Announcement Played (1x): Ambulance dispatched &amp; en route.
                    </span>
                  </div>
                )}

                {/* 2. Live Ambulance Tracking Map */}
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold flex items-center justify-between">
                    <span>Live Ambulance Tracking Map</span>
                    <span className="text-emerald-700">Synchronized Route</span>
                  </div>
                  <LiveMap
                    patientLat={myIncident.latitude}
                    patientLng={myIncident.longitude}
                    patientLabel={`${myIncident.patient_name} (Emergency Location)`}
                    hospitalLat={myIncident.raw_incident.hospital_lat ?? 12.9592}
                    hospitalLng={myIncident.raw_incident.hospital_lng ?? 77.6476}
                    hospitalLabel={myIncident.assigned_hospital_name}
                    ambulanceLabel={`ALS Unit ${myIncident.ambulance_vehicle_no}`}
                    isAmbulanceAllotted={true}
                    dispatchedAt={myIncident.raw_incident.dispatched_at}
                    heightClass="h-48"
                  />
                </div>

                {/* 3. Structured Dispatch Details Grid:
                    - Estimated Time to Reach
                    - Ambulance Number
                    - Driver's Name
                    - Hospital Appointed
                    - Bed Allotted (Yes / No) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      Estimated Time (ETA)
                    </div>
                    <div className="font-mono font-bold text-[#0A1120] mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {etaMinutes} min {String(etaSeconds).padStart(2, '0')} sec
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      Ambulance Number
                    </div>
                    <div className="font-mono font-bold text-[#0A1120] mt-0.5 flex items-center gap-1">
                      <Ambulance className="w-3.5 h-3.5 text-rose-600" />
                      <span>{myIncident.ambulance_vehicle_no}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      Driver&apos;s Name
                    </div>
                    <div className="font-bold text-[#0A1120] mt-0.5 flex items-center justify-between gap-1">
                      <span className="truncate">
                        {myIncident.raw_incident.driver_name || 'Ramesh Gowda'}
                      </span>
                      <a
                        href={`tel:${myIncident.raw_incident.driver_phone || '+919845110801'}`}
                        className="text-emerald-700 hover:text-emerald-800 shrink-0"
                        title="Call Ambulance Driver"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      Bed Allotted Status
                    </div>
                    <div
                      className={`font-bold mt-0.5 flex items-center gap-1 ${
                        isBedConfirmed ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                      data-testid="citizen-bed-allotted-status"
                    >
                      <BedDouble className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {isBedConfirmed
                          ? `YES — ${myIncident.pre_arrival_bed}`
                          : 'NO — Pending Allotment'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hospital Appointed Box */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase text-slate-400">
                        Hospital Appointed
                      </div>
                      <div className="font-bold text-[#0A1120] truncate">
                        {myIncident.assigned_hospital_name}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 shrink-0">
                    {myIncident.pre_arrival_doctor.split('(')[0]}
                  </span>
                </div>

                {/* 4. Emergency Contacts Forwarded via Messenger & WhatsApp Banner */}
                <div
                  className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5"
                  data-testid="citizen-messenger-whatsapp-banner"
                >
                  <div className="flex items-start gap-2 text-[11px] font-bold text-blue-950">
                    <MessageCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      Incident &amp; live tracking link forwarded as an emergency message to your SOS contacts via Messenger and WhatsApp:
                    </span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {(citizen.emergency_contacts || DEFAULT_DEMO_CITIZEN.emergency_contacts).map(
                      (contact, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px] text-blue-900 bg-white/80 px-2.5 py-1 rounded-lg border border-blue-100"
                        >
                          <span className="font-semibold truncate">
                            {contact.name} ({contact.phone})
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-700 shrink-0">
                            WhatsApp &amp; Messenger Sent ✓
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Requirement 5: Instead of showing emergency chat again, provide "Ambulance Has Reached — Return to Home Page" */}
                <button
                  type="button"
                  onClick={async () => {
                    await markAmbulanceReachedReturnHome(myIncident.id);
                    setMessages([]);
                  }}
                  data-testid="ambulance-reached-return-home-btn"
                  className="w-full py-3 px-4 rounded-full bg-[#0A1120] hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4 text-emerald-400" />
                  <span>Ambulance Has Reached — Return to Home Page</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* If citizen returned to Home Page while patient is still at hospital awaiting discharge */}
            {myIncident && myIncident.raw_incident.citizen_returned_home && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase font-bold text-emerald-800">
                    PATIENT UNDER HOSPITAL CARE
                  </div>
                  <div className="text-xs font-semibold text-[#0A1120] truncate">
                    {myIncident.patient_name} at {myIncident.assigned_hospital_name}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Bed: <strong>{isBedConfirmed ? myIncident.pre_arrival_bed : 'Pending Bed Assignment'}</strong> · Case will be saved in AI Chat History upon Discharge.
                  </div>
                </div>
              </div>
            )}

            {/* 5. SIMPLE, CLEAN MULTILINGUAL AI CHAT WITH MAJOR EMERGENCY DROPDOWN SUGGESTIONS */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* Clean Dropdown for Suggestions */}
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <select
              aria-label="Quick Emergency Suggestions"
              value={selectedSuggestion}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSuggestion(val);
                if (val) {
                  handleSendChatMessage(val);
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#0A1120] focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="">{t.dropdownPlaceholder}</option>
              {t.categories.map((cat, idx) => (
                <option key={idx} value={cat.prompt}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clean Message Area */}
          <div className="p-3.5 space-y-3 min-h-[260px] max-h-[360px] overflow-y-auto">
            {messages.map((msg) =>
              msg.sender === 'user' ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-xs px-3.5 py-2 bg-[#0A1120] text-white text-xs">
                    <div>{msg.text}</div>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-start">
                  <div className="w-full rounded-2xl p-3.5 bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span
                        className={`font-bold ${
                          msg.evaluation?.severity === 'CRITICAL'
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {msg.evaluation?.responseTitle}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {msg.timestamp}
                      </span>
                    </div>

                    <ul className="space-y-1 text-slate-700 list-disc list-inside">
                      {msg.evaluation?.immediateSteps.map((step, i) => (
                        <li key={i} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ul>

                    {msg.evaluation?.severity === 'MINOR' && (
                      <>
                        {msg.evaluation.otcMedicines && msg.evaluation.otcMedicines.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                            <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5" />
                              OTC Medicines:
                            </div>
                            <ul className="space-y-0.5 text-[11px] text-slate-700 list-disc list-inside">
                              {msg.evaluation.otcMedicines.map((med, idx) => (
                                <li key={idx}>{med}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {msg.evaluation.warningSigns && msg.evaluation.warningSigns.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                            <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Warning Signs:
                            </div>
                            <ul className="space-y-0.5 text-[11px] text-slate-700 list-disc list-inside">
                              {msg.evaluation.warningSigns.map((warn, idx) => (
                                <li key={idx}>{warn}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    {/* CRITICAL CASE: Starts with Self vs Others Popup before 2-Step Confirmation */}
                    {msg.evaluation?.severity === 'CRITICAL' && msg.evaluation.requiresAmbulance && (
                      <button
                        type="button"
                        onClick={() =>
                          initiateAmbulanceConfirmationFlow(
                            msg.rawSymptoms || msg.evaluation?.emergencyGroup || 'Critical Emergency',
                            'AI_CHAT',
                            false
                          )
                        }
                        className="w-full py-2.5 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        {t.dispatchAlsBtn}
                      </button>
                    )}
                  </div>
                </div>
              )
            )}

            {isEvaluating && (
              <div className="text-xs text-slate-400 font-mono px-1">...</div>
            )}
          </div>

          {/* Clean Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t.chatPlaceholder}
              aria-label="Emergency Symptom Chat Input"
              className="flex-1 px-3.5 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-[#0A1120] focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isEvaluating}
              className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t.sendBtn}</span>
            </button>
          </form>
        </div>
          </>
        )}
      </div>

      {/* ========================================================================
          TOP-LEFT HAMBURGER MENU DRAWER:
          1. Survival Guide
          2. AI Chat History (Not Deletable)
          3. Account Settings
          4. Log Out
         ======================================================================== */}
      {hamburgerOpen && (
        <div
          className="absolute inset-0 z-50 bg-[#0A1120]/60 backdrop-blur-xs flex"
          data-testid="citizen-hamburger-drawer"
        >
          <div className="w-[90%] max-w-[360px] bg-white h-full flex flex-col shadow-2xl border-r border-slate-200">
            {/* Drawer Header */}
            <div className="px-4 py-3.5 bg-[#0A1120] text-white flex items-center justify-between">
              <div>
                <div className="text-xs font-bold">{citizen.full_name}</div>
                <div className="text-[11px] font-mono text-emerald-400">
                  +91 {citizen.mobile} · Blood {citizen.blood_group}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHamburgerOpen(false)}
                aria-label="Close Navigation Menu"
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Menu Navigation Items */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveDrawerSection('SURVIVAL')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeDrawerSection === 'SURVIVAL'
                    ? 'bg-[#0A1120] text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span>Survival Guide</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerSection('HISTORY')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeDrawerSection === 'HISTORY'
                    ? 'bg-[#0A1120] text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5 text-blue-500" />
                <span>AI Chat History</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerSection('SETTINGS')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeDrawerSection === 'SETTINGS'
                    ? 'bg-[#0A1120] text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Account Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHamburgerOpen(false);
                  onCitizenChange(null);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 hover:bg-rose-100 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.logout}</span>
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeDrawerSection === 'SURVIVAL' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-serif-display font-bold text-[#0A1120]">
                      {t.survivalGuideTitle}
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setSurvivalIndex((prev) => (prev + 1) % SURVIVAL_PROTOCOLS.length)
                      }
                      className="text-xs font-semibold text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      Next Protocol <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="text-xs font-bold text-[#0A1120]">
                      {currentProtocol.title[lang]}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold">
                      {currentProtocol.windowText[lang]}
                    </div>

                    <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSurvivalMode('alone')}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          survivalMode === 'alone'
                            ? 'bg-[#0A1120] text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        {t.aloneMode}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSurvivalMode('assisted')}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          survivalMode === 'assisted'
                            ? 'bg-[#0A1120] text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        {t.assistedMode}
                      </button>
                    </div>

                    <ol className="space-y-1.5 text-xs text-slate-700 list-decimal list-inside pt-1">
                      {protocolSteps.map((step, i) => (
                        <li key={i} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {activeDrawerSection === 'HISTORY' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-serif-display font-bold text-[#0A1120]">
                      {t.chatHistoryTitle}
                    </h4>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" /> Permanent Audit Log
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Clinical triage records are permanently retained under BNS &amp; IT Act compliance and cannot be deleted.
                  </p>

                  {chatHistoryList.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                      No emergency cases or AI triage sessions recorded yet for {citizen.mobile}.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {chatHistoryList.map((item) => {
                        const isSolvedCase = item.recordType === 'SOLVED_EMERGENCY';
                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                              isSolvedCase
                                ? 'bg-emerald-50/70 border-emerald-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                            data-testid={
                              isSolvedCase ? 'history-solved-emergency-item' : 'history-chat-item'
                            }
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                              <span className="text-slate-500">{item.timestamp}</span>
                              {isSolvedCase ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                                  SOLVED &amp; DISCHARGED
                                </span>
                              ) : (
                                <span
                                  className={
                                    item.severity === 'CRITICAL'
                                      ? 'text-rose-600 font-bold'
                                      : 'text-emerald-700 font-bold'
                                  }
                                >
                                  {item.severity}
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-[#0A1120]">{item.responseTitle}</div>
                            <div className="font-semibold text-slate-800">{item.userQuery}</div>
                            <div className="text-[11px] text-slate-600 leading-relaxed">
                              {item.summary}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeDrawerSection === 'SETTINGS' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-serif-display font-bold text-[#0A1120]">
                    {t.accountSettingsTitle}
                  </h4>
                  {settingsSavedMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                      {settingsSavedMsg}
                    </div>
                  )}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Full Name</label>
                      <input
                        type="text"
                        value={citizen.full_name}
                        onChange={(e) =>
                          onCitizenChange({ ...citizen, full_name: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">
                          Blood Group
                        </label>
                        <input
                          type="text"
                          value={citizen.blood_group}
                          onChange={(e) =>
                            onCitizenChange({ ...citizen, blood_group: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Age</label>
                        <input
                          type="number"
                          value={citizen.age}
                          onChange={(e) =>
                            onCitizenChange({ ...citizen, age: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Permanent Address
                      </label>
                      <textarea
                        rows={2}
                        value={citizen.permanent_address}
                        onChange={(e) =>
                          onCitizenChange({ ...citizen, permanent_address: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await registerCitizen(citizen);
                        setSettingsSavedMsg('Account settings saved.');
                        setTimeout(() => setSettingsSavedMsg(''), 2500);
                      }}
                      className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer"
                    >
                      Save Account Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setHamburgerOpen(false)} />
        </div>
      )}

      {/* ========================================================================
          MULTI-STAGE AMBULANCE POPUP FLOW:
          1. WHO_FOR: Ask if ambulance is For Myself (Self) or For Others
          2. OTHER_DETAILS: If For Others, ask Gender, Approx Age, Blood Group, Height
          3. CONFIRM_1: Confirm booking of the ambulance
          4. CONFIRM_2: Punishable prank legal warning confirmation
         ======================================================================== */}
      {popupStage !== 'NONE' && (
        <div
          className="fixed inset-0 z-50 bg-[#0A1120]/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          data-testid={`ambulance-popup-${popupStage}`}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            {popupStage === 'WHO_FOR' && (
              <>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-blue-600 font-bold">
                    PATIENT IDENTIFICATION
                  </div>
                  <h3 className="text-lg font-serif-display font-bold text-[#0A1120]">
                    Is this ambulance for yourself or for someone else?
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Selecting <strong>For Myself</strong> sends your registered medical profile to the hospital dashboard. Selecting <strong>For Someone Else</strong> lets you enter the other person&apos;s known details.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSelectForSelf}
                    className="w-full p-3.5 rounded-2xl bg-[#0A1120] hover:bg-slate-800 text-white text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">For Myself ({citizen.full_name})</div>
                        <div className="text-[11px] text-slate-300">
                          Sends Blood {citizen.blood_group}, Age {citizen.age}, {citizen.height || '176 cm'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectForOther}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0A1120] text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">For Someone Else (Other Person)</div>
                        <div className="text-[11px] text-slate-500">
                          Enter their gender, approx age, blood group &amp; height
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCancelConfirmation}
                  className="w-full py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}

            {popupStage === 'OTHER_DETAILS' && (
              <form onSubmit={handleOtherDetailsContinue} className="space-y-3.5">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-blue-600 font-bold">
                    OTHER PERSON&apos;S DETAILS
                  </div>
                  <h3 className="text-lg font-serif-display font-bold text-[#0A1120]">
                    Patient Details for Hospital Dashboard
                  </h3>
                  <p className="text-xs text-slate-600">
                    Provide known information for the patient so the hospital emergency team can prepare appropriate care.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Gender *
                      </label>
                      <select
                        aria-label="Other Person Gender"
                        value={otherPatientForm.sex}
                        onChange={(e) =>
                          setOtherPatientForm({ ...otherPatientForm, sex: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-[#0A1120]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Approx Age (if known)
                      </label>
                      <input
                        type="text"
                        aria-label="Other Person Approx Age"
                        value={otherPatientForm.approxAge}
                        onChange={(e) =>
                          setOtherPatientForm({ ...otherPatientForm, approxAge: e.target.value })
                        }
                        placeholder="e.g. 38 or Unknown"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[#0A1120]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Blood Group (if known)
                      </label>
                      <select
                        aria-label="Other Person Blood Group"
                        value={otherPatientForm.bloodGroup}
                        onChange={(e) =>
                          setOtherPatientForm({ ...otherPatientForm, bloodGroup: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-[#0A1120]"
                      >
                        {['Unknown', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(
                          (bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Height (if known)
                      </label>
                      <input
                        type="text"
                        aria-label="Other Person Height"
                        value={otherPatientForm.height}
                        onChange={(e) =>
                          setOtherPatientForm({ ...otherPatientForm, height: e.target.value })
                        }
                        placeholder="e.g. 170 cm / Unknown"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0A1120]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Patient Name / Identifier (Optional)
                    </label>
                    <input
                      type="text"
                      value={otherPatientForm.name}
                      onChange={(e) =>
                        setOtherPatientForm({ ...otherPatientForm, name: e.target.value })
                      }
                      placeholder="e.g. Unidentified Commuter / Bystander"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0A1120]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setPopupStage('WHO_FOR')}
                    className="py-2.5 px-4 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Continue →
                  </button>
                </div>
              </form>
            )}

            {popupStage === 'CONFIRM_1' && (
              <>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    CONFIRMATION 1 OF 2 · BOOKING CONFIRMATION
                  </div>
                  <h3 className="text-lg font-serif-display font-bold text-[#0A1120]">
                    Do you confirm the booking of this ambulance?
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {patientTargetMode === 'SELF'
                      ? `Your medical profile (${citizen.full_name}, Blood ${citizen.blood_group}) and live location will be sent to the nearest hospital.`
                      : `The other person's details (Gender: ${otherPatientForm.sex}, Age: ${otherPatientForm.approxAge || 'Unknown'}, Blood: ${otherPatientForm.bloodGroup}, Height: ${otherPatientForm.height || 'Unknown'}) will be sent to the nearest hospital.`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelConfirmation}
                    className="py-2.5 px-4 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStep1Yes}
                    className="py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}

            {popupStage === 'CONFIRM_2' && (
              <>
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-rose-600 font-bold">
                    CONFIRMATION 2 OF 2 · LEGAL WARNING
                  </div>
                  <h3 className="text-lg font-serif-display font-bold text-[#0A1120]">
                    If this is a prank, it is punishable by law.
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This emergency ambulance dispatch should only be used during genuine medical emergencies. Do you still want to continue?
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelConfirmation}
                    className="py-2.5 px-4 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStep2Yes}
                    className="py-2.5 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
