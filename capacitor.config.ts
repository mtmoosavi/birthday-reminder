import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mtmoosavi.birthdayreminder',
  appName: 'یادآور تولد',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFF7F5',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_birthday',
      iconColor: '#F43F5E',
    },
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#FFF7F5',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
