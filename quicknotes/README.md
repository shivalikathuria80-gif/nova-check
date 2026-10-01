# QuickNotes

A clean, calm, Firebase-powered notes web app. Create, organize, pin, archive, and search your notes — all synced securely to the cloud.

![HTML](https://img.shields.io/badge/HTML-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)

## Features

- **Authentication** — Sign in with Google or Email/Password
- **Notes CRUD** — Create, read, update, and delete notes
- **Autosave** — Notes save automatically as you type
- **Pin & Archive** — Pin important notes, archive ones you're done with
- **Tags** — Organize notes with tags and filter by them
- **Search** — Instantly search through all your notes
- **Dark Mode** — Beautiful day and night themes
- **Responsive** — Works on desktop, tablet, and mobile
- **Secure** — Firestore security rules ensure users can only access their own data

## Setup Guide

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"** (or **"Add project"**)
3. Give it a name (e.g., "QuickNotes")
4. You can disable Google Analytics (it's not needed for this app)
5. Click **"Create project"**

### Step 2: Register a Web App

1. In your Firebase project dashboard, click the **Web icon** (`</>`)
2. Give your app a nickname (e.g., "QuickNotes Web")
3. You do NOT need to set up Firebase Hosting right now
4. Click **"Register app"**
5. You'll see a code block with your Firebase configuration — **keep this page open**, you'll need these values

### Step 3: Enable Authentication

1. In the Firebase console sidebar, click **"Authentication"**
2. Click **"Get started"**
3. Under **"Sign-in method"**, enable these providers:

**Email/Password:**
- Click "Email/Password"
- Toggle the first switch ON
- Click "Save"

**Google:**
- Click "Google"
- Toggle the switch ON
- Select a support email (use your email)
- Click "Save"

### Step 4: Create the Firestore Database

1. In the sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** for now (we'll add proper rules next)
4. Select a location close to you
5. Click **"Enable"**

### Step 5: Deploy Security Rules

1. In Firestore, click the **"Rules"** tab
2. Replace the default rules with the contents of `firestore.rules` from this project
3. Click **"Publish"**

These rules ensure:
- Users can only read/write their own data
- Unauthenticated users cannot access any data
- Notes can only be created by the user who owns them

### Step 6: Add Your Firebase Config

1. Open the file `js/firebase-config.js`
2. Replace the placeholder values with your real Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",              // Your API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

You can find these values in:
- Firebase Console → Project Settings (gear icon) → General → Your apps → Web app

**Note:** These values are safe to have in client-side code. Your app's security comes from Firebase Authentication and Firestore Security Rules, not from hiding these config values.

### Step 7: Run the Project

You need a local web server to run this project (opening `index.html` directly won't work because of browser security restrictions with JavaScript modules).

The easiest way:

```bash
cd quicknotes
npx serve .
```

> `npx serve .` starts a simple web server in the current folder. `npx` runs the `serve` package without installing it permanently.

Then open the URL shown in the terminal (usually `http://localhost:3000`).

**Alternative:** If you have VS Code, install the "Live Server" extension and right-click `auth.html` → "Open with Live Server".

## Project Structure

```
quicknotes/
├── index.html          ← Main app page (notes workspace)
├── auth.html           ← Sign in / Create account page
├── css/
│   └── styles.css      ← Custom styles (scrollbars, animations)
├── js/
│   ├── firebase-config.js  ← Firebase connection setup
│   ├── auth.js             ← Sign in, sign up, Google auth
│   ├── firestore.js        ← Database operations (CRUD)
│   ├── notes.js            ← Notes logic (filter, search, autosave)
│   ├── ui.js               ← Rendering (lists, tags, profile)
│   ├── theme.js            ← Day/night mode toggle
│   └── app.js              ← App startup and event wiring
├── firestore.rules     ← Database security rules
├── package.json
└── README.md
```

## How It Works

```
User opens app
       ↓
Firebase checks: signed in?
       ├── No  → Show auth.html (sign in page)
       └── Yes → Show index.html (notes app)
                       ↓
              Load notes from Firestore
                       ↓
              Display notes in sidebar list
                       ↓
              User creates/edits/deletes notes
                       ↓
              Changes saved to Firestore automatically
```

## Technologies

| Technology | What it does |
|---|---|
| **HTML** | Page structure |
| **Tailwind CSS** | Styling (loaded from CDN) |
| **Vanilla JavaScript** | App logic — no frameworks needed |
| **Firebase Auth** | User sign-in/sign-up |
| **Cloud Firestore** | Cloud database for notes |

## Troubleshooting

**"Firebase: No Firebase App has been created"**
→ Make sure you added your Firebase config in `js/firebase-config.js`

**Google sign-in popup doesn't open**
→ Make sure you enabled the Google provider in Firebase Authentication settings

**"Missing or insufficient permissions"**
→ Deploy the Firestore security rules from `firestore.rules`

**Notes don't save**
→ Check the browser console (F12) for errors. Usually a Firestore rules issue.

**Page is blank**
→ Make sure you're running through a web server, not opening the HTML file directly
