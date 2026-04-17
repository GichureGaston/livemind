import { Component, HostListener, inject, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeminiService } from '../../core/services/gemini';
import { FirebaseService } from '../../core/services/firebase';
import { QuizStateService } from '../../core/services/quiz-state';
import { QuizSession } from '../../core/models/quiz.model';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './host.html',
  styleUrl: './host.scss'
})
export class HostComponent implements OnDestroy {
  private gemini = inject(GeminiService);
  private firebase = inject(FirebaseService);
  state = inject(QuizStateService);
  private router = inject(Router);

  topic = signal('');
  sessionId = signal('');
  errorMsg = signal('');
  qrCodeDataUrl = signal('');

  private bootTime = Date.now();
  private interactionVerified = false;
  private lastCreateAttempt = 0;
  private isCreating = false;

  constructor() {
    effect(() => {
      const url = this.joinUrl;
      const session = this.state.session();
      if (session?.status === 'lobby') {
        QRCode.toDataURL(url, { width: 400, margin: 2 })
          .then(data => this.qrCodeDataUrl.set(data))
          .catch(err => console.error('QR error', err));
      }
    });

    effect(() => {
      const s = this.state.session();
      const p = this.state.participants();
      const q = this.state.currentQuestion();
      const isExplaining = this.state.isExplaining();

      if (s?.status === 'active' && q && !isExplaining) {
        const participantEntries = Object.values(p);
        const participantCount = participantEntries.length;

        if (participantCount > 0) {
          const answersForQ = participantEntries.filter(
            part => part.answers && part.answers[q.id] !== undefined
          ).length;

          if (answersForQ === participantCount) {
             console.log('All participants have answered! Auto-triggering explanation.');
             this.explainAnswer(); 
          }
        }
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  @HostListener('window:mousedown')
  @HostListener('window:touchstart')
  onUserInteraction(event?: Event) {
    if (Date.now() - this.bootTime > 2000) {
      this.interactionVerified = true;
    }
  }

 async createQuiz() {
    if (!this.interactionVerified) {
      console.warn('Blocked: No manual interaction verified yet.');
      return;
    }

    if (this.state.isGenerating()) return;

    if (!this.topic() || this.topic().trim().length < 3) return;

    this.state.isGenerating.set(true);

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
      console.error('Quiz creation failed:', e);

      if (e.status === 429) {
        this.errorMsg.set('[WARNING] Too many requests. Please wait a moment and try again.');
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        this.errorMsg.set('[WARNING] Network error. Please check your connection.');
      } else {
        this.errorMsg.set('[WARNING] Error: ' + (e.message || 'Something went wrong'));
      }
    } finally {
      this.state.isGenerating.set(false);
      this.isCreating = false;
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

  ngOnDestroy() {
    this.isCreating = false;
  }
}
