import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMilesModalComponent } from './edit-miles-modal.component';

describe('EditMilesModalComponent', () => {
  let component: EditMilesModalComponent;
  let fixture: ComponentFixture<EditMilesModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditMilesModalComponent]
    });
    fixture = TestBed.createComponent(EditMilesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
