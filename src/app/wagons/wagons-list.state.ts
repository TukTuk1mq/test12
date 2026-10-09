import { Injectable, signal } from '@angular/core';
import { WagonRow } from './wagons.mock';
import { EMPTY_FILTER, WagonFilter } from './wagons.service';

export type SortKey = keyof WagonRow | 'status' | 'type' | 'owner' | 'operator';
export type SortDir = 'asc' | 'desc';

export interface SavedNotice {
  id: number;
  wagonNumber: string;
}

/**
 * Состояние списка вагонов, которое должно пережить переход на страницу редактирования и обратно:
 * фильтры, сортировка, страница, а также «последний сохранённый» вагон для подсветки строки.
 * Живёт, пока открыта вкладка (singleton на уровне приложения).
 */
@Injectable({ providedIn: 'root' })
export class WagonsListState {
  readonly draft = signal<WagonFilter>(EMPTY_FILTER);
  readonly applied = signal<WagonFilter>(EMPTY_FILTER);

  readonly sortKey = signal<SortKey>('id');
  readonly sortDir = signal<SortDir>('asc');
  readonly page = signal(1);
  readonly pageSize = signal(50);

  /** Строка, которую только что сохранили — подсвечивается в таблице */
  readonly lastEditedId = signal<number | null>(null);
  /** Сообщение «Изменения сохранены» над таблицей */
  readonly savedNotice = signal<SavedNotice | null>(null);
}
