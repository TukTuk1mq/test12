import { Component, DestroyRef, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, switchMap, tap } from 'rxjs';
import { MOCK_COLORS, MOCK_NAMES, MOCK_OPERATORS, WagonRow } from './wagons.mock';
import { SortKey, WagonsListState } from './wagons-list.state';
import { EMPTY_FILTER, WagonFilter, WagonsService } from './wagons.service';
import { FilterOption, MultiSelectFilter } from './multi-select-filter/multi-select-filter';
import { FilterHint, FilterInfo } from './filter-hint/filter-hint';
import { ExportColumn, downloadXlsx } from './xlsx-export';
import { MOCK_COMPANIES } from '../companies/companies';

interface Column {
  key: SortKey;
  title: string;
  align?: 'end';
  /** Колонку нельзя скрыть */
  locked?: boolean;
}

const HIDDEN_COLUMNS_KEY = 'wagons.hiddenColumns';

interface WeightPreset {
  label: string;
  from: number | null;
  to: number | null;
}

interface DatePreset {
  label: string;
  days: number | null; // null — всё время
}

@Component({
  selector: 'app-wagons',
  imports: [DatePipe, DecimalPipe, RouterLink, MultiSelectFilter, FilterHint],
  templateUrl: './wagons.html',
  styleUrl: './wagons.css',
})
export class Wagons {
  private readonly api = inject(WagonsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  /** Фильтры, сортировка и страница живут в сервисе — переживают переход на редактирование */
  private readonly state = inject(WagonsListState);

  protected readonly totalCount = computed(() => this.api.all().length);

  protected readonly columns: Column[] = [
    { key: 'id', title: '#' },
    { key: 'wagonNumber', title: '№ вагона', locked: true },
    { key: 'containerNumber', title: '№ контейнера' },
    { key: 'status', title: 'Статус' },
    { key: 'type', title: 'Тип' },
    { key: 'owner', title: 'Собственник' },
    { key: 'operator', title: 'Оператор' },
    { key: 'station', title: 'Станция' },
    { key: 'weight', title: 'Вес, т', align: 'end' },
    { key: 'arrivalDate', title: 'Прибытие' },
  ];
  protected readonly pageSizes = [25, 50, 100];

  // --- видимость колонок (запоминается в браузере пользователя) ---
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly hiddenColumns = signal<ReadonlySet<SortKey>>(this.loadHiddenColumns());
  protected readonly visibleColumns = computed(() =>
    this.columns.filter((c) => !this.hiddenColumns().has(c.key)),
  );
  protected readonly datePresets: DatePreset[] = [
    { label: 'Сегодня', days: 1 },
    { label: '7 дней', days: 7 },
    { label: '30 дней', days: 30 },
    { label: 'Всё время', days: null },
  ];

  protected readonly weightPresets: WeightPreset[] = [
    { label: 'до 10 т', from: null, to: 10 },
    { label: '10–20 т', from: 10, to: 20 },
    { label: 'от 20 т', from: 20, to: null },
  ];
  // Границы веса в данных — для подсказок в полях ввода
  protected readonly weightMin = computed(() => Math.min(...this.api.all().map((w) => w.weight)));
  protected readonly weightMax = computed(() => Math.max(...this.api.all().map((w) => w.weight)));

  // --- описания фильтров для подсказок при наведении ---
  private readonly anyOf = 'Выбранные значения объединяются через «ИЛИ», с другими фильтрами — через «И».';
  protected readonly filterInfo: Record<'status' | 'type' | 'owner' | 'operator' | 'date' | 'weight', FilterInfo> = {
    status: {
      title: 'Статус вагона',
      icon: 'bi-circle-half',
      description:
        'Текущее состояние вагона: в пути, на станции, под погрузкой, в ремонте и т. д. Каждому статусу соответствует свой цвет.',
      column: 'Статус',
      searchBy: 'id или название статуса',
      logic: this.anyOf,
    },
    type: {
      title: 'Тип контейнера',
      icon: 'bi-box',
      description:
        'Типоразмер контейнера на вагоне: длина (20, 40, 45 футов) и назначение — сухогрузный, рефрижератор, танк-контейнер и др.',
      column: 'Тип',
      searchBy: 'id, код (например, 40HC) или описание',
      logic: this.anyOf,
    },
    owner: {
      title: 'Собственник вагона',
      icon: 'bi-building',
      description: 'Компания, которой принадлежит вагон. В списке — сокращённое и полное наименование.',
      column: 'Собственник',
      searchBy: 'id, сокращённое или полное название',
      logic: this.anyOf,
    },
    operator: {
      title: 'Оператор',
      icon: 'bi-person-badge',
      description:
        'Компания-оператор, которая отвечает за перевозку. У каждого оператора: сокращённое и полное наименование, код компании и владелец.',
      column: 'Оператор',
      searchBy: 'id, название, код компании (например, SK-2071) или ФИО владельца',
      logic: this.anyOf,
    },
    date: {
      title: 'Дата прибытия',
      icon: 'bi-calendar3',
      description:
        'Дата и время прибытия вагона на станцию. Можно указать только начало или только конец периода.',
      column: 'Прибытие',
      logic: 'Обе даты включительно. Быстрые кнопки считают период от сегодняшнего дня.',
    },
    weight: {
      title: 'Вес груза',
      icon: 'bi-speedometer2',
      description:
        'Вес груза в контейнере в тоннах. Можно указать только нижнюю или только верхнюю границу.',
      column: 'Вес, т',
      logic: 'Обе границы включительно. Дробные значения — через точку или запятую.',
    },
  };

  protected readonly weightHintText = computed(() => {
    const { weightFrom, weightTo } = this.draft();
    return weightFrom === null && weightTo === null ? '' : `Диапазон: ${formatWeight(weightFrom, weightTo)}`;
  });

  protected readonly dateHintText = computed(() => {
    const { dateFrom, dateTo } = this.draft();
    if (!dateFrom && !dateTo) return '';
    return `Период: ${formatDate(dateFrom) || '…'} — ${formatDate(dateTo) || '…'}`;
  });

  /** Мобильные: панель фильтров свёрнута, пока её не раскроют */
  protected readonly filtersExpanded = signal(false);

  // --- фильтры: черновик (то, что пользователь накликал) и применённые ---
  protected readonly draft = this.state.draft;
  protected readonly applied = this.state.applied;

  protected readonly isDirty = computed(() => !sameFilter(this.draft(), this.applied()));
  protected readonly dateRangeInvalid = computed(() => {
    const { dateFrom, dateTo } = this.draft();
    return !!dateFrom && !!dateTo && dateFrom > dateTo;
  });
  protected readonly weightRangeInvalid = computed(() => {
    const { weightFrom, weightTo } = this.draft();
    return weightFrom !== null && weightTo !== null && weightFrom > weightTo;
  });
  protected readonly hasErrors = computed(() => this.dateRangeInvalid() || this.weightRangeInvalid());

  // --- данные ---
  protected readonly rows = signal<WagonRow[]>([]);
  protected readonly loading = signal(true);
  private readonly load$ = new Subject<WagonFilter>();

  // --- таблица ---
  protected readonly sortKey = this.state.sortKey;
  protected readonly sortDir = this.state.sortDir;
  protected readonly page = this.state.page;
  protected readonly pageSize = this.state.pageSize;

  // --- после сохранения на странице редактирования ---
  protected readonly lastEditedId = this.state.lastEditedId.asReadonly();
  protected readonly savedNotice = this.state.savedNotice.asReadonly();
  /** Отредактированный вагон может перестать подходить под фильтры — предупреждаем */
  protected readonly savedRowHidden = computed(() => {
    const notice = this.savedNotice();
    return !!notice && !this.loading() && !this.rows().some((w) => w.id === notice.id);
  });

  // --- справочники ---
  private readonly colorById = new Map(MOCK_COLORS.map((c) => [c.id, c]));
  private readonly nameById = new Map(MOCK_NAMES.map((n) => [n.id, n]));
  // счётчики считаются по актуальным данным — после правок они меняются
  private readonly countsByColor = computed(() => countBy(this.api.all(), (w) => w.colorId));
  private readonly countsByName = computed(() => countBy(this.api.all(), (w) => w.nameId));
  private readonly ownerById = new Map(MOCK_COMPANIES.map((c) => [c.id, c]));
  private readonly countsByOwner = computed(() => countBy(this.api.all(), (w) => w.ownerId));
  private readonly operatorById = new Map(MOCK_OPERATORS.map((o) => [o.id, o]));
  private readonly countsByOperator = computed(() => countBy(this.api.all(), (w) => w.operatorId));

  protected readonly colorOptions = computed<FilterOption[]>(() =>
    MOCK_COLORS.map((c) => ({
      id: c.id,
      label: c.description,
      description: c.color,
      color: c.color,
      count: this.countsByColor().get(c.id) ?? 0,
    })),
  );

  protected readonly nameOptions = computed<FilterOption[]>(() =>
    MOCK_NAMES.map((n) => ({
      id: n.id,
      label: n.name,
      description: n.description,
      count: this.countsByName().get(n.id) ?? 0,
    })),
  );

  protected readonly ownerOptions = computed<FilterOption[]>(() =>
    MOCK_COMPANIES.map((c) => ({
      id: c.id,
      label: c.shortName,
      description: c.fullName,
      count: this.countsByOwner().get(c.id) ?? 0,
    })),
  );

  protected readonly operatorOptions = computed<FilterOption[]>(() =>
    MOCK_OPERATORS.map((o) => ({
      id: o.id,
      label: o.shortName,
      description: o.fullName,
      details: [
        { label: 'Код', value: o.code },
        { label: 'Владелец', value: o.owner },
      ],
      count: this.countsByOperator().get(o.id) ?? 0,
    })),
  );

  constructor() {
    effect(() => {
      const hidden = [...this.hiddenColumns()];
      if (!this.isBrowser) return;
      try {
        localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify(hidden));
      } catch {
        // storage недоступен — настройка просто не запомнится
      }
    });

    this.load$
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap((filter) => this.api.search(filter)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      });
    this.load$.next(this.applied());

    // Сообщение о сохранении и подсветка строки — на несколько секунд
    if (this.isBrowser && this.state.savedNotice()) {
      const timer = setTimeout(() => this.dismissSavedNotice(), 6000);
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    }
  }

  protected openWagon(w: WagonRow) {
    // не мешаем выделять текст в таблице мышью
    if (this.isBrowser && window.getSelection()?.toString()) return;
    this.router.navigate(['/wagons', w.id]);
  }

  protected dismissSavedNotice() {
    this.state.savedNotice.set(null);
    this.state.lastEditedId.set(null);
  }

  // --- выборка на странице ---
  protected readonly sorted = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const value = (w: WagonRow): string | number =>
      key === 'status'
        ? (this.colorById.get(w.colorId)?.description ?? '')
        : key === 'type'
          ? (this.nameById.get(w.nameId)?.name ?? '')
          : key === 'owner'
            ? (this.ownerById.get(w.ownerId)?.name ?? '')
            : key === 'operator'
              ? (this.operatorById.get(w.operatorId)?.name ?? '')
              : w[key];
    return [...this.rows()].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      return (typeof va === 'number' ? va - (vb as number) : va.localeCompare(vb as string, 'ru')) * dir;
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.rows().length / this.pageSize())),
  );
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly rangeFrom = computed(() =>
    this.rows().length ? (this.currentPage() - 1) * this.pageSize() + 1 : 0,
  );
  protected readonly rangeTo = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.rows().length),
  );
  protected readonly pageRows = computed(() =>
    this.sorted().slice(this.rangeFrom() - 1, this.rangeTo()),
  );

  // --- чипы применённых фильтров ---
  protected readonly activeChips = computed(() => {
    const f = this.applied();
    const chips: { key: string; label: string; color?: string; remove: () => void }[] = [
      ...f.colorIds.map((id) => ({
        key: `c${id}`,
        label: this.colorById.get(id)?.description ?? String(id),
        color: this.colorById.get(id)?.color,
        remove: () => this.patchAndApply({ colorIds: f.colorIds.filter((x) => x !== id) }),
      })),
      ...f.nameIds.map((id) => ({
        key: `n${id}`,
        label: this.nameById.get(id)?.name ?? String(id),
        remove: () => this.patchAndApply({ nameIds: f.nameIds.filter((x) => x !== id) }),
      })),
      ...f.ownerIds.map((id) => ({
        key: `o${id}`,
        label: this.ownerById.get(id)?.shortName ?? String(id),
        remove: () => this.patchAndApply({ ownerIds: f.ownerIds.filter((x) => x !== id) }),
      })),
      ...f.operatorIds.map((id) => ({
        key: `op${id}`,
        label: this.operatorById.get(id)?.shortName ?? String(id),
        remove: () => this.patchAndApply({ operatorIds: f.operatorIds.filter((x) => x !== id) }),
      })),
    ];
    if (f.dateFrom || f.dateTo) {
      chips.push({
        key: 'date',
        label: `Прибытие: ${formatDate(f.dateFrom) || '…'} — ${formatDate(f.dateTo) || '…'}`,
        remove: () => this.patchAndApply({ dateFrom: '', dateTo: '' }),
      });
    }
    if (f.weightFrom !== null || f.weightTo !== null) {
      chips.push({
        key: 'weight',
        label: `Вес: ${formatWeight(f.weightFrom, f.weightTo)}`,
        remove: () => this.patchAndApply({ weightFrom: null, weightTo: null }),
      });
    }
    if (f.search) {
      chips.push({
        key: 'search',
        label: `Поиск: «${f.search}»`,
        remove: () => this.patchAndApply({ search: '' }),
      });
    }
    return chips;
  });

  protected readonly hasFilters = computed(
    () => !sameFilter(this.draft(), EMPTY_FILTER) || !sameFilter(this.applied(), EMPTY_FILTER),
  );

  // --- helpers для шаблона ---
  protected colorOf(id: number) {
    return this.colorById.get(id);
  }

  protected operatorOf(id: number) {
    return this.operatorById.get(id);
  }

  protected ownerOf(id: number) {
    return this.ownerById.get(id);
  }

  protected nameOf(id: number) {
    return this.nameById.get(id);
  }

  protected isPresetActive(p: DatePreset) {
    const { dateFrom, dateTo } = this.draft();
    if (p.days === null) return !dateFrom && !dateTo;
    const range = presetRange(p.days);
    return dateFrom === range.dateFrom && dateTo === range.dateTo;
  }

  protected isWeightPresetActive(p: WeightPreset) {
    const { weightFrom, weightTo } = this.draft();
    return weightFrom === p.from && weightTo === p.to;
  }

  // --- действия ---
  protected patchDraft(patch: Partial<WagonFilter>) {
    this.draft.update((f) => ({ ...f, ...patch }));
  }

  protected applyPreset(p: DatePreset) {
    this.patchDraft(p.days === null ? { dateFrom: '', dateTo: '' } : presetRange(p.days));
  }

  /** Повторный клик по активному пресету — сброс диапазона */
  protected applyWeightPreset(p: WeightPreset) {
    this.patchDraft(
      this.isWeightPresetActive(p)
        ? { weightFrom: null, weightTo: null }
        : { weightFrom: p.from, weightTo: p.to },
    );
  }

  protected setWeight(key: 'weightFrom' | 'weightTo', raw: string) {
    const value = parseFloat(raw.replace(',', '.'));
    this.patchDraft({ [key]: Number.isFinite(value) && value >= 0 ? value : null });
  }

  protected apply() {
    if (this.hasErrors()) return;
    this.applied.set(this.draft());
    this.page.set(1);
    this.load$.next(this.applied());
    this.filtersExpanded.set(false); // на мобильных сворачиваем, чтобы сразу видеть результат
  }

  protected cancelDraft() {
    this.draft.set(this.applied());
  }

  protected resetAll() {
    this.draft.set(EMPTY_FILTER);
    this.apply();
  }

  /** Снятие чипа — сразу применяем, без кнопки */
  private patchAndApply(patch: Partial<WagonFilter>) {
    this.applied.update((f) => ({ ...f, ...patch }));
    this.draft.update((f) => ({ ...f, ...patch }));
    this.page.set(1);
    this.load$.next(this.applied());
  }

  protected toggleColumn(col: Column) {
    if (col.locked) return;
    this.hiddenColumns.update((set) => {
      const next = new Set(set);
      next.has(col.key) ? next.delete(col.key) : next.add(col.key);
      return next;
    });
  }

  protected showAllColumns() {
    this.hiddenColumns.set(new Set());
  }

  private loadHiddenColumns(): ReadonlySet<SortKey> {
    if (!this.isBrowser) return new Set();
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(HIDDEN_COLUMNS_KEY) ?? '[]');
      const known = new Set(this.columns.filter((c) => !c.locked).map((c) => c.key));
      return new Set(Array.isArray(saved) ? saved.filter((k): k is SortKey => known.has(k)) : []);
    } catch {
      return new Set();
    }
  }

  // --- выгрузка в Excel ---
  protected readonly exporting = signal(false);
  protected readonly exportError = signal(false);

  /** Как каждая колонка таблицы выглядит в Excel */
  private readonly exportColumns: Record<SortKey, Omit<ExportColumn<WagonRow>, 'title'>> = {
    id: { width: 7, cell: (w) => w.id },
    wagonNumber: { width: 13, cell: (w) => w.wagonNumber },
    containerNumber: { width: 15, cell: (w) => w.containerNumber },
    status: { width: 22, cell: (w) => this.colorById.get(w.colorId)?.description ?? '' },
    type: { width: 9, cell: (w) => this.nameById.get(w.nameId)?.name ?? '' },
    owner: { width: 28, cell: (w) => this.ownerById.get(w.ownerId)?.shortName ?? '' },
    operator: { width: 28, cell: (w) => this.operatorById.get(w.operatorId)?.shortName ?? '' },
    station: { width: 24, cell: (w) => w.station },
    weight: { width: 9, cell: (w) => ({ value: w.weight, type: Number, format: '0.0' }) },
    arrivalDate: {
      width: 17,
      cell: (w) => ({ value: new Date(w.arrivalDate), type: Date, format: 'dd.mm.yyyy hh:mm' }),
    },
    colorId: { width: 8, cell: (w) => w.colorId },
    nameId: { width: 8, cell: (w) => w.nameId },
    ownerId: { width: 8, cell: (w) => w.ownerId },
    operatorId: { width: 8, cell: (w) => w.operatorId },
  };

  /**
   * Выгружает ВСЕ строки по применённым фильтрам (а не только текущую страницу),
   * в текущей сортировке и только видимые колонки.
   */
  protected async exportToExcel() {
    if (this.exporting() || !this.rows().length) return;
    this.exporting.set(true);
    this.exportError.set(false);
    try {
      await downloadXlsx({
        fileName: `vagony_${fileStamp(new Date())}.xlsx`,
        sheetName: 'Вагоны',
        columns: this.visibleColumns().map((c) => ({ title: c.title, ...this.exportColumns[c.key] })),
        rows: this.sorted(),
        summary: this.exportSummary(),
      });
    } catch (e) {
      console.error('Не удалось выгрузить в Excel', e);
      this.exportError.set(true);
    } finally {
      this.exporting.set(false);
    }
  }

  private exportSummary(): [string, string][] {
    const f = this.applied();
    const list = (labels: (string | undefined)[]) => labels.filter(Boolean).join(', ') || 'Все';
    const sortCol = this.columns.find((c) => c.key === this.sortKey())?.title ?? '';
    return [
      ['Дата выгрузки', new Date().toLocaleString('ru-RU')],
      ['Записей', String(this.rows().length)],
      ['Статус', list(f.colorIds.map((id) => this.colorById.get(id)?.description))],
      ['Тип контейнера', list(f.nameIds.map((id) => this.nameById.get(id)?.name))],
      ['Собственник', list(f.ownerIds.map((id) => this.ownerById.get(id)?.shortName))],
      ['Оператор', list(f.operatorIds.map((id) => this.operatorById.get(id)?.shortName))],
      [
        'Дата прибытия',
        f.dateFrom || f.dateTo ? `${formatDate(f.dateFrom) || '…'} — ${formatDate(f.dateTo) || '…'}` : 'Всё время',
      ],
      ['Вес', f.weightFrom !== null || f.weightTo !== null ? formatWeight(f.weightFrom, f.weightTo) : 'Любой'],
      ['Поиск', f.search.trim() || '—'],
      ['Сортировка', `${sortCol}, ${this.sortDir() === 'asc' ? 'по возрастанию' : 'по убыванию'}`],
    ];
  }

  protected sortBy(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  protected goTo(page: number) {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  protected setPageSize(size: string) {
    this.pageSize.set(Number(size));
    this.page.set(1);
  }
}

function countBy<T>(items: T[], key: (item: T) => number): Map<number, number> {
  const map = new Map<number, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return map;
}

function sameFilter(a: WagonFilter, b: WagonFilter): boolean {
  const sameIds = (x: number[], y: number[]) =>
    x.length === y.length && x.every((id) => y.includes(id));
  return (
    sameIds(a.colorIds, b.colorIds) &&
    sameIds(a.nameIds, b.nameIds) &&
    sameIds(a.ownerIds, b.ownerIds) &&
    sameIds(a.operatorIds, b.operatorIds) &&
    a.dateFrom === b.dateFrom &&
    a.dateTo === b.dateTo &&
    a.weightFrom === b.weightFrom &&
    a.weightTo === b.weightTo &&
    a.search.trim() === b.search.trim()
  );
}

function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function presetRange(days: number): Pick<WagonFilter, 'dateFrom' | 'dateTo'> {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { dateFrom: toIsoDate(from), dateTo: toIsoDate(to) };
}

function formatWeight(from: number | null, to: number | null): string {
  const n = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
  if (from !== null && to !== null) return `${n(from)}–${n(to)} т`;
  if (from !== null) return `от ${n(from)} т`;
  return `до ${n(to!)} т`;
}

function fileStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toIsoDate(d)}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function formatDate(iso: string): string {
  return iso ? iso.split('-').reverse().join('.') : '';
}
