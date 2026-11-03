import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  generateRoadRouteWaypoints,
  getRoutePositionAtProgress,
} from '../utils/clinicalLogic';

const patientIcon = L.divIcon({
  className: 'pulseway-patient-marker',
  html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
    <span style="position:absolute;width:30px;height:30px;border-radius:9999px;background:rgba(225,29,72,0.28);border:2px solid #e11d48;"></span>
    <span style="position:relative;width:14px;height:14px;border-radius:9999px;background:#e11d48;border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const ambulanceIcon = L.divIcon({
  className: 'pulseway-ambulance-marker',
  html: `<div style="width:36px;height:36px;border-radius:10px;background:#0A1120;border:2px solid #10B981;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;box-shadow:0 4px 12px rgba(16,185,129,0.45);">
    🚑
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const hospitalIcon = L.divIcon({
  className: 'pulseway-hospital-marker',
  html: `<div style="width:32px;height:32px;border-radius:8px;background:#059669;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;box-shadow:0 3px 10px rgba(0,0,0,0.35);">
    🏥
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface MapAutoCenterProps {
  lat: number;
  lng: number;
}

function MapAutoCenter({ lat, lng }: MapAutoCenterProps) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export interface LiveMapProps {
  patientLat: number;
  patientLng: number;
  patientLabel?: string;
  hospitalLat?: number;
  hospitalLng?: number;
  hospitalLabel?: string;
  ambulanceLabel?: string;
  isAmbulanceAllotted?: boolean;
  dispatchedAt?: number;
  heightClass?: string;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  patientLat,
  patientLng,
  patientLabel = 'Patient Emergency Location',
  hospitalLat = 12.9592,
  hospitalLng = 77.6476,
  hospitalLabel = 'Trauma Hospital Base',
  ambulanceLabel = 'ALS Ambulance Unit',
  isAmbulanceAllotted = false,
  dispatchedAt,
  heightClass = 'h-52',
}) => {
  const [progress, setProgress] = useState<number>(0.15);

  // Synchronize ambulance movement across Citizen App and Hospital Command Center using dispatchedAt
  useEffect(() => {
    if (!isAmbulanceAllotted) {
      setProgress(0);
      return;
    }

    const startTimestamp = dispatchedAt || Date.now();
    const updateProgress = () => {
      const elapsedSec = Math.max(0, (Date.now() - startTimestamp) / 1000);
      // Full route traversal over ~90 seconds of demo time (starting at 15% out of hospital gate)
      const calc = Math.min(0.95, 0.15 + (elapsedSec / 90) * 0.8);
      setProgress(calc);
    };

    updateProgress();
    const interval = window.setInterval(updateProgress, 1000);
    return () => window.clearInterval(interval);
  }, [isAmbulanceAllotted, dispatchedAt]);

  const waypoints = generateRoadRouteWaypoints(
    hospitalLat,
    hospitalLng,
    patientLat,
    patientLng
  );
  const routeState = getRoutePositionAtProgress(waypoints, progress);

  return (
    <div
      className={`w-full ${heightClass} rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100`}
      data-testid="live-osm-map"
    >
      <MapContainer
        center={[patientLat, patientLng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAutoCenter lat={patientLat} lng={patientLng} />

        {/* Patient Location Marker */}
        <Marker position={[patientLat, patientLng]} icon={patientIcon}>
          <Popup>
            <div className="text-xs font-bold text-slate-900">{patientLabel}</div>
            <div className="text-[11px] font-mono text-slate-600">
              {patientLat.toFixed(5)}, {patientLng.toFixed(5)}
            </div>
          </Popup>
        </Marker>

        {/* Hospital Marker */}
        <Marker position={[hospitalLat, hospitalLng]} icon={hospitalIcon}>
          <Popup>
            <div className="text-xs font-bold text-slate-900">{hospitalLabel}</div>
          </Popup>
        </Marker>

        {/* Moving Ambulance & Road-Following Route (When Allotted) */}
        {isAmbulanceAllotted && (
          <>
            <Marker position={[routeState.lat, routeState.lng]} icon={ambulanceIcon}>
              <Popup>
                <div className="text-xs font-bold text-slate-900">{ambulanceLabel}</div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  Via: {routeState.roadName}
                </div>
              </Popup>
            </Marker>

            {routeState.completedWaypoints.length >= 2 && (
              <Polyline
                positions={routeState.completedWaypoints}
                pathOptions={{
                  color: '#059669',
                  weight: 4,
                  opacity: 0.9,
                }}
              />
            )}

            {routeState.remainingWaypoints.length >= 2 && (
              <Polyline
                positions={routeState.remainingWaypoints}
                pathOptions={{
                  color: '#2563EB',
                  weight: 4,
                  dashArray: '8, 6',
                  opacity: 0.95,
                }}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Live Road Telemetry Strip Overlay */}
      {isAmbulanceAllotted && (
        <div className="absolute bottom-2 left-2 right-2 z-[400] bg-[#0A1120]/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg flex items-center justify-between text-[11px] border border-white/10">
          <div className="truncate font-medium">
            <span className="text-emerald-400 font-semibold">Route:</span> {routeState.roadName}
          </div>
          <div className="font-mono font-bold text-emerald-400 shrink-0 ml-2">
            54 km/h · ETA {routeState.etaMinutes}m
          </div>
        </div>
      )}
    </div>
  );
};
