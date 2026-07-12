export type EngineHandle = number;

export type GeoPoint = {
  latitude: number;
  longitude: number;
  altitude: number;
};

export type POIInput = GeoPoint & {
  id: string;
  name?: string;
};

export type EngineConfig = {
  horizontalFovDegrees?: number;
  nearMeters?: number;
  farMeters?: number;
  maxVisiblePOIs?: number;
};

export type SensorState = {
  timestampNs: number;
  location: GeoPoint;
  headingDegrees: number;
  pitchDegrees: number;
  rollDegrees: number;
  viewportWidth: number;
  viewportHeight: number;
};

export type VisiblePOI = {
  poiIndex: number;
  x: number;
  y: number;
  depth: number;
  distance: number;
  bearing: number;
  visible: boolean;
};

export type FrameSnapshot = {
  sequence: number;
  timestampNs: number;
  visiblePOIs: readonly VisiblePOI[];
};

export type PickResult = {
  poiIndex: number;
  distancePixels: number;
} | null;
