#!/usr/bin/env python3
"""Remove runtime logging from the C++production branch.

The replacements are intentionally strict: the script stops if an expected
source fragment is missing, so it cannot silently rewrite unrelated code.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one exact match, found {count}: {old!r}")
    write(path, text.replace(old, new, 1))


def remove_once(path: str, old: str) -> None:
    replace_once(path, old, "")


def regex_replace(path: str, pattern: str, replacement: str, expected: int = 1) -> None:
    text = read(path)
    next_text, count = re.subn(pattern, replacement, text, flags=re.MULTILINE | re.DOTALL)
    if count != expected:
        raise RuntimeError(
            f"{path}: expected {expected} regex matches, found {count}: {pattern!r}"
        )
    write(path, next_text)


# App bootstrap.
remove_once(
    "app/_layout.tsx",
    'import { getCumquatNativeVersion } from "@/modules/cumquat-native/src";\n',
)
remove_once(
    "app/_layout.tsx",
    ' /////////////////////\nuseEffect(() => {\n  console.log("🟢 Cumquat native:", getCumquatNativeVersion());\n}, []);\n/////////////////////\n',
)

# Active AR view.
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    'import { Dlog, Elog, Rlog, Tlog } from "@/utils/tlog";\n',
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '    getNativeVersion(): string;\n',
)
replace_once(
    "components/ARBetaNativeOverlayView.tsx",
    '  } catch (error) {\n    cachedNativeFactory = null;\n    Elog("Native Cumquat module unavailable; using JS fallback:", error);\n  }\n',
    '  } catch {\n    cachedNativeFactory = null;\n  }\n',
)
for line in (
    '  const nativeFailureLoggedRef = useRef(false);\n',
    '  const lastLocationRef = useRef<SensorSnapshot | null>(null);\n',
    '  const frameCountRef = useRef(0);\n',
):
    remove_once("components/ARBetaNativeOverlayView.tsx", line)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '    Rlog(\n      `📐 AR viewport: ${next.width.toFixed(0)}x${next.height.toFixed(0)} landscape`,\n    );\n',
)
regex_replace(
    "components/ARBetaNativeOverlayView.tsx",
    r"  const disableNative = useCallback\(\n    \(error: unknown\) => \{\n      nativeDisabledRef\.current = true;\n      disposeNativeEngine\(\);\n      setEngineMode\(\"js-fallback\"\);\n\n      if \(!nativeFailureLoggedRef\.current\) \{\n        nativeFailureLoggedRef\.current = true;\n        Elog\(\"Native Cumquat failed; switching to JS fallback:\", error\);\n      \}\n    \},\n    \[disposeNativeEngine\],\n  \);",
    '  const disableNative = useCallback(() => {\n    nativeDisabledRef.current = true;\n    disposeNativeEngine();\n    setEngineMode("js-fallback");\n  }, [disposeNativeEngine]);',
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '    Dlog(\n      `⚙️ Native Cumquat initialized: ${nativePOIs.length} POIs (${factory.getNativeVersion()})`,\n    );\n\n',
)
regex_replace(
    "components/ARBetaNativeOverlayView.tsx",
    r"catch \(error\) \{\n(\s*)disableNative\(error\);",
    r"catch {\n\1disableNative();",
    expected=3,
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '            frameCountRef.current += 1;\n            if (frameCountRef.current % 10 === 1) {\n              const visible = nextPOIs.filter((poi) => poi.isVisible);\n              Tlog(\n                `⚙️ Native frame committed: ${visible.length} visible / ${nextPOIs.length} active`,\n              );\n            }\n',
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '        Dlog(`📦 Loaded ${loadedPOIs.length} POIs from binary`);\n',
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '        Elog("POI binary loading failed:", resolvedError);\n',
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '    Dlog(\n      `📐 Initial landscape viewport: ${viewportRef.current.width.toFixed(0)}x${viewportRef.current.height.toFixed(0)}`,\n    );\n\n',
)
replace_once(
    "components/ARBetaNativeOverlayView.tsx",
    '      .catch((error) => Elog("SensorHub start failed:", error));\n',
    '      .catch(() => {\n        if (!cancelled) setIsReady(false);\n      });\n',
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '      const previous = lastLocationRef.current;\n      if (\n        !previous ||\n        Math.abs(previous.lat - snapshot.lat) > 0.000001 ||\n        Math.abs(previous.lon - snapshot.lon) > 0.000001\n      ) {\n        Dlog(`📍 Location changed: ${snapshot.lat}, ${snapshot.lon}`);\n        lastLocationRef.current = snapshot;\n      }\n\n',
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '          onCameraReady={() => Dlog("Camera ready")}\n          onMountError={(error: unknown) => Elog("Camera mount error:", error)}\n',
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '            //////////////////////\n            // // triangles debugging\n            // if (!poi.isVisible) {\n            //   console.log("TRIANGLE", {\n            //     name: poi.name,\n            //     distance: poi.distance,\n            //     clipped: poi.screenPos.clipped,\n            //     clippedByDistance: poi.screenPos.clippedByDistance,\n            //     isOffscreen: poi.isOffscreen,\n            //   });\n            // }\n            ///////////////////////\n',
)
remove_once(
    "components/ARBetaNativeOverlayView.tsx",
    '              nativeFailureLoggedRef.current = false;\n',
)

# Sensor hub.
remove_once("cumquat/sensors.ts", 'import {Tlog} from "@/utils/tlog";\n')
for fragment in (
    '    Tlog("✅ SensorHub started");\n',
    '      Tlog("⚠️ DeviceMotion permission not granted");\n',
    '      Tlog("⚠️ Location permission not granted");\n',
    '    Tlog(`Invalid POI coordinates: lat=${lat2}, lon=${lon2}`);\n',
):
    remove_once("cumquat/sensors.ts", fragment)
replace_once(
    "cumquat/sensors.ts",
    '    } catch (error) {\n      Tlog(`⚠️ Compass heading unavailable: ${String(error)}`);\n    }\n',
    '    } catch {\n      this.headingWatch = null;\n    }\n',
)

# UI/context helpers.
replace_once(
    "contexts/LanguageContext.js",
    'import { createContext, useContext, useEffect, useState } from "react";\n',
    'import { createContext, useContext, useState } from "react";\n',
)
remove_once(
    "contexts/LanguageContext.js",
    '  useEffect(() => {\n    console.log("Language changed to:", currentLanguage);\n  }, [currentLanguage]);\n\n',
)
remove_once(
    "contexts/translations.js",
    '    console.warn(\n      `Missing translation for key: ${key} in language: ${language}`,\n    );\n',
)

# Permissions.
for fragment in (
    '    console.log("Requesting all permissions...");\n',
    '    console.log("Current states:", {\n      cameraGranted: cameraPermission?.granted,\n      locationGranted,\n    });\n\n',
    '      console.log("Camera permission result:", camera);\n',
    '      console.log("Location permission result:", location);\n',
    '    console.log("Final permission results:", { camera, location });\n\n',
):
    remove_once("hooks/usePermissions.ts", fragment)

# Expo Updates.
remove_once(
    "utils/updates.js",
    '        if (!silent) {\n          console.log(\n            `Current channel (${currentInfo.channel}) doesn\'t match requested (${channel})`,\n          );\n        }\n',
)
remove_once(
    "utils/updates.js",
    '      if (!silent) {\n        console.log("No updates available");\n      }\n',
)
replace_once(
    "utils/updates.js",
    '  } catch (error) {\n    if (!silent) {\n      console.error("Update check failed:", error);\n      Alert.alert(\n',
    '  } catch {\n    if (!silent) {\n      Alert.alert(\n',
)
replace_once(
    "utils/updates.js",
    '  } catch (error) {\n    console.log("getCurrentUpdateAsync not available in development");\n',
    '  } catch {\n',
)
remove_once(
    "utils/updates.js",
    '    // Listen for update events\n    if (Updates.addListener) {\n      Updates.addListener((event) => {\n        if (event.type === Updates.UpdateEventType.UPDATE_AVAILABLE) {\n          console.log("Update available:", event.updateId);\n        }\n      });\n    }\n',
)
remove_once(
    "utils/updates.js",
    '  // Log current update info for debugging\n  getCurrentUpdateInfo().then((info) => {\n    console.log("Current update info:", {\n      ...info,\n      buildProfile: buildProfile || "unknown",\n    });\n  });\n',
)

# Keep the public logger API for compatibility, but make production completely silent.
write(
    "utils/tlog.ts",
    '''// utils/tlog.ts - intentionally silent production logger\n\ntype Logger = (...args: unknown[]) => void;\n\nconst noop: Logger = () => {};\n\nexport const Tlog = noop;\nexport const Slog = noop;\nexport const Rlog = noop;\nexport const Plog = noop;\nexport const Elog = noop;\nexport const Dlog = noop;\nexport const PlogPerf = (_label: string, _startTime: number): void => {};\n\nexport default {\n  Tlog,\n  Slog,\n  Rlog,\n  Plog,\n  Elog,\n  Dlog,\n  PlogPerf,\n};\n''',
)

# Native test executable should also be silent on success.
remove_once("modules/cumquat-native/tests/core_test.cpp", "#include <iostream>\n")
remove_once(
    "modules/cumquat-native/tests/core_test.cpp",
    '  std::cout << "cumquat_core_tests passed\\n";\n',
)

print("Production logging removed.")
