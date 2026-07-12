#include "core/Engine.h"

#include <cassert>
#include <cmath>
#include <iostream>

namespace {
bool near(double a, double b, double epsilon = 2.0) {
  return std::abs(a - b) <= epsilon;
}
}

int main() {
  cumquat::Engine engine({
      .horizontalFovDeg = 90.0,
      .nearMeters = 0.5,
      .farMeters = 5000.0,
      .maxVisiblePOIs = 16,
  });

  const cumquat::GeoPoint observer{45.80041, 15.95619, 120.0};
  engine.initialize({
      {"north", "North", {45.80141, 15.95619, 120.0}},
      {"east", "East", {45.80041, 15.95748, 120.0}},
  });

  cumquat::SensorState state;
  state.timestampNs = 1;
  state.location = observer;
  state.headingDeg = 0.0;
  state.viewportWidth = 1000.0;
  state.viewportHeight = 500.0;

  engine.update(state);
  const auto& northFrame = engine.getFrame();
  assert(northFrame.sequence == 1);
  assert(northFrame.visiblePOIs.size() == 1);
  assert(northFrame.visiblePOIs[0].poiIndex == 0);
  assert(near(northFrame.visiblePOIs[0].x, 500.0));

  state.timestampNs = 2;
  state.headingDeg = 90.0;
  engine.update(state);
  const auto& eastFrame = engine.getFrame();
  assert(eastFrame.sequence == 2);
  assert(eastFrame.visiblePOIs.size() == 1);
  assert(eastFrame.visiblePOIs[0].poiIndex == 1);
  assert(near(eastFrame.visiblePOIs[0].x, 500.0));

  const auto picked = engine.pick(500.0, 250.0, 40.0);
  assert(picked.has_value());
  assert(picked->poiIndex == 1);

  // Identity quaternion follows the current JS compatibility convention:
  // q*v*q^-1, radial depth, -Z forward, and X/Y axis remapping. A POI due
  // north therefore lands on the left edge for this synthetic orientation.
  state.timestampNs = 3;
  state.hasOrientationQuaternion = true;
  state.orientation = {0.0, 0.0, 0.0, 1.0};
  engine.update(state);
  const auto& quaternionFrame = engine.getFrame();
  assert(quaternionFrame.sequence == 3);
  assert(quaternionFrame.visiblePOIs.size() == 1);
  assert(quaternionFrame.visiblePOIs[0].poiIndex == 0);
  assert(near(quaternionFrame.visiblePOIs[0].x, 0.0, 3.0));

  std::cout << "cumquat_core_tests passed\n";
  return 0;
}
