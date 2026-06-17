// app/gest.tsx - Updated AR View with fixed imports
// app/gest.tsx - AR View with full pipeline integration
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import {
  projectToScreenWithClipping,
  sensorHub,
  geoToENU,
  rotateVector,
} from "@/cumquat/sensors";
import { AR_CONSTANTS } from "@/cumquat/constants";
import { SensorSnapshot, Vec3 } from "@/cumquat/types";
import {
  ARGestureController,
  GestureMode,
  LimitType,
} from "@/cumquat/gestures/ArGestureControler";
import { QuickHelpTooltip } from "@/ui/ToolTip";
import { ActiveLimitIndicator } from "@/ui/ActiveLimitIndicator";
import { RubberBandVisualFeedback } from "@/ui/RubberBandVisualFeedback";
import { FOVVisualFeedback } from "@/ui/FOVisual";

const { width, height } = Dimensions.get("window");

// Sample POI data
const POIS = [
  { id: 1, name: "Tresnjevacki trg", lat: 45.8, lon: 15.9667, alt: 1 },
  { id: 2, name: "Cafic Eliscafe", lat: 45.7995, lon: 15.967, alt: 1 },
  { id: 3, name: "Sljeme", lat: 45.8994, lon: 15.9448, alt: 1033 },
  { id: 4, name: "Medvedgrad", lat: 45.8833, lon: 15.95, alt: 579 },
];

export default function ARView() {
  // Camera
  const cameraRef = useRef<any>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Sensor state
  const [userLocation, setUserLocation] = useState<SensorSnapshot | null>(null);
  const [poiPositions, setPoiPositions] = useState<
    Array<{
      id: number;
      name: string;
      pos: Vec3;
      distance: number;
    }>
  >([]);

  // Gesture state
  const gestureController = useRef(new ARGestureController());
  const [gestureMode, setGestureMode] = useState<GestureMode>(null);
  const [movingFinger, setMovingFinger] = useState<
    "top" | "bottom" | "both" | null
  >(null);
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [minDistance, setMinDistance] = useState(
    AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
  );
  const [maxDistance, setMaxDistance] = useState(
    AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  );
  const [cameraZoom, setCameraZoom] = useState(0);
  const [fov, setFOV] = useState(AR_CONSTANTS.FOV.DEFAULT);

  // Rubber band state
  const [isRubberBanding, setIsRubberBanding] = useState(false);
  const [activeLimit, setActiveLimit] = useState<LimitType>(null);
  const [rubberBandIntensity, setRubberBandIntensity] = useState(0);

  // UI state
  const [showHelp, setShowHelp] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Initialize gesture controller
  useEffect(() => {
    gestureController.current.setCallbacks({
      onMinDistanceChange: (newMin, isRB) => {
        setMinDistance(newMin);
        if (isRB) {
          setIsRubberBanding(true);
          setActiveLimit("min");
        }
      },
      onMaxDistanceChange: (newMax, isRB) => {
        setMaxDistance(newMax);
        if (isRB) {
          setIsRubberBanding(true);
          setActiveLimit("max");
        }
      },
      onCameraZoomChange: (newZoom, isRB) => {
        setCameraZoom(newZoom);
        if (isCameraReady) {
          // Camera zoom handled by state, passed to CameraView
        }
        if (isRB) {
          setIsRubberBanding(true);
          setActiveLimit("zoom");
        }
      },
      onFOVChange: (newFOV, isRB) => {
        setFOV(newFOV);
        if (isRB) {
          setIsRubberBanding(true);
          setActiveLimit("fov");
          const excess =
            newFOV < AR_CONSTANTS.FOV.MIN
              ? AR_CONSTANTS.FOV.MIN - newFOV
              : newFOV - AR_CONSTANTS.FOV.MAX;
          setRubberBandIntensity(Math.min(1, excess / 20));
        }
      },
      onLimitHit: (limit, excess) => {
        setActiveLimit(limit);
        setIsRubberBanding(true);
        setRubberBandIntensity(Math.min(1, excess / 500));
      },
      onLimitRelease: (limit) => {
        setIsRubberBanding(false);
        setRubberBandIntensity(0);
        setActiveLimit(null);
      },
      onGestureStart: (mode) => {
        setGestureMode(mode);
        setIsGestureActive(true);
        if (mode === "adjustMax") setMovingFinger("top");
        else if (mode === "adjustMin") setMovingFinger("bottom");
        else if (mode === "symmetric") setMovingFinger("both");
      },
      onGestureUpdate: (mode, state) => {
        setGestureMode(mode);
        if (state.min !== undefined) setMinDistance(state.min);
        if (state.max !== undefined) setMaxDistance(state.max);
        if (state.zoom !== undefined) {
          setCameraZoom(state.zoom);
        }
        if (state.fov !== undefined) setFOV(state.fov);
        if (state.isRubberBanding) setIsRubberBanding(true);
      },
      onGestureEnd: (mode, state) => {
        setIsGestureActive(false);
        setGestureMode(null);
        setMovingFinger(null);
        setIsRubberBanding(false);
        setActiveLimit(null);
        setRubberBandIntensity(0);
      },
    });

    // Initialize with defaults
    gestureController.current.updateState(
      AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
      AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
      0,
      AR_CONSTANTS.FOV.DEFAULT,
    );

    // Start sensors
    const init = async () => {
      await sensorHub.start();
      setIsReady(true);
    };
    init();

    return () => {
      sensorHub.stop();
    };
  }, [isCameraReady]);

  // Process POIs
  useEffect(() => {
    if (!userLocation) return;

    const processed = POIS.map((poi) => {
      const enuPos = geoToENU(
        userLocation.lat,
        userLocation.lon,
        userLocation.elevation,
        poi.lat,
        poi.lon,
        poi.alt,
      );

      const rotatedPos = rotateVector(enuPos, userLocation.orientation);
      const distance = Math.hypot(rotatedPos.x, rotatedPos.y, rotatedPos.z);

      return {
        id: poi.id,
        name: poi.name,
        pos: rotatedPos,
        distance: distance,
      };
    });

    setPoiPositions(processed);
  }, [userLocation]);

  // Project POIs with clipping awareness
  const projectedPOIs = poiPositions
    .map((poi) => {
      const screenPos = projectToScreenWithClipping(
        poi.pos,
        width,
        height,
        fov,
        minDistance,
        maxDistance,
      );

      return {
        ...poi,
        screenPos,
      };
    })
    .filter((poi) => poi.screenPos.visible);

  // // Sensor subscription
  // useEffect(() => {
  //   if (!isReady) return;

  //   const interval = setInterval(() => {
  //     const snapshot = sensorHub.getSnapshot();
  //     if (snapshot.lat !== 0 || snapshot.lon !== 0) {
  //       setUserLocation(snapshot);
  //     }
  //   }, 100);

  //   return () => clearInterval(interval);
  // }, [isReady]);
  // app/(tabs)/gest+.tsx - Minimal fix

  // Add this ref after your other state
  const lastLocationRef = useRef<SensorSnapshot | null>(null);

  // Update your sensor subscription useEffect
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      const snapshot = sensorHub.getSnapshot();
      if (snapshot.lat === 0 && snapshot.lon === 0) return;

      // Only update if lat/lon changed significantly
      const last = lastLocationRef.current;
      if (last) {
        const latChanged = Math.abs(last.lat - snapshot.lat) > 0.000001;
        const lonChanged = Math.abs(last.lon - snapshot.lon) > 0.000001;
        if (!latChanged && !lonChanged) {
          // Location hasn't changed meaningfully
          return;
        }
      }

      lastLocationRef.current = snapshot;
      setUserLocation(snapshot);
    }, 100);

    return () => clearInterval(interval);
  }, [isReady]);

  const pinchGesture = gestureController.current.createGesture();

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={pinchGesture}>
        <View style={styles.container}>
          {/* Camera View */}
          <CameraView
            ref={cameraRef}
            facing={cameraFacing}
            mode="video"
            zoom={cameraZoom}
            onCameraReady={() => setIsCameraReady(true)}
            onMountError={(error) =>
              console.error("Camera mount error:", error)
            }
          />

          {/* AR Overlay with projected POIs */}
          <Svg style={StyleSheet.absoluteFill}>
            {projectedPOIs.map((poi) => {
              const distanceFactor =
                1 - (poi.distance - minDistance) / (maxDistance - minDistance);
              const markerSize = 8 + distanceFactor * 12;

              return (
                <React.Fragment key={poi.id}>
                  <Circle
                    cx={poi.screenPos.x}
                    cy={poi.screenPos.y}
                    r={markerSize}
                    fill="#00ffff"
                    stroke="#ffffff"
                    strokeWidth={2}
                    opacity={0.3 + distanceFactor * 0.7}
                  />

                  <SvgText
                    x={poi.screenPos.x + markerSize + 4}
                    y={poi.screenPos.y + 4}
                    fill="#ffffff"
                    fontSize={12}
                    fontWeight="bold"
                  >
                    {poi.name}
                  </SvgText>

                  <SvgText
                    x={poi.screenPos.x + markerSize + 4}
                    y={poi.screenPos.y + 20}
                    fill="#cccccc"
                    fontSize={10}
                  >
                    {(poi.distance / 1000).toFixed(1)}km
                  </SvgText>

                  <Line
                    x1={width / 2}
                    y1={height / 2}
                    x2={poi.screenPos.x}
                    y2={poi.screenPos.y}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                    strokeDasharray={[4, 4]}
                  />
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Center reticle */}
          <View style={styles.reticle}>
            <View style={styles.reticleDot} />
            <View style={styles.reticleRing} />
          </View>

          {/* Visual Feedback Components */}
          <ActiveLimitIndicator
            activeLimit={activeLimit}
            intensity={rubberBandIntensity}
            gestureMode={gestureMode}
            movingFinger={movingFinger}
          />

          <RubberBandVisualFeedback
            isActive={isRubberBanding && activeLimit !== "fov"}
            limitType={activeLimit === "fov" ? null : activeLimit}
            intensity={rubberBandIntensity}
          />

          <FOVVisualFeedback
            isActive={gestureMode === "horizontal"}
            fov={fov}
            isRubberBanding={activeLimit === "fov" && isRubberBanding}
            intensity={activeLimit === "fov" ? rubberBandIntensity : 0}
          />

          {/* Help Tooltip */}
          {showHelp && <QuickHelpTooltip onClose={() => setShowHelp(false)} />}

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() =>
                setCameraFacing((current) =>
                  current === "back" ? "front" : "back",
                )
              }
            >
              <Text style={styles.controlButtonText}>⟳</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                gestureController.current.updateState(
                  AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
                  AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
                  0,
                  AR_CONSTANTS.FOV.DEFAULT,
                );
                setMinDistance(AR_CONSTANTS.DISTANCE.DEFAULT_MIN);
                setMaxDistance(AR_CONSTANTS.DISTANCE.DEFAULT_MAX);
                setCameraZoom(0);
                setFOV(AR_CONSTANTS.FOV.DEFAULT);
              }}
            >
              <Text style={styles.controlButtonText}>↺</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setShowHelp(true)}
            >
              <Text style={styles.controlButtonText}>?</Text>
            </TouchableOpacity>
          </View>

          {/* Distance Indicator */}
          <View style={styles.distanceIndicator}>
            <View style={styles.distanceBar}>
              <View
                style={[
                  styles.distanceFill,
                  {
                    width: `${((maxDistance - minDistance) / AR_CONSTANTS.DISTANCE.MAX) * 100}%`,
                    marginLeft: `${(minDistance / AR_CONSTANTS.DISTANCE.MAX) * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.distanceLabels}>
              <Text style={[styles.distanceLabel, { color: "#4CAF50" }]}>
                MIN: {(minDistance / 1000).toFixed(1)}km
              </Text>
              <Text style={[styles.distanceLabel, { color: "#2196F3" }]}>
                MAX: {(maxDistance / 1000).toFixed(1)}km
              </Text>
              <Text style={[styles.distanceLabel, { color: "#00BCD4" }]}>
                FOV: {Math.round(fov)}°
              </Text>
            </View>
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  reticle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  reticleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00ffff",
    position: "absolute",
  },
  reticleRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    position: "absolute",
  },
  controls: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 50,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  controlButtonText: {
    fontSize: 24,
    color: "white",
  },
  distanceIndicator: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    padding: 10,
  },
  distanceBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  distanceFill: {
    height: "100%",
    backgroundColor: "#00ffff",
    borderRadius: 2,
  },
  distanceLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  distanceLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
});
