// hooks/usePermissions.ts

import { useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Linking } from "react-native";

export function usePermissions() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  // const [mediaPermission, requestMediaPermission] =
  //   MediaLibrary.usePermissions();

  const [locationGranted, setLocationGranted] = useState(false);

  const refreshPermissions = async () => {
    const loc = await Location.getForegroundPermissionsAsync();
    setLocationGranted(loc.status === "granted");
  };

  useEffect(() => {
    refreshPermissions();
  }, []);

  const requestLocationPermission = async () => {
    const res = await Location.requestForegroundPermissionsAsync();
    const granted = res.status === "granted";
    setLocationGranted(granted);
    return granted;
  };

  const requestAllPermissions = async () => {
    // Request permissions sequentially to avoid issues in preview builds
    // Some platforms don't handle parallel permission requests well
    let camera = cameraPermission?.granted || false;
    let location = locationGranted || false;

    if (!camera) {
      const cameraResult = await requestCameraPermission();
      camera = cameraResult.granted;
    }

    if (!location) {
      location = await requestLocationPermission();
    }

    // Refresh location permission state after requesting
    if (!locationGranted && location) {
      await refreshPermissions();
    }

    return camera && location;
  };

  const camera = cameraPermission?.granted ?? false;
  const location = locationGranted;

  const allGranted = camera && location;

  const missingPermissions = [
    !camera && "Camera",
    !location && "Location",
  ].filter(Boolean);

  return {
    camera,
    location,
    allGranted,
    missingPermissions,

    requestCameraPermission,
    requestLocationPermission,
    requestAllPermissions,
    refreshPermissions,

    openSettings: () => Linking.openSettings(),
  };
}
