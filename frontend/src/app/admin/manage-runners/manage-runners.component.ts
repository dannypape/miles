import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as moment from 'moment-timezone';
import { SharedService } from '../../shared.service';
import { io } from 'socket.io-client';

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

  constructor(private http: HttpClient, private sharedService: SharedService, private cdRef: ChangeDetectorRef) {}

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
        if (runner) {
            console.log("🔄 Updating existing runner in UI:", runner);

            // ✅ Prevent duplicate logs
            const isAlreadyLogged = runner.logs.some(log => log.date === data.date && log.miles === data.miles);
            if (isAlreadyLogged) {
                console.warn("⚠️ Duplicate log detected, skipping update.");
                return;
            }

            runner.totalMiles = data.totalMiles;  // ✅ Use backend's updated total miles
            runner.logs.unshift({ date: data.date, miles: data.miles });

            this.runners = [...this.runners];  // ✅ Trigger UI update
            this.cdRef.detectChanges();
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

  /** ✅ Submit miles for a runner */
  submitMiles(runner: Runner): void {
    const miles = runner.milesToLog ?? 0;
    if (miles <= 0) return;

    const selectedDate = runner.logDate 
        ? moment(runner.logDate, "YYYY-MM-DD").format("M/D/YYYY")  // ✅ Format to match backend
        : moment().format("M/D/YYYY");

    this.http.post(`${environment.apiUrl}/api/runners/${runner._id}/log`, {
        miles,
        date: selectedDate
    }).subscribe({
        next: (response: any) => {
            console.log("✅ Miles logged:", response);

            // ✅ Ensure log is displayed immediately in UI
            runner.totalMiles += miles;
            runner.logs.unshift({ date: selectedDate, miles });

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
          alert("Session expired. Please log in again.");
          this.sharedService.checkLoginStatus(); // ✅ Redirect to login
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