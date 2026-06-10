// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add any custom configuration here if needed
// For example:
// config.resolver.assetExts.push('custom-extension');

module.exports = config;
