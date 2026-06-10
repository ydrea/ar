# WH&fW

my Expo AR template app

## UI

1. Smart Zoom Synchronization
   Top half pinch → Increases MIN distance + zooms OUT (wider view)

Bottom half pinch → Increases MAX distance + zooms IN (closer view)

Symmetric pinch → Adjusts both distances + controls zoom directly

1. Real-time Camera Updates
   Uses cameraRef.current.zoom to apply zoom changes instantly

Zoom range: 0 (wide) to 1 (max optical/digital zoom)

Smooth spring animations for visual feedback

1. Visual Zoom Feedback
   Popup indicator shows zoom percentage during adjustment

POI markers scale with zoom level (larger when zoomed in)

Distance range bar shows zoom level as text

1. Zoom Reset Button
   🔍 button resets camera zoom to 0 (wide angle)

Also resets min/max distances to defaults

1. Performance Optimizations
   Camera zoom updates happen on native thread

POI scaling based on zoom is lightweight SVG transforms

Gesture recognition remains smooth even during zoom

Key Smooth Zoom Features

1. Spring Animations
   Camera zoom uses withSpring() for natural, bouncy feel

Configurable damping, mass, and stiffness parameters

Momentum-based velocity for realistic gesture following

1. Gesture Momentum
   Tracks finger velocity during gesture

Applies momentum when gesture ends for smooth finish

Prevents abrupt stops

1. Visual Feedback Animations
   Pulse ring when gesture starts (expands and fades)

UI scale bounce for tactile feel

Distance bar animates smoothly between values

1. Seamless Camera Integration
   useAnimatedProps applies zoom directly to camera

No bridge crossing for zoom updates (UI thread only)

60fps performance even during complex gestures

1. Interactive UI Elements
   Distance labels animate with spring physics

Button press animations for zoom reset

Smooth opacity transitions for POI markers

## UI config

// For responsive, snappy feel (gaming)
springConfig: { damping: 25, mass: 0.5, stiffness: 200 }

// For smooth, cinematic feel (video)
springConfig: { damping: 15, mass: 1.2, stiffness: 100 }

// For bouncy, playful feel (UI)
springConfig: { damping: 10, mass: 0.8, stiffness: 80 }
