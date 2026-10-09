import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule, JsonPipe],
  selector: 'app-rednersmf',
  styleUrl: './rednersmf.css',
  templateUrl: './rednersmf.html',
})
export class Rednersmf {
  items = signal<string[]>(['Яблоко', 'Груша']);

  text = '';
  add() {
    const value = this.text.trim();
    if (!value) return;
    this.items.update((arr) => [...arr, value]);
    this.text = '';
  }
}
