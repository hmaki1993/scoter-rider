import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scooterfuel.tracker',
  appName: 'Fuel Tracker',
  webDir: 'dist',
  android: {
    useLegacyBridge: true,
    allowMixedContent: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_launcher", 
      iconColor: "#488AFF"
    },
    SplashScreen: {
      launchShowDuration: 1000
    }
  },
  /*
  server: {
    url: "http://localhost:3000",
    cleartext: true
  }
  */
};

export default config;
