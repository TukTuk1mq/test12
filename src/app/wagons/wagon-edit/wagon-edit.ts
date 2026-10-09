import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, startWith, switchMap, tap } from 'rxjs';
import { MOCK_COMPANIES } from '../../companies/companies';
import { MOCK_COLORS, MOCK_NAMES, MOCK_OPERATORS, STATIONS, WagonRow } from '../wagons.mock';
import { WagonsService } from '../wagons.service';
import { WagonsListState } from '../wagons-list.state';

type FieldName =
  | 'wagonNumber'
  | 'containerNumber'
  | 'colorId'
  | 'nameId'
  | 'weight'
  | 'ownerId'
  | 'operatorId'
  | 'station'
  | 'arrivalDate';

/** Подписи полей — для списка изменений и сообщений об ошибках */
const FIELD_LABELS: Record<FieldName, string> = {
  wagonNumber: '№ вагона',
  containerNumber: '№ контейнера',
  colorId: 'Статус',
  nameId: 'Тип контейнера',
  weight: 'Вес',
  ownerId: 'Собственник',
  operatorId: 'Оператор',
  station: 'Станция',
  arrivalDate: 'Дата прибытия',
};

@Component({
  selector: 'app-wagon-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './wagon-edit.html',
  styleUrl: './wagon-edit.css',
})
export class WagonEdit {
  private readonly api = inject(WagonsService);
  private readonly listState = inject(WagonsListState);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // --- справочники для выпадающих списков ---
  protected readonly statuses = MOCK_COLORS;
  protected readonly types = MOCK_NAMES;
  protected readonly owners = MOCK_COMPANIES;
  protected readonly operators = MOCK_OPERATORS;
  protected readonly stations = STATIONS;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    wagonNumber: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    containerNumber: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}\d{7}$/)]],
    colorId: [0, Validators.min(1)],
    nameId: [0, Validators.min(1)],
    weight: [0, [Validators.required, Validators.min(0), Validators.max(40)]],
    ownerId: [0, Validators.min(1)],
    operatorId: [0, Validators.min(1)],
    station: ['', Validators.required],
    arrivalDate: ['', Validators.required], // yyyy-MM-ddTHH:mm, локальное время
  });

  // --- состояние страницы ---
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal(false);
  /** Исходные значения — для «Отменить изменения» и подсветки изменённых полей */
  protected readonly original = signal<WagonRow | null>(null);
  private saved = false;

  private readonly value = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  // Подсказки рядом с выпадающими списками
  protected readonly selectedStatus = computed(() => this.statuses.find((s) => s.id === +this.value().colorId));
  protected readonly selectedType = computed(() => this.types.find((t) => t.id === +this.value().nameId));
  protected readonly selectedOwner = computed(() => this.owners.find((o) => o.id === +this.value().ownerId));
  protected readonly selectedOperator = computed(() =>
    this.operators.find((o) => o.id === +this.value().operatorId),
  );

  /** Какие поля отличаются от сохранённых */
  protected readonly changedFields = computed(() => {
    const orig = this.original();
    if (!orig) return [] as FieldName[];
    const initial = toFormValue(orig);
    const current = this.value();
    return (Object.keys(initial) as FieldName[]).filter((k) => String(initial[k]) !== String(current[k]));
  });
  protected readonly changedLabels = computed(() => this.changedFields().map((f) => FIELD_LABELS[f]));

  constructor() {
    this.route.paramMap
      .pipe(
        map((p) => Number(p.get('id'))),
        tap(() => {
          this.loading.set(true);
          this.notFound.set(false);
        }),
        switchMap((id) => this.api.getById(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((row) => {
        this.loading.set(false);
        if (!row) {
          this.notFound.set(true);
          return;
        }
        this.original.set(row);
        this.form.reset(toFormValue(row));
      });
  }

  protected isChanged(field: FieldName) {
    return this.changedFields().includes(field);
  }

  protected showError(field: FieldName) {
    const c = this.form.controls[field];
    return c.invalid && (c.touched || c.dirty);
  }

  /** Номер контейнера — всегда заглавными, без пробелов */
  protected normalizeContainer() {
    const c = this.form.controls.containerNumber;
    const fixed = c.value.toUpperCase().replace(/\s+/g, '');
    if (fixed !== c.value) c.setValue(fixed);
  }

  protected resetChanges() {
    const orig = this.original();
    if (orig) this.form.reset(toFormValue(orig));
    this.saveError.set(false);
  }

  protected save() {
    const orig = this.original();
    if (!orig || this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // фокус на первое поле с ошибкой
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('.is-invalid')?.focus());
      return;
    }

    const v = this.form.getRawValue();
    const updated: WagonRow = {
      ...orig,
      wagonNumber: v.wagonNumber,
      containerNumber: v.containerNumber,
      colorId: +v.colorId,
      nameId: +v.nameId,
      weight: Math.round(+v.weight * 10) / 10,
      ownerId: +v.ownerId,
      operatorId: +v.operatorId,
      station: v.station,
      arrivalDate: new Date(v.arrivalDate).toISOString(),
    };

    this.saving.set(true);
    this.saveError.set(false);
    this.api.update(updated).subscribe({
      next: (saved) => {
        this.saved = true;
        this.saving.set(false);
        this.listState.lastEditedId.set(saved.id);
        this.listState.savedNotice.set({ id: saved.id, wagonNumber: saved.wagonNumber });
        this.router.navigate(['/wagons']);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }

  /** Для guard'а в маршрутах: можно ли уйти со страницы без вопросов */
  canLeave(): boolean {
    if (this.saved || !this.changedFields().length) return true;
    return confirm('Есть несохранённые изменения. Уйти со страницы без сохранения?');
  }

  // Ctrl/Cmd + S — сохранить
  @HostListener('document:keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      this.save();
    }
  }

  // Закрытие/перезагрузка вкладки с несохранёнными изменениями
  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(e: BeforeUnloadEvent) {
    if (this.isBrowser && !this.saved && this.changedFields().length) e.preventDefault();
  }
}

function toFormValue(w: WagonRow) {
  return {
    wagonNumber: w.wagonNumber,
    containerNumber: w.containerNumber,
    colorId: w.colorId,
    nameId: w.nameId,
    weight: w.weight,
    ownerId: w.ownerId,
    operatorId: w.operatorId,
    station: w.station,
    arrivalDate: toLocalInput(w.arrivalDate),
  };
}

/** ISO → значение для <input type="datetime-local"> в локальном времени */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
