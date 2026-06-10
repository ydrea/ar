// Add a calibration offset to SensorHub
private yawOffset = 0;

// Call this once when facing North
public calibrateNorth() {
  const { yaw } = this.quatToEuler(this.snapshot.orientation);
  this.yawOffset = -yaw;
  Tlog(`🧭 Calibrated North: offset ${(this.yawOffset * 180 / Math.PI).toFixed(0)}°`);
}

// In getSnapshot, apply the offset
getSnapshot(): SensorSnapshot {
  if (this.yawOffset !== 0) {
    // Apply yaw offset to orientation quaternion
    const correctedOrientation = this.applyYawOffset(this.snapshot.orientation, this.yawOffset);
    const { yaw } = this.quatToEuler(correctedOrientation);
    return {
      ...this.snapshot,
      orientation: correctedOrientation,
      yaw,
    };
  }
  return { ...this.snapshot };
}

private applyYawOffset(q: Quat, offsetRad: number): Quat {
  const halfYaw = offsetRad * 0.5;
  const offsetQuat = {
    x: 0,
    y: Math.sin(halfYaw),
    z: 0,
    w: Math.cos(halfYaw),
  };
  return this.multiplyQuaternions(offsetQuat, q);
}

private multiplyQuaternions(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}