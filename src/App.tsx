import { useState, useEffect, lazy, Suspense } from 'react';
import { NavTab, RecentPhrase } from './types';
import { INITIAL_RECENT_PHRASES } from './data';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthPortal } from './components/AuthPortal';
import { ToastContainer, ToastMessage } from './components/Toast';

// Route-level code splitting for heavy assistive & MediaPipe WASM modules
const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));
const BlinkToText = lazy(() => import('./components/BlinkToText').then((m) => ({ default: m.BlinkToText })));
const SignLanguage = lazy(() => import('./components/SignLanguage').then((m) => ({ default: m.SignLanguage })));
const MorseTranslator = lazy(() => import('./components/MorseTranslator').then((m) => ({ default: m.MorseTranslator })));
const TextToSpeech = lazy(() => import('./components/TextToSpeech').then((m) => ({ default: m.TextToSpeech })));
const RemoteReceiver = lazy(() => import('./components/RemoteReceiver').then((m) => ({ default: m.RemoteReceiver })));
const RemoteSender = lazy(() => import('./components/RemoteSender').then((m) => ({ default: m.RemoteSender })));
const SosModal = lazy(() => import('./components/SosModal').then((m) => ({ default: m.SosModal })));

const ModuleLoader = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex-1 flex flex-col items-center justify-center p-12 gap-3 text-slate-500 font-mono-code text-xs"
  >
    <span className="material-symbols-outlined text-3xl text-indigo-600 animate-spin">progress_activity</span>
    <span>LOADING ASSISTIVE MODULE...</span>
  </div>
);

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [recentPhrases, setRecentPhrases] = useState<RecentPhrase[]>(INITIAL_RECENT_PHRASES);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);

  // Global Auth State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [patient, setPatient] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Network Connectivity State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true
  );

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, duration = 4000) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message, duration }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // High-Contrast Mode State (persisted in localStorage)
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('echolytix_high_contrast') === 'true';
  });

  const toggleHighContrast = () => {
    setIsHighContrast((prev) => {
      const next = !prev;
      localStorage.setItem('echolytix_high_contrast', String(next));
      announce(next ? 'High contrast accessibility mode activated.' : 'Standard contrast mode restored.');
      addToast('info', next ? 'High contrast mode enabled.' : 'Standard contrast mode restored.');
      return next;
    });
  };

  // Monitor Network Connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      announce('Network connection restored. Syncing active.');
      addToast('success', 'Connection restored — System back online.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      announce('Network connection offline. Vision models running on-device.');
      addToast('warning', 'Network offline — Local vision & TTS remain active.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Assistive Accessibility Live Region State
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const announce = (message: string) => {
    setLiveAnnouncement(message);
  };

  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    announce(`Switched to ${tab} mode.`);
  };

  // Global Accessibility Keyboard Navigation (Alt+1..6, Alt+E, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSosOpen) {
        setIsSosOpen(false);
        announce('Emergency SOS dialog dismissed.');
        return;
      }

      // Do not intercept hotkeys when editing inputs, textareas, or contentEditable nodes
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );
      if (isInput) return;

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === '1' || key === 'd') {
          e.preventDefault();
          handleSelectTab('dashboard');
        } else if (key === '2' || key === 'b') {
          e.preventDefault();
          if (isLoggedIn) {
            handleSelectTab('blink');
          } else {
            handleSelectTab('dashboard');
            announce('Authentication required to access Blink mode.');
          }
        } else if (key === '3' || key === 's') {
          e.preventDefault();
          if (isLoggedIn) {
            handleSelectTab('sign');
          } else {
            handleSelectTab('dashboard');
            announce('Authentication required to access Sign language mode.');
          }
        } else if (key === '4' || key === 'm') {
          e.preventDefault();
          if (isLoggedIn) {
            handleSelectTab('morse');
          } else {
            handleSelectTab('dashboard');
            announce('Authentication required to access Morse mode.');
          }
        } else if (key === '5' || key === 't') {
          e.preventDefault();
          if (isLoggedIn) {
            handleSelectTab('tts');
          } else {
            handleSelectTab('dashboard');
            announce('Authentication required to access Text-to-Speech mode.');
          }
        } else if (key === '6' || key === 'r') {
          e.preventDefault();
          if (isLoggedIn) {
            handleSelectTab('remote');
          } else {
            handleSelectTab('dashboard');
            announce('Authentication required to access Remote receiver mode.');
          }
        } else if (key === 'e') {
          e.preventDefault();
          if (isLoggedIn) {
            setIsSosOpen(prev => {
              const nextState = !prev;
              announce(nextState ? 'Emergency SOS alert dialog opened.' : 'Emergency SOS dialog closed.');
              return nextState;
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoggedIn, isSosOpen]);

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
        <Suspense fallback={<ModuleLoader />}>
          <RemoteSender
            code={remoteSenderCode}
            onDisconnect={() => {
              setRemoteSenderCode(null);
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
          />
        </Suspense>
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
    <div className={`min-h-screen bg-[#F3EDDF] text-slate-900 font-body flex flex-col antialiased selection:bg-indigo-600 selection:text-white ${isHighContrast ? 'high-contrast' : ''}`}>
      {/* WCAG Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white text-xs font-mono-code font-bold transition-all"
      >
        Skip to main content
      </a>

      {/* Screen Reader ARIA Live Status Announcement Region */}
      <div
        id="a11y-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>

      {/* Top AppBar Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenSos={() => {
          if (isLoggedIn) {
            setIsSosOpen(true);
            announce('Emergency SOS alert dialog opened.');
          } else {
            handleSelectTab('dashboard');
          }
        }}
        isLoggedIn={isLoggedIn}
        patientName={patient?.name}
        isHighContrast={isHighContrast}
        onToggleHighContrast={toggleHighContrast}
      />

      {/* Network Offline Alert Banner */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500/90 backdrop-blur-md text-amber-950 px-4 py-2 text-xs font-mono-code font-bold flex items-center justify-center gap-2 border-b border-amber-600/30 sticky top-16 z-40 animate-fade-in shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">wifi_off</span>
          <span>Offline Mode — MediaPipe vision & speech synthesis running locally on-device.</span>
        </div>
      )}

      {/* Main View Port */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col focus:outline-none">
        <ErrorBoundary>
          {!isLoggedIn ? (
            <AuthPortal onLoginSuccess={handleLoginSuccess} />
          ) : (
            <Suspense fallback={<ModuleLoader />}>
              {currentTab === 'dashboard' && (
                <Dashboard
                  onSelectTab={handleSelectTab}
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
                  onOpenSos={() => {
                    setIsSosOpen(true);
                    announce('Emergency SOS alert dialog opened.');
                  }}
                />
              )}
            </Suspense>
          )}
        </ErrorBoundary>
      </main>

      {/* Floating Bottom Navigation Bar (Mobile View) */}
      <BottomNavBar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isLoggedIn={isLoggedIn}
      />

      {/* Emergency SOS Modal */}
      {isLoggedIn && isSosOpen && (
        <Suspense fallback={null}>
          <SosModal isOpen={isSosOpen} onClose={() => {
            setIsSosOpen(false);
            announce('Emergency SOS dialog dismissed.');
          }} />
        </Suspense>
      )}

      {/* Non-blocking Toast Alerts Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
