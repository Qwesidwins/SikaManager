import React, { useState, useEffect } from 'react';

interface LaunchScreenProps {
  onFinish: () => void;
}

const FULL_TEXT = 'SikaManager';

export const LaunchScreen: React.FC<LaunchScreenProps> = ({ onFinish }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isScaledUp, setIsScaledUp] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start scale up immediately
    const scaleTimer = setTimeout(() => {
      setIsScaledUp(true);
    }, 100);

    // Typewriter effect
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      currentIndex++;
      setDisplayedText(FULL_TEXT.slice(0, currentIndex));
      if (currentIndex >= FULL_TEXT.length) {
        clearInterval(typeInterval);
        setIsTypingDone(true);
      }
    }, 75);

    // Exit transition
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2100);

    // Finish callback
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(scaleTimer);
      clearInterval(typeInterval);
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

      {/* Main scaling & typewriting text container */}
      <div
        className={`relative flex flex-col items-center justify-center px-4 text-center transition-all duration-1000 ease-out transform ${
          isScaledUp ? 'scale-100 sm:scale-110 opacity-100' : 'scale-75 opacity-80'
        }`}
      >
        {/* SikaManager Big Heading */}
        <div className="flex items-center justify-center">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
            {displayedText || '\u00A0'}
          </h1>
          {/* Typewriter blinking cursor */}
          <span
            className={`inline-block w-1 sm:w-1.5 md:w-2 h-10 sm:h-14 md:h-18 bg-amber-400 ml-1.5 rounded-full align-middle transition-opacity duration-200 ${
              isTypingDone ? 'animate-pulse' : 'opacity-100'
            }`}
          />
        </div>

        {/* Subtitle */}
        <p
          className={`mt-4 text-xs sm:text-sm uppercase tracking-[0.25em] text-slate-400 font-semibold transition-all duration-700 ${
            displayedText.length > 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          Personal Cash Tracker
        </p>

        {/* Subtle bouncing indicator dots */}
        <div
          className={`mt-6 flex items-center justify-center gap-2 transition-opacity duration-500 ${
            isTypingDone ? 'opacity-100' : 'opacity-0'
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
