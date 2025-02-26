import { Component } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../environments/environment";

@Component({
  selector: "app-forgot-password",
  templateUrl: "./forgot-password.component.html",
  styleUrls: ["./forgot-password.component.scss"]
})
export class ForgotPasswordComponent {
  email: string = "";
  message: string = "";

  constructor(private http: HttpClient) {}

  sendResetCode() {
    this.http.post(`${environment.apiUrl}/api/auth/forgot-password`, { email: this.email })
      .subscribe(
        (response: any) => {
          this.message = response.message;
        },
        (error) => {
          console.error("Error:", error);
          this.message = "Error sending reset code.";
        }
      );
  }
}
