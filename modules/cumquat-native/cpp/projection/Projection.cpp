#include "Projection.h"

#include <cmath>

namespace cumquat::projection {
namespace {
constexpr double kPi = 3.14159265358979323846;
double radians(double degrees) { return degrees * kPi / 180.0; }
}

Vec3 worldToCamera(const Vec3& enu, const SensorState& sensorState) {
  const double yaw = radians(-sensorState.headingDeg);
  const double pitch = radians(-sensorState.pitchDeg);
  const double roll = radians(-sensorState.rollDeg);

  const double cy = std::cos(yaw);
  const double sy = std::sin(yaw);
  const Vec3 yawed{
      cy * enu.x - sy * enu.y,
      sy * enu.x + cy * enu.y,
      enu.z,
  };

  const double cp = std::cos(pitch);
  const double sp = std::sin(pitch);
  const Vec3 pitched{
      yawed.x,
      cp * yawed.y - sp * yawed.z,
      sp * yawed.y + cp * yawed.z,
  };

  const double cr = std::cos(roll);
  const double sr = std::sin(roll);
  return {
      cr * pitched.x - sr * pitched.z,
      pitched.y,
      sr * pitched.x + cr * pitched.z,
  };
}

bool projectToScreen(
    const Vec3& camera,
    const SensorState& sensorState,
    const EngineConfig& config,
    double& x,
    double& y,
    double& depth) {
  depth = camera.y;
  if (depth <= config.nearMeters || depth >= config.farMeters) return false;

  const double width = sensorState.viewportWidth;
  const double height = sensorState.viewportHeight;
  if (width <= 0.0 || height <= 0.0) return false;

  const double focal = width / (2.0 * std::tan(radians(config.horizontalFovDeg) * 0.5));
  x = width * 0.5 + camera.x * focal / depth;
  y = height * 0.5 - camera.z * focal / depth;
  return x >= 0.0 && x <= width && y >= 0.0 && y <= height;
}

} // namespace cumquat::projection
