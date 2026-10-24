import React, { useState, useEffect } from 'react';

interface LaunchScreenProps {
  onFinish: () => void;
}

export const LaunchScreen: React.FC<LaunchScreenProps> = ({ onFinish }) => {
  const [isScaled, setIsScaled] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger smooth scale-up right after mount
    const scaleTimer = setTimeout(() => {
      setIsScaled(true);
    }, 40);

    // Fade out exit transition
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1900);

    // Finish and dismiss
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2350);

    return () => {
      clearTimeout(scaleTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#000a24] text-white select-none transition-opacity duration-500 ease-out cursor-pointer ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle ambient background glow */}
      <div className="absolute w-80 h-80 sm:w-[32rem] sm:h-[32rem] rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse" />

      {/* Main smooth scale-up container */}
      <div
        className={`relative flex flex-col items-center justify-center px-4 text-center transition-all duration-1000 ease-out transform ${
          isScaled
            ? 'scale-100 sm:scale-110 opacity-100 translate-y-0'
            : 'scale-50 opacity-0 translate-y-6'
        }`}
      >
        {/* SikaManager Big Scale-Up Heading */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
          SikaManager
        </h1>

        {/* Subtitle */}
        <p
          className={`mt-4 text-xs sm:text-sm uppercase tracking-[0.25em] text-slate-400 font-semibold transition-all duration-700 ${
            isScaled ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-3'
          }`}
        >
          Personal Cash Tracker
        </p>

        {/* Subtle bouncing indicator dots */}
        <div
          className={`mt-6 flex items-center justify-center gap-2 transition-all duration-700 ${
            isScaled ? 'opacity-100 delay-500' : 'opacity-0'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
