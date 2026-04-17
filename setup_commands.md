# LiveMind Project Setup Commands

This document contains the sequence of commands used to create and configure the LiveMind project from scratch.

## 1. Project Initialization
Create the base Angular project with Server-Side Rendering (SSR), SCSS styling, and routing enabled.

```bash
npx -y @angular/cli@latest new livemind --ssr --style scss --routing
```

## 2. Dependencies Installation
Install the required libraries for Firebase integration, QR code generation, and environment management.

```bash
# Core Dependencies
npm install firebase @angular/fire qrcode dotenv

# Development Dependencies
npm install --save-dev @types/qrcode ts-node
```

## 3. Environment Configuration
Generate the `src/environments/environment.ts` file from your local `.env` file using the custom setup script.

```bash
npm run config
```

## 4. Component & Service Scaffolding
Commands used to generate the core architecture of the application.

```bash
# Services
ng generate service core/services/firebase
ng generate service core/services/gemini

# Feature Components
ng generate component features/host
ng generate component features/player
ng generate component features/leaderboard
```

## 5. Development & Build
Commands for running the app locally and building for production.

```bash
# Run locally
npm run start

# Build for production
npm run build
```

## 6. Deployment
Deploy the application to Firebase Hosting.

```bash
# Full deployment pipeline
npm run config && npm run build && npx firebase-tools deploy --only hosting
```
