// Add to your sensors.ts
function filterVisiblePOIs(
  userPos: SensorSnapshot,
  pois: Array<{ lat: number; lon: number; alt: number }>,
  minDistance: number,
  maxDistance: number
) {
  return pois.filter(poi => {
    const enu = geoToENU(
      userPos.lat, userPos.lon, userPos.elevation,
      poi.lat, poi.lon, poi.alt
    );
    
    const distance = Math.hypot(enu.x, enu.y, enu.z);
    return distance >= minDistance && distance <= maxDistance;
  });
}

// Enhanced projectToScreen that respects distances
function projectToScreenWithLimits(
  cameraPos: Vec3,
  width: number,
  height: number,
  fov: number,
  minDistance: number,
  maxDistance: number
): ScreenPosition & { clippedByDistance: boolean } {
  const depth = -cameraPos.z;
  
  // Distance-based clipping
  if (depth < minDistance) {
    return { x: 0, y: 0, visible: false, clippedByDistance: 'min' };
  }
  if (depth > maxDistance) {
    return { x: 0, y: 0, visible: false, clippedByDistance: 'max' };
  }
  
  // Your existing projection logic
  if (depth <= 0.1) {
    return { x: 0, y: 0, visible: false, clippedByDistance: null };
  }
  
  const correctedX = -cameraPos.y;
  const correctedY = -cameraPos.x;
  const fovRad = fov * Math.PI / 180;
  const focalLength = (width / 2) / Math.tan(fovRad / 2);
  
  const screenX = width / 2 + (correctedX / depth) * focalLength;
  const screenY = height / 2 - (correctedY / depth) * focalLength;
  
  const margin = 200;
  const visible = screenX >= -margin && screenX <= width + margin && 
                  screenY >= -margin && screenY <= height + margin;
  
  return { x: screenX, y: screenY, visible, clippedByDistance: null };
}