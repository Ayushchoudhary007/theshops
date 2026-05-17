import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ayush.theshops',
  appName: 'TheShops',
  webDir: 'dist',
  server: {
    androidScheme: "https",
    // Uncomment for live-reload during development:
    // url: "http://192.168.x.x:5173",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor:    "#ffffff",
    },
  },
};

export default config;
