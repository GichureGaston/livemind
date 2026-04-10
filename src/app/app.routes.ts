import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/host/host').then(m => m.HostComponent)
  },
  {
    path: 'lobby/:id',
    loadComponent: () => import('./features/lobby/lobby').then(m => m.LobbyComponent)
  },
  {
    path: 'play/:id',
    loadComponent: () => import('./features/player/player').then(m => m.PlayerComponent)
  },
  {
    path: 'leaderboard/:id',
    loadComponent: () => import('./features/leaderboard/leaderboard').then(m => m.LeaderboardComponent)
  },
  { path: '**', redirectTo: '' }
];
