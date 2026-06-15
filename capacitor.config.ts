import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scooterfuel.tracker',
  appName: 'Fuel Tracker',
  webDir: 'dist',
  backgroundColor: '#0a0a0c',
  android: {
    useLegacyBridge: true,
    allowMixedContent: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_launcher", 
      iconColor: "#488AFF",
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 1000
    },
    Keyboard: {
      resize: 'none'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0c'
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
