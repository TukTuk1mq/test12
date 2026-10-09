import { Injectable, signal } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';
import { MOCK_WAGONS, WagonRow } from './wagons.mock';

export interface WagonFilter {
  colorIds: number[];
  nameIds: number[];
  ownerIds: number[];
  operatorIds: number[];
  dateFrom: string; // yyyy-MM-dd, '' — без ограничения
  dateTo: string;
  weightFrom: number | null; // тонны, null — без ограничения
  weightTo: number | null;
  search: string;
}

export const EMPTY_FILTER: WagonFilter = { colorIds: [], nameIds: [], ownerIds: [], operatorIds: [], dateFrom: '', dateTo: '', weightFrom: null, weightTo: null, search: '' };

/**
 * Имитация API. Данные живут в памяти, пока открыта вкладка: правки видны в таблице,
 * фильтрах и выгрузке, после перезагрузки страницы — сбрасываются к мокам.
 * Когда появится бэкенд — заменить тела методов на HttpClient:
 *   search  → GET  /api/wagons?…
 *   getById → GET  /api/wagons/:id
 *   update  → PUT  /api/wagons/:id
 */
@Injectable({ providedIn: 'root' })
export class WagonsService {
  private readonly data = signal<WagonRow[]>(MOCK_WAGONS.map((w) => ({ ...w })));
  /** Все вагоны — для счётчиков в фильтрах */
  readonly all = this.data.asReadonly();

  getById(id: number): Observable<WagonRow | undefined> {
    const row = this.data().find((w) => w.id === id);
    return of(row ? { ...row } : undefined).pipe(delay(300));
  }

  update(row: WagonRow): Observable<WagonRow> {
    return of({ ...row }).pipe(
      delay(500),
      tap((saved) => this.data.update((list) => list.map((w) => (w.id === saved.id ? saved : w)))),
    );
  }

  search(filter: WagonFilter): Observable<WagonRow[]> {
    const colors = new Set(filter.colorIds);
    const names = new Set(filter.nameIds);
    const owners = new Set(filter.ownerIds);
    const operators = new Set(filter.operatorIds);
    const from = filter.dateFrom ? new Date(`${filter.dateFrom}T00:00:00`).getTime() : -Infinity;
    const to = filter.dateTo ? new Date(`${filter.dateTo}T00:00:00`).getTime() + 86_400_000 : Infinity;
    const q = filter.search.trim().toLowerCase();

    const rows = this.data().filter((w) => {
      const time = new Date(w.arrivalDate).getTime();
      return (
        (!colors.size || colors.has(w.colorId)) &&
        (!names.size || names.has(w.nameId)) &&
        (!owners.size || owners.has(w.ownerId)) &&
        (!operators.size || operators.has(w.operatorId)) &&
        time >= from &&
        time < to &&
        (filter.weightFrom === null || w.weight >= filter.weightFrom) &&
        (filter.weightTo === null || w.weight <= filter.weightTo) &&
        (!q ||
          w.wagonNumber.includes(q) ||
          w.containerNumber.toLowerCase().includes(q) ||
          w.station.toLowerCase().includes(q))
      );
    });

    return of(rows).pipe(delay(600)); // задержка сети
  }
}
