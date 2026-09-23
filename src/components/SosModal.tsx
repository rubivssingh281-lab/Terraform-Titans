import React, { useState, useEffect, useRef } from 'react';
import { toggleEmergencySiren, speakText } from '../utils/sound';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose }) => {
  const [sirenActive, setSirenActive] = useState<boolean>(true);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState<string>('Sachin Gupta');
  const [caregiverName, setCaregiverName] = useState<string>('Saksham');
  const [caregiverPhone, setCaregiverPhone] = useState<string>('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({ lat: 28.627, lng: 77.372 });
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<boolean>(false);

  const speechLoopRef = useRef<any>(null);

  // Load patient from storage and request real-time GPS Geolocation
  useEffect(() => {
    if (!isOpen) return;

    // Reset dispatch states
    setDispatchSuccess(false);
    setIsDispatching(true);

    // 1. Fetch patient profile details
    const stored = localStorage.getItem('echolytix_patient');
    let loadedId: number | null = null;
    let loadedName = 'Sachin Gupta';
    let loadedCaregiver = 'Saksham';
    let loadedPhone = '';

    if (stored) {
      try {
        const p = JSON.parse(stored);
        if (p.id) {
          loadedId = Number(p.id);
          setPatientId(loadedId);
        }
        if (p.name) {
          loadedName = p.name;
          setPatientName(p.name);
        }
        if (p.caregiver_name) {
          loadedCaregiver = p.caregiver_name;
          setCaregiverName(p.caregiver_name);
        }
        if (p.caregiver_phone) {
          loadedPhone = p.caregiver_phone;
          setCaregiverPhone(p.caregiver_phone);
        }
      } catch (e) {
        console.error("Error parsing patient profile for SOS", e);
      }
    }

    // 2. Fetch real-time GPS location
    setIsGpsLoading(true);
    setGpsError('');

    const handleLocationSuccess = (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setGpsCoords({ lat, lng });
      setIsGpsLoading(false);
      triggerSosDispatch(loadedId, loadedName, loadedCaregiver, lat, lng);
    };

    const handleLocationError = (error: GeolocationPositionError) => {
      console.warn("GPS Geolocation failed. Using default mock coordinates:", error.message);
      setGpsError(error.message);
      setIsGpsLoading(false);
      triggerSosDispatch(loadedId, loadedName, loadedCaregiver, 28.627, 77.372);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    } else {
      setGpsError("Geolocation not supported");
      setIsGpsLoading(false);
      triggerSosDispatch(loadedId, loadedName, loadedCaregiver, 28.627, 77.372);
    }

    return () => {
      stopDistressLoops();
    };
  }, [isOpen]);

  // Handle siren state updates
  useEffect(() => {
    if (isOpen && sirenActive) {
      toggleEmergencySiren(true);
    } else {
      toggleEmergencySiren(false);
    }
  }, [isOpen, sirenActive]);

  // Dispatch SOS payload to server backend
  const triggerSosDispatch = (
    pId: number | null,
    pName: string,
    cName: string,
    lat: number,
    lng: number
  ) => {
    const sosMessage = `EMERGENCY: Patient "${pName}" requires urgent assistance. Please contact caregiver "${cName}".`;

    // Trigger TTS loop immediately
    speakDistressMessage(pName, cName);
    
    // Set speech repeat loop every 10 seconds
    if (speechLoopRef.current) clearInterval(speechLoopRef.current);
    speechLoopRef.current = setInterval(() => {
      speakDistressMessage(pName, cName);
    }, 10000);

    fetch('/api/emergency/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: pId,
        message: sosMessage,
        latitude: lat,
        longitude: lng
      })
    })
      .then(res => {
        if (res.ok) {
          setDispatchSuccess(true);
        }
        setIsDispatching(false);
      })
      .catch(err => {
        console.error("SOS dispatch network request failed:", err);
        setIsDispatching(false);
      });
  };

  const speakDistressMessage = (pName: string, cName: string) => {
    speakText(`Emergency SOS alert. Patient ${pName} requires immediate assistance. Caregiver ${cName} has been notified.`);
  };

  const stopDistressLoops = () => {
    toggleEmergencySiren(false);
    window.speechSynthesis.cancel();
    if (speechLoopRef.current) {
      clearInterval(speechLoopRef.current);
      speechLoopRef.current = null;
    }
  };

  const handleClose = () => {
    stopDistressLoops();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#F3EDDF]/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FCFAF4] max-w-lg w-full rounded-2xl border-2 border-rose-500/50 p-6 flex flex-col gap-6 shadow-[0_0_50px_rgba(244,63,94,0.25)] relative overflow-hidden">
        
        {/* Top Emergency Pulse Header */}
        <div className="flex items-center gap-3 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30">
          <span className="material-symbols-outlined text-3xl text-rose-600 animate-ping">
            warning
          </span>
          <div>
            <h3 className="font-display font-extrabold text-lg text-rose-600 uppercase tracking-wider">
              Emergency SOS Signal
            </h3>
            <span className="font-mono-code text-xs text-rose-500">
              DISTRESS BEACON DISPATCHED TO CARE CENTER
            </span>
          </div>
        </div>

        {/* Broadcast Details */}
        <div className="flex flex-col gap-3 font-mono-code text-xs text-slate-800">
          <div className="bg-[#EFE8D8] p-4 rounded-xl border border-[#E6DDC9]">
            <span className="text-slate-500 block mb-1">Broadcast Message:</span>
            <p className="font-bold text-sm text-rose-600 leading-normal">
              "EMERGENCY: User {patientName} requires urgent assistance. Caregiver: {caregiverName} {caregiverPhone && `(${caregiverPhone})`}."
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#EFE8D8] border border-[#E6DDC9]">
              <span className="flex items-center gap-1.5 font-mono-code text-[11px]">
                <span className="material-symbols-outlined text-emerald-600 text-sm">
                  {isDispatching ? 'sync' : 'check_circle'}
                </span>
                Caregiver Broadcast
              </span>
              <span className={`font-bold ${dispatchSuccess ? 'text-emerald-600' : isDispatching ? 'text-amber-600 animate-pulse' : 'text-rose-600'}`}>
                {dispatchSuccess ? 'TRANSMITTED' : isDispatching ? 'SENDING...' : 'FAILED'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#EFE8D8] border border-[#E6DDC9]">
              <span className="flex items-center gap-1.5 font-mono-code text-[11px]">
                <span className="material-symbols-outlined text-indigo-600 text-sm">
                  {isGpsLoading ? 'sync' : 'location_on'}
                </span>
                GPS Beacon
              </span>
              <span className="text-indigo-600 truncate max-w-[120px] font-bold text-right">
                {isGpsLoading ? 'LOCATING...' : gpsError ? 'DEFAULT (DELHI)' : `${gpsCoords.lat.toFixed(4)}°N, ${gpsCoords.lng.toFixed(4)}°E`}
              </span>
            </div>
          </div>
        </div>

        {/* Siren Control */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#EFE8D8] border border-[#E6DDC9]">
          <div className="flex items-center gap-2 text-xs font-mono-code text-slate-800">
            <span className="material-symbols-outlined text-rose-600">volume_up</span>
            <span>Audible Distress Siren Alarm</span>
          </div>
          <button
            onClick={() => setSirenActive(!sirenActive)}
            className={`px-3 py-1 rounded-full text-xs font-mono-code font-bold transition-colors ${
              sirenActive ? 'bg-rose-500/30 text-rose-500 border border-rose-500/40' : 'bg-[#E6DDC9] text-slate-500'
            }`}
          >
            {sirenActive ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={handleClose}
          className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-mono-code font-bold text-sm border border-rose-500/30 transition-all active:scale-95 shadow-[0_4px_12px_rgba(220,38,38,0.2)]"
        >
          Cancel SOS Alert
        </button>
      </div>
    </div>
  );
};
