#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace cumquat {

struct GeoPoint {
  double latitudeDeg{0.0};
  double longitudeDeg{0.0};
  double altitudeMeters{0.0};
};

struct Quaternion {
  double x{0.0};
  double y{0.0};
  double z{0.0};
  double w{1.0};
};

struct POI {
  std::string id;
  std::string name;
  GeoPoint position;
};

struct EngineConfig {
  double horizontalFovDeg{90.0};
  double nearMeters{0.5};
  double farMeters{135000.0};
  std::uint32_t maxVisiblePOIs{256};
};

struct SensorState {
  std::int64_t timestampNs{0};
  GeoPoint location;

  // Direct device quaternion mode preserves the exact JS q*v*q^-1 path.
  Quaternion orientation;
  bool hasOrientationQuaternion{false};

  // Euler mode remains available for conventional/native callers and tests.
  double headingDeg{0.0};
  double pitchDeg{0.0};
  double rollDeg{0.0};

  double viewportWidth{1.0};
  double viewportHeight{1.0};
};

enum class DistanceClip : std::uint8_t {
  None = 0,
  Min = 1,
  Max = 2,
};

struct VisiblePOI {
  std::uint32_t poiIndex{0};
  double x{0.0};
  double y{0.0};
  double depth{0.0};
  double distance{0.0};
  double bearingDeg{0.0};
  bool visible{false};
  bool clipped{true};
  DistanceClip clippedByDistance{DistanceClip::None};
};

struct FrameSnapshot {
  std::uint64_t sequence{0};
  std::int64_t timestampNs{0};

  // Stable POI-index order. Includes visible, offscreen, behind-camera, and
  // distance-clipped entries so the UI can render labels and edge indicators
  // without running a second projection implementation in JavaScript.
  std::vector<VisiblePOI> projectedPOIs;

  // Visible-only, depth-sorted view retained for picking and compatibility.
  std::vector<VisiblePOI> visiblePOIs;
};

struct PickResult {
  std::uint32_t poiIndex{0};
  double distancePixels{0.0};
};

} // namespace cumquat
