import { Component, effect, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase';
import { QuizStateService } from '../../core/services/quiz-state';
import { Participant } from '../../core/models/quiz.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player.html',
  styleUrl: './player.scss',
})
export class PlayerComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firebase = inject(FirebaseService);
  state = inject(QuizStateService);

  sessionId = signal<string>('');
  nickname = signal<string>('');
  isJoining = signal<boolean>(false);
  hasAnswered = signal<boolean>(false);
  selectedOption = signal<number | null>(null);

  private sessionSub: Subscription | null = null;
  private participantsSub: Subscription | null = null;
  private currentQuestionIndex = -1;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.sessionId.set(id);
      
      this.firebase.signInAnonymously().then(() => {
        this.sessionSub = this.firebase.watchSession(id).subscribe(s => {
          this.state.session.set(s);
        });
        
        this.participantsSub = this.firebase.watchParticipants(id).subscribe(p => {
          this.state.participants.set(p);
        });
      }).catch(err => {
        console.error('Silent auth failed:', err);
      });
    }

    effect(() => {
      const session = this.state.session();
      if (session && session.currentQuestionIndex !== this.currentQuestionIndex) {
        this.currentQuestionIndex = session.currentQuestionIndex;
        this.hasAnswered.set(false);
        this.selectedOption.set(null);
      }
    });
  }

  async joinSession() {
    if (!this.nickname().trim() || this.isJoining()) return;
    this.isJoining.set(true);

    try {
      const uid = await this.firebase.signInAnonymously();
      const participantId = `p_${uid}_${Date.now()}`;
      
      const participant: Participant = {
        id: participantId,
        nickname: this.nickname().trim(),
        score: 0,
        answers: {},
        joinedAt: Date.now()
      };

      await this.firebase.addParticipant(this.sessionId(), participant);
      this.state.myParticipantId.set(participantId);
    } catch (error) {
      console.error('Failed to join session', error);
    } finally {
      this.isJoining.set(false);
    }
  }

  async submitAnswer(index: number) {
    if (this.hasAnswered() || this.selectedOption() !== null) return;
    
    this.hasAnswered.set(true);
    this.selectedOption.set(index);

    const session = this.state.session();
    const myId = this.state.myParticipantId();
    if (!session || !myId) return;

    const currentQ = session.questions[session.currentQuestionIndex];
    if (!currentQ) return;

    const isCorrect = (index === currentQ.correctIndex);
    const points = isCorrect ? 100 : 0;

    try {
      await this.firebase.submitAnswer(this.sessionId(), myId, currentQ.id, index, points);
    } catch (e) {
      console.error('Failed to submit answer', e);
      this.hasAnswered.set(false);
      this.selectedOption.set(null);
    }
  }

  viewLeaderboard() {
    this.router.navigate(['/leaderboard', this.sessionId()]);
  }

  ngOnDestroy() {
    this.sessionSub?.unsubscribe();
    this.participantsSub?.unsubscribe();
  }
}
