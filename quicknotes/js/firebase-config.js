// ============================================================
// Firebase Configuration
// ============================================================
// This file sets up the connection between your app and Firebase.
//
// Firebase is a service by Google that provides:
//   - Authentication (user sign-in/sign-up)
//   - Firestore (a cloud database to store notes)
//
// HOW TO SET UP:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or use an existing one)
// 3. Click the gear icon → Project Settings
// 4. Scroll down to "Your apps" → click the Web icon (</>)
// 5. Register your app and copy the config values below
// 6. Replace the placeholder values with your real ones
//
// IMPORTANT: These values are meant to be in client-side code.
// Security comes from Firebase Authentication + Firestore Rules,
// NOT from hiding these values.
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDjB9JYJULYGtLn6MD6MaTa0BvKmMBDL8M",
  authDomain: "quicknotes-601ca.firebaseapp.com",
  projectId: "quicknotes-601ca",
  storageBucket: "quicknotes-601ca.firebasestorage.app",
  messagingSenderId: "594681069076",
  appId: "1:594681069076:web:ef08b5790e249dad6d3101"
};

// Initialize Firebase — this connects your app to Firebase's servers
firebase.initializeApp(firebaseConfig);

// Create shortcuts to the services we'll use throughout the app
// "auth" handles sign-in, sign-up, sign-out
// "db" is the Firestore database where notes are stored
const auth = firebase.auth();
const db = firebase.firestore();
