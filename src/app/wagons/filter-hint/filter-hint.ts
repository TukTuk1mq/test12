import { Component, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';

export interface FilterInfo {
  title: string;
  icon: string;
  /** Что именно фильтрует — 1–2 предложения */
  description: string;
  /** Колонка таблицы, по которой идёт отбор */
  column?: string;
  /** Как искать внутри фильтра */
  searchBy?: string;
  /** Как сочетаются выбранные значения */
  logic?: string;
}

const CARD_WIDTH = 300;
const GAP = 12;

let nextId = 0;

/**
 * Обёртка с подсказкой: при наведении (с небольшой задержкой) или фокусе с клавиатуры
 * показывает карточку с описанием фильтра.
 * Карточка позиционируется относительно окна (position: fixed), поэтому её не обрезает
 * прокручиваемая панель фильтров. При прокрутке/ресайзе — прячется.
 */
@Component({
  selector: 'app-filter-hint',
  templateUrl: './filter-hint.html',
  styleUrl: './filter-hint.css',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'show(0)',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
    '(window:resize)': 'hide()',
    '[attr.aria-describedby]': 'visible() ? id : null',
  },
})
export class FilterHint {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly info = input.required<FilterInfo>();
  /** Сколько значений в справочнике */
  readonly total = input<number | null>(null);
  /** Текущий выбор, уже в виде текста */
  readonly current = input<string>('');
  /** Не показывать (например, когда открыт выпадающий список) */
  readonly disabled = input(false);

  protected readonly id = `filter-hint-${nextId++}`;
  protected readonly visible = signal(false);
  protected readonly position = signal({ top: 0, left: 0, below: false });
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Прокрутка панели фильтров не всплывает до window — слушаем на фазе перехвата
    if (typeof document !== 'undefined') {
      const onScroll = () => this.visible() && this.hide();
      document.addEventListener('scroll', onScroll, { capture: true, passive: true });
      inject(DestroyRef).onDestroy(() =>
        document.removeEventListener('scroll', onScroll, { capture: true }),
      );
    }
  }

  protected show(delay = 350) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.position.set(this.computePosition());
      this.visible.set(true);
    }, delay);
  }

  protected hide() {
    clearTimeout(this.timer);
    this.visible.set(false);
  }

  /** Справа от фильтра, если хватает места; иначе — под ним */
  private computePosition() {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const fitsRight = window.innerWidth - rect.right >= CARD_WIDTH + GAP * 2;
    return fitsRight
      ? { top: rect.top, left: rect.right + GAP, below: false }
      : { top: rect.bottom + 8, left: Math.max(GAP, rect.left), below: true };
  }
}
