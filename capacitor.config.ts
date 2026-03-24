import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kilogram.rider',
  appName: 'Kilogram Rider',
  webDir: 'dist',
  server: {
    androidScheme: 'http', // 🎯 Switching to http often bypasses strict CORS
    cleartext: true,
    allowNavigation: ['*'] // 🎯 Allow the app to talk to ANY url
  }
};

export default config;