import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kilogram.rider',
  appName: 'Kilogram Rider',
  webDir: 'dist',
  server: {
    // 🎯 Use 'https' for better security and Supabase compatibility
    androidScheme: 'https',
    cleartext: true,
    // 🎯 This tells the APK which external links are safe to open
    allowNavigation: [
      "google.com",
      "*.google.com",
      "*.supabase.co", // Allow your Supabase database
      "maps.google.com"
    ]
  }
};

export default config;