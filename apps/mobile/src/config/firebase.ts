import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Firebase configuration - Replace these values from Firebase Console
// Firebase Console → Project Settings → Your apps → Web app
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCDnK3SQQ8Ndh6lnZ8brhKTCc0bC5BbCHA",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "my-soca-project.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "my-soca-project",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "my-soca-project.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "277931500765",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:277931500765:web:e05010639f4fcb17556734",
};

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Get Auth instance
export const auth = getAuth(app);

// Export app for other Firebase services if needed
export { app };
