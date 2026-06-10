/** @type {import('@capacitor/cli').Config} */
const config = {
  appId: 'com.conquestofetheria.app',
  appName: 'Conquest of Etheria',
  webDir: 'apps/web/.next',
  server: {
    url: 'https://conquestofetheria.com',
    cleartext: false,
  },
  android: {
    backgroundColor: '#0b1111',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0b1111',
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#0b1111',
    },
  },
};

module.exports = config;
