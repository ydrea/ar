// app/gest-beta.tsx - Clean Beta AR View with proper logging
import React, { useEffect, useState, useRef, useMemo } from "react";
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
import { CameraView, CameraType } from "expo-camera";
import { Circle, Svg, Line, Text as SvgText } from "react-native-svg";
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
import { RubberBandVisualFeedback } from "@/ui/RubberBandVisualFeedback";
import { Dlog, Tlog, Elog } from "@/utils/tlog";

const { width, height } = Dimensions.get("window");

// POIs array
const POIS = [
  { id: 1, name: "Tresnjevacki trg Market", lat: 45.8, lon: 15.9667, alt: 1 },
  { id: 2, name: "Cafic Eliscafe", lat: 45.7995, lon: 15.967, alt: 1 },
  { id: 3, name: "Pekara Mlinar", lat: 45.8005, lon: 15.966, alt: 1 },
  { id: 4, name: "Konoba Tresnjevka", lat: 45.799, lon: 15.9675, alt: 1 },
  { id: 5, name: "Park Maksimir", lat: 45.81, lon: 15.98, alt: 1 },
  { id: 6, name: "Trg Njegoševa", lat: 45.798, lon: 15.965, alt: 1 },
  { id: 7, name: "Konzum Superstore", lat: 45.801, lon: 15.968, alt: 1 },
  { id: 8, name: "Ljekarna Tresnjevka", lat: 45.7985, lon: 15.9645, alt: 1 },
  { id: 9, name: "Osnovna škola Tresnjevka", lat: 45.802, lon: 15.969, alt: 1 },
  { id: 10, name: "Crkva sv.Antuna", lat: 45.7975, lon: 15.963, alt: 1 },
  { id: 11, name: "Pivnica Medvedgrad", lat: 45.803, lon: 15.97, alt: 1 },
  { id: 12, name: "Bistrolana Tresnjevka", lat: 45.799, lon: 15.9685, alt: 1 },
  { id: 13, name: "Frizerski salon Ana", lat: 45.8, lon: 15.9655, alt: 1 },
  { id: 14, name: "Automehaničar Drop", lat: 45.797, lon: 15.967, alt: 1 },
  { id: 15, name: "Vrtuljak Park", lat: 45.8015, lon: 15.964, alt: 1 },
  { id: 16, name: "Trg Kvatrić", lat: 45.798, lon: 15.9695, alt: 1 },
  {
    id: 17,
    name: "Poslovni centar Tresnjevka",
    lat: 45.8015,
    lon: 15.9695,
    alt: 1,
  },
  { id: 18, name: "Knjižara Algoritam", lat: 45.798, lon: 15.9665, alt: 1 },
  { id: 19, name: "Pekara Kruh", lat: 45.8025, lon: 15.9675, alt: 1 },
  { id: 20, name: "Ljekarna Jambo", lat: 45.7975, lon: 15.968, alt: 1 },
  {
    id: 21,
    name: "Cibona",
    lat: 45.803249057020885,
    lon: 15.96347793271185,
    alt: 92,
  },
  {
    id: 22,
    name: "Zagrepčanka",
    lat: 45.798528643549396,
    lon: 15.96245585283698,
    alt: 95,
  },
  {
    id: 23,
    name: "Vjesnik",
    lat: 45.793551576662246,
    lon: 15.959205695046405,
    alt: 67,
  },
  {
    id: 24,
    name: "Jelenovac",
    lat: 45.82741901993836,
    lon: 15.956039702679561,
    alt: 135,
  },
  {
    id: 25,
    name: "Dom sportova",
    lat: 45.80736039531922,
    lon: 15.951976431579737,
    alt: 0,
  },
  {
    id: 26,
    name: "Sljeme",
    lat: 45.89946265300375,
    lon: 15.94482091926767,
    alt: 1033,
  },
  {
    id: 27,
    name: "Medvedgrad",
    lat: 45.89946265300375,
    lon: 15.94482091926767,
    alt: 579,
  },
  {
    id: 28,
    name: "Grmoščica",
    lat: 45.81692484023739,
    lon: 15.92419321766124,
    alt: 239,
  },
  {
    id: 29,
    name: "Trg Francuske Republike",
    lat: 45.81050656334719,
    lon: 15.95553638845962,
    alt: 0,
  },
  { id: 30, name: "Otok ljubavi", lat: 45.779416, lon: 15.93489, alt: 7 },
  { id: 31, name: "Otok veslača", lat: 45.778193, lon: 15.93373, alt: 10 },
  { id: 32, name: "Otok Trešnjevka", lat: 45.782458, lon: 15.918919, alt: 10 },
  {
    id: 33,
    name: "Otok Univerzijade",
    lat: 45.784486,
    lon: 15.914094,
    alt: 15,
  },
  {
    id: 34,
    name: "Otok hrvatske mladeži",
    lat: 45.778619,
    lon: 15.925837,
    alt: 14,
  },
  { id: 35, name: "Otok divljine", lat: 45.776107, lon: 15.927812, alt: 20 },
  // Add this to your POIS array temporarily
  { id: 999, name: "TEST", lat: 45.8005, lon: 15.9563, alt: 1 },
];

const normalizeAngle = (deg: number): number => ((deg % 360) + 360) % 360;

export default function ARBetaView() {
  // At the top of your component
  console.log(`📱 Screen: ${width}x${height}, aspect: ${width / height}`);

  const cameraRef = useRef<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [userLocation, setUserLocation] = useState<SensorSnapshot | null>(null);
  const [poiPositions, setPoiPositions] = useState<any[]>([]);

  // Gesture state
  const gestureController = useRef(new ARGestureController());
  const [minDistance, setMinDistance] = useState(
    AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
  );
  const [maxDistance, setMaxDistance] = useState(
    AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  );
  const [cameraZoom, setCameraZoom] = useState(0);
  const [fov, setFOV] = useState(AR_CONSTANTS.FOV.DEFAULT);
  const [isRubberBanding, setIsRubberBanding] = useState(false);
  const [activeLimit, setActiveLimit] = useState<LimitType>(null);
  const [rubberBandIntensity, setRubberBandIntensity] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [gestureMode, setGestureMode] = useState<GestureMode>(null);
  const [isGestureActive, setIsGestureActive] = useState(false);

  // Refs for tracking changes
  const lastOrientationRef = useRef({ x: 0, y: 0, z: 0, w: 1 });
  const lastLocationRef = useRef<SensorSnapshot | null>(null);
  const logCountRef = useRef(0);

  // Initialize gesture controller
  // In log.tsx - Fix the useEffect callback types

  useEffect(() => {
    gestureController.current.setCallbacks({
      onMinDistanceChange: (newMin: number, isRB: boolean) => {
        setMinDistance(newMin);
        if (isRB) {
          setIsRubberBanding(true);
          setActiveLimit("min");
        }
      },
      onMaxDistanceChange: (newMax: number, isRB: boolean) => {
        setMaxDistance(newMax);
        if (isRB) {
          setIsRubberBanding(true);
          setActiveLimit("max");
        }
      },
      onCameraZoomChange: (newZoom: number, isRB: boolean) => {
        setCameraZoom(newZoom);
        if (isRB) {
          setIsRubberBanding(true);
          setActiveLimit("zoom");
        }
      },
      onFOVChange: (newFOV: number, isRB: boolean) => {
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
      onLimitHit: (limit: LimitType, excess: number) => {
        setActiveLimit(limit);
        setIsRubberBanding(true);
        setRubberBandIntensity(Math.min(1, excess / 500));
      },
      onLimitRelease: () => {
        setIsRubberBanding(false);
        setRubberBandIntensity(0);
        setActiveLimit(null);
      },
      onGestureStart: (mode: GestureMode) => {
        setGestureMode(mode);
        setIsGestureActive(true);
      },
      onGestureUpdate: (mode: GestureMode, state: any) => {
        setGestureMode(mode);
        if (state.min !== undefined) setMinDistance(state.min);
        if (state.max !== undefined) setMaxDistance(state.max);
        if (state.zoom !== undefined) setCameraZoom(state.zoom);
        if (state.fov !== undefined) setFOV(state.fov);
        if (state.isRubberBanding) setIsRubberBanding(true);
      },
      onGestureEnd: () => {
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

    Dlog(
      `📍 Processing ${POIS.length} POIs at: ${userLocation.lat}, ${userLocation.lon}`,
    );

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
      ///////////////////

      const distance = Math.hypot(rotatedPos.x, rotatedPos.y, rotatedPos.z);
      const poiBearing = calculateBearing(
        userLocation.lat,
        userLocation.lon,
        poi.lat,
        poi.lon,
      );

      // // Log first 5 POIs for debugging
      // if (poi.id <= 5) {
      //   Dlog(`  POI ${poi.id}: ${poi.name}`);
      //   Dlog(
      //     `    pos: (${rotatedPos.x.toFixed(1)}, ${rotatedPos.y.toFixed(1)}, ${rotatedPos.z.toFixed(1)})`,
      //   );
      //   Dlog(
      //     `    distance: ${distance.toFixed(0)}m, bearing: ${poiBearing.toFixed(0)}°`,
      //   );
      // }

      return { ...poi, pos: rotatedPos, distance, bearing: poiBearing };
    });
    setPoiPositions(processed);
  }, [userLocation]);

  // Process POIs with clipping
  const projectedPOIs = useMemo(() => {
    const result = poiPositions
      .map((poi) => {
        const screenPos = projectToScreenWithClipping(
          poi.pos,
          poi.distance,
          width,
          height,
          fov,
          minDistance,
          maxDistance,
        );

        // // Debug first few POIs
        // if (poi.id <= 3 && logCountRef.current % 10 === 0) {
        //   Dlog(
        //     `🔍 POI ${poi.id}: screen: (${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)})`,
        //   );
        //   Dlog(
        //     `   visible: ${screenPos.visible}, clipped: ${screenPos.clipped}`,
        //   );
        //   Dlog(
        //     `   clippedByDistance: ${screenPos.clippedByDistance}, depth: ${screenPos.depth}`,
        //   );
        // }

        return {
          ...poi,
          screenPos,
          isDistanceClipped: screenPos.clippedByDistance !== null,
          isOffscreen:
            screenPos.clipped && screenPos.clippedByDistance === null,
          isVisible: screenPos.visible && screenPos.clippedByDistance === null,
        };
      })
      .filter(
        (poi) => poi.isVisible || poi.isOffscreen || poi.isDistanceClipped,
      );

    // // Throttled log
    // logCountRef.current++;
    // if (logCountRef.current % 20 === 0) {
    //   const visible = result.filter((p) => p.isVisible);
    //   Dlog(`📍 Visible: ${visible.length}/${result.length}`);
    // }

    // In the projectedPOIs useMemo, after calculating result:
    const visiblePOIs = result.filter((p) => p.isVisible);
    if (visiblePOIs.length > 0 && logCountRef.current % 5 === 0) {
      visiblePOIs.forEach((poi) => {
        Dlog(
          `📍 ${poi.name}: screen (${poi.screenPos.x.toFixed(0)}, ${poi.screenPos.y.toFixed(0)})`,
        );
      });
    }

    return result;
  }, [poiPositions, fov, minDistance, maxDistance]);

  // Sensor subscription
  useEffect(() => {
    if (!isReady) return;

    let lastLocationUpdate = 0;

    const interval = setInterval(() => {
      const snapshot = sensorHub.getSnapshot();
      if (snapshot.lat === 0 && snapshot.lon === 0) return;

      const orient = snapshot.orientation;
      const lastOrient = lastOrientationRef.current;

      // Check orientation change
      const orientChanged =
        Math.abs(orient.x - lastOrient.x) > 0.001 ||
        Math.abs(orient.y - lastOrient.y) > 0.001 ||
        Math.abs(orient.z - lastOrient.z) > 0.001 ||
        Math.abs(orient.w - lastOrient.w) > 0.001;

      // Check location change
      const now = Date.now();
      const isLocationUpdate = now - lastLocationUpdate > 500;
      let locationChanged = false;

      if (isLocationUpdate) {
        const last = lastLocationRef.current;
        if (
          !last ||
          Math.abs(last.lat - snapshot.lat) > 0.000001 ||
          Math.abs(last.lon - snapshot.lon) > 0.000001
        ) {
          locationChanged = true;
          lastLocationUpdate = now;
          lastLocationRef.current = snapshot;
        }
      }

      // Update if something changed
      if (locationChanged) {
        Dlog(`📍 Location changed: ${snapshot.lat}, ${snapshot.lon}`);
        setUserLocation(snapshot);
        lastOrientationRef.current = { ...orient };
      } else if (orientChanged) {
        setUserLocation((prev) => {
          if (!prev) return snapshot;
          return {
            ...prev,
            orientation: orient,
            timestamp: snapshot.timestamp,
          };
        });
        lastOrientationRef.current = { ...orient };
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isReady]);

  const pinchGesture = gestureController.current.createGesture();

  const averageBearing = useMemo(() => {
    const visiblePOIs = projectedPOIs.filter((p) => p.isVisible);
    if (visiblePOIs.length === 0) return 0;
    let sum = 0;
    visiblePOIs.forEach((p) => {
      sum += p.bearing;
    });
    return normalizeAngle(sum / visiblePOIs.length);
  }, [projectedPOIs]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={pinchGesture}>
        <View style={styles.container}>
          {/* Camera View */}
          {cameraReady && (
            <CameraView
              ref={cameraRef}
              facing={cameraFacing}
              mode="video"
              zoom={cameraZoom}
              onCameraReady={() => setCameraReady(true)}
              onMountError={(error) => {
                Elog("Camera mount error:", error);
                setCameraReady(false);
              }}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* AR Overlay */}

          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Debug counter */}
            <SvgText
              x={10}
              y={30}
              fill="rgba(255,255,255,0.9)"
              fontSize={14}
              fontWeight="bold"
            >
              POIs: {projectedPOIs.filter((p) => p.isVisible).length} visible /{" "}
              {projectedPOIs.length} total
            </SvgText>

            {projectedPOIs.map((poi) => {
              const { x, y } = poi.screenPos;

              if (x === 0 && y === 0 && !poi.isOffscreen) return null;

              // Simple distance-based opacity
              const distanceRatio = Math.min(1, poi.distance / 2000);
              const opacity = Math.max(0.6, 1 - distanceRatio * 0.5);
              const fontSize = Math.max(10, 16 - distanceRatio * 6);

              // VISIBLE POI
              if (poi.isVisible) {
                return (
                  <React.Fragment key={poi.id}>
                    {/* 🟥 RED DOT - to confirm position */}
                    <Circle cx={x} cy={y} r={10} fill="rgba(255, 0, 0, 0.8)" />

                    {/* POI Name */}
                    <SvgText
                      x={x}
                      y={y - 15}
                      fill={`rgba(255, 255, 255, ${opacity})`}
                      fontSize={fontSize}
                      fontWeight="bold"
                      textAnchor="middle"
                      stroke="rgba(0, 0, 0, 0.6)"
                      strokeWidth={3}
                    >
                      {poi.name}
                    </SvgText>

                    {/* Distance */}
                    <SvgText
                      x={x}
                      y={y + fontSize + 6}
                      fill={`rgba(200, 200, 255, ${opacity * 0.7})`}
                      fontSize={Math.max(8, fontSize - 4)}
                      textAnchor="middle"
                      stroke="rgba(0, 0, 0, 0.3)"
                      strokeWidth={2}
                    >
                      {poi.distance < 1000
                        ? `${Math.round(poi.distance)}m`
                        : `${(poi.distance / 1000).toFixed(1)}km`}
                    </SvgText>
                  </React.Fragment>
                );
              }

              // OFFSCREEN TRIANGLES (same as before)
              const isTooFar =
                poi.isDistanceClipped &&
                poi.screenPos.clippedByDistance === "max";
              const isTooClose =
                poi.isDistanceClipped &&
                poi.screenPos.clippedByDistance === "min";
              const isOffscreen = poi.isOffscreen;

              if (isOffscreen || isTooFar || isTooClose) {
                const centerX = width / 2;
                const centerY = height / 2;
                const dx = x - centerX;
                const dy = y - centerY;
                const angle = Math.atan2(dy, dx);

                let triX: number, triY: number, triAngle: number;
                let strokeColor = `rgba(255, 255, 255, ${Math.max(0.4, opacity)})`;
                const triSize = 8 + (1 - distanceRatio) * 6;

                if (isTooFar) {
                  triX = centerX + Math.cos(angle) * (width / 2 - 40);
                  triY = 50;
                  triAngle = -Math.PI / 2;
                  strokeColor = `rgba(255, 200, 100, ${Math.max(0.4, opacity)})`;
                } else if (isTooClose) {
                  triX = centerX + Math.cos(angle) * (width / 2 - 40);
                  triY = height - 50;
                  triAngle = Math.PI / 2;
                  strokeColor = `rgba(100, 200, 255, ${Math.max(0.4, opacity)})`;
                } else {
                  const edgeDistance = 40;
                  triX = centerX + Math.cos(angle) * (width / 2 - edgeDistance);
                  triY =
                    centerY + Math.sin(angle) * (height / 2 - edgeDistance);
                  triAngle = angle;
                }

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
          {/* Center Reticle */}
          <View style={styles.reticle}>
            <View style={styles.reticleDot} />
          </View>

          {/* Rubber Band Feedback */}
          <RubberBandVisualFeedback
            isActive={isRubberBanding && activeLimit !== "fov"}
            limitType={activeLimit === "fov" ? null : activeLimit}
            intensity={rubberBandIntensity}
          />

          {/* TOP HUD */}
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

          {/* Reset Button */}
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
                const snapshot = sensorHub.getSnapshot();
                if (snapshot.lat !== 0 || snapshot.lon !== 0) {
                  setUserLocation(snapshot);
                }
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
  container: { flex: 1, backgroundColor: "#000" },
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
  hudLeft: { alignItems: "center", flex: 1 },
  hudCenter: { alignItems: "center", flex: 1 },
  hudRight: { alignItems: "center", flex: 1 },
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
  controlButtonText: { fontSize: 24, color: "white" },
});
