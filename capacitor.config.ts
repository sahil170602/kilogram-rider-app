import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kilogram.rider',
  appName: 'Kilogram Rider',
  webDir: 'dist',
  server: {
    // 🎯 Use 'https' for the scheme to match Supabase
    androidScheme: 'https',
    // 🎯 Allows the app to talk to your Supabase URL
    cleartext: true,
    allowNavigation: [
      '*.supabase.co',
      'localhost'
    ]
  }
};

export default config;