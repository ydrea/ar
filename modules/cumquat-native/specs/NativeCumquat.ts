import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  createEngine(config: Object): number;
  initialize(handle: number, pois: ReadonlyArray<Object>): void;
  update(handle: number, sensorState: Object): number;
  getFrame(handle: number): Object;
  pick(handle: number, x: number, y: number, radiusPixels: number): Object | null;
  destroyEngine(handle: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCumquat');
