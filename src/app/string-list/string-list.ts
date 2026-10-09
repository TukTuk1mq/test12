import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-string-list',
  styles: `
    .dark {
      background-color: black;
      color: white;
    }
    .white {
      background-color: white;
      color: black;
    }
  `,
  template: `
    <div>
      <input [placeholder]="" [(ngModel)]="name" />
      <p>Привет, {{ name() }}!</p>
      <button (click)="name.set('')">Очистить</button>
    </div>
  `,
})
export class StringList {
  name = signal('');
}
