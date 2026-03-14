/**
 * Capacitor configuration — LingoFriends mobile app wrapper
 *
 * Wraps the SvelteKit PWA in a native iOS/Android shell.
 * The web assets are built to 'build/' by SvelteKit (adapter-node static output
 * will be used for Capacitor — see build:mobile in package.json).
 *
 * Plugins used:
 *   @capacitor/status-bar — hide status bar / set colour
 *   @capacitor/splash-screen — hide splash when app ready
 *   @capacitor/haptics — light tap feedback on answer correct/wrong
 *
 * Setup:
 *   npm run build:mobile   (build static export for Capacitor)
 *   npx cap sync           (sync web assets to iOS/Android projects)
 *   npx cap open ios       (open Xcode)
 *   npx cap open android   (open Android Studio)
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.lingofriends.app',
	appName: 'LingoFriends',

	// SvelteKit static build output
	webDir: 'build',

	server: {
		// In development, point at the local dev server for hot-reload
		// Comment this out for production builds
		// url: 'http://192.168.1.x:5173',
		// cleartext: true,
	},

	plugins: {
		SplashScreen: {
			// Show splash screen until app JS loads
			launchShowDuration: 1500,
			launchAutoHide: true,
			backgroundColor: '#FFF8F0',  // matches app bg-sky-50 warm tone
			androidSplashResourceName: 'splash',
			showSpinner: false,
		},
		StatusBar: {
			// Use default overlay on iOS — full-screen immersive feel
			style: 'LIGHT',
			backgroundColor: '#FFF8F0',
		},
		Keyboard: {
			// Resize the webview, not the body — prevents content from jumping
			resize: 'body',
			style: 'LIGHT',
			resizeOnFullScreen: true,
		},
	},

	ios: {
		// Allow app to use local network for dev server
		allowsLinkPreview: false,
		contentInset: 'automatic',
	},

	android: {
		allowMixedContent: false,
		captureInput: true,
	},
};

export default config;
