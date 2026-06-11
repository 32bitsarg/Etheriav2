/** @type {import('@capacitor/cli').Config} */
const config = {
  appId: 'com.conquestofetheria.app',
  appName: 'Conquest of Etheria',
  // Shell mínimo offline: con server.url remoto, webDir solo se usa como
  // fallback local. Antes apuntaba a apps/web/.next (build de servidor de
  // Next: enorme y no servible de forma estática).
  webDir: 'capacitor-shell',
  server: {
    url: 'https://conquestofetheria.com',
    cleartext: false,
  },
  android: {
    backgroundColor: '#0b1111',
    // El sitio es HTTPS puro: permitir contenido mixto era un riesgo innecesario
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // GameInitializer llama SplashScreen.hide() cuando el juego está listo.
      // Esto evita que el splash desaparezca a los 2.5s dejando una pantalla de
      // carga WebView visible — el usuario ve el splash nativo durante toda la espera.
      launchAutoHide: false,
      launchFadeOutDuration: 500,
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
