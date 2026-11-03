/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  checkSupabaseSchemaReady,
  DEFAULT_HOSPITALS,
  fetchActiveIncidents,
  getLocalHospitals,
  getLocalIncidents,
  supabase,
  type CitizenAccount,
  type EmergencyIncident,
  type HospitalAccount,
} from './utils/supabase';
import { CitizenApp } from './components/CitizenApp';
import { HospitalCommandCenter } from './components/HospitalCommandCenter';

export type ViewMode = 'DUAL' | 'CITIZEN' | 'HOSPITAL';

const SIMULATED_LOCATIONS = [
  {
    lat: 12.9716,
    lng: 77.5946,
    accuracy: 1.8,
    address: 'MG Road / Indiranagar Arterial Corridor, Bengaluru, Karnataka',
  },
  {
    lat: 12.9784,
    lng: 77.6408,
    accuracy: 1.6,
    address: '100 Feet Road, Indiranagar Junction, Bengaluru, Karnataka',
  },
  {
    lat: 12.9352,
    lng: 77.6245,
    accuracy: 1.9,
    address: '80 Feet Road, Koramangala 4th Block, Bengaluru, Karnataka',
  },
];

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('DUAL');
  const [isDark, setIsDark] = useState<boolean>(false);

  // Citizen Auth State — Strictly starts as null so Citizen Sign In / Registration is never bypassed
  const [citizen, setCitizen] = useState<CitizenAccount | null>(null);

  // Hospital Auth State — Defaults to Manipal Hospital (HOSP-BLR-8841) or can be switched/signed out
  const [hospital, setHospital] = useState<HospitalAccount | null>(() => {
    const list = getLocalHospitals();
    return list[0] || DEFAULT_HOSPITALS[0];
  });

  // Active Emergency Incidents — Starts with 0 dummy cases
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);

  // Simulated High-Accuracy Road Corridor Coordinates (No external GPS or paid geocoding dependencies)
  const [locIndex, setLocIndex] = useState(0);
  const liveGps = SIMULATED_LOCATIONS[locIndex];

  const recalibrateDeviceGps = useCallback(() => {
    setLocIndex((prev) => (prev + 1) % SIMULATED_LOCATIONS.length);
  }, []);

  // Sync Dark / Light Theme on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Synchronize incidents from local storage & Supabase Realtime
  const refreshIncidentsAndHospital = useCallback(async () => {
    const localIncs = getLocalIncidents().filter((i) => i.status !== 'DISCHARGED');
    setIncidents(localIncs);

    if (hospital) {
      const updatedHosp = getLocalHospitals().find(
        (h) => h.hospital_code === hospital.hospital_code
      );
      if (updatedHosp) {
        setHospital(updatedHosp);
      }
    }
  }, [hospital]);

  // Clear any stale demo incidents ONCE on initial boot so Hospital Console starts with 0 demo cases
  useEffect(() => {
    localStorage.removeItem('pulseway_incidents_v1');
    localStorage.removeItem('pulseway_incidents_v2');
    localStorage.removeItem('pulseway_discharged_ids_v1');
    setIncidents([]);
  }, []);

  useEffect(() => {
    const handleLocalSync = () => {
      refreshIncidentsAndHospital();
    };
    window.addEventListener('pulseway-sync', handleLocalSync);

    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    checkSupabaseSchemaReady().then((ready) => {
      if (!isMounted || !ready) return;
      fetchActiveIncidents().then((list) => {
        if (isMounted) setIncidents(list);
      });
      activeChannel = supabase
        .channel('pulseway-realtime-incidents')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emergency_incidents' },
          () => {
            fetchActiveIncidents().then((list) => {
              if (isMounted) setIncidents(list);
            });
          }
        )
        .subscribe();
    });

    return () => {
      isMounted = false;
      window.removeEventListener('pulseway-sync', handleLocalSync);
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [refreshIncidentsAndHospital]);

  // Strictly isolate the Citizen App's active incident to the currently logged-in citizen
  const activeIncident = citizen
    ? incidents.find(
        (i) => i.citizen_mobile === citizen.mobile && i.status !== 'DISCHARGED'
      ) || null
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] dark:bg-[#060B14] text-[#0A1120] dark:text-slate-100">
      {/* Clean 3-Zone Top Bar — No SQL Guide or Solo Commute buttons */}
      <header className="flex items-center justify-between gap-6 px-6 py-3 bg-[#0A1120] text-white border-b border-slate-800 sticky top-0 z-30">
        {/* Zone 1: Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setViewMode('DUAL');
          }}
          className="text-base font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
          <span>PulseWay</span>
        </a>

        {/* Zone 2: View Switcher (Dual View, Citizen View, Hospital View only) */}
        <nav
          aria-label="Primary Workspace Views"
          className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1 rounded-xl overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => setViewMode('DUAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'DUAL'
                ? 'bg-[#10B981] text-[#052E16] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Dual Split-View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('CITIZEN')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'CITIZEN'
                ? 'bg-[#10B981] text-[#052E16] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Citizen App
          </button>
          <button
            type="button"
            onClick={() => setViewMode('HOSPITAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'HOSPITAL'
                ? 'bg-[#10B981] text-[#052E16] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Hospital Command
          </button>
        </nav>

        {/* Zone 3: Theme Toggle */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace Canvas */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6">
        {viewMode === 'DUAL' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[calc(100vh-6.5rem)]">
            {/* Left 4 Columns: Mobile-Optimized Citizen App */}
            <div className="lg:col-span-4 flex flex-col">
              <CitizenApp
                citizen={citizen}
                onCitizenChange={setCitizen}
                liveGps={liveGps}
                onRecalibrateGps={recalibrateDeviceGps}
                activeIncident={activeIncident}
                onIncidentCreated={(inc) => {
                  setIncidents((prev) => [inc, ...prev.filter((i) => i.id !== inc.id)]);
                }}
              />
            </div>

            {/* Right 8 Columns: Hospital Emergency Command Center */}
            <div className="lg:col-span-8 flex flex-col">
              <HospitalCommandCenter
                hospital={hospital}
                onHospitalChange={setHospital}
                incidents={incidents}
                onIncidentsChange={refreshIncidentsAndHospital}
              />
            </div>
          </div>
        )}

        {viewMode === 'CITIZEN' && (
          <div className="max-w-[420px] mx-auto min-h-[calc(100vh-6.5rem)] flex flex-col">
            <CitizenApp
              citizen={citizen}
              onCitizenChange={setCitizen}
              liveGps={liveGps}
              onRecalibrateGps={recalibrateDeviceGps}
              activeIncident={activeIncident}
              onIncidentCreated={(inc) => {
                setIncidents((prev) => [inc, ...prev.filter((i) => i.id !== inc.id)]);
              }}
            />
          </div>
        )}

        {viewMode === 'HOSPITAL' && (
          <div className="w-full min-h-[calc(100vh-6.5rem)] flex flex-col">
            <HospitalCommandCenter
              hospital={hospital}
              onHospitalChange={setHospital}
              incidents={incidents}
              onIncidentsChange={refreshIncidentsAndHospital}
            />
          </div>
        )}
      </main>
    </div>
  );
}
