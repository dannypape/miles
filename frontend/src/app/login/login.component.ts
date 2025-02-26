// import { Component } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Router } from '@angular/router';
// import { SharedService } from '../shared.service';
// import { environment } from '../environments/environment';

// @Component({
//   selector: 'app-login',
//   templateUrl: './login.component.html',
//   styleUrls: ['./login.component.scss']
// })
// export class LoginComponent {
//   email: string = '';
//   password: string = '';
//   user = { email: '', password: '' }; // ✅ Define user object
//   errorMessage: string = '';
//   constructor(private http: HttpClient, private router: Router, private sharedService: SharedService) {}

//   loginUser() {
//     const loginData = { email: this.email, password: this.password };
  
//     this.http.post(`${environment.apiUrl}/api/auth/login`, loginData).subscribe({
//       next: (response: any) => {
//         console.log("✅ Login Response:", response); // ✅ Log the response

//         const isAdmin = response.user?.isAdmin ?? false;

//         localStorage.setItem("token", response.token);
//         localStorage.setItem("userId", response.userId);
//         localStorage.setItem("userName", response.name);
//         localStorage.setItem("isAdmin", response.isAdmin.toString());

//         // ✅ Update SharedService
//         this.sharedService.updateUserName(response.name);
//         this.sharedService.updateIsAdmin(response.isAdmin);
//         this.sharedService.checkLoginStatus(); // ✅ Update isLoggedIn dynamically

//         this.router.navigate(["/dashboard"]);
//       },
//       error: (error) => {
//         console.error("Login failed:", error);
  
//         if (error.status === 403 && error.error.forcePasswordReset) {
//           console.warn("🔹 User must reset password first!");
//           this.router.navigate(["/reset-password"]); // ✅ Redirect to reset page
//         }
//       }
//     });
//   }

  
// }

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedService } from '../shared.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  user = { email: '', password: '' }; // ✅ Define user object
  errorMessage: string = '';
  alertMessage = '';

  constructor(private http: HttpClient, private router: Router, private sharedService: SharedService, private route: ActivatedRoute) {}


ngOnInit() {
  this.route.queryParams.subscribe(params => {
    if (params['message']) {
      this.alertMessage = params['message'];  // ✅ Show message on login page
    }
  });
}

  // loginUser() {
  //   const loginData = { email: this.email, password: this.password };
  
  //   this.http.post(`${environment.apiUrl}/api/auth/login`, loginData).subscribe({
  //     next: (response: any) => {
  //       console.log("✅ Login Response:", response);
  
  //       // ✅ STOP execution if password reset is required
  //       if (response.forcePasswordReset) {
  //         console.warn("🔹 Password reset required! Redirecting to reset-password page.");
          
  //         // ✅ Store email for autofill
  //         localStorage.setItem("resetEmail", this.email);
  
  //         // ✅ Redirect to reset password page
  //         // this.router.navigate(["/reset-password"]);
  //         this.router.navigate(["/reset-password"]).then(success => {
  //           if (success) {
  //             console.log("✅ Navigation to reset-password successful!");
  //           } else {
  //             console.error("❌ Navigation to reset-password failed!");
  //           }
  //         });


  //         return; // ❗ STOP further execution
  //       } else {
  
  //       // ✅ Store authentication data
  //         localStorage.setItem("token", response.token);
  //         localStorage.setItem("userId", response.userId);
  //         localStorage.setItem("userName", response.name);
  //         localStorage.setItem("isAdmin", response.isAdmin.toString());
    
  //         // ✅ Update SharedService
  //         this.sharedService.updateUserName(response.name);
  //         this.sharedService.updateIsAdmin(response.isAdmin);
  //         this.sharedService.checkLoginStatus(); 
    
  //         // ✅ Redirect only if no password reset is needed
  //         this.router.navigate(["/dashboard"]);
  //       }
  //     },
  //     error: (error) => {
  //       console.error('❌ Login failed:', error);
  //       if (error.status === 403) {
  //         alert('Access forbidden: Please check your credentials or contact support.');
  //       }
  //     }
  //   });
  // }
  // loginUser() {
  //   const loginData = { email: this.email, password: this.password };
  
  //   this.http.post(`${environment.apiUrl}/api/auth/login`, loginData).subscribe({
  //     next: (response: any) => {
  //       console.log("✅ Login Response:", response);
  
  //       // ✅ STOP execution if password reset is required
  //       if (response.forcePasswordReset) {
  //         console.warn("🔹 Password reset required! Redirecting to reset-password page.");
  
  //         // ✅ Store email for autofill
  //         localStorage.setItem("resetEmail", this.email);
  
  //         // ✅ Redirect to reset password page
  //         this.router.navigate(["/reset-password"]).then(success => {
  //           if (success) {
  //             console.log("✅ Navigation to reset-password successful!");
  //           } else {
  //             console.error("❌ Navigation to reset-password failed!");
  //           }
  //         });
  
  //         return; // ❗ STOP further execution
  //       } else {
  //         // ✅ Store authentication data
  //         localStorage.setItem("token", response.token);
  //         localStorage.setItem("userId", response.userId);
  //         localStorage.setItem("userName", response.name);
  //         localStorage.setItem("isAdmin", response.isAdmin.toString());
  
  //         // ✅ Update SharedService
  //         this.sharedService.updateUserName(response.name);
  //         this.sharedService.updateIsAdmin(response.isAdmin);
  //         this.sharedService.checkLoginStatus();
  
  //         // ✅ Redirect only if no password reset is needed
  //         this.router.navigate(["/dashboard"]);
  //       }
  //     },
  //     error: (error) => {
  //       console.error('❌ Login failed:', error);
  //       if (error.status === 403) {
  //         alert('Access forbidden: Please check your credentials or contact support.');
  //       }
  //     }
  //   });
  // }
  loginUser() {
    const loginData = { email: this.email, password: this.password };
  
    this.http.post(`${environment.apiUrl}/api/auth/login`, loginData).subscribe({
      next: (response: any) => {
        console.log("✅ Login Response:", response);
        // ✅ Ensure userId is stored in localStorage
        if (response.userId) {
          localStorage.setItem('userId', response.userId);
        } else {
          console.error("❌ Missing userId in response!");
        }
  
        localStorage.setItem('token', response.token);
        localStorage.setItem('userName', response.name);
        localStorage.setItem('isAdmin', response.isAdmin ? 'true' : 'false'); // ✅ Store admin flag
        // this.sharedService.checkLoginStatus(); 
  
        // ✅ Update SharedService
        this.sharedService.updateUserName(response.name);
        this.sharedService.updateIsAdmin(response.isAdmin);
        this.sharedService.checkLoginStatus();
  
        if (response.forcePasswordChange) {
          this.router.navigate(['/reset-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.errorMessage = "Invalid email or password.";
      }
    });
  }
}