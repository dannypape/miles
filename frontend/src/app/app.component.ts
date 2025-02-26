import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedService } from './shared.service';
import { environment } from './environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('menuToggle', [
      state('menu', style({ transform: 'rotate(0deg)' })),  // Normal state
      state('close', style({ transform: 'rotate(180deg)' })), // Rotated for close
      transition('menu <=> close', animate('300ms ease-in-out')) // Smooth animation
    ])
  ]
})
export class AppComponent implements OnInit {
  title = 'Miles Tracker';
  isSidenavOpen = false;
  isAdmin: boolean = false;
  isLoggedIn: boolean = false;
  userName: string = '';
  balanceHistory: any[] = [];
  tokenExpired: boolean = false;

  constructor(private router: Router, private sharedService: SharedService, private http: HttpClient,) {}

  ngOnInit() {
    this.sharedService.isLoggedIn$.subscribe(status => {
      console.log('AppComponent detected login status:', status);
      this.isLoggedIn = status;
    });

    this.sharedService.tokenExpired$.subscribe(status => {
      console.log('🔄 Token expired UI update:', status);
      this.tokenExpired = status;
    });

    // ✅ Subscribe to isAdmin
    this.sharedService.isAdmin$.subscribe(status => {
      console.log("🔄 Updated isAdmin:", status);
      this.isAdmin = status;
    });
    
    const token = localStorage.getItem('token');
    if (token) {
      if (this.isTokenExpired(token)) {
        console.warn("🔴 Token is expired, attempting refresh...");
        this.refreshToken();
      } else {
        console.log("✅ Token is still valid.");
        this.sharedService.checkLoginStatus(); // ✅ Update UI without refresh
      }
    } else {
      this.sharedService.checkLoginStatus(); // ✅ Ensure UI updates correctly
    }
  }

  toggleSidenavAndLog(page: string): void {
    console.log(`✅ Navigating to: ${page}`);
    this.isSidenavOpen = false;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp < currentTime; // ✅ Return true if expired
    } catch (error) {
      console.warn("🔴 Invalid token detected:", error);
      return true; // Treat as expired if decoding fails
    }
  }

  refreshToken() {
    const refreshToken = localStorage.getItem("token");

    if (!refreshToken) {
      console.warn("🔴 No refresh token available. Logging out.");
      this.sharedService.logout();
      return;
    }

    console.log("🔄 Attempting to refresh token with:", refreshToken); // ✅ Log token

    const headers = refreshToken ? new HttpHeaders({ Authorization: `Bearer ${refreshToken}` }) : new HttpHeaders();
    this.http.post(`${environment.apiUrl}/api/auth/refresh`, { headers }).subscribe({
      next: (response: any) => {
        console.log("✅ Token refreshed:", response.token);
        localStorage.setItem("token", response.token);
        this.sharedService.checkLoginStatus(); // ✅ Ensure UI updates
        this.sharedService.updateTokenExpired(false);
      },
      error: () => {
        console.warn("🔴 Token refresh failed. User must log in again.");
        localStorage.removeItem("token"); // Remove invalid token
        this.sharedService.logout(); // Log out user
      }
    });
  }

  reloadPage() {
    location.reload();
  }

  toggleSidenav() {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  logout(): void {
    this.sharedService.logout();
    this.toggleSidenav();
  }
}

