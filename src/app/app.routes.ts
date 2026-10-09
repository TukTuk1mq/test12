import { CanDeactivateFn, Routes } from '@angular/router';
import { Profile } from './profile/profile';
import { Companies } from './companies/companies';
import { Quickgame } from './quickgame/quickgame';
import { Wagons } from './wagons/wagons';

/** Спрашивает подтверждение, если на странице есть несохранённые изменения */
const unsavedChangesGuard: CanDeactivateFn<{ canLeave(): boolean }> = (page) => page.canLeave();

export const routes: Routes = [
  { path: '', redirectTo: 'profile', pathMatch: 'full' },
  { path: 'profile', component: Profile, title: 'Личный кабинет' },
  { path: 'companies', component: Companies, title: 'Компании' },
  {path: 'quickgame', component: Quickgame, title: "Игры"},
  { path: 'wagons', component: Wagons, title: 'Вагоны' },
  {
    path: 'wagons/:id',
    // формы нужны только здесь — грузим страницу лениво, стартовый бандл не растёт
    loadComponent: () => import('./wagons/wagon-edit/wagon-edit').then((m) => m.WagonEdit),
    title: 'Редактирование вагона',
    canDeactivate: [unsavedChangesGuard],
  },
  { path: '**', redirectTo: 'profile' },
];
