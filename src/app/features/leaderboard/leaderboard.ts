import { Component, inject, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase';
import { QuizStateService } from '../../core/services/quiz-state';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class LeaderboardComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firebase = inject(FirebaseService);
  state = inject(QuizStateService);

  private sessionSub: Subscription | null = null;
  private participantsSub: Subscription | null = null;

  topThree = computed(() => {
    return this.state.leaderboard().slice(0, 3);
  });

  runnersUp = computed(() => {
    return this.state.leaderboard().slice(3);
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.sessionSub = this.firebase.watchSession(id).subscribe(s => {
        this.state.session.set(s);
      });
      this.participantsSub = this.firebase.watchParticipants(id).subscribe(p => {
        this.state.participants.set(p);
      });
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    this.sessionSub?.unsubscribe();
    this.participantsSub?.unsubscribe();
  }
}
