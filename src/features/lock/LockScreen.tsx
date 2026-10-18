import React, { useState, useEffect } from 'react';
import { verifyPasscode } from '@/crypto/passcode';
import { triggerHaptic } from '@/lib/haptics';
import { Lock, Delete, Fingerprint, ShieldAlert } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
  passcodeHash: string;
  biometricEnabled?: boolean;
}

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

export const LockScreen: React.FC<LockScreenProps> = ({
  onUnlock,
  passcodeHash,
  biometricEnabled = false,
}) => {
  const [pin, setPin] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Check WebAuthn platform authenticator availability
  useEffect(() => {
    async function checkBiometrics() {
      if (
        biometricEnabled &&
        typeof window !== 'undefined' &&
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      ) {
        try {
          const available =
            await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available);
          if (available) {
            triggerBiometricAuth();
          }
        } catch {
          setBiometricAvailable(false);
        }
      }
    }
    checkBiometrics();
  }, [biometricEnabled]);

  // Handle countdown timer if locked out
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Auto-verify when 4 or more digits entered
  useEffect(() => {
    if (pin.length >= 4 && cooldownSeconds <= 0) {
      handleVerify(pin);
    }
  }, [pin, cooldownSeconds]);

  async function handleVerify(candidate: string) {
    try {
      const isMatch = await verifyPasscode(candidate, passcodeHash);
      if (isMatch) {
        triggerHaptic();
        setErrorMsg(null);
        setFailedAttempts(0);
        onUnlock();
      } else {
        triggerHaptic();
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        if (nextFailed >= MAX_FAILED_ATTEMPTS) {
          setCooldownSeconds(COOLDOWN_SECONDS);
          setErrorMsg(`Too many failed attempts. Try again in ${COOLDOWN_SECONDS} seconds.`);
        } else {
          setErrorMsg(
            `Incorrect passcode. ${MAX_FAILED_ATTEMPTS - nextFailed} attempts remaining.`
          );
        }
        setPin('');
      }
    } catch {
      setErrorMsg('Verification error. Please retry.');
      setPin('');
    }
  }

  async function triggerBiometricAuth() {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return;
    try {
      // In a pure local-first environment without server challenges,
      // we check platform authenticator availability and perform client assertion
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // WebAuthn dummy credential request for user verification
      const cred = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
        },
      });

      if (cred) {
        triggerHaptic();
        onUnlock();
      }
    } catch {
      // User canceled or device doesn't have enrolled biometric; fail silently back to keypad
    }
  }

  function handleKeyPress(digit: string) {
    if (cooldownSeconds > 0) return;
    if (pin.length < 8) {
      triggerHaptic();
      setPin((prev) => prev + digit);
    }
  }

  function handleDelete() {
    if (cooldownSeconds > 0) return;
    triggerHaptic();
    setPin((prev) => prev.slice(0, -1));
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col justify-between items-center px-6 py-12 selection:bg-none">
      {/* Brand & Security Header */}
      <div className="flex flex-col items-center text-center mt-6 space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-surface-container-high flex items-center justify-center text-primary shadow-sm mb-2">
          <Lock className="w-8 h-8 text-secondary" />
        </div>
        <h1 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">
          SikaManger
        </h1>
        <p className="font-label-sm text-sm text-on-surface-variant">
          Enter your passcode to unlock your finances
        </p>
      </div>

      {/* Passcode Dots / Cooldown Indicator */}
      <div className="flex flex-col items-center space-y-4 my-auto">
        {cooldownSeconds > 0 ? (
          <div className="flex flex-col items-center bg-error-container/40 border border-error/30 rounded-2xl px-6 py-4 text-center max-w-xs">
            <ShieldAlert className="w-6 h-6 text-error mb-2 animate-bounce" />
            <p className="font-body-md-bold text-sm text-error">App Temporarily Locked</p>
            <p className="font-label-sm text-xs text-on-surface-variant mt-1">
              Please wait {cooldownSeconds}s before attempting again.
            </p>
          </div>
        ) : (
          <div
            className={`flex items-center gap-4 py-3 transition-transform ${
              isShaking ? 'animate-shake' : ''
            }`}
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    isFilled
                      ? 'bg-primary scale-110 shadow-sm'
                      : 'bg-surface-container-high border-2 border-outline-variant/50'
                  }`}
                />
              );
            })}
          </div>
        )}

        {errorMsg && (
          <p className="font-label-sm text-xs text-error font-medium text-center px-4 animate-fadeIn">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs pb-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={cooldownSeconds > 0}
              onClick={() => handleKeyPress(digit.toString())}
              className="h-16 rounded-2xl bg-surface-container-low hover:bg-surface-variant active:scale-95 text-primary font-headline-md text-2xl font-semibold flex items-center justify-center transition-all disabled:opacity-40"
            >
              {digit}
            </button>
          ))}

          {/* Biometric shortcut if available */}
          {biometricAvailable ? (
            <button
              type="button"
              disabled={cooldownSeconds > 0}
              onClick={triggerBiometricAuth}
              aria-label="Biometric unlock"
              className="h-16 rounded-2xl bg-surface-container-low hover:bg-surface-variant active:scale-95 text-secondary flex items-center justify-center transition-all disabled:opacity-40"
            >
              <Fingerprint className="w-7 h-7" />
            </button>
          ) : (
            <div className="h-16" />
          )}

          <button
            type="button"
            disabled={cooldownSeconds > 0}
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-surface-container-low hover:bg-surface-variant active:scale-95 text-primary font-headline-md text-2xl font-semibold flex items-center justify-center transition-all disabled:opacity-40"
          >
            0
          </button>

          <button
            type="button"
            disabled={cooldownSeconds > 0 || pin.length === 0}
            onClick={handleDelete}
            aria-label="Delete"
            className="h-16 rounded-2xl bg-surface-container-low hover:bg-surface-variant active:scale-95 text-on-surface-variant flex items-center justify-center transition-all disabled:opacity-30"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
