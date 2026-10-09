import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Quickgame } from './quickgame';

describe('Quickgame', () => {
  let component: Quickgame;
  let fixture: ComponentFixture<Quickgame>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Quickgame],
    }).compileComponents();

    fixture = TestBed.createComponent(Quickgame);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
