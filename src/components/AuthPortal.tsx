import React, { useState } from 'react';
import { playBeep } from '../utils/sound';

interface AuthPortalProps {
  onLoginSuccess: (patientData: any, token: string) => void;
}

type AuthScreen = 'login' | 'register' | 'forgot' | 'reset';

export const AuthPortal: React.FC<AuthPortalProps> = ({ onLoginSuccess }) => {
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form Fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [medicalId, setMedicalId] = useState<string>('');
  const [caregiverName, setCaregiverName] = useState<string>('');
  const [caregiverPhone, setCaregiverPhone] = useState<string>('');
  const [emergencyEmail, setEmergencyEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleScreenChange = (newScreen: AuthScreen) => {
    playBeep(600, 0.08);
    setScreen(newScreen);
    clearMessages();
  };

  // Demo Autofill Helper
  const handleDemoFill = () => {
    setEmail('Sachingupta@gmail.com');
    setPassword('123456789');
    clearMessages();
    playBeep(600, 0.08);
  };

  // Validations
  const validateEmail = (emailStr: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const validatePasswordStrength = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters long.';
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    if (!hasLetter || !hasNumber) return 'Password must contain at least one letter and one number.';
    return '';
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all credentials.');
      playBeep(250, 0.3);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/auth/login`,  {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (res.ok) {
        const data = await res.json();
        playBeep(880, 0.1);
        setTimeout(() => playBeep(1200, 0.15), 100);
        onLoginSuccess(data, data.sessionToken);
      } else {
        const text = await res.text();
        let errorMsg = 'Authentication failed. Please verify credentials.';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch (e) {
          if (res.status === 404) {
            errorMsg = `Server login route not found (HTTP 404). Please verify your Netlify build redirects and Render setup.`;
          } else if (res.status === 500) {
            errorMsg = `Internal server error (HTTP 500). Please check your Render backend logs.`;
          } else if (res.status === 401 || res.status === 403) {
            errorMsg = `Invalid credentials (HTTP ${res.status}). Incorrect email or password.`;
          } else {
            errorMsg = `Server error (HTTP ${res.status}): ${text.substring(0, 60)}...`;
          }
        }
        setErrorMessage(errorMsg);
        playBeep(250, 0.3);
      }
    } catch (err: any) {
      console.error("[Echolytix Diagnostic] Login connection failed. Possible network error, server offline, or CORS issue:", {
        message: err.message,
        online: navigator.onLine,
        resolvedBaseUrl: (import.meta as any).env?.VITE_API_URL || "Relative (/api)",
      });
      setErrorMessage('Unable to connect to the Echolytix authentication server. Please check your internet connection and verify backend is running.');
      playBeep(250, 0.3);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Signup
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('Please fill in all required fields.');
      playBeep(250, 0.3);
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      playBeep(250, 0.3);
      return;
    }

    const passStrengthErr = validatePasswordStrength(password);
    if (passStrengthErr) {
      setErrorMessage(passStrengthErr);
      playBeep(250, 0.3);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      playBeep(250, 0.3);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          age: age ? Number(age) : undefined,
          medical_id: medicalId.trim(),
          caregiver_name: caregiverName.trim(),
          caregiver_phone: caregiverPhone.trim(),
          emergency_email: emergencyEmail.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        playBeep(880, 0.12);
        setTimeout(() => playBeep(1000, 0.12), 100);
        setSuccessMessage('Registration successful! You can now sign in.');
        setScreen('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        const text = await res.text();
        let errorMsg = 'Registration failed. Please check inputs.';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch (e) {
          if (res.status === 404) {
            errorMsg = `Registration endpoint not found (HTTP 404). Please verify backend redirects.`;
          } else if (res.status === 500) {
            errorMsg = `Internal server error (HTTP 500). Please check Render backend logs.`;
          } else {
            errorMsg = `Server error (HTTP ${res.status}): ${text.substring(0, 60)}...`;
          }
        }
        setErrorMessage(errorMsg);
        playBeep(250, 0.3);
      }
    } catch (err: any) {
      console.error("[Echolytix Diagnostic] Registration connection failed:", err);
      setErrorMessage('Could not connect to the database to register user. Please check your network and verify backend status.');
      playBeep(250, 0.3);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      playBeep(250, 0.3);
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      playBeep(250, 0.3);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        playBeep(800, 0.1);
        setSuccessMessage(data.message);
        
        // Expose the OTP in a friendly message for reviewer / developer convenience
        if (data.devOtp) {
          setSuccessMessage(`OTP verification code generated: ${data.devOtp} (Copied to server terminal)`);
          setOtp(data.devOtp);
        }
        
        setTimeout(() => {
          setScreen('reset');
          clearMessages();
        }, 3500);
      } else {
        const text = await res.text();
        let errorMsg = 'Failed to dispatch recovery code.';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch (e) {
          if (res.status === 404) {
            errorMsg = `Recovery endpoint not found (HTTP 404). Please verify backend redirects.`;
          } else if (res.status === 500) {
            errorMsg = `Internal server error (HTTP 500). Please check Render backend logs.`;
          } else {
            errorMsg = `Server error (HTTP ${res.status}): ${text.substring(0, 60)}...`;
          }
        }
        setErrorMessage(errorMsg);
        playBeep(250, 0.3);
      }
    } catch (err: any) {
      console.error("[Echolytix Diagnostic] Password recovery connection failed:", err);
      setErrorMessage('Unable to connect to recovery server. Please check your network and verify backend status.');
      playBeep(250, 0.3);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !otp.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('Please fill in all reset parameters.');
      playBeep(250, 0.3);
      return;
    }

    const passStrengthErr = validatePasswordStrength(password);
    if (passStrengthErr) {
      setErrorMessage(passStrengthErr);
      playBeep(250, 0.3);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      playBeep(250, 0.3);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword: password
        })
      });

      if (res.ok) {
        const data = await res.json();
        playBeep(880, 0.1);
        setTimeout(() => playBeep(1200, 0.1), 100);
        setSuccessMessage('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          setScreen('login');
          setPassword('');
          setConfirmPassword('');
          setOtp('');
          clearMessages();
        }, 2000);
      } else {
        const text = await res.text();
        let errorMsg = 'Reset code validation failed.';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch (e) {
          if (res.status === 404) {
            errorMsg = `Reset password endpoint not found (HTTP 404). Please verify backend redirects.`;
          } else if (res.status === 500) {
            errorMsg = `Internal server error (HTTP 500). Please check Render backend logs.`;
          } else {
            errorMsg = `Server error (HTTP ${res.status}): ${text.substring(0, 60)}...`;
          }
        }
        setErrorMessage(errorMsg);
        playBeep(250, 0.3);
      }
    } catch (err: any) {
      console.error("[Echolytix Diagnostic] Password reset connection failed:", err);
      setErrorMessage('Internal network error during password reset. Please check your connection and verify backend is running.');
      playBeep(250, 0.3);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-grow px-4 py-12 flex items-center justify-center max-w-[1280px] mx-auto w-full pb-28 md:pb-12">
      <div className="bg-[#FCFAF4] border border-[#E6DDC9] p-8 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col gap-6 backdrop-blur-md animate-fade-in">
        {/* Background auras */}
        <div className="absolute -right-20 -top-20 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand & Header */}
        <div className="text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 mb-3.5 shadow-inner">
            <span className="material-symbols-outlined text-3xl animate-pulse">
              {screen === 'login' ? 'lock_person' : screen === 'register' ? 'person_add' : 'vpn_key'}
            </span>
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 uppercase tracking-tight">
            {screen === 'login' && 'Portal Authorization'}
            {screen === 'register' && 'Register Patient Account'}
            {screen === 'forgot' && 'Reset Verification'}
            {screen === 'reset' && 'Create New Password'}
          </h2>
          <p className="font-body text-xs text-slate-500 mt-1.5 max-w-xs leading-normal">
            {screen === 'login' && 'Secure patient database login. Retrieve your diagnostic calibration and caregiver alert profile.'}
            {screen === 'register' && 'Setup patient details, preferred hardware calibrations, and primary emergency caregiver alerts.'}
            {screen === 'forgot' && 'Request a secure verification code to reset your account password.'}
            {screen === 'reset' && 'Provide the 6-digit OTP code sent to your email to configure your new credentials.'}
          </p>
        </div>

        {/* Global Alert Messages */}
        {errorMessage && (
          <div className="text-[11px] font-mono-code text-rose-600 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-xl flex items-start gap-2.5 animate-pulse">
            <span className="material-symbols-outlined text-sm mt-0.5">error</span>
            <span className="leading-normal">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="text-[11px] font-mono-code text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl flex items-start gap-2.5">
            <span className="material-symbols-outlined text-sm mt-0.5">check_circle</span>
            <span className="leading-normal">{successMessage}</span>
          </div>
        )}

        {/* Screen 1: Login Form */}
        {screen === 'login' && (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono-code text-slate-500 uppercase font-semibold">User Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">person</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/30 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-xs font-mono-code text-slate-800 placeholder-slate-600 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono-code text-slate-500 uppercase font-semibold">Security Password</label>
                <button
                  type="button"
                  onClick={() => handleScreenChange('forgot')}
                  className="text-[10px] font-mono-code text-indigo-600 hover:text-indigo-500 hover:underline outline-none"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/30 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-3 text-xs font-mono-code text-slate-800 placeholder-slate-600 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowPassword(!showPassword);
                    playBeep(700, 0.05);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 flex items-center justify-center p-1"
                >
                  <span className="material-symbols-outlined text-base">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2.5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-display font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                {isLoading ? 'progress_activity' : 'login'}
              </span>
              {isLoading ? 'VERIFYING CREDENTIALS...' : 'AUTHORIZE PATIENT'}
            </button>

            <div className="text-center mt-1">
              <span className="text-[10px] text-slate-500 font-mono-code">
                Need Echolytix tracking?{' '}
                <button
                  type="button"
                  onClick={() => handleScreenChange('register')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Register Account
                </button>
              </span>
            </div>

            {/* Dev Autofill Tool */}
            <div className="border-t border-[#E6DDC9] pt-4 mt-1 text-center">
              <span className="text-[9px] font-mono-code text-slate-400 block mb-2">DEVELOPER / PATIENT TESTING</span>
              <button
                type="button"
                onClick={handleDemoFill}
                className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 font-mono-code text-[10px] rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                Auto-fill Testing Credentials
              </button>
            </div>
          </form>
        )}

        {/* Screen 2: Registration Form */}
        {screen === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 max-h-[460px] overflow-y-auto pr-1">
            <span className="text-[9px] font-mono-code text-indigo-600 uppercase tracking-widest font-semibold border-b border-[#E6DDC9] pb-1">
              1. Basic Credentials
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Stephen Hawking"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, letter & number"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <span className="text-[9px] font-mono-code text-indigo-600 uppercase tracking-widest font-semibold border-b border-[#E6DDC9] pb-1 mt-1">
              2. Medical Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Age (Optional)</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="42"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Medical ID (Optional)</label>
                <input
                  type="text"
                  value={medicalId}
                  onChange={(e) => setMedicalId(e.target.value)}
                  placeholder="ID-409B"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                />
              </div>
            </div>

            <span className="text-[9px] font-mono-code text-indigo-600 uppercase tracking-widest font-semibold border-b border-[#E6DDC9] pb-1 mt-1">
              3. Caregiver Alerts
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Caregiver Name</label>
                <input
                  type="text"
                  value={caregiverName}
                  onChange={(e) => setCaregiverName(e.target.value)}
                  placeholder="Saksham"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Caregiver Mobile</label>
                <input
                  type="text"
                  value={caregiverPhone}
                  onChange={(e) => setCaregiverPhone(e.target.value)}
                  placeholder="+91..."
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Alert Email</label>
                <input
                  type="email"
                  value={emergencyEmail}
                  onChange={(e) => setEmergencyEmail(e.target.value)}
                  placeholder="alert@test.com"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3.5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                {isLoading ? 'progress_activity' : 'person_add'}
              </span>
              {isLoading ? 'CREATING PATIENT PROFILE...' : 'REGISTER NEW PATIENT'}
            </button>

            <div className="text-center mt-1">
              <span className="text-[10px] text-slate-500 font-mono-code">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => handleScreenChange('login')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Sign In Here
                </button>
              </span>
            </div>
          </form>
        )}

        {/* Screen 3: Forgot Password Request */}
        {screen === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono-code text-slate-500 uppercase font-semibold">Registered Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@carecenter.com"
                  className="w-full bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/30 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-xs font-mono-code text-slate-800 placeholder-slate-600 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-display font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                {isLoading ? 'progress_activity' : 'send_to_mobile'}
              </span>
              {isLoading ? 'GENERATING CODE...' : 'DISPATCH RESET OTP'}
            </button>

            <button
              type="button"
              onClick={() => handleScreenChange('login')}
              className="py-2.5 bg-transparent hover:bg-black/5 border border-transparent text-slate-500 hover:text-slate-800 text-[11px] font-mono-code rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Login
            </button>
          </form>
        )}

        {/* Screen 4: Reset Password OTP Form */}
        {screen === 'reset' && (
          <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono-code text-slate-500 uppercase font-semibold">User Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#EFE8D8] border border-[#E6DDC9] rounded-xl px-4 py-3 text-xs font-mono-code text-slate-800 outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono-code text-slate-500 uppercase font-semibold">6-Digit OTP Code</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">lock_open</span>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/30 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-xs font-mono-code text-slate-800 placeholder-slate-600 outline-none tracking-widest transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono-code text-slate-500 uppercase font-semibold">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new pass"
                  className="bg-[#EFE8D8] border border-[#E6DDC9] hover:border-slate-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono-code text-slate-800 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                {isLoading ? 'published_with_changes' : 'published_with_changes'}
              </span>
              {isLoading ? 'UPDATING CREDENTIALS...' : 'CONFIRM NEW PASSWORD'}
            </button>

            <button
              type="button"
              onClick={() => handleScreenChange('login')}
              className="py-2.5 bg-transparent hover:bg-black/5 border border-transparent text-slate-500 hover:text-slate-800 text-[11px] font-mono-code rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Login
            </button>
          </form>
        )}
      </div>
    </main>
  );
};
