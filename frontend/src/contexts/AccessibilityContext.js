import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('highContrast') === 'true';
  });
  
  const [screenReaderMode, setScreenReaderMode] = useState(() => {
    return localStorage.getItem('screenReaderMode') === 'true';
  });

  const [reducedMotion, setReducedMotion] = useState(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [speechEnabled, setSpeechEnabled] = useState(false);

  useEffect(() => {
    // Apply high contrast mode
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    localStorage.setItem('highContrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    // Apply screen reader mode
    if (screenReaderMode) {
      document.documentElement.classList.add('screen-reader-mode');
      // Set aria-live regions to be more verbose
      document.documentElement.setAttribute('data-screen-reader', 'true');
      
      // Add visual indicator banner
      const banner = document.createElement('div');
      banner.id = 'screen-reader-banner';
      banner.className = 'screen-reader-banner';
      banner.innerHTML = '🔊 Text-to-Speech Active - Click elements to hear them read aloud';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      document.body.appendChild(banner);
      
      // Announce to screen reader
      setTimeout(() => {
        banner.setAttribute('aria-live', 'assertive');
      }, 100);
    } else {
      document.documentElement.classList.remove('screen-reader-mode');
      document.documentElement.removeAttribute('data-screen-reader');
      
      // Remove visual indicator
      const banner = document.getElementById('screen-reader-banner');
      if (banner) {
        banner.remove();
      }
    }
    localStorage.setItem('screenReaderMode', screenReaderMode);
  }, [screenReaderMode]);

  useEffect(() => {
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReducedMotion(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleHighContrast = () => {
    setHighContrast(prev => !prev);
  };

  const toggleScreenReaderMode = () => {
    const newValue = !screenReaderMode;
    setScreenReaderMode(newValue);
    
    // Enable/disable text-to-speech
    if (newValue) {
      // Check if browser supports speech synthesis
      if ('speechSynthesis' in window) {
        setSpeechEnabled(true);
        speak('Screen reader mode activated. Enhanced focus indicators enabled.');
      } else {
        setSpeechEnabled(false);
        console.warn('Speech synthesis not supported in this browser');
      }
    } else {
      setSpeechEnabled(false);
      speak('Screen reader mode deactivated.');
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
    }
  };

  // Text-to-speech function
  const speak = (text, lang = 'en-US') => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    window.speechSynthesis.speak(utterance);
  };

  const value = {
    highContrast,
    screenReaderMode,
    reducedMotion,
    speechEnabled,
    toggleHighContrast,
    toggleScreenReaderMode,
    speak
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};
