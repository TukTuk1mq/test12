import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Rednersmf } from './rednersmf';

describe('Rednersmf', () => {
  let component: Rednersmf;
  let fixture: ComponentFixture<Rednersmf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rednersmf],
    }).compileComponents();

    fixture = TestBed.createComponent(Rednersmf);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
