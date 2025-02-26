import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  step = 1; // Controls the form step
  email = '';
  resetCode = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    // ✅ Auto-fill email if redirected from login
    this.email = localStorage.getItem("resetEmail") || '';
  }

  requestResetCode() {
    this.http.post(`${environment.apiUrl}/api/auth/reset-password-request`, { email: this.email })
      .subscribe({
        next: (res: any) => {
          this.successMessage = res.message;
          this.step = 2; // Move to the OTP verification step
        },
        error: (err) => {
          this.errorMessage = err.error.message || 'Error sending reset code.';
        }
      });
  }

  resetPassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = "Passwords do not match.";
      return;
    }

    this.http.post(`${environment.apiUrl}/api/auth/reset-password`, { 
        email: this.email, 
        resetCode: this.resetCode, 
        newPassword: this.newPassword 
      })
      .subscribe({
        next: (res: any) => {
          this.successMessage = res.message;

          // ✅ Clear stored reset email after success
          localStorage.removeItem("resetEmail");

          setTimeout(() => {
            this.router.navigate(['/login']); // Redirect after success
          }, 2000);
        },
        error: (err) => {
          this.errorMessage = err.error.message || 'Error resetting password.';
        }
      });
  }
}