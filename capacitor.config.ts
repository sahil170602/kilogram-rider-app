import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kilogram.rider',
  appName: 'Kilogram Rider',
  webDir: 'dist',
  server: {
    // 🎯 Change this to 'http' (Internal only) 
    // This often fixes the 'Failed to Fetch' CORS issue on Android
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: ['*']
  }
};

export default config;