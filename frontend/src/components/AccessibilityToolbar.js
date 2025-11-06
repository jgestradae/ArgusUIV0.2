import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { 
  Contrast, 
  Volume2, 
  Languages, 
  ChevronDown,
  Eye,
  HelpCircle
} from 'lucide-react';

const AccessibilityToolbar = () => {
  const { t, i18n } = useTranslation();
  const { highContrast, screenReaderMode, toggleHighContrast, toggleScreenReaderMode } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    setIsOpen(false);
    // No reload needed - React will re-render automatically
  };

  // Normalize language code (handle en-US, es-CO, etc.)
  const currentLanguage = (i18n.language || 'es').split('-')[0].toLowerCase();

  return (
    <div className="accessibility-toolbar" role="toolbar" aria-label={t('accessibility.menu')}>
      {/* Skip to main content link - must be first focusable element */}
      <a 
        href="#main-content" 
        className="skip-link"
        aria-label={t('accessibility.skip_to_content')}
      >
        {t('accessibility.skip_to_content')}
      </a>

      <div className="flex items-center space-x-2">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="toolbar-button"
            aria-label={t('accessibility.language_selector')}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <Languages className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">{t('accessibility.language_selector')}</span>
            <span className="ml-1 text-xs uppercase">{currentLanguage}</span>
            <ChevronDown className="w-3 h-3 ml-1" aria-hidden="true" />
          </button>
          
          {isOpen && (
            <div 
              className="language-dropdown"
              role="menu"
              aria-label={t('accessibility.language_selector')}
            >
              <button
                onClick={() => changeLanguage('es')}
                className={`language-option ${currentLanguage === 'es' ? 'active' : ''}`}
                role="menuitem"
                aria-current={currentLanguage === 'es' ? 'true' : undefined}
              >
                <span className="flag-icon">🇨🇴</span>
                Español
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`language-option ${currentLanguage === 'en' ? 'active' : ''}`}
                role="menuitem"
                aria-current={currentLanguage === 'en' ? 'true' : undefined}
              >
                <span className="flag-icon">🇺🇸</span>
                English
              </button>
            </div>
          )}
        </div>

        {/* High Contrast Toggle */}
        <button
          onClick={toggleHighContrast}
          className={`toolbar-button ${highContrast ? 'active' : ''}`}
          aria-label={t('accessibility.high_contrast')}
          aria-pressed={highContrast}
          title={t('accessibility.high_contrast')}
        >
          <Contrast className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">{t('accessibility.high_contrast')}</span>
        </button>

        {/* Screen Reader Mode Toggle */}
        <button
          onClick={toggleScreenReaderMode}
          className={`toolbar-button ${screenReaderMode ? 'active' : ''}`}
          aria-label={t('accessibility.screen_reader_mode')}
          aria-pressed={screenReaderMode}
          title={t('accessibility.screen_reader_mode')}
        >
          <Volume2 className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">{t('accessibility.screen_reader_mode')}</span>
        </button>

        {/* Help/Accessibility Info */}
        <a
          href="/accessibility-statement"
          className="toolbar-button"
          aria-label={t('help.accessibility_features')}
          title={t('help.accessibility_features')}
        >
          <HelpCircle className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">{t('help.accessibility_features')}</span>
        </a>
      </div>

      <style jsx>{`
        .accessibility-toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .skip-link {
          position: absolute;
          left: -9999px;
          z-index: 10000;
          padding: 0.75rem 1rem;
          background: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 0.25rem;
          font-weight: 600;
        }

        .skip-link:focus {
          left: 1rem;
          top: 0.5rem;
        }

        .toolbar-button {
          display: flex;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: rgba(51, 65, 85, 0.5);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .toolbar-button:hover {
          background: rgba(51, 65, 85, 0.8);
          color: white;
          border-color: #3b82f6;
        }

        .toolbar-button:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .toolbar-button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        .language-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: #1e293b;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          min-width: 150px;
          overflow: hidden;
        }

        .language-option {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 0.75rem 1rem;
          background: transparent;
          color: #94a3b8;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .language-option:hover {
          background: rgba(59, 130, 246, 0.1);
          color: white;
        }

        .language-option.active {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          font-weight: 600;
        }

        .flag-icon {
          margin-right: 0.5rem;
          font-size: 1.25rem;
        }

        /* High Contrast Mode Styles */
        :global(.high-contrast) .accessibility-toolbar {
          background: #000;
          border-bottom: 3px solid #fff;
        }

        :global(.high-contrast) .toolbar-button {
          background: #000;
          color: #fff;
          border: 2px solid #fff;
        }

        :global(.high-contrast) .toolbar-button:hover,
        :global(.high-contrast) .toolbar-button.active {
          background: #ffff00;
          color: #000;
          border-color: #ffff00;
        }

        :global(.high-contrast) .language-dropdown {
          background: #000;
          border: 2px solid #fff;
        }

        :global(.high-contrast) .language-option {
          color: #fff;
          border-bottom: 1px solid #fff;
        }

        :global(.high-contrast) .language-option:hover {
          background: #ffff00;
          color: #000;
        }
      `}</style>
    </div>
  );
};

export default AccessibilityToolbar;
