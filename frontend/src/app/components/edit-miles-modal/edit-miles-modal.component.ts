import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-edit-miles-modal',
  templateUrl: './edit-miles-modal.component.html',
  styleUrls: ['./edit-miles-modal.component.scss']
})
export class EditMilesModalComponent {
  milesEntry: any; // ✅ Define milesEntry

  constructor(
    public dialogRef: MatDialogRef<EditMilesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { miles: number, date: string }
  ) {
    console.log("DIALOG ENTRY:", data)
    this.milesEntry = data; // ✅ Initialize milesEntry with the passed data
  }

  confirmSave() {
    console.log("SAVE DIALOG ENTRY:", this.milesEntry)
    this.dialogRef.close(this.milesEntry); // ✅ Close modal and return new miles value
  }

  cancel() {
    this.dialogRef.close(); // Close modal without saving
  }
}
