import NativeCumquat from './NativeCumquat';
import type {
  EngineConfig,
  EngineHandle,
  FrameSnapshot,
  PickResult,
  POIInput,
  SensorState,
} from './types';

export class CumquatEngine {
  readonly #handle: EngineHandle;
  #disposed = false;

  private constructor(config: EngineConfig) {
    this.#handle = NativeCumquat.createEngine(config);
  }

  static create(config: EngineConfig = {}): CumquatEngine {
    return new CumquatEngine(config);
  }

  initialize(pois: readonly POIInput[]): void {
    this.#assertAlive();
    NativeCumquat.initialize(this.#handle, pois);
  }

  update(sensorState: SensorState): number {
    this.#assertAlive();
    return NativeCumquat.update(this.#handle, sensorState);
  }

  getFrame(): FrameSnapshot {
    this.#assertAlive();
    return NativeCumquat.getFrame(this.#handle) as FrameSnapshot;
  }

  pick(x: number, y: number, radiusPixels = 32): PickResult {
    this.#assertAlive();
    return NativeCumquat.pick(this.#handle, x, y, radiusPixels) as PickResult;
  }

  dispose(): void {
    if (this.#disposed) return;
    NativeCumquat.destroyEngine(this.#handle);
    this.#disposed = true;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error('CumquatEngine has been disposed');
    }
  }
}
