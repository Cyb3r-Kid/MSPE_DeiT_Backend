const { withAppBuildGradle, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to ensure broad Android device compatibility:
 * 1. Force v1 (JAR signing) and v2 signing on all build types and signing configs
 * 2. Ensure extractNativeLibs="true" so unaligned or vendor ROM package parsers don't fail
 */
function withAndroidFixes(config) {
  // 1. Android Manifest: set extractNativeLibs to true
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:extractNativeLibs'] = 'true';
    }
    return config;
  });

  // 2. App build.gradle: enforce v1SigningEnabled and v2SigningEnabled across all signingConfigs
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const signingEnforcement = `
// Enforce APK Signature Scheme v1 (JAR) and v2 for all Android device package managers
android {
    signingConfigs.all {
        v1SigningEnabled true
        v2SigningEnabled true
    }
}
`;
    if (!contents.includes('v1SigningEnabled true')) {
      contents += `\n${signingEnforcement}\n`;
    }
    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withAndroidFixes;
