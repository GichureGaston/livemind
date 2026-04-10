import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Question } from '../models/quiz.model';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private http = inject(HttpClient);

  private get generateUrl() {
    return BASE + '/' + MODEL + ':generateContent?key=' + environment.geminiApiKey;
  }
  private get streamUrl() {
    return BASE + '/' + MODEL + ':streamGenerateContent?alt=sse&key=' + environment.geminiApiKey;
  }

  async generateQuestions(topic: string, retries = 3): Promise<Question[]> {
    const prompt = 'Generate exactly 5 multiple choice quiz questions about "' + topic + '". Return ONLY valid JSON array, no markdown. Format: [{"id":"q1","text":"question?","options":["A","B","C","D"],"correctIndex":0}]';

    for (let i = 0; i < retries; i++) {
      try {
        const res: any = await this.http.post(this.generateUrl, {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8 }
        }).toPromise();
        const raw = res.candidates[0].content.parts[0].text;
        const clean = raw.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
      } catch (e: any) {
        if (e.status === 429 && i < retries - 1) {
          await new Promise(r => setTimeout(r, 3000 * (i + 1)));
          continue;
        }
        throw e;
      }
    }
    throw new Error('Failed after retries');
  }

  async streamExplanation(question: string, correctAnswer: string, onChunk: (text: string) => void): Promise<void> {
    const prompt = 'In 2-3 sentences, explain why "' + correctAnswer + '" is correct for: "' + question + '"';
    const response = await fetch(this.streamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        try {
          const json = JSON.parse(line.replace('data: ', ''));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) onChunk(text);
        } catch {}
      }
    }
  }
}
