import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kilogram.rider',
  appName: 'Kilogram Rider',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true, // 🎯 Essential for "Failed to Fetch" fixes
    allowNavigation: ['*']
  }
};

export default config;