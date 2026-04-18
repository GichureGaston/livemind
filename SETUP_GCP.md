# GCP & Vertex AI Setup Guide

Linking your project to Google Cloud Platform (GCP) allows you to use Vertex AI, manage billing, and leverage enterprise-grade AI infrastructure.

## 1. Link Firebase to GCP
Every Firebase project is automatically a GCP project. To access full GCP features:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Firebase project from the project dropdown at the top.

## 2. Enable Billing
Vertex AI requires a linked billing account, even if you are using free credits.
1. In the GCP Console, go to **Billing**.
2. Link your project to an active **Billing Account**.
3. If you have **GCP Credits** (from a workshop or promo), ensure they are applied to this account.

## 3. Enable Vertex AI API
1. Search for **Vertex AI API** in the GCP Console search bar.
2. Click **Enable**.
3. This allows your Firebase project to communicate with Gemini models via the Vertex infrastructure.

## 4. Enable Vertex AI for Firebase
This is the bridge that allows your Angular frontend to call Gemini securely.
1. Go back to the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Build > Vertex AI**.
3. Click **Get Started**.
4. This step automatically configures the necessary permissions (IAM roles) for your Firebase App to access Vertex AI.

## 5. Implementation in LiveMind
In this project, we transitioned from direct HTTP calls to the `firebase/vertexai` (or `firebase/ai`) SDK.

```typescript
// gemini.service.ts
import { getApp } from 'firebase/app';
import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';

const ai = getAI(getApp(), {
  backend: new VertexAIBackend('us-central1')
});
const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });
```

---
**Verification:** Check the **APIs & Services > Metrics** dashboard in GCP to see your AI traffic and usage in real-time.
