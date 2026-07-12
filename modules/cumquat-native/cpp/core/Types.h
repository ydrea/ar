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
  double headingDeg{0.0};
  double pitchDeg{0.0};
  double rollDeg{0.0};
  double viewportWidth{1.0};
  double viewportHeight{1.0};
};

struct VisiblePOI {
  std::uint32_t poiIndex{0};
  double x{0.0};
  double y{0.0};
  double depth{0.0};
  double distance{0.0};
  double bearingDeg{0.0};
  bool visible{false};
};

struct FrameSnapshot {
  std::uint64_t sequence{0};
  std::int64_t timestampNs{0};
  std::vector<VisiblePOI> visiblePOIs;
};

struct PickResult {
  std::uint32_t poiIndex{0};
  double distancePixels{0.0};
};

} // namespace cumquat
