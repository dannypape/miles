import { Component, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { SharedService } from '../../shared.service';

@Component({
  selector: 'app-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss']
})
export class CreateUserComponent {
  name: string = '';
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  isAdminCkb: boolean = false;
  isFormValid: boolean = false;
  isAdmin: boolean = false;

  constructor(private http: HttpClient, private cdRef: ChangeDetectorRef, private sharedService: SharedService) {}

  checkFormValid(): void {
    this.isFormValid = !!(this.firstName?.trim() && this.lastName?.trim() && this.email?.trim() && this.password?.trim());
    this.cdRef.detectChanges();  // ✅ Force Angular to update UI
  }

  ngOnInit() {
    // this.sharedService.isAdmin$.subscribe(isAdmin => this.isAdmin = isAdmin);
    this.sharedService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
      this.cdRef.detectChanges();  // ✅ Force detect changes
    });
  }

  // createUser(): void {
  //   const token = localStorage.getItem("token");
  //   if (!token) {
  //     console.error("No token found, cannot create user.");
  //     return;
  //   }

  //   const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

  //   this.http.post(`${environment.apiUrl}/api/auth/create-user`, {
  //     name: `${this.firstName} ${this.lastName}`,
  //     firstName: this.firstName,
  //     lastName: this.lastName,
  //     email: this.email,
  //     password: this.password,
  //     isAdmin: this.isAdminCkb
  //   }, { headers }).subscribe({
  //     next: (response: any) => {
  //       console.log("User created successfully:", response);
  //       alert("User created successfully!");
  //     },
  //     error: (error) => console.error("Error creating user:", error),
  //   });
  // }
  createUser(): void {
    const token = localStorage.getItem("token"); // ✅ Retrieve the token
  
    if (!token) {
      console.error("❌ No token found, cannot create user.");
      return;
    }
  
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`, // ✅ Attach token
      "Content-Type": "application/json" // ✅ Ensure proper content type
    });
  
    const newUserData = {
      name: `${this.firstName} ${this.lastName}`,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
      isAdmin: this.isAdminCkb
    };
  
    this.http.post(`${environment.apiUrl}/api/auth/create-user`, newUserData, { headers }).subscribe({
      next: (response: any) => {
        console.log("✅ User created successfully:", response);
        alert("User created successfully!");
      },
      error: (error) => {
        console.error("❌ Error creating user:", error);
  
        if (error.status === 403) {
          alert("Access denied! Only admins can create users.");
        } else {
          alert("Failed to create user. Please try again.");
        }
      }
    });
  }
}
