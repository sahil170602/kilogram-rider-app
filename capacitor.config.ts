import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kilogram.rider',
  appName: 'Kilogram Rider',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'wohlmirmfcvdoateryzc.supabase.co', // 🎯 Update this to the new URL
      '*'
    ]
  }
};

export default config;