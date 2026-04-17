import { Injectable } from '@angular/core';
import { getApp } from 'firebase/app';
import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';
import { from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly MODEL_NAME = 'gemini-2.5-flash';

  private get model() {
    const ai = getAI(getApp(), {
      backend: new VertexAIBackend('us-central1')
    });
    return getGenerativeModel(ai, { model: this.MODEL_NAME });
  }

  explain(content: string) {
    return from(this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: content }] }]
    })).pipe(
      map(result => ({
        candidates: [{
          content: {
            parts: [{ text: result.response.text() }]
          }
        }]
      }))
    );
  }
}
