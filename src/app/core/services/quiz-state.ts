import { Injectable, signal, computed } from '@angular/core';
import { QuizSession, Question, Participant, LeaderboardEntry } from '../models/quiz.model';

@Injectable({ providedIn: 'root' })
export class QuizStateService {
  session = signal<QuizSession | null>(null);
  participants = signal<Record<string, Participant>>({});
  isGenerating = signal(false);
  explanation = signal('');
  isExplaining = signal(false);
  myParticipantId = signal<string | null>(null);
  hasAnswered = signal(false);

  currentQuestion = computed<Question | null>(() => {
    const s = this.session();
    if (!s || s.status !== 'active') return null;
    return s.questions?.[s.currentQuestionIndex] ?? null;
  });

  leaderboard = computed<LeaderboardEntry[]>(() => {
    const p = this.participants();
    return Object.values(p)
      .map(p => ({ id: p.id, nickname: p.nickname, score: p.score }))
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  });

  participantCount = computed(() => Object.keys(this.participants()).length);

  myScore = computed(() => {
    const id = this.myParticipantId();
    if (!id) return 0;
    return this.participants()[id]?.score ?? 0;
  });
}
