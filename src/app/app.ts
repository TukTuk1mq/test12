import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Counter } from './counter/counter';
import { Rednersmf } from './rednersmf/rednersmf';
import { StringList } from './string-list/string-list';
import { ThemeService } from './theme.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('angular_project');
  protected readonly themeService = inject(ThemeService);
}
