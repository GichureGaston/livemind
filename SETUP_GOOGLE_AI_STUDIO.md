# 🤖 Google AI Studio Setup Guide

Google AI Studio is the fastest way to start prototyping with Gemini models. Use this for initial development and testing before migrating to Vertex AI for production.

## 1. Get an API Key
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Click on **Get API key** in the left-hand sidebar.
3. Click **Create API key in new project** or select an existing project.
4. Copy the API Key immediately (you won't be able to see it again easily).

## 2. Test Your Key
You can verify your key is working with a simple `curl` command:
```bash
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "contents": [{
        "parts":[{"text": "Write a short quiz question about Angular."}]
      }]
    }'
```

## 3. Initial Project Integration
In the early stages of LiveMind, we used the API key directly in the environment:

```typescript
// src/environments/environment.ts
export const environment = {
  // ...
  geminiApiKey: 'YOUR_API_KEY_HERE'
};
```

### Why migrate to Vertex AI?
While AI Studio is great for dev, the **Vertex AI for Firebase SDK** (via GCP) is preferred for the final build because:
- **Security:** No API keys are exposed in the frontend; it uses Firebase's internal auth.
- **Quotas:** Higher rate limits and enterprise-grade scalability.
- **GCP Credits:** Allows you to use Google Cloud credits/billing for usage.

---
**Recommended Flow:** Start here, then move to [GCP Setup](file:///home/gaston/livemind/SETUP_GCP.md) for production.
