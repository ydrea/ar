// cumquat/types.ts
export type SensorSnapshot = {
  lat: number;
  lon: number;
  elevation: number;
  orientation: Quat;
  timestamp: number;
};

export type Quat = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type WorldPosition = {
  position: Vec3;
  distance: number;
  bearing: number;
};

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type ScreenPosition = {
  clipped: boolean;
  x: number;
  y: number;
  visible: boolean;
  clippedByDistance?: "min" | "max" | null; // Add this
  depth?: number; // Add depth for debugging
  radialDistance?: number; // Add radial distance for debugging
};

export type ProjectedPOI = {
  id: number;
  name: string;
  distance: number;
  screenPos: ScreenPosition;
  rawPos: Vec3;
};

// AROutput type for the overlay
export type AROutput = {
  id: number;
  name: string;
  world: WorldPosition;
  screen: ScreenPosition;
  distance: number;
};
