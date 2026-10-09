import { Component, input, signal } from '@angular/core';

export interface Array {
  id: number;
  name: string;
}
export const arr: Array[] = [{ id: 1, name: 'сон' }];

@Component({
  imports: [],
  selector: 'app-quickgame',
  styles: ``,
  template: ` <div>
    <input type="text" placeholder="обед" #mainInput />
    <button (click)="newTask(mainInput.value)">+</button>
    <button (click)="delTask()">-</button>
    @for (item of arr(); track item.id) {
      <div>{{ item.name }}</div>
    }
  </div>`,
})
export class Quickgame {
  protected readonly arr = signal<Array[]>(arr);

  newTask(value: string) {
    arr.push({ id: 3, name: value });
    console.log(arr);
  }
  delTask() {
    arr.unshift();
  }
}
