import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StringList } from './string-list';

describe('StringList', () => {
  let component: StringList;
  let fixture: ComponentFixture<StringList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StringList],
    }).compileComponents();

    fixture = TestBed.createComponent(StringList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
