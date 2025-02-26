import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SharedService } from '../shared.service';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private sharedService: SharedService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.sharedService.isAdmin$.pipe(
      take(1),
      map(isAdmin => {
        console.log("🔍 Checking AdminGuard: isAdmin =", isAdmin);
  
        // ✅ Allow users to access "/reset-password" without being an admin
        if (!isAdmin && this.router.url !== '/reset-password') {
          console.warn("⛔ Access Denied: Redirecting to dashboard...");
          this.router.navigate(['/dashboard']);
          return false;
        }
        return true;
      })
    );
  }
}