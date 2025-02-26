import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as moment from 'moment-timezone';
import { SharedService } from '../../shared.service';
import { io } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthInterceptorService } from '../../auth-interceptor.service'; // Ensure correct path
import { MatSnackBar } from '@angular/material/snack-bar';

interface Runner {
  _id: string;
  firstName: string;
  lastName: string;
  totalMiles: number;
  logs: { date: string; miles: number }[];
  expanded?: boolean;  // ✅ Allow expansion state tracking
  milesToLog?: number; // ✅ Input field for new mile submissions
  logDate?: string;    // ✅ New field to track selected date
}

@Component({
  selector: 'app-manage-runners',
  templateUrl: './manage-runners.component.html',
  styleUrls: ['./manage-runners.component.scss']
})
export class ManageRunnersComponent implements OnInit {
  runners: Runner[] = [];
  newRunner = { firstName: '', lastName: '' };
  isAdmin: boolean = false;
  isFormValid: boolean = false;
  socket = io(`${environment.apiUrl}`); 

  constructor(private http: HttpClient, private sharedService: SharedService, private cdRef: ChangeDetectorRef, private authInterceptorService: AuthInterceptorService, private snackBar: MatSnackBar ) {}

  checkFormValid(): void {
    this.isFormValid = !!(this.newRunner.firstName?.trim() && this.newRunner.lastName?.trim());
    this.cdRef.detectChanges();  // ✅ Force Angular to update UI
  }

  ngOnInit() {
    this.fetchRunners();
    // this.sharedService.isAdmin$.subscribe(isAdmin => this.isAdmin = isAdmin);
    this.sharedService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
      this.cdRef.detectChanges();  // ✅ Force detect changes
    });
    this.socket.off("updateMiles");

    this.socket.on("updateMiles", (data: any) => {
        console.log("🔹 Real-time update received in ManageRunnersComponent:", data);

        const runner = this.runners.find(r => r._id === data.runnerId);
        
        const runnerIndex = this.runners.findIndex(r => r._id === data.runnerId);
        if (runnerIndex !== -1) {
            console.log("🔄 Updating existing runner in UI:", runner);




            // ✅ Update total miles
            this.runners[runnerIndex].totalMiles = data.totalMiles;

            // ✅ Ensure logs update correctly
            this.runners[runnerIndex].logs = data.logs;  // Replace logs with updated backend logs

            // runner.totalMiles = data.totalMiles;  // ✅ Use backend's updated total miles
            // runner.logs.unshift({ date: data.date, miles: data.miles });

            this.runners = [...this.runners];  // ✅ Trigger UI update
            this.cdRef.detectChanges();

            // ✅ Show toast notification for all users when miles are logged
          // if (data.lastSubmission) {
          //   console.log("LAST SUBMISSION: ", data.lastSubmission)
          //   this.showMilesToast(data.lastSubmission.user, data.lastSubmission.miles);
          // }
        } else {
            console.warn("⚠️ Runner not found in local state, fetching fresh data...");
            this.fetchRunners();
        }
    });
  }
  fetchRunners(): void {
    this.http.get<Runner[]>(`${environment.apiUrl}/api/runners`)
      .subscribe({
        next: (data) => {
          this.runners = data.map(runner => ({
            ...runner,
            logs: runner.logs.map(log => ({
              ...log,
              date: moment(log.date).format("M/D/YYYY")  // ✅ Format date
            })),
            expanded: false,
            milesToLog: undefined,
            logDate: moment().format("YYYY-MM-DD")  // ✅ Default to today
          }));
        },
        error: (err) => console.error("❌ Error fetching runners:", err)
      });
  }

  // ✅ Show a toast notification
showMilesToast(name: string, miles: number): void {
  this.snackBar.open(`${name} logged ${miles} miles! 🏃`, "Close", {
    duration: 5000,
    horizontalPosition: "end",
    verticalPosition: "bottom",
    panelClass: ["miles-toast"]
  });
}
  /** ✅ Submit miles for a runner */
  submitMiles(runner: Runner): void {
    const miles = runner.milesToLog ?? 0;
    if (miles <= 0) return;

    const selectedDate = runner.logDate 
        ? moment(runner.logDate, "YYYY-MM-DD").format("M/D/YYYY")  // ✅ Format to match backend
        : moment().format("M/D/YYYY");

      console.log("📤 Submitting miles for runner:", {
        runnerId: runner._id,
        miles,
        date: selectedDate
      });

    this.http.post(`${environment.apiUrl}/api/runners/${runner._id}/log`, {
        miles,
        date: selectedDate
    }).subscribe({
        next: (response: any) => {
            console.log("✅ Miles logged:", response);

            // ✅ Ensure log is displayed immediately in UI
            // runner.totalMiles += miles;
            // runner.logs.unshift({ date: selectedDate, miles });

            this.runners = [...this.runners];  // ✅ Trigger UI update
            this.cdRef.detectChanges();

            runner.milesToLog = undefined; // ✅ Reset input field
        },
        error: (err) => console.error("❌ Error logging miles:", err)
    });
  }


  addRunner() {
    if (!this.isFormValid) return; // Double-check

    const token = localStorage.getItem('token'); // ✅ Retrieve stored token
    if (!token) {
      console.error("❌ No auth token found. Redirecting to login.");
      this.sharedService.checkLoginStatus();
      return;
    }

    console.log("🔹 Sending request with Authorization Header:", `Bearer ${token}`);


    this.http.post(`${environment.apiUrl}/api/runners`, this.newRunner, {
      headers: { Authorization: `Bearer ${token}` } // ✅ Attach token
    }).subscribe({
      next: () => {
        this.newRunner = { firstName: '', lastName: '' }; // Reset form
        this.fetchRunners();
      },
      error: (err) => {
        console.error("❌ Error adding runner:", err);
        if (err.status === 401) {
          console.warn("🔄 Unauthorized! Attempting to refresh token...");
          
          (this.authInterceptorService.refreshToken() as Observable<string>).subscribe(
            (newToken: string) => { 
              if (newToken) {
                console.log("✅ Token refreshed. Retrying request...");
                this.addRunner(); // Retry request after refresh
              } else {
                console.error("⛔ Token refresh failed. Logging out.");
                alert("Session expired. Please log in again.");
                this.sharedService.checkLoginStatus();
              }
            },
            (refreshErr: any) => { 
              console.error("⛔ Refresh failed:", refreshErr);
              alert("Session expired. Please log in again.");
              this.sharedService.checkLoginStatus();
            }
          );
        }
      }
    });
    
  }

  logMiles(runner: any) {
    if (runner.milesToLog > 0) {
      this.http.put(`${environment.apiUrl}/api/runners/${runner._id}`, { miles: runner.milesToLog })
        .subscribe(() => {
          runner.milesToLog = 0; // Reset input
          this.fetchRunners();
        });
    }
  }

  deleteRunner(runnerId: string) {
    this.http.delete(`${environment.apiUrl}/api/runners/${runnerId}`).subscribe(() => {
      this.fetchRunners();
    });
  }

  toggleRunner(runner: any) {
    runner.expanded = !runner.expanded;
  }
}