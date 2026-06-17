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
  x: number;
  y: number;
  visible: boolean;
  clippedByDistance?: 'min' | 'max' | null;  // Add this
  depth?: number;  // Add depth for debugging
};

export type ProjectedPOI = {
  id: number;
  name: string;
  distance: number;
  screenPos: ScreenPosition;
  rawPos: Vec3;
};