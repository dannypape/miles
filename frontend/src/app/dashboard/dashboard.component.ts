import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { io } from 'socket.io-client';
import { Chart } from 'chart.js/auto';
import { environment } from '../environments/environment';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { VenmoBalanceModalComponent } from '../components/venmo-balance-modal/venmo-balance-modal.component';
import { EditMilesModalComponent } from '../components/edit-miles-modal/edit-miles-modal.component';
import * as moment from 'moment-timezone';
import { SharedService } from '../shared.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  balance: number = 0;
  milesNeeded: number = 0;
  users: any[] = [];
  socket = io(`${environment.apiUrl}`); // ✅ Connect to WebSocket server
  chart: any;
  barChart: any;

  totalMiles: number = 0;
  userMiles: number = 0;
  logs: any[] = [];
  milesToLog: number | null = null;
  userName: string = '';
  venmoBalance: number = 0;
  isLoggedIn: boolean = false;
  isAdmin: boolean = false;
  balanceHistory: any[] = [];
  groupedLogs: any[] = [];
  showModal: boolean = false;
  // isSidenavOpen = false;
  displayedColumns: string[] = ['new-balance', 'updated-at'];

  displayedLogColumns: string[] = ['date', 'miles'];
  previousPositions: Map<string, number> = new Map(); // Add this line
  // Store expansion state separately
  expansionState: Map<string, boolean> = new Map();
  logDate: string = '';
  

  // Predicate function for expanded row
  isExpandedRow = (index: number, row: any) => row.expanded;

  constructor(private sharedService: SharedService, private http: HttpClient, private router: Router, private dialog: MatDialog, private snackBar: MatSnackBar) {}


  ngOnInit() {
    this.setDefaultLogDate();
    this.fetchData();
    this.fetchVenmoBalance();
    this.checkIfAdmin();
    this.fetchBalanceHistory();

    console.log("IS LOGGED IN:", this.isLoggedIn);
    
    this.sharedService.isLoggedIn$.subscribe(status => {
        console.log('Dashboard detected login status:', status);
        this.isLoggedIn = status;
    });

    this.sharedService.userName$.subscribe(name => {
        console.log("🔄 Updated userName:", name);
        this.userName = name || "User"; // ✅ Set default if empty
    });

    this.sharedService.isAdmin$.subscribe(status => {
        console.log("🔄 Updated isAdmin:", status);
        this.isAdmin = status;
    });

    if (!this.socket.hasListeners("logMiles")) {
      this.socket.on("logMiles", (data: any) => {
        console.log("📡 logMiles WebSocket event received!", data);

        if (data && data.user && data.miles) {
            this.showMilesToast(data.user, data.miles);
        } else {
            console.warn("⚠️ Invalid logMiles event received:", data);
        }
    });
    }
    if (!this.socket.hasListeners("updateMiles")) {
      this.socket.on("updateMiles", (data: any) => {
          console.log("🔹 Real-time update received in DashboardComponent:", data);

          // const user = this.groupedLogs.find(u => u.userId === data.runnerId);
          const user = this.groupedLogs.find(u => u.userId === data.userId || u.runnerId === data.runnerId);
          if (user) {
              user.totalMiles = data.totalMiles;
              user.logs = data.logs;
              this.groupedLogs = [...this.groupedLogs];  // ✅ Trigger UI update
          } else {
              // ✅ If new user, re-fetch data
              this.fetchData();
          }

          // ✅ Show toast notification for all users when miles are logged
          if (data.lastSubmission) {
              console.log("📢 Last Submission: ", data.lastSubmission);

              if (data.lastSubmission.runnerId) {
                  console.log("🏃 Miles logged for a runner:", data.lastSubmission.runnerId);
              } else {
                  console.log("👤 Miles logged for a user:", data.lastSubmission.userId);
              }

              this.showMilesToast(data.lastSubmission.user, data.lastSubmission.miles);
          }
      });
    }

    // ✅ Prevent duplicate balance update listeners
    if (!this.socket.hasListeners("venmoBalanceUpdated")) {
        this.socket.on("venmoBalanceUpdated", (data: any) => {
            console.log("🔹 Venmo balance updated in real-time:", data);
            this.venmoBalance = data.balance;
            this.milesNeeded = data.milesNeeded;
            this.updateChart();
        });
    }
  }

  setDefaultLogDate(): void {
    this.logDate = moment().tz("America/New_York").format("YYYY-MM-DD"); // ✅ Correct format
  }
  
  getTopPerformersText(): string {
    const usersWithMiles = this.groupedLogs.filter(user => user.totalMiles > 0).length;
    return usersWithMiles >= 5 ? 'Top 5 Performers' : 'Top Performers';
  }

  

  ngAfterViewInit(): void {
    setTimeout(() => this.initChart(), 500); // Ensure DOM is ready
  }

  toggleRow(user: any): void {
    user.expanded = !user.expanded;
    this.groupedLogs = [...this.groupedLogs]; // ✅ Trigger UI update
  }


updateGroupedLogs(logs: any[]): any[] {
  return logs.map((log: { logs: { date: string }[] }) => ({
      ...log,
      logs: log.logs.map((entry: { date: string }) => ({
          ...entry,
          date: moment(entry.date).tz("America/New_York").format("YYYY-MM-DD")  // ✅ Convert to ET
      }))
  }));
}
private debounceTimer: any;


listenForRealTimeUpdates(): void {
  this.socket.on("updateMiles", (data: any) => {
      console.log("🔹 Real-time update received:", data);

      if (!data || !Array.isArray(data.groupedLogs)) {
          console.error("❌ Invalid updateMiles data received!", data);
          return;
      }

      this.groupedLogs = data.groupedLogs.map((user: any) => ({
          ...user,
          logs: user.logs.map((log: { date: string, miles: number }) => ({
              ...log,
              date: moment(log.date).tz("America/New_York").format("M/D/YYYY")  // ✅ Format real-time updates
              // date: moment.utc(log.date).tz("America/New_York").format("YYYY-MM-DD")
          })),
          movedUp: user.movedUp === true
      }));

      console.log("✅ Updated groupedLogs in UI with formatted dates:", this.groupedLogs);

      setTimeout(() => {
          this.updateChart();
          this.processBarChartData();
      }, 300);
  });
}



/** ✅ Show a toast when Venmo balance updates */
showBalanceToast(balanceDifference: number, additionalMiles: number): void {
  this.snackBar.open(
      `🎉 Venmo balance increased by $${balanceDifference}. ${additionalMiles} more miles added!`,
      "Close",
      {
          duration: 0,
          horizontalPosition: "end",
          verticalPosition: "bottom",
          panelClass: ["balance-toast"]
      }
  );
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



fetchData(): void {
  const token = localStorage.getItem("token");
  const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();

  const expansionStates = new Map(this.groupedLogs.map(user => [user.userId || user.runnerId, user.expanded]));


  this.http.get<{ totalMiles: number; logs: any[]; groupedLogs: any[] }>(
      `${environment.apiUrl}/api/miles`, { headers }
  ).subscribe({
    next: (data) => {
      console.log("✅ Fetched data from API:", data);
      this.totalMiles = data.totalMiles;
      this.logs = data.logs || [];

      this.groupedLogs = data.groupedLogs ? 
          data.groupedLogs.map(user => ({
              ...user,
              logs: user.logs.map((log: { date: string, miles: number }) => ({
                  ...log,
                  date: moment(log.date).tz("America/New_York").format("M/D/YYYY")  // ✅ Format as MM/DD/YYYY
              })),
              expanded: expansionStates.get(user.userId) || false, // ✅ Restore expansion state
              movedUp: user.movedUp === true
          })) : [];

      console.log("✅ Updated groupedLogs with formatted dates:", this.groupedLogs);
      setTimeout(() => {
          this.updateChart();
          this.processBarChartData();
      }, 300);
    },
    error: (error) => {
        console.error("❌ Error fetching miles data:", error);
        if (error.status === 404) {
            console.warn("⚠️ API endpoint not found. Check backend routes.");
        }
    }
  });
}





  /** ✅ Group Logs by User */
  processGroupedLogs(logs: any[]): any[] {
    const grouped = logs.reduce((acc: any, log: any) => {
      const userId = log.userId._id;
      if (!acc[userId]) {
        acc[userId] = {
          userId: userId, // Add userId for tracking
          userName: log.userId.name,
          totalMiles: 0,
          logs: [],
          expanded: false,
          movedUp: false, // Add movedUp flag
        };
      }
      acc[userId].totalMiles += log.miles;
      acc[userId].logs.push(log);
      return acc;
    }, {});
  
    return Object.values(grouped).sort((a: any, b: any) => b.totalMiles - a.totalMiles);
  }


  /** ✅ Submit Miles */

  logMiles(runnerId: string | null = null): void {
    if (!this.isLoggedIn || this.milesToLog === null || this.milesToLog <= 0) return;

    const token = localStorage.getItem("token");
    if (!token) {
        console.error("❌ No token found, cannot submit miles.");
        return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    // ✅ Use the date picker value
    const formattedDate = moment(this.logDate, "YYYY-MM-DD").format("YYYY-MM-DD");

    const milesData: any = {
        miles: Math.max(0, this.milesToLog),
        date: formattedDate  // ✅ Send correct date to backend
    };

    if (runnerId) {
        milesData.runnerId = runnerId;  // ✅ Set the runnerId if logging for a runner
    } else {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            console.error("❌ No userId found in localStorage.");
            return;
        }
        milesData.userId = userId;
    }

    console.log("📤 Sending logMiles event:", milesData);
    this.socket.emit("logMiles", milesData);

    const user = this.groupedLogs.find(u => u.userId === milesData.userId || u.runnerId === milesData.runnerId);
    if (user) {
        user.totalMiles += milesData.miles;
        user.logs.unshift({ date: formattedDate, miles: milesData.miles });
        this.groupedLogs = [...this.groupedLogs];  // ✅ Trigger UI update
    }

    this.milesToLog = null; // Reset input
    this.setDefaultLogDate();
  }

  /** ✅ Initialize Doughnut Chart */
  initChart(): void {
    const ctx = document.getElementById('progressChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: this.getChartData(),
      options: { responsive: true, maintainAspectRatio: false }
    });
  }



  



  /** ✅ Update Chart Data */
  updateChart(): void {
    if (this.chart) {
      this.chart.data = this.getChartData();
      this.chart.update();
    } else {
      this.initChart();
    }
  }

  /** ✅ Process Bar Chart Data (Last 10 Days) */
processBarChartData(): void {
  if (!this.logs || this.logs.length === 0) {
    console.warn("No logs available for chart data!");
    return;
  }

  // ✅ Generate an array of last 10 days (formatted as YYYY-MM-DD)
  const last10Days = Array.from({ length: 10 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  console.log("Logs data:", this.logs);

  // ✅ Aggregate miles per day for the last 10 days
  const milesPerDay = last10Days.map(date => ({
    date,
    miles: this.logs
      .filter(log => log.date.startsWith(date)) // Match logs with the date
      .reduce((sum, log) => sum + log.miles, 0)
  }));

  console.log("Processed miles per day data:", milesPerDay);

  // ✅ Ensure the chart exists before updating
  if (!this.barChart) {
    this.initBarChart(milesPerDay);
  } else {
    this.barChart.data.labels = milesPerDay.map(d => d.date);
    this.barChart.data.datasets[0].data = milesPerDay.map(d => d.miles);
    this.barChart.update();
  }
}



initBarChart(milesPerDay: { date: string, miles: number }[]): void {
  const ctx = document.getElementById('barChart') as HTMLCanvasElement;
  if (!ctx) return;

  if (this.barChart) {
    this.barChart.destroy();
  }

  console.log("Initializing bar chart with:", milesPerDay);

  // Create gradient effect
  const chartContext = ctx.getContext("2d");
  if (!chartContext) return;

  const gradient = chartContext.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "rgba(98, 0, 234, 0.9)"); // Deep Purple
  gradient.addColorStop(1, "rgba(3, 218, 198, 0.8)"); // Teal

  this.barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: milesPerDay.map(entry => entry.date),
      datasets: [{
        label: 'Miles Ran Per Day',
        data: milesPerDay.map(entry => entry.miles),
        backgroundColor: gradient, // Apply gradient
        borderRadius: 10, // Rounded bars
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Hide legend for a cleaner look
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 12 },
          cornerRadius: 6,
        },
      },
      scales: {
        x: {
          grid: {
            display: false, // Remove vertical grid lines
          },
          ticks: {
            color: '#666',
            font: { size: 14, family: 'Roboto, Arial, sans-serif' },
          },
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.1)', // Soft grid lines
          },
          ticks: {
            color: '#666',
            font: { size: 14 },
          },
          min: 0, // ✅ Correct way to ensure Y-axis starts at 0
        },
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
    },
  });
}

  /** ✅ Get Data for Doughnut Chart */

  getChartData(): any {
    const milesRemaining = Math.max(0, this.milesNeeded - this.totalMiles);
    return {
      labels: ['Miles Ran', 'Miles Remaining'],
      datasets: [{
        data: [this.totalMiles, milesRemaining],
        backgroundColor: [
          'rgba(98, 0, 234, 0.85)',  // Material Deep Purple
          'rgba(158, 158, 158, 0.6)' // Material Grey
        ],
        borderColor: [
          'rgba(98, 0, 234, 1)', 
          'rgba(158, 158, 158, 1)'
        ],
        borderWidth: 2,
        hoverOffset: 10, // Pops out on hover
      }]
    };
}






  

  /** ✅ Toggle User Details */
  toggleDetails(user: any): void {
    user.expanded = !user.expanded;
  }

  /** ✅ Handle Logout */
  

  /** ✅ Open Venmo Balance Modal */
  openModal(): void {
    const dialogRef = this.dialog.open(VenmoBalanceModalComponent, {
      width: '400px',
      data: { balance: this.venmoBalance },
      disableClose: true,  // Prevents accidental closing
      hasBackdrop: true,  // Adds a dark overlay
      // position: { top: '50%', left: '50%' }, // ✅ Forces modal to center
      // position: { top: '50vh', left: '50vw' }, // Center the modal
    });

    dialogRef.afterClosed().subscribe((result: number | undefined) => {
      if (result !== undefined && result !== this.venmoBalance) {
        this.updateVenmoBalance(result);
      }
    });
  }

  /** ✅ Open Edit Miles Modal */
  openEditMilesModal(entry: any): void {
    console.log("🛠 Opening Edit Miles Modal with entry:", entry); // ✅ Log entry

    const dialogRef = this.dialog.open(EditMilesModalComponent, {
      width: '400px',
      data: { entryId: entry._id, miles: entry.miles, date: entry.date },
      disableClose: true,  // Prevents accidental closing
      hasBackdrop: true,  // Adds a dark overlay
      // position: { top: '50%', left: '50%' }, // ✅ Forces modal to center
      // position: { top: '50vh', left: '50vw' }, // Center the modal
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log("🛠 Modal closed, result:", result); // ✅ Log result
      if (result !== undefined && result !== entry.miles && result !== entry.date) {
        this.updateUserMiles(entry._id, result.miles, result.date);
      }
    });
  }

  /** ✅ Update User Miles */
  updateUserMiles(entryId: string, newMiles: number, newDate: string) {
    if (!this.isAdmin) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const formattedDate = moment(newDate, ["YYYY-MM-DD", "M/D/YYYY"]).format("YYYY-MM-DD"); // ✅ Standard format

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    // const requestBody = ;

    console.log("📤 Sending update request:", { entryId, miles: newMiles, date: formattedDate }); // ✅ Log request

    this.http.put(`${environment.apiUrl}/api/miles/update`, { entryId, miles: newMiles, date: formattedDate }, { headers })
      .subscribe({
        next: (response: any) => {
          console.log("Miles updated successfully:", response);
          this.fetchData();
          setTimeout(() => this.updateChart(), 300);
        },
        error: (error) => console.error("Error updating miles:", error)
      });
  }

  fetchVenmoBalance(): void {
    this.http.get<{ balance: number; milesNeeded: number }>(`${environment.apiUrl}/api/venmo/balance`)
        .subscribe({
            next: (data) => {
                console.log("🔹 Fetched Venmo Balance:", data);
                this.venmoBalance = data.balance; // ✅ Update UI with latest balance
                this.milesNeeded = data.milesNeeded; // ✅ Update miles needed dynamically
                this.updateChart(); // ✅ Ensure chart updates with new data
            },
            error: (error) => console.error("❌ Error fetching Venmo balance:", error)
        });
}

  

  checkIfAdmin(): void {
    const token = localStorage.getItem("token");
    if (!token) return;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get(`${environment.apiUrl}/api/auth/me`, { headers }).subscribe({
        next: (data: any) => {
            this.isAdmin = data.isAdmin || false;
            if (this.isAdmin) {
                this.fetchBalanceHistory();
            }
        },
        error: (error) => {
            console.error("❌ Error checking admin status:", error);
            if (error.status === 404) {
                console.warn("⚠️ /api/user/me endpoint not found. Ensure backend has this route.");
            }
        }
    });
  }
  
  fetchBalanceHistory(): void {
    const token = localStorage.getItem("token");
    if (!token || !this.isAdmin) return;
  
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  
    this.http.get<any[]>(`${environment.apiUrl}/api/venmo/balance/history`, { headers })
      .subscribe({
        next: (data) => {
          this.balanceHistory = data.map(record => ({
            ...record,
            updatedBy: record.updatedBy || { name: 'Unknown', email: 'N/A' }, // ✅ Default if missing
            updatedAt: moment(record.updatedAt).tz("America/New_York").format("YYYY-MM-DD hh:mm A") // ✅ ET format
          }));
        },
        error: (error) => console.error("Error fetching balance history:", error)
      });
  }
  
  updateVenmoBalance(newBalance: number) {
    if (!this.isAdmin) return; // Only allow admins

    const token = localStorage.getItem("token");
    if (!token) return;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.put(`${environment.apiUrl}/api/venmo/balance`, { balance: newBalance }, { headers })
      .subscribe({
        next: (response: any) => {
          console.log("✅ Venmo balance updated successfully:", response);

          // ✅ Immediately update the admin's UI with the latest balance
          this.venmoBalance = response.balance;
          this.milesNeeded = response.milesNeeded;

          // ✅ Refresh balance history (so admin sees their own update)
          this.fetchBalanceHistory();

          // ✅ Show the toast message
          this.showBalanceToast(response.balanceDifference, response.additionalMiles);

          // ✅ Close the modal
          this.closeModal();
        },
        error: (error) => console.error("❌ Error updating Venmo balance:", error)
      });
}


  closeModal() {
    this.showModal = false;
  }

  

  





}


