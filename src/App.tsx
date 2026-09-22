import { useState, useEffect } from 'react';
import { NavTab, RecentPhrase } from './types';
import { INITIAL_RECENT_PHRASES } from './data';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { Dashboard } from './components/Dashboard';
import { BlinkToText } from './components/BlinkToText';
import { SignLanguage } from './components/SignLanguage';
import { MorseTranslator } from './components/MorseTranslator';
import { TextToSpeech } from './components/TextToSpeech';
import { SosModal } from './components/SosModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthPortal } from './components/AuthPortal';
import { RemoteReceiver } from './components/RemoteReceiver';
import { RemoteSender } from './components/RemoteSender';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [recentPhrases, setRecentPhrases] = useState<RecentPhrase[]>(INITIAL_RECENT_PHRASES);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);

  // Global Auth State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [patient, setPatient] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Remote Sender State
  const [remoteSenderCode, setRemoteSenderCode] = useState<string | null>(null);

  // Extract remote-sender from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSender = params.get('remote-sender') === 'true';
    const code = params.get('code');
    if (isSender && code) {
      setRemoteSenderCode(code);
    }
  }, []);

  // Validate session on mount
  useEffect(() => {
    const token = localStorage.getItem('echolytix_session_token');
    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Session invalid or expired');
      })
      .then(data => {
        setPatient(data);
        setSessionToken(token);
        setIsLoggedIn(true);
      })
      .catch(err => {
        console.warn('Session verification failed:', err);
        localStorage.removeItem('echolytix_session_token');
        localStorage.removeItem('echolytix_logged_in');
        localStorage.removeItem('echolytix_patient');
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

  // Fetch recent phrases when logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    fetch('/api/phrases')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch phrases');
      })
      .then((data: RecentPhrase[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRecentPhrases(data);
        }
      })
      .catch(err => console.warn('Could not load phrase history:', err));
  }, [isLoggedIn]);

  // Handle Login Success
  const handleLoginSuccess = (patientData: any, token: string) => {
    localStorage.setItem('echolytix_session_token', token);
    localStorage.setItem('echolytix_logged_in', 'true');
    localStorage.setItem('echolytix_patient', JSON.stringify(patientData));
    
    // Sync local storage profile cache for other components
    localStorage.setItem('profile_patient_name', patientData.name || '');
    localStorage.setItem('profile_patient_age', String(patientData.age || ''));
    localStorage.setItem('profile_medical_id', patientData.medical_id || '');
    localStorage.setItem('profile_caregiver_name', patientData.caregiver_name || '');
    localStorage.setItem('profile_caregiver_phone', patientData.caregiver_phone || '');
    localStorage.setItem('profile_emergency_email', patientData.emergency_email || '');
    localStorage.setItem('profile_tts_speed', String(patientData.tts_speed || '1.0'));
    localStorage.setItem('profile_blink_threshold', String(patientData.blink_threshold || '0.18'));
    localStorage.setItem('profile_commit_delay', String(patientData.commit_delay || '1800'));

    setPatient(patientData);
    setSessionToken(token);
    setIsLoggedIn(true);
    setCurrentTab('dashboard');
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        });
      }
    } catch (e) {
      console.warn("Logout request failed:", e);
    } finally {
      localStorage.removeItem('echolytix_session_token');
      localStorage.removeItem('echolytix_logged_in');
      localStorage.removeItem('echolytix_patient');
      
      // Keep theme setting, but clear profile cache
      const theme = localStorage.getItem('theme');
      localStorage.clear();
      if (theme) localStorage.setItem('theme', theme);

      setPatient(null);
      setSessionToken(null);
      setIsLoggedIn(false);
      setCurrentTab('dashboard');
      setRecentPhrases(INITIAL_RECENT_PHRASES);
    }
  };

  // Profile Save Sync Callback
  const handleProfileUpdate = (updatedPatient: any) => {
    setPatient(updatedPatient);
    localStorage.setItem('echolytix_patient', JSON.stringify(updatedPatient));
  };

  // Save new phrase to Backend SQLite DB (Protected Route)
  const handleAddPhraseHistory = async (text: string, mode: RecentPhrase['mode']) => {
    try {
      const res = await fetch('/api/phrases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ text, mode })
      });

      if (res.ok) {
        const newEntry: RecentPhrase = await res.json();
        setRecentPhrases(prev => [newEntry, ...prev.filter(p => p.id !== newEntry.id)]);
      } else {
        // Fallback local update
        const fallback: RecentPhrase = {
          id: Date.now().toString(),
          text,
          mode,
          timestamp: 'Just now'
        };
        setRecentPhrases(prev => [fallback, ...prev.slice(0, 9)]);
      }
    } catch (err) {
      console.error('Error saving phrase to backend:', err);
      const fallback: RecentPhrase = {
        id: Date.now().toString(),
        text,
        mode,
        timestamp: 'Just now'
      };
      setRecentPhrases(prev => [fallback, ...prev.slice(0, 9)]);
    }
  };

  if (remoteSenderCode) {
    return (
      <ErrorBoundary>
        <RemoteSender
          code={remoteSenderCode}
          onDisconnect={() => {
            setRemoteSenderCode(null);
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
      </ErrorBoundary>
    );
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F3EDDF] text-slate-900 flex items-center justify-center font-mono-code text-xs">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-indigo-600 animate-spin">progress_activity</span>
          <span>ESTABLISHING SECURE CONNECTION...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3EDDF] text-slate-900 font-body flex flex-col antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top AppBar Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSos={() => {
          if (isLoggedIn) {
            setIsSosOpen(true);
          } else {
            setCurrentTab('dashboard');
          }
        }}
        isLoggedIn={isLoggedIn}
        patientName={patient?.name}
      />

      {/* Main View Port */}
      <div className="flex-1 flex flex-col">
        <ErrorBoundary>
          {!isLoggedIn ? (
            <AuthPortal onLoginSuccess={handleLoginSuccess} />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <Dashboard
                  onSelectTab={setCurrentTab}
                  recentPhrases={recentPhrases}
                  patient={patient}
                  sessionToken={sessionToken}
                  onLogout={handleLogout}
                  onProfileUpdate={handleProfileUpdate}
                />
              )}

              {currentTab === 'blink' && (
                <BlinkToText onAddPhraseHistory={handleAddPhraseHistory} />
              )}

              {currentTab === 'sign' && (
                <SignLanguage onAddPhraseHistory={handleAddPhraseHistory} />
              )}

              {currentTab === 'morse' && (
                <MorseTranslator onAddPhraseHistory={handleAddPhraseHistory} />
              )}

              {currentTab === 'tts' && (
                <TextToSpeech onAddPhraseHistory={handleAddPhraseHistory} />
              )}

              {currentTab === 'remote' && (
                <RemoteReceiver
                  onAddPhraseHistory={handleAddPhraseHistory}
                  onOpenSos={() => setIsSosOpen(true)}
                />
              )}
            </>
          )}
        </ErrorBoundary>
      </div>

      {/* Floating Bottom Navigation Bar (Mobile View) */}
      <BottomNavBar 
        currentTab={currentTab} 
        onSelectTab={setCurrentTab} 
        isLoggedIn={isLoggedIn}
      />

      {/* Emergency SOS Modal */}
      {isLoggedIn && (
        <SosModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} />
      )}
    </div>
  );
}
