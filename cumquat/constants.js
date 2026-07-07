// /cumquat/constants.js
export const AR_CONSTANTS = {
  DEG2RAD: Math.PI / 180,
  RAD2DEG: 180 / Math.PI,
  R: 6371000,

  // WGS84 constants
  WGS84_A: 6378137,
  WGS84_F: 1 / 298.257223563,
  //  WGS84_E2: WGS84_F * (2 - WGS84_F)

  // FOV settings
  FOV: {
    MIN: 30,
    MAX: 120,
    DEFAULT: 60,
    STEP: 10,
  },

  // Distance settings (in meters)
  DISTANCE: {
    MIN: 0,
    MAX: 135000, // 135km
    DEFAULT_MIN: 0,
    DEFAULT_MAX: 13500, // 1.35km default
    STEP: 10000, // 10km steps
  },

  // UI settings
  UI: {
    MIN_GAP: 50,
    THUMB_SIZE: 32,
  },
};
