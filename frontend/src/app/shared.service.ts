import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private tokenExpiredSource = new BehaviorSubject<boolean>(false);
  tokenExpired$ = this.tokenExpiredSource.asObservable();

  private isAdminSource = new BehaviorSubject<boolean>(
    localStorage.getItem('isAdmin') === 'true'
  );
  isAdmin$ = this.isAdminSource.asObservable();

  private isLoggedInSource = new BehaviorSubject<boolean>(this.tokenIsValid()); // ✅ Checks if token is valid
  isLoggedIn$ = this.isLoggedInSource.asObservable();

  private userNameSource = new BehaviorSubject<string>(
    localStorage.getItem('userName') || ''
  );
  userName$ = this.userNameSource.asObservable();

  private balanceHistorySource = new BehaviorSubject<any[]>([]);
  balanceHistory$ = this.balanceHistorySource.asObservable();

  constructor() {}

  private tokenIsValid(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp > currentTime; // ✅ Token is still valid
    } catch (error) {
      console.warn("🔴 Invalid token detected:", error);
      return false; // Invalid token
    }
  }

  updateTokenExpired(status: boolean) {
    console.log('🔄 Token expired state updated:', status);
    this.tokenExpiredSource.next(status);
  }

  // updateIsAdmin(status: boolean) {
  //   console.log("🔄 Updating isAdmin in SharedService:", status); // ✅ Debugging log
  //   localStorage.setItem('isAdmin', status.toString());
  //   this.isAdminSource.next(status);
  // }
  updateIsAdmin(status: boolean) {
    this.isAdminSource.next(status);
  }

  updateUserName(name: string) {
    localStorage.setItem('userName', name);
    this.userNameSource.next(name);
  }

  updateBalanceHistory(history: any[]) {
    this.balanceHistorySource.next(history);
  }

  // checkLoginStatus() {
  //   const hasToken = !!localStorage.getItem('token');
  //   console.log('🔄 Checking login status:', hasToken);
  //   this.isLoggedInSource.next(hasToken);
  // }
  
  
  checkLoginStatus() {
    const token = localStorage.getItem('token');
    this.isLoggedInSource.next(!!token);
  }

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userId");

    this.isLoggedInSource.next(false);
    this.isAdminSource.next(false);
    this.userNameSource.next('');

  }
}