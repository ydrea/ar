const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Cumquat iOS native integration', () => {
  test('registers the Objective-C++ provider with React Native Codegen', () => {
    const packageJson = JSON.parse(read('package.json'));

    expect(packageJson.codegenConfig.ios.modulesProvider).toEqual({
      NativeCumquat: 'NativeCumquatModuleProvider',
    });
  });

  test('compiles the shared C++ implementation as a C++20 CocoaPod', () => {
    const podspec = read('modules/cumquat-native/CumquatNative.podspec');

    expect(podspec).toContain('"cpp/**/*.{h,cpp}"');
    expect(podspec).toContain('"ios/**/*.{h,m,mm}"');
    expect(podspec).toContain(
      '"CLANG_CXX_LANGUAGE_STANDARD" => "c++20"',
    );
    expect(podspec).toContain('install_modules_dependencies(s)');
  });

  test('provides the generated TurboModule through Objective-C++', () => {
    const providerHeader = read(
      'modules/cumquat-native/ios/NativeCumquatModuleProvider.h',
    );
    const providerImplementation = read(
      'modules/cumquat-native/ios/NativeCumquatModuleProvider.mm',
    );

    expect(providerHeader).toContain('<RCTModuleProvider>');
    expect(providerImplementation).toContain(
      'std::make_shared<facebook::react::NativeCumquatModule>',
    );
    expect(providerImplementation).toContain('params.jsInvoker');
  });

  test('adds the local pod during Expo prebuild', () => {
    const plugin = read('plugins/withCumquatNative.js');

    expect(plugin).toContain('withPodfile');
    expect(plugin).toContain(
      "pod 'CumquatNative', :path => '../modules/cumquat-native'",
    );
  });
});
