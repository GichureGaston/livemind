# 🔥 Firebase Setup Guide

Follow these steps to configure the Firebase backend for the LiveMind AI Quiz application.

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the prompts (e.g., name it `livemind-ai`).
3. (Optional) Enable Google Analytics for your project.

## 2. Register Your Web Application
1. Click the **Web** icon (`</>`) in the project overview to register an app.
2. Enter an app nickname (e.g., `livemind-web`).
3. **Important:** Check the box for **Also set up Firebase Hosting**.
4. Copy the `firebaseConfig` object provided. You will need this for your `environment.ts` file.

## 3. Enable Essential Services

### Cloud Firestore
1. In the left sidebar, go to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose a location and start in **Production mode** (you can update rules later).
4. Rules should eventually be secured based on session IDs.

### Firebase Hosting
1. Go to **Build > Hosting**.
2. Click **Get started**.
3. You will use the Firebase CLI to deploy (see below).

### Vertex AI for Firebase (Production)
1. Go to **Build > Vertex AI**.
2. Click **Get Started**.
3. Follow the instructions to enable the API in the GCP Console and link your project.

## 4. Local Setup & Initialization

### Install Firebase Tools
If you haven't already, install the Firebase CLI globally:
```bash
npm install -g firebase-tools
```

### Initialize the Project
Run the following command in the root of your project:
```bash
firebase login
firebase init
```
Select the following features:
- `Firestore`
- `Hosting`
- `Functions` (Optional, if used for backend logic)

### Configure Angular
Add the Firebase configuration to your `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "...",
    appId: "..."
  }
};
```

---
**Next Step:** Proceed to [GCP Setup](file:///home/gaston/livemind/SETUP_GCP.md) to link billing and enable advanced AI features.
