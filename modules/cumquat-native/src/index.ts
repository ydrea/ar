import NativeCumquat from './NativeCumquat';

export {CumquatEngine} from './CumquatEngine';

export function getCumquatNativeVersion(): string {
  return NativeCumquat.getVersion();
}

export type {
  EngineConfig,
  FrameSnapshot,
  GeoPoint,
  PickResult,
  POIInput,
  SensorState,
  VisiblePOI,
} from './types';
