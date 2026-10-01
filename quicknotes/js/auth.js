// ============================================================
// Authentication
// ============================================================
// Handles user sign-in, sign-up, and sign-out using Firebase Auth.
// Supports two methods:
//   1. Email + Password — user creates an account with email/password
//   2. Google — user signs in with their Google account
//
// When a new user signs in for the first time, we also create
// their profile document in Firestore (the database).
// ============================================================

(function () {
  // ---- DOM Elements ----
  var loadingScreen, authContainer;
  var signinForm, signupForm, tabSignin, tabSignup;
  var signinEmail, signinPassword, signinBtn;
  var signupName, signupEmail, signupPassword, signupBtn;
  var googleBtn, authMessage;

  document.addEventListener('DOMContentLoaded', function () {
    loadingScreen = document.getElementById('loading-screen');
    authContainer = document.getElementById('auth-container');
    signinForm = document.getElementById('signin-form');
    signupForm = document.getElementById('signup-form');
    tabSignin = document.getElementById('tab-signin');
    tabSignup = document.getElementById('tab-signup');
    signinEmail = document.getElementById('signin-email');
    signinPassword = document.getElementById('signin-password');
    signinBtn = document.getElementById('signin-btn');
    signupName = document.getElementById('signup-name');
    signupEmail = document.getElementById('signup-email');
    signupPassword = document.getElementById('signup-password');
    signupBtn = document.getElementById('signup-btn');
    googleBtn = document.getElementById('google-btn');
    authMessage = document.getElementById('auth-message');

    // Set up form submissions
    signinForm.addEventListener('submit', handleSignIn);
    signupForm.addEventListener('submit', handleSignUp);
    googleBtn.addEventListener('click', handleGoogleSignIn);

    // Check if Firebase is configured with real values
    if (firebaseConfig.apiKey === 'YOUR_API_KEY_HERE') {
      // Show a helpful setup message instead of a broken loading screen
      loadingScreen.classList.add('hidden');
      authContainer.classList.remove('hidden');
      showMessage('Firebase is not configured yet. Open js/firebase-config.js and add your Firebase project credentials. See the README for setup instructions.', 'error');
      return;
    }

    // Listen for auth state changes
    // This fires when Firebase finishes checking if the user is already signed in
    auth.onAuthStateChanged(function (user) {
      if (user) {
        // User is signed in — save their profile and go to the main app
        saveUserProfile(user).then(function () {
          window.location.href = 'index.html';
        }).catch(function (error) {
          // Signed in, but writing the profile failed — usually Firestore rules.
          // Without this the page would spin forever with no explanation.
          loadingScreen.classList.add('hidden');
          authContainer.classList.remove('hidden');
          showMessage('Signed in, but saving your profile failed (' + error.code + '). Check your Firestore security rules.', 'error');
        });
      } else {
        // No user signed in — show the auth screen
        loadingScreen.classList.add('hidden');
        authContainer.classList.remove('hidden');
      }
    });
  });

  // ---- Tab Switching ----
  // Switches between "Sign In" and "Create Account" forms
  window.switchTab = function (tab) {
    hideMessage();
    if (tab === 'signin') {
      signinForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      tabSignin.classList.add('bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white', 'shadow-sm');
      tabSignin.classList.remove('text-gray-500', 'dark:text-gray-400');
      tabSignup.classList.remove('bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white', 'shadow-sm');
      tabSignup.classList.add('text-gray-500', 'dark:text-gray-400');
    } else {
      signinForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
      tabSignup.classList.add('bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white', 'shadow-sm');
      tabSignup.classList.remove('text-gray-500', 'dark:text-gray-400');
      tabSignin.classList.remove('bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white', 'shadow-sm');
      tabSignin.classList.add('text-gray-500', 'dark:text-gray-400');
    }
  };

  // ---- Email/Password Sign In ----
  function handleSignIn(e) {
    e.preventDefault();
    var email = signinEmail.value.trim();
    var password = signinPassword.value;

    if (!email || !password) {
      showMessage('Please fill in all fields.', 'error');
      return;
    }

    setLoading(signinBtn, true, 'Signing in...');

    // Firebase call: sign in with email and password
    auth.signInWithEmailAndPassword(email, password)
      .then(function () {
        // Success — onAuthStateChanged will redirect to index.html
      })
      .catch(function (error) {
        showMessage(getFriendlyError(error.code), 'error');
        setLoading(signinBtn, false, 'Sign In');
      });
  }

  // ---- Email/Password Sign Up ----
  function handleSignUp(e) {
    e.preventDefault();
    var name = signupName.value.trim();
    var email = signupEmail.value.trim();
    var password = signupPassword.value;

    if (!name || !email || !password) {
      showMessage('Please fill in all fields.', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(signupBtn, true, 'Creating account...');

    // Firebase call: create a new account
    auth.createUserWithEmailAndPassword(email, password)
      .then(function (result) {
        // After creating the account, save the user's display name
        return result.user.updateProfile({ displayName: name });
      })
      .then(function () {
        // onAuthStateChanged will handle the redirect
      })
      .catch(function (error) {
        showMessage(getFriendlyError(error.code), 'error');
        setLoading(signupBtn, false, 'Create Account');
      });
  }

  // ---- Google Sign In ----
  function handleGoogleSignIn() {
    setLoading(googleBtn, true, 'Connecting...');

    // This opens a popup window where the user signs in with Google
    var provider = new firebase.auth.GoogleAuthProvider();

    auth.signInWithPopup(provider)
      .then(function () {
        // Success — onAuthStateChanged handles the rest
      })
      .catch(function (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
          showMessage(getFriendlyError(error.code), 'error');
        }
        setLoading(googleBtn, false, 'Continue with Google');
      });
  }

  // ---- Save User Profile to Firestore ----
  // When a user signs in for the first time, we create a document
  // in the "users" collection with their basic info.
  function saveUserProfile(user) {
    var userRef = db.collection('users').doc(user.uid);

    return userRef.get().then(function (doc) {
      if (!doc.exists) {
        // First time — create the profile
        return userRef.set({
          uid: user.uid,
          displayName: user.displayName || 'User',
          email: user.email,
          photoURL: user.photoURL || null,
          provider: user.providerData[0] ? user.providerData[0].providerId : 'unknown',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Returning user — update last sign-in time
        return userRef.update({
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  }

  // ---- UI Helpers ----

  function showMessage(text, type) {
    authMessage.textContent = text;
    authMessage.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'dark:bg-red-950', 'dark:text-red-300',
      'bg-green-50', 'text-green-700', 'dark:bg-green-950', 'dark:text-green-300');
    if (type === 'error') {
      authMessage.classList.add('bg-red-50', 'text-red-700', 'dark:bg-red-950', 'dark:text-red-300');
    } else {
      authMessage.classList.add('bg-green-50', 'text-green-700', 'dark:bg-green-950', 'dark:text-green-300');
    }
  }

  function hideMessage() {
    authMessage.classList.add('hidden');
  }

  function setLoading(button, loading, text) {
    button.disabled = loading;
    if (text) {
      // Find the text node or span inside the button
      var textNode = button.querySelector('span');
      if (textNode) {
        textNode.textContent = text;
      } else {
        button.textContent = text;
      }
    }
  }

  // Convert Firebase error codes into friendly messages
  function getFriendlyError(code) {
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email. Try creating one.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try signing in.';
      case 'auth/weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'auth/network-request-failed':
        return 'Network error. Check your internet connection.';
      case 'auth/popup-blocked':
        return 'Popup was blocked. Please allow popups for this site.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/unauthorized-domain':
        return 'This website address is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase Authentication.';
      default:
        return 'Something went wrong (' + code + '). Please try again.';
    }
  }
})();
