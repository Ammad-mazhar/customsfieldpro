import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.customsfieldpro.crm',
  appName: 'CustomsFieldPro',
  webDir: 'dist',
  server: {
    allowNavigation: ['*.openstreetmap.org', '*.tile.openstreetmap.org', 'nominatim.openstreetmap.org'],
  },
  ios: {
    backgroundColor: '#185FA5',
  },
  android: {
    backgroundColor: '#185FA5',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#185FA5',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
}

export default config
