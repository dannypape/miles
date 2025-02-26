import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-manage-fundraiser',
  templateUrl: './manage-fundraiser.component.html',
  styleUrls: ['./manage-fundraiser.component.scss']
})
export class ManageFundraiserComponent {
  conversionRate: number = 5;  // Default value

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  /** ✅ Delete all users except the admin */
  /** ✅ Delete all users except the admin */
  deleteUsers() {
    if (!confirm("Are you sure you want to delete all users (except yourself)?")) return;

    const token = localStorage.getItem("token");
    this.http.delete(`${environment.apiUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => this.showSnackbar("All users (except admin) deleted"),
      error: () => this.showSnackbar("Failed to delete users", true)
    });
  }

  /** ✅ Delete all runners */
  deleteRunners() {
    if (!confirm("Are you sure you want to delete all runners?")) return;

    const token = localStorage.getItem("token");
    this.http.delete(`${environment.apiUrl}/api/admin/runners`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => this.showSnackbar("All runners deleted"),
      error: () => this.showSnackbar("Failed to delete runners", true)
    });
  }

  /** ✅ Update the conversion rate */
  updateConversionRate() {
    this.http.put(`${environment.apiUrl}/api/admin/miles-conversion`, { conversionRate: this.conversionRate })
      .subscribe({
        next: () => this.showSnackbar("Miles conversion rate updated"),
        error: () => this.showSnackbar("Failed to update conversion rate", true)
      });
  }

  /** ✅ Show snackbar messages */
  private showSnackbar(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: isError ? 'error-snackbar' : 'success-snackbar'
    });
  }
}