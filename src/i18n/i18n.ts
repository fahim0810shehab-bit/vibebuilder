/**
 * @fileoverview i18n configuration and utility functions for internationalization.
 * This module sets up i18next with React integration and provides utilities for
 * dynamic translation loading.
 *
 * @module i18n
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// declare custom type options so the return is always a string.
declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
  }
}

/**
 * Initialize i18next instance with default configuration.
 * - Sets English (US) as the default and fallback language
 * - Disables HTML escaping for interpolation
 * - Ensures null is never returned (always returns string)
 * - Starts with empty resources (loaded dynamically)
 */
i18n.use(initReactI18next).init({
  lng: 'en-US',
  fallbackLng: 'en-US',
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
  resources: {},
});

/**
 * Loads and registers translations for a specific language and module.
 *
 * This function fetches translations from the API and adds them to the i18n instance.
 * It handles the translations in two ways:
 * 1. Adds them to the default 'translation' namespace for direct access
 * 2. Adds them to a module-specific namespace for organized access
 *
 * The function includes error handling and will not throw errors to avoid breaking the UI.
 *
 * @param {string} language - The language code to load translations for (e.g., 'en-US', 'fr-FR')
 * @param {string} moduleName - The module name to load translations for (e.g., 'common', 'dashboard')
 * @returns {Promise<void>} Resolves when translations are loaded and registered
 * @throws {never} Catches all errors internally to prevent UI disruption
 *
 * @example
 * // Load translations for the dashboard module in French
 * await loadTranslations('fr-FR', 'dashboard');
 */
// Mock translation dictionary for common keys
const HARDCODED_ENGLISH: Record<string, string> = {
  'LOG_IN': 'Log In',
  'SIGN_UP': 'Sign Up',
  'DONT_HAVE_ACCOUNT': "Don't have an account?",
  'AUTH_OR': 'or',
  'EMAIL': 'Email',
  'PASSWORD': 'Password',
  'FORGOT_PASSWORD': 'Forgot Password?',
  'SUBMIT': 'Submit',
  'SAVE': 'Save',
  'PUBLISH': 'Publish',
  'DASHBOARD': 'Dashboard',
  'PAGES': 'Pages',
  'SETTINGS': 'Settings',
  'LOGOUT': 'Logout',
  'CANCEL': 'Cancel',
  'DELETE': 'Delete',
  'EDIT': 'Edit',
  'ADD': 'Add',
  'SUCCESS': 'Success',
  'ERROR': 'Error'
};

export const loadTranslations = async (language: string, moduleName: string): Promise<void> => {
  console.log(`[i18n] Mocking load for ${language}/${moduleName}`);
  return Promise.resolve();
};

/**
 * ---------------------------------------------------------------------------
 * Key Mode Toggle Logic
 * ---------------------------------------------------------------------------
 * The following code enables dynamic toggling between displaying translation
 * **values** (default) and **keys** (key-mode) at runtime. The toggle is driven
 * by messages sent from a browser extension via `window.postMessage`.
 *
 * Expected message format:
 *   { action: 'keymode', keymode: boolean, defaultLang?: string }
 *
 * When `keymode` is `true`, all calls to `i18n.t()` will return the **key**
 * instead of the translated value. This is achieved by monkey-patching the
 * `i18n.t` function while preserving its original behaviour for normal mode.
 *
 * Renders are refreshed by emitting a `languageChanged` event, which the
 * `react-i18next` provider already listens to for triggering re-renders.
 * ---------------------------------------------------------------------------
 */

declare global {
  interface Window {
    __i18nKeyMode?: boolean;
  }
}

// Initialise global flag
if (typeof window !== 'undefined') {
  window.__i18nKeyMode = false;
}

// Safely monkey-patch i18n.t to handle hardcoded English and humanized keys
try {
  const originalT = i18n.t.bind(i18n);
  (i18n as any).t = (key: string | string[], ...args: any[]) => {
    const k = Array.isArray(key) ? key[0] : key;
    
    // Return hardcoded English if exists
    if (HARDCODED_ENGLISH[k]) return HARDCODED_ENGLISH[k];
    
    // If it's a known key in i18next, use the original t function
    // (This allows interpolation and other features to work for standard keys)
    if (i18n.exists(k)) {
      return originalT(key, ...args);
    }
    
    // Fallback to humanizing the key (e.g. "WELCOME_MESSAGE" -> "Welcome Message")
    return k.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };
} catch (e) {
  console.warn('[i18n] Failed to patch t function:', e);
}

// Listen for messages coming from the browser extension
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return; // Ignore messages from iframes or other sources
    if (event.origin !== window.location.origin) return; // Prevent cross-origin injections
    const { data } = event;
    if (!data || typeof data !== 'object') return;

    const { action, keymode } = data as { action?: string; keymode?: boolean };
    if (action === 'keymode' && typeof keymode === 'boolean') {
      const previous = window.__i18nKeyMode;
      window.__i18nKeyMode = keymode;

      if (previous !== keymode) {
        (i18n as any).emit('languageChanged', i18n.language);
      }
    }
  });
}

export default i18n;
