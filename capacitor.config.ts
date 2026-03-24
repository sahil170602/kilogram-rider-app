import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kilogram.rider',
  appName: 'Kilogram Rider',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // 🎯 Use 'http' if 'https' is causing certificate/loading issues locally
    androidScheme: 'http', 
    cleartext: true,
    // 🎯 This helps if you are using routing (like React Router)
    allowNavigation: ['*'] 
  }
};

export default config;