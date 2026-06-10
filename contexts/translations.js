// contexts/translations.js
// Translation dictionary for the app
// (UI only, no island name translations)

import help from "@/app/(tabs)/help";

const translations = {
  // Common UI elements
  en: {
    compassCalibration: "Calibrating compass…",
    movePhone: "Move phone in a figure-8",
    stability: "Stability: {count}/15",
    selectLanguage: "Select Language:",
    startAR: "Start AR Experience",
    loading: "Loading…",
    arView: "AR View",
    visibleIslands: "{count} visible islands",
    debugLog: "Debug Log",
    settings: "Settings",
    camera: "Camera",
    map: "Map",
    islands: "Islands",
    about: "About",
    help: "Help",
  },

  hr: {
    compassCalibration: "Kalibriranje kompasa…",
    movePhone: "Pomaknite telefon u obliku osmice",
    stability: "Stabilnost: {count}/15",
    selectLanguage: "Odaberite jezik:",
    startAR: "Pokreni AR iskustvo",
    loading: "Učitavanje…",
    arView: "AR Pregled",
    visibleIslands: "{count} vidljivih otoka",
    debugLog: "Debug Log",
    settings: "Postavke",
    camera: "Kamera",
    map: "Karta",
    islands: "Otoci",
    about: "O aplikaciji",
    help: "Pomoć",
  },

  it: {
    compassCalibration: "Calibrazione bussola…",
    movePhone: "Muovi il telefono a forma di otto",
    stability: "Stabilità: {count}/15",
    selectLanguage: "Seleziona lingua:",
    startAR: "Avvia esperienza AR",
    loading: "Caricamento…",
    arView: "Vista AR",
    visibleIslands: "{count} isole visibili",
    debugLog: "Debug Log",
    settings: "Impostazioni",
    camera: "Fotocamera",
    map: "Mappa",
    islands: "Isole",
    about: "Informazioni",
    help: "Aiuto",
  },

  de: {
    compassCalibration: "Kompass kalibrieren…",
    movePhone: "Telefon in Achterform bewegen",
    stability: "Stabilität: {count}/15",
    selectLanguage: "Sprache auswählen:",
    startAR: "AR-Erlebnis starten",
    loading: "Laden…",
    arView: "AR-Ansicht",
    visibleIslands: "{count} sichtbare Inseln",
    debugLog: "Debug Log",
    settings: "Einstellungen",
    camera: "Kamera",
    map: "Karte",
    islands: "Inseln",
    about: "Über",
    help: "Hilfe",
  },

  fr: {
    compassCalibration: "Calibration de la boussole…",
    movePhone: "Déplacez le téléphone en forme de huit",
    stability: "Stabilité: {count}/15",
    selectLanguage: "Sélectionnez la langue:",
    startAR: "Démarrer l'expérience RA",
    loading: "Chargement…",
    arView: "Vue RA",
    visibleIslands: "{count} îles visibles",
    debugLog: "Debug Log",
    settings: "Paramètres",
    camera: "Caméra",
    map: "Carte",
    islands: "Îles",
    about: "À propos",
    help: "Aide",
  },
};

// Helper function to replace placeholders in translations
export const translate = (key, language, replacements = {}) => {
  // Fallback to English if language not available
  const lang = translations[language] || translations.en;

  if (!lang || !lang[key]) {
    console.warn(
      `Missing translation for key: ${key} in language: ${language}`,
    );
    return translations.en[key] || key;
  }

  let translation = lang[key];

  // Replace placeholders like {count}, {name}, etc.
  Object.entries(replacements).forEach(([placeholder, value]) => {
    translation = translation.replace(`{${placeholder}}`, value);
  });

  return translation;
};

// Get all available languages
export const getAvailableLanguages = () => {
  return Object.keys(translations);
};

// Simple pass-through function for island names (no translation)
// Uses original names from pois.optimized.json
export const getIslandName = (islandName) => {
  return islandName; // Return original name without translation
};

export default translations;
