import {
  Component,
  Injector,
  afterNextRender,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FilterHint, FilterInfo } from '../filter-hint/filter-hint';

export interface FilterOption {
  id: number;
  label: string;
  description: string;
  color?: string;
  count?: number;
  /** Дополнительные поля пункта (например, код и владелец) — показываются в списке и участвуют в поиске */
  details?: { label: string; value: string }[];
}

// Сколько пунктов рисуем в списке за раз — при большом справочнике просим уточнить поиск
const RENDER_LIMIT = 200;

@Component({
  selector: 'app-multi-select-filter',
  imports: [FilterHint, NgTemplateOutlet],
  templateUrl: './multi-select-filter.html',
  styleUrl: './multi-select-filter.css',
})
export class MultiSelectFilter {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly title = input.required<string>();
  readonly icon = input('bi-funnel');
  readonly searchPlaceholder = input('Поиск по id, названию, описанию');
  readonly options = input.required<FilterOption[]>();
  readonly selected = model<number[]>([]);
  /** Подробное описание фильтра для подсказки при наведении */
  readonly info = input<FilterInfo | null>(null);
  /**
   * overlay — список всплывает поверх страницы;
   * inline — раскрывается в потоке (для прокручиваемых панелей, где всплывающий список обрезался бы)
   */
  readonly mode = input<'overlay' | 'inline'>('overlay');

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly onlySelected = signal(false);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly selectedSet = computed(() => new Set(this.selected()));

  protected readonly selectedOptions = computed(() => {
    const set = this.selectedSet();
    return this.options().filter((o) => set.has(o.id));
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const set = this.selectedSet();
    return this.options().filter(
      (o) =>
        (!this.onlySelected() || set.has(o.id)) &&
        (!q ||
          String(o.id) === q ||
          o.label.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          !!o.details?.some((d) => d.value.toLowerCase().includes(q))),
    );
  });

  /** Текущий выбор текстом — для подсказки */
  protected readonly selectionText = computed(() => {
    const labels = this.selectedOptions().map((o) => o.label);
    if (!labels.length) return '';
    const head = labels.slice(0, 3).join(', ');
    return `Выбрано: ${head}${labels.length > 3 ? ` и ещё ${labels.length - 3}` : ''}`;
  });

  protected readonly visible = computed(() => this.filtered().slice(0, RENDER_LIMIT));

  protected toggleOpen() {
    this.open.update((v) => !v);
    if (this.open()) {
      afterNextRender(
        () => {
          // в inline-режиме докручиваем панель фильтров, чтобы раскрытый список был виден целиком
          if (this.mode() === 'inline') {
            this.host.nativeElement
              .querySelector('.ms-panel')
              ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          this.searchInput()?.nativeElement.focus({ preventScroll: this.mode() === 'inline' });
        },
        { injector: this.injector },
      );
    }
  }

  protected showSelected() {
    this.onlySelected.set(true);
    if (!this.open()) this.toggleOpen();
  }

  protected toggle(id: number) {
    const set = new Set(this.selectedSet());
    set.has(id) ? set.delete(id) : set.add(id);
    this.selected.set([...set]);
  }

  protected selectAllFiltered() {
    const set = new Set(this.selectedSet());
    this.filtered().forEach((o) => set.add(o.id));
    this.selected.set([...set]);
  }

  protected clear() {
    this.selected.set([]);
    this.onlySelected.set(false);
  }

  protected remove(id: number, event: Event) {
    event.stopPropagation();
    this.selected.set(this.selected().filter((x) => x !== id));
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('keydown.escape')
  protected onEscape() {
    this.open.set(false);
  }
}
