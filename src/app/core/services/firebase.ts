import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, update, get } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QuizSession, Participant } from '../models/quiz.model';

const app = initializeApp(environment.firebase);
const db = getDatabase(app);
const auth = getAuth(app);

@Injectable({ providedIn: 'root' })
export class FirebaseService {

  async signInAnonymously(): Promise<string> {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  }

  async createSession(session: QuizSession): Promise<void> {
    await set(ref(db, `sessions/${session.id}`), session);
  }

  watchSession(sessionId: string): Observable<QuizSession | null> {
    return new Observable(observer => {
      const unsubscribe = onValue(
        ref(db, `sessions/${sessionId}`),
        snap => observer.next(snap.val()),
        err => observer.error(err)
      );
      return () => unsubscribe();
    });
  }

  async addParticipant(sessionId: string, participant: Participant): Promise<void> {
    await set(ref(db, `sessions/${sessionId}/participants/${participant.id}`), participant);
  }

  watchParticipants(sessionId: string): Observable<Record<string, Participant>> {
    return new Observable(observer => {
      const unsubscribe = onValue(
        ref(db, `sessions/${sessionId}/participants`),
        snap => observer.next(snap.val() ?? {}),
        err => observer.error(err)
      );
      return () => unsubscribe();
    });
  }

  async submitAnswer(sessionId: string, participantId: string, questionId: string, answerIndex: number, points: number): Promise<void> {
    await update(ref(db, `sessions/${sessionId}/participants/${participantId}`), {
      [`answers/${questionId}`]: answerIndex,
      score: (await get(ref(db, `sessions/${sessionId}/participants/${participantId}/score`))).val() + points
    });
  }

  async advanceQuestion(sessionId: string, index: number): Promise<void> {
    await update(ref(db, `sessions/${sessionId}`), { currentQuestionIndex: index });
  }

  async updateSessionStatus(sessionId: string, status: 'lobby' | 'active' | 'ended'): Promise<void> {
    await update(ref(db, `sessions/${sessionId}`), { status });
  }
}
