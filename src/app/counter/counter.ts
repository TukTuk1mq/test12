import { Component, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-counter',
  styleUrl: './counter.css',
  templateUrl: './counter.html',
})
export class Counter {
  count = signal(0);

  increment() {
    this.count.update((c) => c + 1);
  }

  reset() {
    this.count.set(0);
  }
}
