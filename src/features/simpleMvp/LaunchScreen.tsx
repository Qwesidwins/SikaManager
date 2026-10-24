import React, { useState, useEffect } from 'react';
import { Wallet, Sparkles } from 'lucide-react';

interface LaunchScreenProps {
  onFinish: () => void;
}

export const LaunchScreen: React.FC<LaunchScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<'initial' | 'morph' | 'reveal' | 'exit'>('initial');

  useEffect(() => {
    // Phase 1 -> 2: Shape morphs into emblem
    const t1 = setTimeout(() => {
      setPhase('morph');
    }, 450);

    // Phase 2 -> 3: SikaManger brand text scales in & reveals
    const t2 = setTimeout(() => {
      setPhase('reveal');
    }, 1050);

    // Phase 3 -> 4: Exit transition
    const t3 = setTimeout(() => {
      setPhase('exit');
    }, 2000);

    // Finish and unmount
    const t4 = setTimeout(() => {
      onFinish();
    }, 2450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#000a24] text-white select-none transition-opacity duration-500 ease-out cursor-pointer ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background radial glow */}
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse" />

      {/* Central morphing emblem */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Morphing Shape */}
        <div
          className={`transition-all duration-700 ease-out flex items-center justify-center ${
            phase === 'initial'
              ? 'w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 scale-75 shadow-lg shadow-amber-500/40 rotate-12'
              : 'w-20 h-20 rounded-[28px] bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 scale-100 shadow-2xl shadow-amber-500/50 rotate-0'
          }`}
        >
          {phase === 'initial' ? (
            <div className="w-6 h-6 rounded-full bg-white/30 animate-ping" />
          ) : (
            <div className="flex items-center justify-center animate-in zoom-in-75 duration-300">
              <Wallet className="w-10 h-10 text-slate-950 stroke-[2.2]" />
            </div>
          )}
        </div>

        {/* Brand Text Reveal */}
        <div
          className={`mt-6 text-center transition-all duration-700 ease-out ${
            phase === 'reveal' || phase === 'exit'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-4 scale-95'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
              SikaManger
            </h1>
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          </div>

          <p className="text-xs uppercase tracking-widest text-slate-400 font-medium mt-1.5">
            Personal Cash Tracker
          </p>

          <div className="mt-4 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

