import { Injectable, inject } from '@angular/core';
import { Question } from '../models/quiz.model';
import { BehaviorSubject } from 'rxjs';
import { getApp } from 'firebase/app';
import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';

interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

const MODEL = 'gemini-2.5-flash';
const RATE_LIMIT_CONFIG = {
  MIN_INTERVAL_MS: 2000,
  COOLDOWN_MS: 5000,
  LOCKOUT_DURATION_MS: 60000,
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 30000
};

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private lastRequestTime = 0;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private rateLimitInfo$ = new BehaviorSubject<RateLimitInfo>({
    remaining: -1,
    resetTime: 0
  });

  private get model() {
    const ai = getAI(getApp(), {
      backend: new VertexAIBackend('us-central1')
    });
    return getGenerativeModel(ai, { model: MODEL });
  }

  async generateQuestions(
    topic: string,
    difficulty: string = 'medium',
    count: number = 5
  ): Promise<Question[]> {
    return this.executeWithRateLimit(async () => {
      console.log('[API] Call Initialized:', { topic, difficulty, count });

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: this.buildPrompt(topic, difficulty, count) }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });

      return this.parseQuestions(result.response.text());
    });
  }

  /**
   * Main wrapper that handles:
   * - Rate limiting enforcement
   * - Exponential backoff on failures
   * - Local lockout protection
   * - Automatic fallback to mock data
   */
  private async executeWithRateLimit<T>(
    apiCall: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    const lockout = this.getActiveLockout();
    if (lockout) {
      console.warn('[WARNING] Safety Lockout Active:', { remainingMs: lockout });
      return this.getMockQuestions('Quiz') as any;
    }

    await this.waitForRateLimit();

    try {
      const result = await apiCall();
      this.clearLockout(); // Success: clear any lockout
      return result;
    } catch (error: any) {
      console.error('[ERROR] API Error:', error);

      if (this.isTransientError(error) && retryCount < RATE_LIMIT_CONFIG.MAX_RETRIES) {
        const backoffMs = this.calculateBackoff(retryCount);
        console.log(`[RETRY] Retrying in ${backoffMs}ms... (Attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.MAX_RETRIES})`);
        await this.sleep(backoffMs);
        return this.executeWithRateLimit(apiCall, retryCount + 1);
      }

      if (error.status === 429) {
        const retryAfter = this.extractRetryAfter(error);
        this.setLockout(retryAfter);
        console.warn(`[RATE LIMIT] Fallback activated for ${retryAfter}ms`);
      } else {
        console.warn(`[FALLBACK] API Failed (Status: ${error.status}). Fallback activated.`);
      }

      return this.getMockQuestions('Quiz') as any;
    }
  }

  /**
   * Queue-based request management (for future use with concurrent requests)
   */
  private async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        await this.sleep(RATE_LIMIT_CONFIG.MIN_INTERVAL_MS);
      }
    }

    this.isProcessingQueue = false;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const remainingCooldown = RATE_LIMIT_CONFIG.MIN_INTERVAL_MS - timeSinceLastRequest;

    if (remainingCooldown > 0) {
      console.log(`[RATE LIMIT] waiting ${remainingCooldown}ms...`);
      await this.sleep(remainingCooldown);
    }

    this.lastRequestTime = Date.now();
  }

  async streamExplanation(
    question: string,
    correctAnswer: string,
    onChunk: (text: string) => void
  ): Promise<void> {
    const lockout = this.getActiveLockout();
    if (lockout) {
      onChunk('Explanation unavailable due to rate limiting, but the answer is correct!');
      return;
    }

    const prompt = `In 2-3 sentences, explain why "${correctAnswer}" is the correct answer for: "${question}"`;

    try {
      await this.waitForRateLimit();

      const result = await this.model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      for await (const chunk of result.stream) {
        onChunk(chunk.text());
      }
    } catch (e) {
      console.error('Streaming error:', e);
      onChunk('Explanation unavailable due to rate limiting, but the answer is correct!');
    }
  }

  private buildPrompt(topic: string, difficulty: string, count: number): string {
    return `Generate a quiz about ${topic}. Difficulty: ${difficulty}. Count: ${count} questions.
    Return ONLY a JSON array where each object has "text" (string), "options" (array of 4 strings), and "correctIndex" (0-3).
    Example format:
    [{"text": "What is...?", "options": ["A", "B", "C", "D"], "correctIndex": 0}]`;
  }

  private parseQuestions(rawText: string): Question[] {
    try {
      const cleanJson = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Validate and map to Question model
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.map((q: any, index: number) => {
        if (!q.text || !Array.isArray(q.options) || q.correctIndex === undefined) {
          throw new Error(`Invalid question format at index ${index}`);
        }
        return {
          ...q,
          id: `q_${Date.now()}_${index}`
        };
      });
    } catch (e) {
      console.error('Failed to parse Gemini response:', e);
      throw new Error('Invalid quiz format received from AI');
    }
  }

  private getMockQuestions(topic: string): Question[] {
    return [
      {
        id: 'mock_1',
        text: `How should you handle API rate limiting (429 errors) in ${topic}?`,
        options: [
          'Immediately retry the request',
          'Ignore the error and continue',
          'Implement exponential backoff and respect Retry-After headers',
          'Delete your API key'
        ],
        correctIndex: 2
      },
      {
        id: 'mock_2',
        text: `What is the best practice for managing API quotas?`,
        options: [
          'Make as many requests as possible',
          'Implement local rate limiting and request queuing',
          'Only use free tier APIs',
          'Cache results and monitor usage'
        ],
        correctIndex: 3
      },
      {
        id: 'mock_3',
        text: `Why should API keys never be exposed in frontend code?`,
        options: [
          'They are too long',
          'They can be stolen and abused by attackers',
          'It violates REST principles',
          'They only work on servers'
        ],
        correctIndex: 1
      }
    ];
  }

  private getActiveLockout(): number {
    const lockoutTime = localStorage.getItem('gemini_lockout');
    if (!lockoutTime) return 0;

    const lockoutMs = parseInt(lockoutTime);
    const now = Date.now();
    const remainingMs = lockoutMs - now;

    if (remainingMs > 0) {
      return remainingMs;
    }

    this.clearLockout();
    return 0;
  }

  private setLockout(durationMs: number = RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS): void {
    const lockoutTime = Date.now() + durationMs;
    localStorage.setItem('gemini_lockout', lockoutTime.toString());
  }

  private clearLockout(): void {
    localStorage.removeItem('gemini_lockout');
  }

  private isTransientError(error: any): boolean {
    return error.status === 429 || (error.status >= 500 && error.status < 600) || error.name === 'TimeoutError';
  }

  private extractRetryAfter(error: any): number {
    const headers = error.headers;
    if (headers?.['retry-after']) {
      const retryAfter = parseInt(headers['retry-after']);
      return isNaN(retryAfter) ? RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS : retryAfter * 1000;
    }
    return RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS;
  }

  private extractRetryAfterFromResponse(response: Response): number {
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const ms = parseInt(retryAfter);
      return isNaN(ms) ? RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS : ms * 1000;
    }
    return RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS;
  }

  private calculateBackoff(retryCount: number): number {
    const baseBackoff = RATE_LIMIT_CONFIG.INITIAL_BACKOFF_MS;
    const exponentialBackoff = baseBackoff * Math.pow(2, retryCount);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * exponentialBackoff * 0.1;
    return Math.min(exponentialBackoff + jitter, RATE_LIMIT_CONFIG.MAX_BACKOFF_MS);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRateLimitStatus$() {
    return this.rateLimitInfo$.asObservable();
  }

  getRemainingLockout(): number {
    return this.getActiveLockout();
  }
}
