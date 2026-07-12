#include "NativeCumquatModule.h"

#include <algorithm>
#include <cmath>
#include <limits>
#include <utility>
#include <vector>

namespace facebook::react {
namespace {

jsi::Value property(
    jsi::Runtime& runtime,
    const jsi::Object& object,
    const char* name) {
  return object.getProperty(runtime, name);
}

double numberOr(
    jsi::Runtime& runtime,
    const jsi::Object& object,
    const char* name,
    double fallback) {
  const auto value = property(runtime, object, name);
  return value.isNumber() ? value.asNumber() : fallback;
}

std::string stringOr(
    jsi::Runtime& runtime,
    const jsi::Object& object,
    const char* name,
    std::string fallback = {}) {
  const auto value = property(runtime, object, name);
  return value.isString() ? value.asString(runtime).utf8(runtime)
                          : std::move(fallback);
}

jsi::Object requiredObject(
    jsi::Runtime& runtime,
    const jsi::Object& object,
    const char* name) {
  auto value = property(runtime, object, name);
  if (!value.isObject()) {
    throw jsi::JSError(
        runtime,
        std::string("NativeCumquat expected object property '") + name + "'");
  }
  return value.asObject(runtime);
}

cumquat::GeoPoint readGeoPoint(
    jsi::Runtime& runtime,
    const jsi::Object& object) {
  return {
      numberOr(runtime, object, "latitude", 0.0),
      numberOr(runtime, object, "longitude", 0.0),
      numberOr(runtime, object, "altitude", 0.0),
  };
}

void validateFinite(
    jsi::Runtime& runtime,
    double value,
    const char* propertyName) {
  if (!std::isfinite(value)) {
    throw jsi::JSError(
        runtime,
        std::string("NativeCumquat expected finite '") + propertyName + "'");
  }
}

} // namespace

NativeCumquatModule::NativeCumquatModule(
    std::shared_ptr<CallInvoker> jsInvoker)
    : NativeCumquatCxxSpec(std::move(jsInvoker)) {}

std::string NativeCumquatModule::getVersion(jsi::Runtime&) {
  return "0.1.0-cpp";
}

double NativeCumquatModule::createEngine(
    jsi::Runtime& runtime,
    jsi::Object configObject) {
  cumquat::EngineConfig config;
  config.horizontalFovDeg = numberOr(
      runtime,
      configObject,
      "horizontalFovDegrees",
      config.horizontalFovDeg);
  config.nearMeters =
      numberOr(runtime, configObject, "nearMeters", config.nearMeters);
  config.farMeters =
      numberOr(runtime, configObject, "farMeters", config.farMeters);

  const auto maxVisible = numberOr(
      runtime,
      configObject,
      "maxVisiblePOIs",
      static_cast<double>(config.maxVisiblePOIs));

  validateFinite(runtime, config.horizontalFovDeg, "horizontalFovDegrees");
  validateFinite(runtime, config.nearMeters, "nearMeters");
  validateFinite(runtime, config.farMeters, "farMeters");
  validateFinite(runtime, maxVisible, "maxVisiblePOIs");

  config.horizontalFovDeg = std::clamp(config.horizontalFovDeg, 1.0, 179.0);
  config.nearMeters = std::max(0.001, config.nearMeters);
  config.farMeters = std::max(config.nearMeters + 0.001, config.farMeters);
  config.maxVisiblePOIs = static_cast<std::uint32_t>(std::clamp(
      maxVisible,
      1.0,
      static_cast<double>(std::numeric_limits<std::uint32_t>::max())));

  auto engine = std::make_shared<cumquat::Engine>(config);

  std::lock_guard lock(mutex_);
  const auto handle = nextHandle_++;
  engines_.emplace(handle, std::move(engine));
  return static_cast<double>(handle);
}

void NativeCumquatModule::initialize(
    jsi::Runtime& runtime,
    double handle,
    jsi::Array poiArray) {
  auto engine = requireEngine(runtime, handle);
  const auto count = poiArray.size(runtime);

  std::vector<cumquat::POI> pois;
  pois.reserve(count);

  for (std::size_t index = 0; index < count; ++index) {
    auto value = poiArray.getValueAtIndex(runtime, index);
    if (!value.isObject()) {
      throw jsi::JSError(runtime, "NativeCumquat POIs must be objects");
    }

    auto object = value.asObject(runtime);
    cumquat::POI poi;
    poi.id = stringOr(runtime, object, "id");
    poi.name = stringOr(runtime, object, "name");
    poi.position = readGeoPoint(runtime, object);

    if (poi.id.empty()) {
      throw jsi::JSError(runtime, "NativeCumquat POI id cannot be empty");
    }

    validateFinite(runtime, poi.position.latitudeDeg, "latitude");
    validateFinite(runtime, poi.position.longitudeDeg, "longitude");
    validateFinite(runtime, poi.position.altitudeMeters, "altitude");
    pois.push_back(std::move(poi));
  }

  engine->initialize(std::move(pois));
}

double NativeCumquatModule::update(
    jsi::Runtime& runtime,
    double handle,
    jsi::Object sensorObject) {
  auto engine = requireEngine(runtime, handle);

  cumquat::SensorState sensorState;
  sensorState.timestampNs = static_cast<std::int64_t>(
      numberOr(runtime, sensorObject, "timestampNs", 0.0));
  sensorState.location = readGeoPoint(
      runtime,
      requiredObject(runtime, sensorObject, "location"));
  sensorState.headingDeg =
      numberOr(runtime, sensorObject, "headingDegrees", 0.0);
  sensorState.pitchDeg =
      numberOr(runtime, sensorObject, "pitchDegrees", 0.0);
  sensorState.rollDeg =
      numberOr(runtime, sensorObject, "rollDegrees", 0.0);
  sensorState.viewportWidth =
      numberOr(runtime, sensorObject, "viewportWidth", 1.0);
  sensorState.viewportHeight =
      numberOr(runtime, sensorObject, "viewportHeight", 1.0);

  validateFinite(runtime, sensorState.location.latitudeDeg, "location.latitude");
  validateFinite(runtime, sensorState.location.longitudeDeg, "location.longitude");
  validateFinite(runtime, sensorState.location.altitudeMeters, "location.altitude");
  validateFinite(runtime, sensorState.headingDeg, "headingDegrees");
  validateFinite(runtime, sensorState.pitchDeg, "pitchDegrees");
  validateFinite(runtime, sensorState.rollDeg, "rollDegrees");
  validateFinite(runtime, sensorState.viewportWidth, "viewportWidth");
  validateFinite(runtime, sensorState.viewportHeight, "viewportHeight");

  if (sensorState.viewportWidth <= 0.0 || sensorState.viewportHeight <= 0.0) {
    throw jsi::JSError(runtime, "NativeCumquat viewport must be positive");
  }

  return static_cast<double>(engine->update(sensorState));
}

jsi::Object NativeCumquatModule::getFrame(
    jsi::Runtime& runtime,
    double handle) {
  const auto engine = requireEngine(runtime, handle);
  const auto& snapshot = engine->getFrame();

  jsi::Object frame(runtime);
  frame.setProperty(runtime, "sequence", static_cast<double>(snapshot.sequence));
  frame.setProperty(
      runtime,
      "timestampNs",
      static_cast<double>(snapshot.timestampNs));

  jsi::Array visible(runtime, snapshot.visiblePOIs.size());
  for (std::size_t index = 0; index < snapshot.visiblePOIs.size(); ++index) {
    const auto& source = snapshot.visiblePOIs[index];
    jsi::Object output(runtime);
    output.setProperty(runtime, "poiIndex", static_cast<double>(source.poiIndex));
    output.setProperty(runtime, "x", source.x);
    output.setProperty(runtime, "y", source.y);
    output.setProperty(runtime, "depth", source.depth);
    output.setProperty(runtime, "distance", source.distance);
    output.setProperty(runtime, "bearing", source.bearingDeg);
    output.setProperty(runtime, "visible", source.visible);
    visible.setValueAtIndex(runtime, index, std::move(output));
  }

  frame.setProperty(runtime, "visiblePOIs", std::move(visible));
  return frame;
}

std::optional<jsi::Object> NativeCumquatModule::pick(
    jsi::Runtime& runtime,
    double handle,
    double x,
    double y,
    double radiusPixels) {
  validateFinite(runtime, x, "x");
  validateFinite(runtime, y, "y");
  validateFinite(runtime, radiusPixels, "radiusPixels");

  const auto engine = requireEngine(runtime, handle);
  const auto result = engine->pick(x, y, std::max(0.0, radiusPixels));
  if (!result.has_value()) {
    return std::nullopt;
  }

  jsi::Object output(runtime);
  output.setProperty(
      runtime,
      "poiIndex",
      static_cast<double>(result->poiIndex));
  output.setProperty(runtime, "distancePixels", result->distancePixels);
  return output;
}

void NativeCumquatModule::destroyEngine(jsi::Runtime& runtime, double handle) {
  const auto key = validateHandle(runtime, handle);
  std::lock_guard lock(mutex_);
  engines_.erase(key);
}

NativeCumquatModule::EnginePtr NativeCumquatModule::requireEngine(
    jsi::Runtime& runtime,
    double handle) const {
  const auto key = validateHandle(runtime, handle);
  std::lock_guard lock(mutex_);
  const auto iterator = engines_.find(key);
  if (iterator == engines_.end()) {
    throw jsi::JSError(runtime, "NativeCumquat engine handle is invalid or disposed");
  }
  return iterator->second;
}

std::uint64_t NativeCumquatModule::validateHandle(
    jsi::Runtime& runtime,
    double handle) {
  if (!std::isfinite(handle) || handle < 1.0 || std::floor(handle) != handle) {
    throw jsi::JSError(runtime, "NativeCumquat received an invalid engine handle");
  }
  return static_cast<std::uint64_t>(handle);
}

} // namespace facebook::react
