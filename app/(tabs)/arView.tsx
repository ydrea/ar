// // app/ARView.tsx - Updated with FOV control
// // ... (previous imports remain the same, add FOVVisualFeedback)

export default function ARView() {
  //   // ... (existing state)
  //   // FOV state
  //   const [fov, setFOV] = useState(AR_CONSTANTS.FOV.DEFAULT);
  //   // Update projectToScreen to use dynamic FOV
  //   const updateProjectionWithFOV = useCallback((pos: Vec3, currentFOV: number) => {
  //     return projectToScreen(pos, width, height, currentFOV);
  //   }, []);
  //   // Initialize gesture controller with FOV support
  //   useEffect(() => {
  //     gestureController.current.setCallbacks({
  //       // ... existing callbacks
  //       onFOVChange: (newFOV, isRubberBanding) => {
  //         runOnJS(setFOV)(newFOV);
  //         if (isRubberBanding) {
  //           runOnJS(setIsRubberBanding)(true);
  //           runOnJS(setActiveLimit)('fov');
  //           // Calculate intensity for FOV
  //           const excess = newFOV < AR_CONSTANTS.FOV.MIN
  //             ? AR_CONSTANTS.FOV.MIN - newFOV
  //             : newFOV - AR_CONSTANTS.FOV.MAX;
  //           const intensity = Math.min(1, excess / 20); // 20° excess = full intensity
  //           runOnJS(setRubberBandIntensity)(intensity);
  //           runOnJS(triggerHapticFeedback)(intensity);
  //         }
  //       },
  //       // ... rest of callbacks
  //     });
  //     // Initialize with default FOV
  //     gestureController.current.updateState(
  //       AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
  //       AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  //       0,
  //       AR_CONSTANTS.FOV.DEFAULT
  //     );
  //     // ... rest of initialization
  //   }, []);
  //   // Update POI projection when FOV changes
  //   const visiblePOIs = poiPositions
  //     .filter(poi => poi.distance >= minDistance && poi.distance <= maxDistance)
  //     .map(poi => {
  //       const screenPos = updateProjectionWithFOV(poi.pos, fov);
  //       return { ...poi, screenPos };
  //     })
  //     .filter(poi => poi.screenPos.visible);
  //   return (
  //     <GestureHandlerRootView style={styles.container}>
  //       <GestureDetector gesture={pinchGesture}>
  //         <View style={styles.container}>
  //           {/* Camera View */}
  //           <AnimatedCamera
  //             ref={cameraRef}
  //             style={StyleSheet.absoluteFillObject}
  //             facing={cameraFacing}
  //             mode="picture"
  //             flash="off"
  //             animatedProps={useAnimatedCameraZoom().animatedProps}
  //             onCameraReady={() => setIsCameraReady(true)}
  //           />
  //           {/* AR Overlay with dynamic FOV */}
  //           <Svg style={StyleSheet.absoluteFillObject}>
  //             {visiblePOIs.map((poi) => {
  //               // Marker size adjusts with FOV (wider FOV = smaller markers)
  //               const markerSize = 12 * (AR_CONSTANTS.FOV.DEFAULT / fov);
  //               return (
  //                 <React.Fragment key={poi.id}>
  //                   <Circle
  //                     cx={poi.screenPos.x}
  //                     cy={poi.screenPos.y}
  //                     r={markerSize}
  //                     fill="#00ffff"
  //                     stroke="#ffffff"
  //                     strokeWidth={2}
  //                     opacity={Math.max(0.3, Math.min(1, 1 - (poi.distance - minDistance) / (maxDistance - minDistance)))}
  //                   />
  //                   <SvgText
  //                     x={poi.screenPos.x + markerSize + 4}
  //                     y={poi.screenPos.y + 4}
  //                     fill="#ffffff"
  //                     fontSize={Math.max(8, 12 * (AR_CONSTANTS.FOV.DEFAULT / fov))}
  //                     fontWeight="bold"
  //                   >
  //                     {poi.name}
  //                   </SvgText>
  //                   <SvgText
  //                     x={poi.screenPos.x + markerSize + 4}
  //                     y={poi.screenPos.y + 20}
  //                     fill="#cccccc"
  //                     fontSize={10}
  //                   >
  //                     {(poi.distance / 1000).toFixed(1)}km
  //                   </SvgText>
  //                   <Line
  //                     x1={width / 2}
  //                     y1={height / 2}
  //                     x2={poi.screenPos.x}
  //                     y2={poi.screenPos.y}
  //                     stroke="rgba(255,255,255,0.25)"
  //                     strokeWidth={1}
  //                     strokeDasharray={[4, 4]}
  //                   />
  //                 </React.Fragment>
  //               );
  //             })}
  //           </Svg>
  //           {/* FOV Visual Feedback */}
  //           <FOVVisualFeedback
  //             isActive={gestureMode === 'horizontal'}
  //             fov={fov}
  //             isRubberBanding={activeLimit === 'fov' && isRubberBanding}
  //             intensity={activeLimit === 'fov' ? rubberBandIntensity : 0}
  //           />
  //           {/* Other overlays... */}
  //           <View style={styles.reticle}>
  //             <View style={styles.reticleDot} />
  //             <View style={styles.reticleRing} />
  //           </View>
  //           <RubberBandVisualFeedback
  //             isActive={isRubberBanding && activeLimit !== 'fov'}
  //             limitType={activeLimit}
  //             intensity={rubberBandIntensity}
  //           />
  //           <VisualFeedbackOverlay
  //             gestureMode={gestureMode === 'horizontal' ? null : gestureMode}
  //             isActive={isGestureActive && gestureMode !== 'horizontal'}
  //             minDistance={minDistance}
  //             maxDistance={maxDistance}
  //           />
  //           {/* Controls with FOV reset */}
  //           <View style={styles.cameraControls}>
  //             <TouchableOpacity style={styles.controlButton} onPress={() => {
  //               setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
  //             }}>
  //               <Text style={styles.controlButtonText}>⟳</Text>
  //             </TouchableOpacity>
  //             <TouchableOpacity style={styles.controlButton} onPress={() => {
  //               resetCameraZoom();
  //               gestureController.current.updateState(
  //                 AR_CONSTANTS.DISTANCE.DEFAULT_MIN,
  //                 AR_CONSTANTS.DISTANCE.DEFAULT_MAX,
  //                 0,
  //                 AR_CONSTANTS.FOV.DEFAULT
  //               );
  //               setMinDistance(AR_CONSTANTS.DISTANCE.DEFAULT_MIN);
  //               setMaxDistance(AR_CONSTANTS.DISTANCE.DEFAULT_MAX);
  //               setFOV(AR_CONSTANTS.FOV.DEFAULT);
  //             }}>
  //               <Text style={styles.controlButtonText}>🔍</Text>
  //             </TouchableOpacity>
  //           </View>
  //           {/* Enhanced distance indicator with FOV */}
  //           <View style={styles.distanceIndicator}>
  //             <View style={styles.distanceBar}>
  //               <View
  //                 style={[
  //                   styles.distanceFill,
  //                   {
  //                     width: `${((maxDistance - minDistance) / AR_CONSTANTS.DISTANCE.MAX) * 100}%`,
  //                     marginLeft: `${(minDistance / AR_CONSTANTS.DISTANCE.MAX) * 100}%`
  //                   }
  //                 ]}
  //               />
  //             </View>
  //             <View style={styles.distanceLabels}>
  //               <Text style={[styles.distanceLabel, { color: '#4CAF50' }]}>
  //                 MIN: {(minDistance / 1000).toFixed(1)}km
  //               </Text>
  //               <Text style={[styles.distanceLabel, { color: '#2196F3' }]}>
  //                 MAX: {(maxDistance / 1000).toFixed(1)}km
  //               </Text>
  //               <Text style={[styles.distanceLabel, { color: '#00ffff' }]}>
  //                 FOV: {Math.round(fov)}°
  //               </Text>
  //             </View>
  //           </View>
  //           {/* Updated instructions */}
  //           {!isGestureActive && !isRubberBanding && (
  //             <View style={styles.instructionOverlay}>
  //               <View style={styles.instructionBox}>
  //                 <Text style={styles.instructionTitle}>Gesture Controls:</Text>
  //                 <Text style={[styles.instructionText, { color: '#4CAF50' }]}>
  //                   ▲ Vertical top half → MIN distance
  //                 </Text>
  //                 <Text style={[styles.instructionText, { color: '#2196F3' }]}>
  //                   ▼ Vertical bottom half → MAX distance
  //                 </Text>
  //                 <Text style={[styles.instructionText, { color: '#00ffff' }]}>
  //                   ↔ Horizontal pinch → Field of View (FOV)
  //                 </Text>
  //                 <Text style={[styles.instructionText, { color: '#ffffff' }]}>
  //                   ⚡ Symmetric vertical → Zoom + both distances
  //                 </Text>
  //               </View>
  //             </div>
  //           )}
  //         </View>
  //       </GestureDetector>
  //     </GestureHandlerRootView>
  //   );
}
