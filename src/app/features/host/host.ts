import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeminiService } from '../../core/services/gemini';
import { FirebaseService } from '../../core/services/firebase';
import { QuizStateService } from '../../core/services/quiz-state';
import { QuizSession } from '../../core/models/quiz.model';

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './host.html',
  styleUrl: './host.scss'
})
export class HostComponent {
  private gemini = inject(GeminiService);
  private firebase = inject(FirebaseService);
  state = inject(QuizStateService);
  private router = inject(Router);

  topic = signal('');
  sessionId = signal('');
  errorMsg = signal('');

  async createQuiz() {
    if (!this.topic()) return;
    this.state.isGenerating.set(true);
    this.errorMsg.set('');

    try {
      const uid = await this.firebase.signInAnonymously();
      const questions = await this.gemini.generateQuestions(this.topic());
      const id = 'session_' + Date.now();

      const session: QuizSession = {
        id,
        topic: this.topic(),
        hostId: uid,
        status: 'lobby',
        currentQuestionIndex: 0,
        questions,
        createdAt: Date.now()
      };

      await this.firebase.createSession(session);
      this.state.session.set(session);
      this.sessionId.set(id);

      this.firebase.watchParticipants(id).subscribe(p => {
        this.state.participants.set(p);
      });

    } catch (e: any) {
      this.errorMsg.set('Error: ' + e.message);
    } finally {
      this.state.isGenerating.set(false);
    }
  }

  async startQuiz() {
    await this.firebase.updateSessionStatus(this.sessionId(), 'active');
    this.state.session.update(s => s ? { ...s, status: 'active' } : s);
  }

  async nextQuestion() {
    const session = this.state.session();
    if (!session) return;
    const next = session.currentQuestionIndex + 1;
    if (next >= session.questions.length) {
      await this.firebase.updateSessionStatus(this.sessionId(), 'ended');
      this.state.session.update(s => s ? { ...s, status: 'ended' } : s);
    } else {
      await this.firebase.advanceQuestion(this.sessionId(), next);
      this.state.session.update(s => s ? { ...s, currentQuestionIndex: next } : s);
      this.state.isExplaining.set(false);
      this.state.explanation.set('');
    }
  }

  async explainAnswer() {
    const q = this.state.currentQuestion();
    if (!q) return;
    this.state.isExplaining.set(true);
    this.state.explanation.set('');
    await this.gemini.streamExplanation(
      q.text,
      q.options[q.correctIndex],
      chunk => this.state.explanation.update(e => e + chunk)
    );
  }

  get joinUrl() {
    return `${window.location.origin}/lobby/${this.sessionId()}`;
  }
}
