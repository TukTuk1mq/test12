import { Component, DestroyRef, DOCUMENT, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface Company {
  id: number;
  name: string;
  shortName: string;
  fullName: string;
  address: string;
}

export const MOCK_COMPANIES: Company[] = [
  {
    id: 1,
    name: 'Ромашка',
    shortName: 'ООО «Ромашка»',
    fullName: 'Общество с ограниченной ответственностью «Ромашка»',
    address: 'г. Москва, ул. Тверская, д. 12, офис 34',
  },
  {
    id: 2,
    name: 'ТехноСтрой',
    shortName: 'АО «ТехноСтрой»',
    fullName: 'Акционерное общество «ТехноСтрой»',
    address: 'г. Санкт-Петербург, Невский пр-т, д. 88',
  },
  {
    id: 3,
    name: 'Северный ветер',
    shortName: 'ООО «Северный ветер»',
    fullName: 'Общество с ограниченной ответственностью «Северный ветер»',
    address: 'г. Мурманск, ул. Ленина, д. 5',
  },
  {
    id: 4,
    name: 'Альфа Логистик',
    shortName: 'ООО «Альфа Логистик»',
    fullName: 'Общество с ограниченной ответственностью «Альфа Логистик»',
    address: 'г. Казань, ул. Баумана, д. 41',
  },
  {
    id: 5,
    name: 'Иванов И. И.',
    shortName: 'ИП Иванов И. И.',
    fullName: 'Индивидуальный предприниматель Иванов Иван Иванович',
    address: 'г. Екатеринбург, ул. Малышева, д. 73, кв. 15',
  },
];

@Component({
  selector: 'app-companies',
  imports: [FormsModule],
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="mb-0">Компании</h4>
        <span class="text-body-secondary small">Всего: {{ companies().length }}</span>
      </div>

      <div class="list-group shadow-sm">
        @for (company of companies(); track company.id) {
          <button
            type="button"
            class="list-group-item list-group-item-action d-flex align-items-center py-3"
            (click)="open(company)"
          >
            <span
              class="company-icon rounded bg-primary-subtle text-primary d-flex align-items-center justify-content-center me-3"
            >
              <i class="bi bi-building"></i>
            </span>
            <span class="fw-semibold flex-grow-1">{{ company.name }}</span>
            <i class="bi bi-pencil text-body-secondary"></i>
          </button>
        } @empty {
          <div class="list-group-item text-body-secondary">Компаний пока нет</div>
        }
      </div>
    </div>

    <!-- Модальное окно редактирования -->
    @if (draft(); as company) {
      <div
        class="modal fade show d-block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="companyModalTitle"
        (click)="close()"
      >
        <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
          <form class="modal-content" #form="ngForm" (ngSubmit)="save()">
            <div class="modal-header">
              <h5 class="modal-title" id="companyModalTitle">Редактирование компании</h5>
              <button
                type="button"
                class="btn-close"
                aria-label="Закрыть"
                (click)="close()"
              ></button>
            </div>

            <div class="modal-body">
              <div class="mb-3">
                <label for="companyName" class="form-label">Имя компании</label>
                <input
                  id="companyName"
                  name="name"
                  class="form-control"
                  required
                  #nameCtrl="ngModel"
                  [class.is-invalid]="nameCtrl.invalid && nameCtrl.touched"
                  [(ngModel)]="company.name"
                />
                <div class="invalid-feedback">Укажите имя компании</div>
              </div>
              <div class="mb-3">
                <label for="companyShortName" class="form-label">Короткое имя</label>
                <input
                  id="companyShortName"
                  name="shortName"
                  class="form-control"
                  [(ngModel)]="company.shortName"
                />
              </div>
              <div class="mb-3">
                <label for="companyFullName" class="form-label">Полное имя</label>
                <input
                  id="companyFullName"
                  name="fullName"
                  class="form-control"
                  [(ngModel)]="company.fullName"
                />
              </div>
              <div>
                <label for="companyAddress" class="form-label">Адрес</label>
                <textarea
                  id="companyAddress"
                  name="address"
                  rows="2"
                  class="form-control"
                  [(ngModel)]="company.address"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" (click)="close()">
                Отмена
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    }
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background-color: var(--bs-tertiary-bg);
    }

    .company-icon {
      width: 40px;
      height: 40px;
    }
  `,
})
export class Companies {
  private readonly document = inject(DOCUMENT);

  protected readonly companies = signal<Company[]>(MOCK_COMPANIES);
  // Копия редактируемой компании: изменения применяются только по кнопке «Сохранить»
  protected readonly draft = signal<Company | null>(null);

  constructor() {
    // Если уйти со страницы с открытой модалкой, вернуть прокрутку body
    inject(DestroyRef).onDestroy(() => this.document.body.classList.remove('modal-open'));
  }

  protected open(company: Company): void {
    this.draft.set({ ...company });
    this.document.body.classList.add('modal-open');
  }

  @HostListener('document:keydown.escape')
  protected close(): void {
    this.draft.set(null);
    this.document.body.classList.remove('modal-open');
  }

  protected save(): void {
    const edited = this.draft();
    if (!edited) return;
    this.companies.update((list) => list.map((c) => (c.id === edited.id ? edited : c)));
    this.close();
  }
}
