#include "Engine.h"

#include "../geo/Geodesy.h"
#include "../projection/Projection.h"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace cumquat {

Engine::Engine(EngineConfig config) : config_(config) {
  if (config_.horizontalFovDeg <= 1.0 || config_.horizontalFovDeg >= 179.0) {
    throw std::invalid_argument("horizontalFovDeg must be between 1 and 179 degrees");
  }
  if (config_.nearMeters < 0.0 || config_.farMeters <= config_.nearMeters) {
    throw std::invalid_argument("invalid near/far distance range");
  }
}

void Engine::initialize(std::vector<POI> pois) {
  pois_ = std::move(pois);
  frame_ = {};
  frame_.visiblePOIs.reserve(std::min<std::size_t>(pois_.size(), config_.maxVisiblePOIs));
  initialized_ = true;
}

std::uint64_t Engine::update(const SensorState& sensorState) {
  if (!initialized_) {
    throw std::logic_error("Cumquat engine must be initialized before update");
  }

  frame_.sequence += 1;
  frame_.timestampNs = sensorState.timestampNs;
  frame_.visiblePOIs.clear();

  for (std::uint32_t index = 0; index < pois_.size(); ++index) {
    const POI& poi = pois_[index];
    const Vec3 enu = geo::ecefToENU(geo::toECEF(poi.position), sensorState.location);
    const double distance = enu.length();
    if (distance < config_.nearMeters || distance > config_.farMeters) continue;

    const Vec3 camera = projection::worldToCamera(enu, sensorState);
    double x = 0.0;
    double y = 0.0;
    double depth = 0.0;
    const bool visible = projection::projectToScreen(
        camera, sensorState, config_, x, y, depth);
    if (!visible) continue;

    frame_.visiblePOIs.push_back({
        index,
        x,
        y,
        depth,
        distance,
        geo::initialBearingDeg(sensorState.location, poi.position),
        true,
    });

    if (frame_.visiblePOIs.size() >= config_.maxVisiblePOIs) break;
  }

  std::sort(
      frame_.visiblePOIs.begin(),
      frame_.visiblePOIs.end(),
      [](const VisiblePOI& left, const VisiblePOI& right) {
        return left.depth > right.depth;
      });

  return frame_.sequence;
}

const FrameSnapshot& Engine::getFrame() const noexcept {
  return frame_;
}

std::optional<PickResult> Engine::pick(
    double x,
    double y,
    double radiusPixels) const {
  const double radiusSquared = radiusPixels * radiusPixels;
  std::optional<PickResult> result;

  for (const VisiblePOI& poi : frame_.visiblePOIs) {
    const double dx = poi.x - x;
    const double dy = poi.y - y;
    const double distanceSquared = dx * dx + dy * dy;
    if (distanceSquared > radiusSquared) continue;

    const double distancePixels = std::sqrt(distanceSquared);
    if (!result || distancePixels < result->distancePixels) {
      result = PickResult{poi.poiIndex, distancePixels};
    }
  }

  return result;
}

bool Engine::isInitialized() const noexcept {
  return initialized_;
}

} // namespace cumquat
