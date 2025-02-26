import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VenmoBalanceModalComponent } from './venmo-balance-modal.component';

describe('VenmoBalanceModalComponent', () => {
  let component: VenmoBalanceModalComponent;
  let fixture: ComponentFixture<VenmoBalanceModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VenmoBalanceModalComponent]
    });
    fixture = TestBed.createComponent(VenmoBalanceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
