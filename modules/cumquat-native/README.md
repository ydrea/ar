The canonical C++ source code is here:

~/EkoMuzej/ar/modules/cumquat-native/cpp/

Main compiled files:

modules/cumquat-native/cpp/
├── bridge/
│   ├── NativeCumquatModule.cpp   # JSI/TurboModule bridge
│   └── NativeCumquatModule.h
├── core/
│   ├── Engine.cpp                # Main AR engine
│   └── Engine.h
├── geo/
│   ├── Geodesy.cpp               # Geographic coordinate calculations
│   └── Geodesy.h
├── projection/
│   ├── Projection.cpp            # Camera/screen projection
│   └── Projection.h
└── math/
    └── ...                       # Shared math/types helpers

The Android build currently compiles these four .cpp files:

bridge/NativeCumquatModule.cpp
core/Engine.cpp
geo/Geodesy.cpp
projection/Projection.cpp

That list comes from your withCumquatNative config plugin.

Engine.cpp is the actual core implementation that owns the POI dataset, view state and projected frames.

NativeCumquatModule.cpp is the React Native JSI bridge between TypeScript and the C++ engine.

After expo prebuild, you will also see:

android/app/src/main/jni/
├── CMakeLists.txt
└── OnLoad.cpp

Those are generated integration files, not the main source code. The plugin creates them and points CMake back to modules/cumquat-native/cpp/.

To list every C++ and header file locally:

find modules/cumquat-native/cpp \
  -type f \( -name '*.cpp' -o -name '*.h' -o -name '*.hpp' \) \
  | sort

Edit files under modules/cumquat-native/cpp/; do not make persistent changes inside android/app/src/main/jni/ because expo prebuild --clean regenerates that directory.
