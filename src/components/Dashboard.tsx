import React, { useState, useEffect } from 'react';
import { NavTab, RecentPhrase } from '../types';
import { speakText, playBeep } from '../utils/sound';

interface DashboardProps {
  onSelectTab: (tab: NavTab) => void;
  recentPhrases: RecentPhrase[];
  patient: any;
  sessionToken: string | null;
  onLogout: () => void;
  onProfileUpdate: (updatedPatient: any) => void;
}

type DashboardTab = 'settings' | 'support' | 'admin';

export const Dashboard: React.FC<DashboardProps> = ({ 
  onSelectTab, 
  recentPhrases,
  patient,
  sessionToken,
  onLogout,
  onProfileUpdate
}) => {
  // Navigation inside the dashboard card
  const [activeTab, setActiveTab] = useState<DashboardTab>('settings');

  // Profile Settings State
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('');
  const [medicalId, setMedicalId] = useState<string>('');
  const [caregiverName, setCaregiverName] = useState<string>('');
  const [caregiverPhone, setCaregiverPhone] = useState<string>('');
  const [emergencyEmail, setEmergencyEmail] = useState<string>('');
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [blinkThreshold, setBlinkThreshold] = useState<number>(0.18);
  const [commitDelay, setCommitDelay] = useState<number>(1800);
  
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Support / Feedback Form State
  const [supportName, setSupportName] = useState<string>('');
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [supportMessage, setSupportMessage] = useState<string>('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState<boolean>(false);
  const [supportSuccess, setSupportSuccess] = useState<boolean>(false);
  const [supportError, setSupportError] = useState<string>('');

  // Admin Logs State
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(false);

  // System Notifications Log State
  const [notifications, setNotifications] = useState<string[]>([]);

  // Sync state values when patient prop changes
  useEffect(() => {
    if (patient) {
      setPatientName(patient.name || '');
      setPatientAge(String(patient.age || ''));
      setMedicalId(patient.medical_id || '');
      setCaregiverName(patient.caregiver_name || '');
      setCaregiverPhone(patient.caregiver_phone || '');
      setEmergencyEmail(patient.emergency_email || '');
      setTtsSpeed(Number(patient.tts_speed || 1.0));
      setBlinkThreshold(Number(patient.blink_threshold || 0.18));
      setCommitDelay(Number(patient.commit_delay || 1800));

      // Load initial dashboard system notifications
      setNotifications([
        `Establish secure session for patient ${patient.name || 'Stephen'}.`,
        `Calibration parameters loaded successfully (Blink threshold: ${Number(patient.blink_threshold || 0.18).toFixed(2)}).`,
        `Speech synthesizer initialized at ${Number(patient.tts_speed || 1.0).toFixed(1)}x rate.`,
        "Emergency SOS alert center armed and active."
      ]);
    }
  }, [patient]);

  // Fetch admin logs when tab is selected
  useEffect(() => {
    if (activeTab === 'admin' && sessionToken) {
      setIsAdminLoading(true);
      
      // Fetch SOS beacons
      const fetchSos = fetch('/api/emergency/sos?limit=20')
        .then(res => res.ok ? res.json() : [])
        .catch(() => []);

      // Fetch Support feedback requests
      const fetchSupport = fetch('/api/support?limit=20', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })
        .then(res => res.ok ? res.json() : [])
        .catch(() => []);

      Promise.all([fetchSos, fetchSupport])
        .then(([sosLogs, feedbackLogs]) => {
          setSosAlerts(sosLogs);
          setSupportRequests(feedbackLogs);
        })
        .catch(err => console.error("Error loading caregiver logs:", err))
        .finally(() => setIsAdminLoading(false));
    }
  }, [activeTab, sessionToken]);

  const handleTabChange = (tab: DashboardTab) => {
    playBeep(650, 0.08);
    setActiveTab(tab);
  };

  // Submit Profile update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    if (!patientName.trim()) {
      alert("Name is required.");
      setIsSaving(false);
      return;
    }

    const payload = {
      id: patient?.id,
      name: patientName,
      age: Number(patientAge || 0),
      medical_id: medicalId,
      caregiver_name: caregiverName,
      caregiver_phone: caregiverPhone,
      emergency_email: emergencyEmail,
      tts_speed: ttsSpeed,
      blink_threshold: blinkThreshold,
      commit_delay: commitDelay
    };

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        onProfileUpdate(data); // Sync state to App.tsx
        setSaveSuccess(true);
        playBeep(900, 0.12);
        setTimeout(() => playBeep(1100, 0.12), 100);

        // Append log notification
        setNotifications(prev => [
          `Profile calibration updated at ${new Date().toLocaleTimeString()}.`,
          ...prev
        ]);

        setTimeout(() => {
          setSaveSuccess(false);
        }, 4000);
      } else {
        alert(data.error || "Failed to update profile settings.");
      }
    } catch (err) {
      console.error("Profile API request error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Feedback / Support ticket
  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError('');
    setSupportSuccess(false);
    setIsSubmittingSupport(true);

    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) {
      setSupportError('All fields (name, email, message) are required.');
      playBeep(250, 0.3);
      setIsSubmittingSupport(false);
      return;
    }

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supportName.trim(),
          email: supportEmail.trim(),
          message: supportMessage.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSupportSuccess(true);
        playBeep(900, 0.12);
        setSupportMessage('');
        setNotifications(prev => [
          `Support request submitted successfully by ${supportName}.`,
          ...prev
        ]);
      } else {
        setSupportError(data.error || 'Failed to submit feedback.');
        playBeep(250, 0.3);
      }
    } catch (err) {
      console.error(err);
      setSupportError('Connection lost. Unable to submit support form.');
      playBeep(250, 0.3);
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  return (
    <main className="flex-grow px-4 md:px-8 py-6 flex flex-col gap-6 max-w-[1280px] mx-auto w-full pb-28 md:pb-12 animate-fade-in">
      {/* Logged in Hero Welcomer */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6DDC9] pb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 shadow-inner">
            <span className="material-symbols-outlined text-3xl">account_circle</span>
          </div>
          <div>
            <div className="text-xs font-mono-code text-indigo-600">PATIENT HUB ACTIVATED</div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-slate-900">
              Welcome, {patientName || 'Stephen'}
            </h2>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="border border-rose-900/40 bg-rose-50 hover:bg-rose-100 text-rose-600 font-mono-code text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-auto active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.08)]"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sign Out
        </button>
      </section>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFAF4] p-4.5 rounded-2xl border border-[#E6DDC9] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-xl">record_voice_over</span>
          </div>
          <div>
            <div className="font-mono-code text-lg font-bold text-slate-900">{recentPhrases.length} Spoken</div>
            <div className="text-[10px] text-slate-500 font-mono-code">Recent Sentences</div>
          </div>
        </div>

        <div className="bg-[#FCFAF4] p-4.5 rounded-2xl border border-[#E6DDC9] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <span className="material-symbols-outlined text-xl">speed</span>
          </div>
          <div>
            <div className="font-mono-code text-lg font-bold text-indigo-600">{(commitDelay / 1000).toFixed(1)}s</div>
            <div className="text-[10px] text-slate-500 font-mono-code">Blink Delay</div>
          </div>
        </div>

        <div className="bg-[#FCFAF4] p-4.5 rounded-2xl border border-[#E6DDC9] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-xl">support_agent</span>
          </div>
          <div>
            <div className="font-mono-code text-xs font-bold text-slate-900 truncate max-w-[120px]">
              {caregiverName || 'Jonathan'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono-code">Primary Caregiver</div>
          </div>
        </div>

        <div className="bg-[#FCFAF4] p-4.5 rounded-2xl border border-[#E6DDC9] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 animate-pulse">
            <span className="material-symbols-outlined text-xl">security</span>
          </div>
          <div>
            <div className="font-mono-code text-lg font-bold text-rose-600">Armed</div>
            <div className="text-[10px] text-slate-500 font-mono-code">Emergency SOS Hub</div>
          </div>
        </div>
      </div>

      {/* Main Content split columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols) - Tabs & Panel Views */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-[#FCFAF4] rounded-3xl border border-[#E6DDC9] relative overflow-hidden flex flex-col min-h-[460px]">
            {/* Tabs Navigation Header */}
            <div className="flex border-b border-[#E6DDC9] bg-[#FFFDF8] p-1 gap-1">
              <button
                onClick={() => handleTabChange('settings')}
                className={`flex-1 py-3 text-xs font-mono-code font-bold rounded-t-2xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'settings'
                    ? 'bg-[#FCFAF4] text-indigo-600 border-t border-l border-r border-[#E6DDC9]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
                }`}
              >
                <span className="material-symbols-outlined text-sm">settings_accessibility</span>
                Patient Profile & Settings
              </button>
              <button
                onClick={() => handleTabChange('support')}
                className={`flex-1 py-3 text-xs font-mono-code font-bold rounded-t-2xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'support'
                    ? 'bg-[#FCFAF4] text-indigo-600 border-t border-l border-r border-[#E6DDC9]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
                }`}
              >
                <span className="material-symbols-outlined text-sm">contact_support</span>
                Contact Support
              </button>
              <button
                onClick={() => handleTabChange('admin')}
                className={`flex-1 py-3 text-xs font-mono-code font-bold rounded-t-2xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'admin'
                    ? 'bg-[#FCFAF4] text-indigo-600 border-t border-l border-r border-[#E6DDC9]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
                }`}
              >
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                Caregiver Logs (Admin)
              </button>
            </div>

            {/* Tab Panel 1: Patient Settings Form */}
            {activeTab === 'settings' && (
              <div className="p-6 flex flex-col gap-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-body mb-2">
                  Update communication parameters, emergency contacts, and calibration rates. All changes are stored securely in the SQLite database.
                </p>

                <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
                  {/* Step 1: Personal Profile */}
                  <div>
                    <span className="text-[10px] font-mono-code text-slate-500 uppercase tracking-widest font-semibold block mb-3 border-b border-[#E6DDC9] pb-1.5">
                      1. Personal Information
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono-code text-slate-500 font-bold">FULL NAME</label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-mono-code text-slate-800 outline-none"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono-code text-slate-500 font-bold">PATIENT AGE</label>
                        <input
                          type="number"
                          value={patientAge}
                          onChange={(e) => setPatientAge(e.target.value)}
                          className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-mono-code text-slate-800 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono-code text-slate-500 font-bold">MEDICAL FILE ID</label>
                        <input
                          type="text"
                          value={medicalId}
                          onChange={(e) => setMedicalId(e.target.value)}
                          className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-mono-code text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Caregiver & Alerts */}
                  <div>
                    <span className="text-[10px] font-mono-code text-slate-500 uppercase tracking-widest font-semibold block mb-3 border-b border-[#E6DDC9] pb-1.5">
                      2. Caregiver Contact & Alerts
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono-code text-slate-500 font-bold">CAREGIVER NAME</label>
                        <input
                          type="text"
                          value={caregiverName}
                          onChange={(e) => setCaregiverName(e.target.value)}
                          className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-mono-code text-slate-800 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono-code text-slate-500 font-bold">CAREGIVER MOBILE</label>
                        <input
                          type="text"
                          value={caregiverPhone}
                          onChange={(e) => setCaregiverPhone(e.target.value)}
                          className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-mono-code text-slate-800 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono-code text-slate-500 font-bold">EMERGENCY ALERT EMAIL</label>
                        <input
                          type="email"
                          value={emergencyEmail}
                          onChange={(e) => setEmergencyEmail(e.target.value)}
                          className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-mono-code text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Hardware Preferences */}
                  <div>
                    <span className="text-[10px] font-mono-code text-slate-500 uppercase tracking-widest font-semibold block mb-3 border-b border-[#E6DDC9] pb-1.5">
                      3. Calibration & Preferences
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Speech Rate Slider */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between font-mono-code text-[10px] text-slate-500">
                          <span>SPEECH RATE</span>
                          <span className="text-indigo-600">{ttsSpeed.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={ttsSpeed}
                          onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                          className="accent-indigo-500 w-full cursor-pointer h-1 bg-[#EFE8D8] rounded-lg"
                        />
                      </div>

                      {/* EAR threshold slider */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between font-mono-code text-[10px] text-slate-500">
                          <span>EAR THRESHOLD</span>
                          <span className="text-indigo-600">{blinkThreshold.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={0.12}
                          max={0.24}
                          step={0.01}
                          value={blinkThreshold}
                          onChange={(e) => setBlinkThreshold(parseFloat(e.target.value))}
                          className="accent-indigo-500 w-full cursor-pointer h-1 bg-[#EFE8D8] rounded-lg"
                        />
                      </div>

                      {/* Commit delay selector */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono-code text-slate-500 font-bold">COMMIT SPEED</label>
                        <select
                          value={commitDelay}
                          onChange={(e) => setCommitDelay(Number(e.target.value))}
                          className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl text-xs font-mono-code text-indigo-600 p-2.5 outline-none cursor-pointer"
                        >
                          <option value={1200}>Fast (1.2s)</option>
                          <option value={1800}>Medium (1.8s)</option>
                          <option value={2500}>Slow (2.5s)</option>
                          <option value={3500}>Extra Slow (3.5s)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between border-t border-[#E6DDC9] pt-5 mt-2">
                    <div>
                      {saveSuccess && (
                        <div className="text-[10px] font-mono-code text-emerald-600 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg animate-fade-in">
                          <span className="material-symbols-outlined text-xs animate-bounce">check_circle</span>
                          <span>Settings successfully synchronized!</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-display font-bold text-xs rounded-xl transition-all shadow-[0_0_12px_rgba(99,102,241,0.2)] flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isSaving ? 'progress_activity' : 'save'}
                      </span>
                      {isSaving ? 'Saving Profile...' : 'Save Profile Details'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab Panel 2: Contact Support Form */}
            {activeTab === 'support' && (
              <div className="p-6 flex flex-col gap-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-body mb-2">
                  Submit technical feedback, register bugs, or reach out to caregiver support engineers.
                </p>

                <form onSubmit={handleSupportSubmit} className="flex flex-col gap-4 max-w-lg">
                  {supportError && (
                    <div className="text-[11px] font-mono-code text-rose-600 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg flex items-start gap-1.5 animate-pulse">
                      <span className="material-symbols-outlined text-xs mt-0.5">error</span>
                      <span>{supportError}</span>
                    </div>
                  )}

                  {supportSuccess && (
                    <div className="text-[11px] font-mono-code text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-lg flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-xs mt-0.5">check_circle</span>
                      <span>Support ticket submitted! Caregiver response time is typically under 1 hour.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono-code text-slate-500 font-bold">YOUR NAME</label>
                      <input
                        type="text"
                        value={supportName}
                        onChange={(e) => setSupportName(e.target.value)}
                        placeholder="Sachin Gupta"
                        className="bg-[#EFE8D8] border border-[#E6DDC9] focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-mono-code text-slate-800 outline-none"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono-code text-slate-500 font-bold">EMAIL ADDRESS</label>
                      <input
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        placeholder="sachingupta@gmail.com"
                        className="bg-[#EFE8D8] border border-[#E6DDC9] focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-mono-code text-slate-800 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono-code text-slate-500 font-bold">MESSAGE CONTENT</label>
                    <textarea
                      rows={5}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe the technical assistance or support you need..."
                      className="bg-[#EFE8D8] border border-[#E6DDC9] focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono-code text-slate-800 outline-none resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingSupport}
                    className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-display font-bold text-xs rounded-xl transition-all shadow-[0_0_12px_rgba(99,102,241,0.2)] flex items-center justify-center gap-1.5 max-w-xs active:scale-95 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isSubmittingSupport ? 'progress_activity' : 'send'}
                    </span>
                    {isSubmittingSupport ? 'Submitting Form...' : 'Submit Support Request'}
                  </button>
                </form>
              </div>
            )}

            {/* Tab Panel 3: Caregiver Logs / Admin Dashboard */}
            {activeTab === 'admin' && (
              <div className="p-6 flex flex-col gap-5 animate-fade-in flex-grow">
                <div className="flex justify-between items-center border-b border-[#E6DDC9] pb-2">
                  <div>
                    <h4 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wide">
                      Admin Distress & Support Center
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono-code mt-0.5">
                      Monitor patient status, active/previous SOS signals, and incoming support forms.
                    </p>
                  </div>
                  <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-md px-1.5 py-0.5 font-mono-code text-[8px] font-bold">
                    Armed & Auditable
                  </span>
                </div>

                {isAdminLoading ? (
                  <div className="flex-grow flex items-center justify-center font-mono-code text-xs text-slate-400 gap-2 py-12">
                    <span className="material-symbols-outlined text-base animate-spin">sync</span>
                    RETRIEVING SECURED SERVER LOGS...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-grow">
                    {/* SOS distress alerts list (7 cols) */}
                    <div className="md:col-span-7 flex flex-col gap-3">
                      <span className="text-[9px] font-mono-code text-slate-500 font-bold uppercase tracking-wider block">
                        🚨 Dispatched SOS Signals ({sosAlerts.length})
                      </span>
                      
                      <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                        {sosAlerts.map((alert: any) => (
                          <div key={alert.id} className="p-3 bg-[#EFE8D8] rounded-xl border border-[#E6DDC9] flex flex-col gap-1 text-[11px] font-mono-code text-slate-700">
                            <div className="flex justify-between items-center border-b border-[#E6DDC9]/40 pb-1.5 mb-1">
                              <span className="text-rose-600 font-bold font-display text-[10px] uppercase">
                                STATUS: {alert.status}
                              </span>
                              <span className="text-slate-400 text-[9px]">
                                {new Date(alert.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 leading-normal mb-1">"{alert.message}"</p>
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Position: {alert.latitude.toFixed(4)}°N, {alert.longitude.toFixed(4)}°E</span>
                              <a 
                                href={`https://www.openstreetmap.org/?mlat=${alert.latitude}&mlon=${alert.longitude}#map=15/${alert.latitude}/${alert.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                <span className="material-symbols-outlined text-[11px]">map</span>
                                Track Map
                              </a>
                            </div>
                          </div>
                        ))}

                        {sosAlerts.length === 0 && (
                          <div className="text-center py-8 text-xs italic text-slate-400 bg-[#EFE8D8]/40 rounded-xl border border-dashed border-[#E6DDC9]">
                            No distress signals logged.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Support feedback logs list (5 cols) */}
                    <div className="md:col-span-5 flex flex-col gap-3">
                      <span className="text-[9px] font-mono-code text-slate-500 font-bold uppercase tracking-wider block">
                        ✉️ support requests ({supportRequests.length})
                      </span>

                      <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                        {supportRequests.map((req: any) => (
                          <div key={req.id} className="p-2.5 bg-[#EFE8D8] rounded-xl border border-[#E6DDC9] flex flex-col gap-1 text-[10px] font-mono-code text-slate-700">
                            <div className="flex flex-col gap-0.5 border-b border-[#E6DDC9]/40 pb-1 mb-1">
                              <span className="font-bold text-slate-800 text-xs">{req.name}</span>
                              <span className="text-slate-400 text-[9px] truncate">{req.email}</span>
                            </div>
                            <p className="text-slate-700 leading-normal italic">"{req.message}"</p>
                            <span className="text-slate-400 text-[8px] mt-1 text-right">
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}

                        {supportRequests.length === 0 && (
                          <div className="text-center py-8 text-xs italic text-slate-400 bg-[#EFE8D8]/40 rounded-xl border border-dashed border-[#E6DDC9]">
                            No support forms recorded.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 Cols) - Hardware, Launch, System Logs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Diagnostics */}
          <div className="bg-[#FCFAF4] p-5 rounded-2xl border border-[#E6DDC9] flex flex-col gap-3">
            <h3 className="font-display font-bold text-xs text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E6DDC9] pb-2">
              <span className="material-symbols-outlined text-sm">settings_suggest</span>
              Hardware Diagnostics
            </h3>
            
            <div className="flex flex-col gap-2 text-[11px] font-mono-code text-slate-700">
              <div className="flex justify-between items-center bg-[#EFE8D8] p-2 rounded-lg border border-[#E6DDC9]">
                <span>FACIAL TRACKING WEBCAM</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Connected
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#EFE8D8] p-2 rounded-lg border border-[#E6DDC9]">
                <span>SPEECH SYNTHESIS ENGINE</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#EFE8D8] p-2 rounded-lg border border-[#E6DDC9]">
                <span>MEDIAPIPE NEURAL RUNTIME</span>
                <span className="text-indigo-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Standby
                </span>
              </div>
            </div>
          </div>

          {/* Quick Tab Launcher */}
          <div className="bg-[#FCFAF4] p-5 rounded-2xl border border-[#E6DDC9] flex flex-col gap-3.5">
            <h3 className="font-display font-bold text-xs text-slate-500 uppercase tracking-wider border-b border-[#E6DDC9] pb-2">
              Launch Modality
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectTab('blink')}
                className="bg-[#EFE8D8] hover:bg-[#E6DDC9] p-3 rounded-xl border border-[#E6DDC9] hover:border-indigo-500/20 text-center flex flex-col items-center gap-1 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg text-emerald-600">visibility</span>
                <span className="text-[10px] font-mono-code font-bold text-slate-700">Blink Morse</span>
              </button>
              <button
                onClick={() => onSelectTab('sign')}
                className="bg-[#EFE8D8] hover:bg-[#E6DDC9] p-3 rounded-xl border border-[#E6DDC9] hover:border-indigo-500/20 text-center flex flex-col items-center gap-1 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg text-indigo-600">front_hand</span>
                <span className="text-[10px] font-mono-code font-bold text-slate-700">Sign Gestures</span>
              </button>
              <button
                onClick={() => onSelectTab('tts')}
                className="bg-[#EFE8D8] hover:bg-[#E6DDC9] p-3 rounded-xl border border-[#E6DDC9] hover:border-indigo-500/20 text-center flex flex-col items-center gap-1 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg text-amber-600">record_voice_over</span>
                <span className="text-[10px] font-mono-code font-bold text-slate-700">Quick TTS</span>
              </button>
              <button
                onClick={() => onSelectTab('morse')}
                className="bg-[#EFE8D8] hover:bg-[#E6DDC9] p-3 rounded-xl border border-[#E6DDC9] hover:border-indigo-500/20 text-center flex flex-col items-center gap-1 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg text-rose-600">keyboard</span>
                <span className="text-[10px] font-mono-code font-bold text-slate-700">Morse Tap</span>
              </button>
            </div>
          </div>

          {/* System Notifications Log Panel */}
          <div className="bg-[#FCFAF4] p-5 rounded-2xl border border-[#E6DDC9] flex flex-col gap-3">
            <h3 className="font-display font-bold text-xs text-slate-500 uppercase tracking-wider border-b border-[#E6DDC9] pb-2">
              System Notifications
            </h3>
            
            <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto text-[9px] font-mono-code text-slate-500">
              {notifications.map((note, index) => (
                <div key={index} className="flex gap-2 items-start py-0.5">
                  <span className="text-indigo-600 select-none">&gt;</span>
                  <span className="leading-normal">{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log (Speech History) */}
          <div className="bg-[#FCFAF4] p-5 rounded-2xl border border-[#E6DDC9] flex flex-col gap-3 flex-grow">
            <h3 className="font-display font-bold text-xs text-slate-500 uppercase tracking-wider flex justify-between items-center border-b border-[#E6DDC9] pb-2">
              <span>Speech History</span>
              <span className="text-[9px] font-mono-code text-slate-400">{recentPhrases.length} logs</span>
            </h3>

            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {recentPhrases.map((item) => (
                <div key={item.id} className="p-2.5 bg-[#EFE8D8] rounded-xl border border-[#E6DDC9] flex items-center justify-between gap-2 hover:bg-[#E6DDC9] transition-colors">
                  <div className="flex flex-col gap-0.5 truncate flex-grow">
                    <span className="text-xs font-medium text-slate-800 truncate">{item.text}</span>
                    <span className="text-[9px] font-mono-code text-slate-400 uppercase">{item.mode} • {item.timestamp}</span>
                  </div>
                  <button
                    onClick={() => speakText(item.text.replace(/"/g, ''))}
                    className="w-7 h-7 bg-[#FCFAF4] hover:bg-indigo-600 hover:text-white rounded-lg flex items-center justify-center text-slate-500 transition-colors border border-[#E6DDC9]"
                  >
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                  </button>
                </div>
              ))}
              {recentPhrases.length === 0 && (
                <span className="text-xs italic text-slate-400 text-center py-4">No speech logged yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
