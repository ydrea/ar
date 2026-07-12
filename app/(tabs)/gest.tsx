// app/(tabs)/gest.tsx - Native-first Cumquat AR view with JS failure fallback
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {GestureDetector} from "react-native-gesture-handler";
import {CameraType} from "expo-camera";
import {Circle, Line, Svg, Text as SvgText} from "react-native-svg";

import {AR_CONSTANTS} from "@/cumquat/constants";
import {
  calculateBearing,
  geoToENU,
  projectToScreenWithClipping,
  rotateVector,
  sensorHub,
} from "@/cumquat/sensors";
import type {ScreenPosition, SensorSnapshot} from "@/cumquat/types";
import {useARGestureController} from "@/cumquat/gestures/useARGestureController";
import type {
  GestureState,
  GestureUpdate,
  LimitType,
} from "@/cumquat/gestures/types";
import {useCameraZoom} from "@/hooks/useCameraZoom";
import type {
  EngineConfig,
  FrameSnapshot,
  POIInput,
  ProjectedPOI as NativeProjectedPOI,
  SensorState,
} from "@/modules/cumquat-native/src/types";
import {RubberBandVisualFeedback} from "@/ui/RubberBandVisualFeedback";
import {Dlog, Elog} from "@/utils/tlog";

const {width, height} = Dimensions.get("window");

type SourcePOI = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  alt: number;
};

type RenderPOI = SourcePOI & {
  distance: number;
  bearing: number;
  screenPos: ScreenPosition;
  isDistanceClipped: boolean;
  isOffscreen: boolean;
  isVisible: boolean;
};

type NativeEngine = {
  initialize(pois: readonly POIInput[]): void;
  update(sensorState: SensorState): number;
  getFrame(): FrameSnapshot;
  dispose(): void;
};

type NativeEngineFactory = {
  create(config?: EngineConfig): NativeEngine;
  getNativeVersion(): string;
};

type EngineMode = "starting" | "native" | "js-fallback";

const POIS: readonly SourcePOI[] = [
  {id: 1, name: "Tresnjevacki trg Market", lat: 45.8, lon: 15.9667, alt: 1},
  {id: 2, name: "Cafic Eliscafe", lat: 45.7995, lon: 15.967, alt: 1},
  {id: 3, name: "Pekara Mlinar", lat: 45.8005, lon: 15.966, alt: 1},
  {id: 4, name: "Konoba Tresnjevka", lat: 45.799, lon: 15.9675, alt: 1},
  {id: 5, name: "Park Maksimir", lat: 45.81, lon: 15.98, alt: 1},
  {id: 6, name: "Trg Njegoševa", lat: 45.798, lon: 15.965, alt: 1},
  {id: 7, name: "Konzum Superstore", lat: 45.801, lon: 15.968, alt: 1},
  {id: 8, name: "Ljekarna Tresnjevka", lat: 45.7985, lon: 15.9645, alt: 1},
  {id: 9, name: "Osnovna škola Tresnjevka", lat: 45.802, lon: 15.969, alt: 1},
  {id: 10, name: "Crkva sv.Antuna", lat: 45.7975, lon: 15.963, alt: 1},
  {id: 11, name: "Pivnica Medvedgrad", lat: 45.803, lon: 15.97, alt: 1},
  {id: 12, name: "Bistrolana Tresnjevka", lat: 45.799, lon: 15.9685, alt: 1},
  {id: 13, name: "Frizerski salon Ana", lat: 45.8, lon: 15.9655, alt: 1},
  {id: 14, name: "Automehaničar Drop", lat: 45.797, lon: 15.967, alt: 1},
  {id: 15, name: "Vrtuljak Park", lat: 45.8015, lon: 15.964, alt: 1},
  {id: 16, name: "Trg Kvatrić", lat: 45.798, lon: 15.9695, alt: 1},
  {
    id: 17,
    name: "Poslovni centar Tresnjevka",
    lat: 45.8015,
    lon: 15.9695,
    alt: 1,
  },
  {id: 18, name: "Knjižara Algoritam", lat: 45.798, lon: 15.9665, alt: 1},
  {id: 19, name: "Pekara Kruh", lat: 45.8025, lon: 15.9675, alt: 1},
  {id: 20, name: "Ljekarna Jambo", lat: 45.7975, lon: 15.968, alt: 1},
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
  {id: 30, name: "Otok ljubavi", lat: 45.779416, lon: 15.93489, alt: 7},
  {id: 31, name: "Otok veslača", lat: 45.778193, lon: 15.93373, alt: 10},
  {id: 32, name: "Otok Trešnjevka", lat: 45.782458, lon: 15.918919, alt: 10},
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
  {id: 35, name: "Otok divljine", lat: 45.776107, lon: 15.927812, alt: 20},
  {id: 999, name: "TEST", lat: 45.8005, lon: 15.9563, alt: 1},
];

const NATIVE_POIS: readonly POIInput[] = POIS.map((poi) => ({
  id: String(poi.id),
  name: poi.name,
  latitude: poi.lat,
  longitude: poi.lon,
  altitude: poi.alt,
}));

const DEFAULT_GESTURE_STATE: GestureState = {
  minDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
  maxDistance: AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  zoom: 0,
  fov: AR_CONSTANTS.FOV.DEFAULT,
};

let cachedNativeFactory: NativeEngineFactory | null | undefined;

function getNativeFactory(): NativeEngineFactory | null {
  if (cachedNativeFactory !== undefined) return cachedNativeFactory;

  try {
    const nativePackage = require("@/modules/cumquat-native/src") as {
      CumquatEngine: NativeEngineFactory;
    };
    cachedNativeFactory = nativePackage.CumquatEngine;
  } catch (error) {
    cachedNativeFactory = null;
    Elog("Native Cumquat module unavailable; using JS fallback:", error);
  }

  return cachedNativeFactory;
}

const normalizeAngle = (degrees: number): number =>
  ((degrees % 360) + 360) % 360;

function getRubberBandIntensity(
  limit: LimitType | null,
  excess: number,
): number {
  if (!limit || excess <= 0) return 0;
  if (limit === "fov") return Math.min(1, excess / 20);
  if (limit === "zoom") return Math.min(1, excess / 0.2);
  return Math.min(1, excess / 500);
}

function mapNativePOI(nativePOI: NativeProjectedPOI): RenderPOI {
  const source = POIS[nativePOI.poiIndex];
  if (!source) {
    throw new Error(`NativeCumquat returned invalid POI index ${nativePOI.poiIndex}`);
  }

  const screenPos: ScreenPosition = {
    x: nativePOI.x,
    y: nativePOI.y,
    visible: nativePOI.visible,
    clipped: nativePOI.clipped,
    clippedByDistance: nativePOI.clippedByDistance,
    depth: nativePOI.depth,
    radialDistance: nativePOI.distance,
  };

  return {
    ...source,
    distance: nativePOI.distance,
    bearing: nativePOI.bearing,
    screenPos,
    isDistanceClipped: nativePOI.clippedByDistance !== null,
    isOffscreen:
      nativePOI.clipped && nativePOI.clippedByDistance === null,
    isVisible:
      nativePOI.visible && nativePOI.clippedByDistance === null,
  };
}

function mapNativeFrame(frame: FrameSnapshot): RenderPOI[] {
  if (frame.projectedPOIs.length !== POIS.length) {
    throw new Error(
      `NativeCumquat returned ${frame.projectedPOIs.length}/${POIS.length} projected POIs`,
    );
  }
  return frame.projectedPOIs.map(mapNativePOI);
}

function projectWithJavaScript(
  snapshot: SensorSnapshot,
  fov: number,
  minDistance: number,
  maxDistance: number,
): RenderPOI[] {
  return POIS.map((poi) => {
    const enuPosition = geoToENU(
      snapshot.lat,
      snapshot.lon,
      snapshot.elevation,
      poi.lat,
      poi.lon,
      poi.alt,
    );
    const cameraPosition = rotateVector(enuPosition, snapshot.orientation);
    const distance = Math.hypot(
      cameraPosition.x,
      cameraPosition.y,
      cameraPosition.z,
    );
    const bearing = calculateBearing(
      snapshot.lat,
      snapshot.lon,
      poi.lat,
      poi.lon,
    );
    const screenPos = projectToScreenWithClipping(
      cameraPosition,
      distance,
      width,
      height,
      fov,
      minDistance,
      maxDistance,
    );

    return {
      ...poi,
      distance,
      bearing,
      screenPos,
      isDistanceClipped: screenPos.clippedByDistance != null,
      isOffscreen:
        screenPos.clipped && screenPos.clippedByDistance == null,
      isVisible:
        screenPos.visible && screenPos.clippedByDistance == null,
    };
  });
}

export default function ARBetaView() {
  const [cameraFacing] = useState<CameraType>("back");
  const [projectedPOIs, setProjectedPOIs] = useState<RenderPOI[]>([]);
  const [engineMode, setEngineMode] = useState<EngineMode>("starting");
  const [minDistance, setMinDistance] = useState(
    DEFAULT_GESTURE_STATE.minDistance,
  );
  const [maxDistance, setMaxDistance] = useState(
    DEFAULT_GESTURE_STATE.maxDistance,
  );
  const [fov, setFOV] = useState(DEFAULT_GESTURE_STATE.fov);
  const [isRubberBanding, setIsRubberBanding] = useState(false);
  const [activeLimit, setActiveLimit] = useState<LimitType | null>(null);
  const [rubberBandIntensity, setRubberBandIntensity] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const nativeEngineRef = useRef<NativeEngine | null>(null);
  const nativeSignatureRef = useRef("");
  const nativeDisabledRef = useRef(false);
  const nativeFailureLoggedRef = useRef(false);
  const lastLocationRef = useRef<SensorSnapshot | null>(null);
  const frameCountRef = useRef(0);

  const {
    cameraRef,
    animatedZoom,
    animatedProps,
    AnimatedCamera,
  } = useCameraZoom({
    initialZoom: DEFAULT_GESTURE_STATE.zoom,
    springConfig: {
      stiffness: AR_CONSTANTS.GESTURE.SPRING_STIFFNESS,
      damping: AR_CONSTANTS.GESTURE.SPRING_DAMPING,
      mass: AR_CONSTANTS.GESTURE.SPRING_MASS,
    },
  });

  useEffect(() => {
    console.log(`📱 Screen: ${width}x${height}, aspect: ${width / height}`);
  }, []);

  const disposeNativeEngine = useCallback(() => {
    nativeEngineRef.current?.dispose();
    nativeEngineRef.current = null;
    nativeSignatureRef.current = "";
  }, []);

  const ensureNativeEngine = useCallback((): NativeEngine | null => {
    if (nativeDisabledRef.current) return null;

    const factory = getNativeFactory();
    if (!factory) return null;

    const nearMeters = Math.max(0.001, minDistance);
    const farMeters = Math.max(nearMeters + 0.001, maxDistance);
    const signature = `${fov.toFixed(4)}:${nearMeters.toFixed(3)}:${farMeters.toFixed(3)}`;

    if (
      nativeEngineRef.current &&
      nativeSignatureRef.current === signature
    ) {
      return nativeEngineRef.current;
    }

    disposeNativeEngine();

    const engine = factory.create({
      horizontalFovDegrees: fov,
      nearMeters,
      farMeters,
      maxVisiblePOIs: POIS.length,
    });
    engine.initialize(NATIVE_POIS);

    nativeEngineRef.current = engine;
    nativeSignatureRef.current = signature;
    Dlog(
      `⚙️ Native Cumquat initialized: ${POIS.length} POIs (${factory.getNativeVersion()})`,
    );
    return engine;
  }, [disposeNativeEngine, fov, maxDistance, minDistance]);

  const renderSnapshot = useCallback(
    (snapshot: SensorSnapshot) => {
      if (!nativeDisabledRef.current) {
        try {
          const engine = ensureNativeEngine();
          if (!engine) throw new Error("Native Cumquat engine unavailable");

          engine.update({
            timestampNs: snapshot.timestamp * 1_000_000,
            location: {
              latitude: snapshot.lat,
              longitude: snapshot.lon,
              altitude: snapshot.elevation,
            },
            orientationQuaternion: snapshot.orientation,
            headingDegrees: 0,
            pitchDegrees: 0,
            rollDegrees: 0,
            viewportWidth: width,
            viewportHeight: height,
          });

          const nextPOIs = mapNativeFrame(engine.getFrame());
          setProjectedPOIs(nextPOIs);
          setEngineMode("native");

          frameCountRef.current += 1;
          if (frameCountRef.current % 10 === 1) {
            const visible = nextPOIs.filter((poi) => poi.isVisible);
            Dlog(`⚙️ Native frame: ${visible.length}/${nextPOIs.length} visible`);
            visible.slice(0, 6).forEach((poi) => {
              Dlog(
                `📍 ${poi.name}: screen (${poi.screenPos.x.toFixed(0)}, ${poi.screenPos.y.toFixed(0)})`,
              );
            });
          }
          return;
        } catch (error) {
          nativeDisabledRef.current = true;
          disposeNativeEngine();
          if (!nativeFailureLoggedRef.current) {
            nativeFailureLoggedRef.current = true;
            Elog("Native Cumquat failed; switching to JS fallback:", error);
          }
        }
      }

      setProjectedPOIs(
        projectWithJavaScript(snapshot, fov, minDistance, maxDistance),
      );
      setEngineMode("js-fallback");
    },
    [disposeNativeEngine, ensureNativeEngine, fov, maxDistance, minDistance],
  );

  const applyGestureState = useCallback((state: GestureState) => {
    setMinDistance(state.minDistance);
    setMaxDistance(state.maxDistance);
    setFOV(state.fov);
  }, []);

  const handleGestureUpdate = useCallback(
    (update: GestureUpdate) => {
      applyGestureState(update.state);
      setIsRubberBanding(update.rubberBanding);
      setActiveLimit(update.activeLimit);
      setRubberBandIntensity(
        getRubberBandIntensity(update.activeLimit, update.excess),
      );
    },
    [applyGestureState],
  );

  const handleGestureEnd = useCallback(
    (state: GestureState) => {
      applyGestureState(state);
      setIsRubberBanding(false);
      setActiveLimit(null);
      setRubberBandIntensity(0);
    },
    [applyGestureState],
  );

  const gestureCallbacks = useMemo(
    () => ({onUpdate: handleGestureUpdate, onEnd: handleGestureEnd}),
    [handleGestureEnd, handleGestureUpdate],
  );

  const {gesture: pinchGesture, setState: setGestureState} =
    useARGestureController({
      initialState: DEFAULT_GESTURE_STATE,
      callbacks: gestureCallbacks,
      cameraZoom: animatedZoom,
    });

  useEffect(() => {
    let cancelled = false;

    sensorHub
      .start()
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch((error) => {
        Elog("SensorHub start failed:", error);
      });

    return () => {
      cancelled = true;
      sensorHub.stop();
      disposeNativeEngine();
    };
  }, [disposeNativeEngine]);

  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      const snapshot = sensorHub.getSnapshot();
      if (snapshot.lat === 0 && snapshot.lon === 0) return;

      const previous = lastLocationRef.current;
      if (
        !previous ||
        Math.abs(previous.lat - snapshot.lat) > 0.000001 ||
        Math.abs(previous.lon - snapshot.lon) > 0.000001
      ) {
        Dlog(`📍 Location changed: ${snapshot.lat}, ${snapshot.lon}`);
        lastLocationRef.current = snapshot;
      }

      renderSnapshot(snapshot);
    }, 100);

    return () => clearInterval(interval);
  }, [isReady, renderSnapshot]);

  const averageBearing = useMemo(() => {
    const visiblePOIs = projectedPOIs.filter((poi) => poi.isVisible);
    if (visiblePOIs.length === 0) return 0;
    const total = visiblePOIs.reduce((sum, poi) => sum + poi.bearing, 0);
    return normalizeAngle(total / visiblePOIs.length);
  }, [projectedPOIs]);

  return (
    <GestureDetector gesture={pinchGesture}>
      <View style={styles.container}>
        <AnimatedCamera
          ref={cameraRef as any}
          animatedProps={animatedProps}
          facing={cameraFacing}
          mode="video"
          onCameraReady={() => Dlog("Camera ready")}
          onMountError={(error: unknown) => {
            Elog("Camera mount error:", error);
          }}
          style={StyleSheet.absoluteFill}
        />

        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <SvgText
            x={10}
            y={30}
            fill="rgba(255,255,255,0.9)"
            fontSize={14}
            fontWeight="bold"
          >
            POIs: {projectedPOIs.filter((poi) => poi.isVisible).length} visible /{" "}
            {projectedPOIs.length} total · {engineMode === "native" ? "C++" : engineMode}
          </SvgText>

          {projectedPOIs.map((poi) => {
            const {x, y} = poi.screenPos;
            if (
              x === 0 &&
              y === 0 &&
              !poi.isOffscreen &&
              !poi.isDistanceClipped
            ) {
              return null;
            }

            const distanceRatio = Math.min(1, poi.distance / 2000);
            const opacity = Math.max(0.6, 1 - distanceRatio * 0.5);
            const fontSize = Math.max(10, 16 - distanceRatio * 6);

            if (poi.isVisible) {
              return (
                <React.Fragment key={poi.id}>
                  <Circle cx={x} cy={y} r={10} fill="rgba(255, 0, 0, 0.8)" />
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

            const isTooFar =
              poi.isDistanceClipped &&
              poi.screenPos.clippedByDistance === "max";
            const isTooClose =
              poi.isDistanceClipped &&
              poi.screenPos.clippedByDistance === "min";

            if (poi.isOffscreen || isTooFar || isTooClose) {
              const centerX = width / 2;
              const centerY = height / 2;
              const dx = x - centerX;
              const dy = y - centerY;
              const angle = Math.atan2(dy, dx);

              let triX: number;
              let triY: number;
              let triAngle: number;
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

        <View style={styles.reticle} pointerEvents="none">
          <View style={styles.reticleDot} />
        </View>

        <RubberBandVisualFeedback
          isActive={isRubberBanding && activeLimit !== "fov"}
          limitType={activeLimit === "fov" ? null : activeLimit}
          intensity={rubberBandIntensity}
        />

        <View style={styles.topHUD} pointerEvents="none">
          <View style={styles.hudLeft}>
            <Text style={styles.hudLabel}>MIN</Text>
            <Text style={[styles.hudValue, {color: "#4CAF50"}]}>
              {(minDistance / 1000).toFixed(1)}km
            </Text>
          </View>
          <View style={styles.hudCenter}>
            <Text style={styles.hudLabel}>BEARING</Text>
            <Text style={[styles.hudValue, {color: "#00BCD4"}]}>
              {Math.round(averageBearing)}°
            </Text>
          </View>
          <View style={styles.hudRight}>
            <Text style={styles.hudLabel}>MAX</Text>
            <Text style={[styles.hudValue, {color: "#2196F3"}]}>
              {(maxDistance / 1000).toFixed(1)}km
            </Text>
          </View>
          <View style={styles.hudRight}>
            <Text style={styles.hudLabel}>FOV</Text>
            <Text style={[styles.hudValue, {color: "#FFC107"}]}>
              {Math.round(fov)}°
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              const resetState = setGestureState(DEFAULT_GESTURE_STATE);
              applyGestureState(resetState);
              setIsRubberBanding(false);
              setActiveLimit(null);
              setRubberBandIntensity(0);
              nativeDisabledRef.current = false;
              nativeFailureLoggedRef.current = false;
              disposeNativeEngine();
              setEngineMode("starting");
            }}
          >
            <Text style={styles.controlButtonText}>↺</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: "#000"},
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
  hudLeft: {alignItems: "center", flex: 1},
  hudCenter: {alignItems: "center", flex: 1},
  hudRight: {alignItems: "center", flex: 1},
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
  controlButtonText: {fontSize: 24, color: "white"},
});
