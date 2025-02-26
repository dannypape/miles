import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageRunnersComponent } from './manage-runners.component';

describe('ManageRunnersComponent', () => {
  let component: ManageRunnersComponent;
  let fixture: ComponentFixture<ManageRunnersComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ManageRunnersComponent]
    });
    fixture = TestBed.createComponent(ManageRunnersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
