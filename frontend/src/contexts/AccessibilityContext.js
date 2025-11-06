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
      banner.innerHTML = '🔊 Screen Reader Mode Active - Enhanced Focus Indicators Enabled';
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
    setScreenReaderMode(prev => !prev);
  };

  const value = {
    highContrast,
    screenReaderMode,
    reducedMotion,
    toggleHighContrast,
    toggleScreenReaderMode
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};
