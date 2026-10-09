import { DOCUMENT, Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * Тема Bootstrap 5.3: выставляем data-bs-theme на <html>.
 * Начальное значение уже проставил inline-скрипт в index.html (без мигания при загрузке),
 * здесь только читаем его и сохраняем выбор пользователя.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<Theme>(this.initialTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.document.documentElement.setAttribute('data-bs-theme', theme);
      if (this.isBrowser) {
        try {
          localStorage.setItem(STORAGE_KEY, theme);
        } catch {
          // приватный режим / storage недоступен — просто не запоминаем
        }
      }
    });
  }

  toggle() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  private initialTheme(): Theme {
    if (!this.isBrowser) return 'light';
    const attr = this.document.documentElement.getAttribute('data-bs-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
