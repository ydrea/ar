// ui/ARControls.tsx
import { AR_CONSTANTS } from "@/constants/ar";
import { ARMFrameLoop } from "@/engine/ARMFrameLoop";
import React, { useState } from "react";
import { View } from "react-native";
import DistanceRangeSlider, { FOVSlider } from "./Sliders";

type ARControlsProps = {
  frameLoop: ARMFrameLoop;
};

export function ARControls({ frameLoop }: ARControlsProps) {
  const [fov, setFov] = useState(AR_CONSTANTS.FOV.DEFAULT);
  const [distanceRange, setDistanceRange] = useState({
    minDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
    maxDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  });

  const handleFOVChange = (newFov: number) => {
    setFov(newFov);
    frameLoop.setFOV(newFov);
  };

  const handleDistanceRangeChange = (range: {
    minDistance: number;
    maxDistance: number;
  }) => {
    setDistanceRange(range);
    frameLoop.setDistanceRange(range.minDistance, range.maxDistance);
  };

  return (
    <View>
      <FOVSlider
        min={AR_CONSTANTS.FOV.MIN}
        max={AR_CONSTANTS.FOV.MAX}
        initialValue={AR_CONSTANTS.FOV.DEFAULT}
        step={AR_CONSTANTS.FOV.STEP}
        onChange={handleFOVChange}
      />

      <DistanceRangeSlider
        min={AR_CONSTANTS.DISTANCE.MIN}
        max={AR_CONSTANTS.DISTANCE.MAX}
        initialMin={AR_CONSTANTS.DISTANCE.DEFAULT_MIN}
        initialMax={AR_CONSTANTS.DISTANCE.DEFAULT_MAX}
        step={AR_CONSTANTS.DISTANCE.STEP}
        onChange={handleDistanceRangeChange}
      />
    </View>
  );
}
