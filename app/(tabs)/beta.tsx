// app/gest-beta.tsx - Clean Beta AR View
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { Svg, Line, Text as SvgText } from "react-native-svg";
import {
  projectToScreenWithClipping,
  sensorHub,
  geoToENU,
  rotateVector,
  calculateBearing,
} from "@/cumquat/sensors";
import { AR_CONSTANTS } from "@/cumquat/constants";
import { SensorSnapshot, Vec3 } from "@/cumquat/types";
import {
  ARGestureController,
  GestureMode,
  LimitType,
} from "@/cumquat/gestures/ArGestureControler";
import { ActiveLimitIndicator } from "@/ui/ActiveLimitIndicator";
import { RubberBandVisualFeedback } from "@/ui/RubberBandVisualFeedback";

const { width, height } = Dimensions.get("window");

// Your POIs - keep as is
const POIS = [
  { id: 1, name: "Tresnjevacki trg Market", lat: 45.8, lon: 15.9667, alt: 1 },
  { id: 2, name: "Cafic Eliscafe", lat: 45.7995, lon: 15.967, alt: 1 },
  // ... rest of your POIs
  { id: 35, name: "Otok divljine", lat: 45.776107, lon: 15.927812, alt: 20 },
];

// Helper: Normalize angle to 0-360
const normalizeAngle = (deg: number): number => {
  return ((deg % 360) + 360) % 360;
};

export default function ARBetaView() {
  // Camera
  const cameraRef = useRef<any>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Sensor state
  const [userLocation, setUserLocation] = useState<SensorSnapshot | null>(null);
  const [bearing, setBearing] = useState<number>(0);
  const [poiPositions, setPoiPositions] = useState<
    Array<{
      id: number;
      name: string;
      pos: Vec3;
      distance: number;
      bearing: number;
    }>
  >([]);

  // Gesture state
  const gestureController = useRef(new ARGestureController());
  const [gestureMode, setGestureMode] = useState<GestureMode>(null);
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
      },
      onGestureUpdate: (mode, state) => {
        setGestureMode(mode);
        if (state.min !== undefined) setMinDistance(state.min);
        if (state.max !== undefined) setMaxDistance(state.max);
        if (state.zoom !== undefined) setCameraZoom(state.zoom);
        if (state.fov !== undefined) setFOV(state.fov);
        if (state.isRubberBanding) setIsRubberBanding(true);
      },
      onGestureEnd: (mode, state) => {
        setIsGestureActive(false);
        setGestureMode(null);
        setIsRubberBanding(false);
        setActiveLimit(null);
        setRubberBandIntensity(0);
      },
    });

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
  }, []);

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

      // Calculate bearing from user to POI
      const poiBearing = calculateBearing(
        userLocation.lat,
        userLocation.lon,
        poi.lat,
        poi.lon,
      );

      return {
        id: poi.id,
        name: poi.name,
        pos: rotatedPos,
        distance: distance,
        bearing: poiBearing,
      };
    });

    setPoiPositions(processed);
  }, [userLocation]);

  // Process POIs with clipping
  const projectedPOIs = poiPositions
    .map((poi) => {
      // Calculate true distance once
      const trueDistance = poi.distance; // computed with Math.hypot

      const screenPos = projectToScreenWithClipping(
        poi.pos, // Camera-space position
        trueDistance, // ← RADIAL DISTANCE for clipping
        width,
        height,
        fov,
        minDistance,
        maxDistance,
      );

      return {
        ...poi,
        screenPos,
        isDistanceClipped: screenPos.clippedByDistance !== null,
        isOffscreen: screenPos.clipped && screenPos.clippedByDistance === null,
        isVisible: screenPos.visible && screenPos.clippedByDistance === null,
      };
    })
    .filter((poi) => {
      // Keep POIs that are:
      // 1. Visible (on screen, in range)
      // 2. Offscreen but in range (for triangles)
      // 3. Clipped by distance (for triangles)
      return poi.isVisible || poi.isOffscreen || poi.isDistanceClipped;
    });
  // Sensor subscription - UPDATE this to track orientation continuously
  useEffect(() => {
    if (!isReady) return;

    let lastLocationUpdate = 0;

    const interval = setInterval(() => {
      const snapshot = sensorHub.getSnapshot();
      if (snapshot.lat === 0 && snapshot.lon === 0) return;

      // Always update orientation, but only update location when changed
      const now = Date.now();
      const isLocationUpdate = now - lastLocationUpdate > 500;

      if (isLocationUpdate) {
        // Check if location changed significantly
        const last = userLocation;
        if (
          !last ||
          Math.abs(last.lat - snapshot.lat) > 0.000001 ||
          Math.abs(last.lon - snapshot.lon) > 0.000001
        ) {
          setUserLocation(snapshot);
          lastLocationUpdate = now;
        }
      } else {
        // Just update orientation without changing location
        setUserLocation((prev) =>
          prev
            ? {
                ...prev,
                orientation: snapshot.orientation,
                timestamp: snapshot.timestamp,
              }
            : snapshot,
        );
      }
    }, 50); // Faster updates for smooth orientation

    return () => clearInterval(interval);
  }, [isReady, userLocation]);

  const pinchGesture = gestureController.current.createGesture();

  // Get bearing for HUD (average bearing of visible POIs)
  const averageBearing = React.useMemo(() => {
    const visiblePOIs = projectedPOIs.filter((p) => p.isVisible);
    if (visiblePOIs.length === 0) return 0;

    let sum = 0;
    visiblePOIs.forEach((p) => {
      // Convert to radians for circular mean if needed
      sum += p.bearing;
    });
    return normalizeAngle(sum / visiblePOIs.length);
  }, [projectedPOIs]);

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

          {/* AR Overlay */}
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {projectedPOIs.map((poi) => {
              const { x, y } = poi.screenPos;

              // distance-based opacity and size
              const distanceRatio = Math.min(
                1,
                Math.max(
                  0,
                  (poi.distance - minDistance) /
                    (Math.min(maxDistance, 5000) - minDistance),
                ),
              );

              // Opacity: 0.2 (far) to 1.0 (near)
              const opacity = 0.2 + (1 - distanceRatio) * 0.8;

              // Font size: 8px (far) to 16px (near)
              const fontSize = 8 + (1 - distanceRatio) * 8;

              // -----------------------------
              // VISIBLE POI - Show name + distance
              // -----------------------------
              if (poi.isVisible) {
                return (
                  <React.Fragment key={poi.id}>
                    {/* POI Name */}
                    <SvgText
                      x={x}
                      y={y}
                      fill={`rgba(255, 255, 255, ${opacity})`}
                      fontSize={fontSize}
                      fontWeight="600"
                      textAnchor="middle"
                      stroke="rgba(0, 0, 0, 0.3)"
                      strokeWidth={2}
                    >
                      {poi.name}
                    </SvgText>

                    {/* Distance */}
                    <SvgText
                      x={x}
                      y={y + fontSize + 6}
                      fill={`rgba(255, 255, 255, ${opacity * 0.7})`}
                      fontSize={Math.max(8, fontSize - 4)}
                      textAnchor="middle"
                      stroke="rgba(0, 0, 0, 0.2)"
                      strokeWidth={1}
                    >
                      {poi.distance < 1000
                        ? `${Math.round(poi.distance)}m`
                        : `${(poi.distance / 1000).toFixed(1)}km`}
                    </SvgText>
                  </React.Fragment>
                );
              }

              // -----------------------------
              // OFFSCREEN DIRECTIONAL TRIANGLE
              // -----------------------------
              const isTooFar =
                poi.isDistanceClipped &&
                poi.screenPos.clippedByDistance === "max";
              const isTooClose =
                poi.isDistanceClipped &&
                poi.screenPos.clippedByDistance === "min";
              const isOffscreen = poi.isOffscreen; // Offscreen but in range

              // Show triangles for: offscreen, too far, OR too close
              if (isOffscreen || isTooFar || isTooClose) {
                // Direction from center of screen to POI
                const centerX = width / 2;
                const centerY = height / 2;

                // Calculate direction from center to offscreen position
                const dx = x - centerX;
                const dy = y - centerY;
                const angle = Math.atan2(dy, dx);

                // Determine where to place the triangle
                let triX, triY, triRotation;

                if (isTooFar) {
                  // Place at TOP of screen, pointing up
                  triX = centerX + Math.cos(angle) * (width / 2 - 40);
                  triY = 50; // Top of screen
                  triRotation = -Math.PI / 2; // Point up
                } else if (isTooClose) {
                  // Place at BOTTOM of screen, pointing down
                  triX = centerX + Math.cos(angle) * (width / 2 - 40);
                  triY = height - 50; // Bottom of screen
                  triRotation = Math.PI / 2; // Point down
                } else {
                  // Offscreen but in range - place on screen edge
                  const edgeDistance = 40;
                  triX = centerX + Math.cos(angle) * (width / 2 - edgeDistance);
                  triY =
                    centerY + Math.sin(angle) * (height / 2 - edgeDistance);
                  triRotation = angle;
                }

                // Triangle size based on distance (larger for closer)
                const triSize = 6 + (1 - distanceRatio) * 8;

                // color based on clipping type
                let strokeColor = `rgba(255, 255, 255, ${Math.max(0.3, opacity)})`;
                if (isTooFar) {
                  strokeColor = `rgba(255, 200, 100, ${Math.max(0.4, opacity)})`; // yellow for too far
                } else if (isTooClose) {
                  strokeColor = `rgba(100, 200, 255, ${Math.max(0.4, opacity)})`; // blue for too close
                }

                // For offscreen (in range), use the direction angle to point toward POI
                if (isOffscreen) {
                  return (
                    <Line
                      key={poi.id}
                      x1={triX - Math.cos(angle + Math.PI / 2) * triSize}
                      y1={triY - Math.sin(angle + Math.PI / 2) * triSize}
                      x2={triX + Math.cos(angle) * triSize * 1.5}
                      y2={triY + Math.sin(angle) * triSize * 1.5}
                      stroke={strokeColor}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  );
                }

                // For too far / too close - point straight up/down
                // This is a simple triangle pointing up or down
                const triAngle = isTooFar ? -Math.PI / 2 : Math.PI / 2;

                return (
                  <Line
                    key={poi.id}
                    x1={triX - Math.cos(triAngle + Math.PI / 2) * triSize}
                    y1={triY - Math.sin(triAngle + Math.PI / 2) * triSize}
                    x2={triX + Math.cos(triAngle) * triSize * 1.5}
                    y2={triY + Math.sin(triAngle) * triSize * 1.5}
                    stroke={strokeColor}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                );
              }

              return null;
            })}
          </Svg>
          {/* Center Reticle - clean, minimal */}
          <View style={styles.reticle}>
            <View style={styles.reticleDot} />
          </View>

          {/* Rubber Band Feedback - subtle */}
          <RubberBandVisualFeedback
            isActive={isRubberBanding && activeLimit !== "fov"}
            limitType={activeLimit === "fov" ? null : activeLimit}
            intensity={rubberBandIntensity}
          />

          {/* TOP HUD - Clean, minimal */}
          <View style={styles.topHUD}>
            <View style={styles.hudLeft}>
              <Text style={styles.hudLabel}>MIN</Text>
              <Text style={[styles.hudValue, { color: "#4CAF50" }]}>
                {(minDistance / 1000).toFixed(1)}km
              </Text>
            </View>
            <View style={styles.hudCenter}>
              <Text style={styles.hudLabel}>BEARING</Text>
              <Text style={[styles.hudValue, { color: "#00BCD4" }]}>
                {Math.round(averageBearing)}°
              </Text>
            </View>
            <View style={styles.hudRight}>
              <Text style={styles.hudLabel}>MAX</Text>
              <Text style={[styles.hudValue, { color: "#2196F3" }]}>
                {(maxDistance / 1000).toFixed(1)}km
              </Text>
            </View>
            <View style={styles.hudRight}>
              <Text style={styles.hudLabel}>FOV</Text>
              <Text style={[styles.hudValue, { color: "#FFC107" }]}>
                {Math.round(fov)}°
              </Text>
            </View>
          </View>

          {/* Bottom Controls - minimal */}
          <View style={styles.controls}>
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
    marginTop: -4,
    marginLeft: -4,
    width: 8,
    height: 8,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  reticleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0, 255, 255, 0.8)",
  },
  topHUD: {
    position: "absolute",
    top: 55,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  hudLeft: {
    alignItems: "center",
    flex: 1,
  },
  hudCenter: {
    alignItems: "center",
    flex: 1,
  },
  hudRight: {
    alignItems: "center",
    flex: 1,
  },
  hudLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hudValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginTop: 1,
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 50,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  controlButtonText: {
    fontSize: 24,
    color: "white",
  },
});
