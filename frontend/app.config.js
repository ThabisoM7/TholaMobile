module.exports = {
  "expo": {
    "name": "TholaApp",
    "slug": "tholaapp",
    "owner": "tattshq",
    "extra": {
      "eas": {
        "projectId": "148007e1-d221-4433-a3ad-74a499a2b478"
      }
    },
    "version": "1.0.0",
    "scheme": "thola",
    "orientation": "portrait",
    "icon": "./assets/logo.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/logo.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.thola.app"
    },
    "android": {
      "package": "com.thola.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/logo.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location for finding nearby vendors."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera for KYC verification."
        }
      ],
      [
        "@rnmapbox/maps",
        {
          "RNMapboxMapsImpl": "mapbox",
          "RNMapboxMapsDownloadToken": process.env.MAPBOX_DOWNLOADS_TOKEN
        }
      ]
    ]
  }
};
