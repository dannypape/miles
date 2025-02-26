import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  // user = { name: '', email: '', password: '' }; // ✅ Define user object
  name: string = '';
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  verificationCode: string = ''; // ✅ Define verification code field
  showVerification: boolean = false; // ✅ Show verification input after registration

  constructor(private http: HttpClient, private router: Router) {}

  registerUser(): void {
    this.http.post(`${environment.apiUrl}/api/auth/register`, {
      name: `${this.firstName} ${this.lastName}`,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password
    })
        .subscribe({
          next: (response: any) => {
            if (response.redirectToLogin) {
                console.warn("⚠️ Account already exists. Redirecting to login...");
                this.router.navigate(['/login'], { 
                  queryParams: { message: response.message }
                });
            } else {
                console.log("User registered:", response);
                this.showVerification = true;  // ✅ Show verification input
            }
          },
          error: (error) => {
              console.error("Registration failed:", error);
          }
          // next: (response: any) => {
          //   console.log("User registered:", response);
          //   this.showVerification = true;
          // },
          // error: (error) => {
          //   console.error("Registration failed:", error);
      
          //   if (error.status === 400 && error.error?.error === "User already exists") {
          //     this.router.navigate(['/login'], { 
          //       queryParams: { message: "Account already exists. Please log in." } 
          //     });
          //   }
          // }
        });
}


verifyCode(): void {
  this.http.post(`${environment.apiUrl}/api/auth/verify`, {
      email: this.email,
      verificationCode: this.verificationCode
  }).subscribe({
      next: (response: any) => {
          console.log("Verification successful:", response);
          alert("Account verified! You can now log in.");
          this.router.navigate(['/login']); // ✅ Redirect to login
      },
      error: (error) => {
          console.error("Verification failed:", error);
      }
  });
}


  verifyEmail() {
    this.http.post(`${environment.apiUrl}/api/auth/verify-email`, {
        email: this.email,
        code: this.verificationCode
      }).subscribe({
        next: () => {
          this.router.navigate(["/login"]); // ✅ Redirect after success
        },
        error: err => console.error("Verification failed:", err)
      });
  }
}
