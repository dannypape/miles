import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-venmo-balance-modal',
  templateUrl: './venmo-balance-modal.component.html',
  styleUrls: ['./venmo-balance-modal.component.scss']
})
export class VenmoBalanceModalComponent {
  @Input() venmoBalance!: number; // ✅ Correctly define as Input
  @Output() updateBalance = new EventEmitter<number>(); // ✅ Emit updated balance

  constructor(
    public dialogRef: MatDialogRef<VenmoBalanceModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.venmoBalance = data.balance; // ✅ Assign from injected data
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    this.updateBalance.emit(this.venmoBalance); // ✅ Emit event with updated balance
    this.dialogRef.close(this.venmoBalance);
  }
}
