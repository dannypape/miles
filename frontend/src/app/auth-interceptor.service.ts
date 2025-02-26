// // import { Injectable } from '@angular/core';
// // import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
// // import { Observable, throwError } from 'rxjs';
// // import { catchError } from 'rxjs/operators';
// // import { SharedService } from './shared.service';

// // @Injectable()
// // export class AuthInterceptorService implements HttpInterceptor {
// //   constructor(private sharedService: SharedService) {}

// //   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
// //     const token = localStorage.getItem('token');

// //     if (token) {
// //       req = req.clone({
// //         setHeaders: { Authorization: `Bearer ${token}` }
// //       });
// //     }

// //     return next.handle(req).pipe(
// //       catchError((error: HttpErrorResponse) => {
// //         if (error.status === 401) {
// //           console.warn('🔴 Token expired! Prompting user to refresh.');

// //           // Update SharedService to notify components
// //           this.sharedService.updateTokenExpired(true);
// //         }
// //         return throwError(error);
// //       })
// //     );
// //   }
// // }

// // import { Injectable } from '@angular/core';
// // import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
// // import { Observable, throwError } from 'rxjs';
// // import { catchError } from 'rxjs/operators';
// // import { SharedService } from './shared.service';
// // import { Router } from '@angular/router';

// // @Injectable()
// // export class AuthInterceptorService implements HttpInterceptor {
// //   constructor(private sharedService: SharedService, private router: Router) {}

// //   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
// //     const token = localStorage.getItem('token');

// //     if (token) {
// //       req = req.clone({
// //         setHeaders: { Authorization: `Bearer ${token}` }
// //       });
// //     }

// //     return next.handle(req).pipe(
// //       catchError((error: HttpErrorResponse) => {
// //         if (error.status === 401) {
// //           console.warn('🔴 Token expired! Redirecting user to login.');

// //           // ✅ Save the current URL before redirecting
// //           localStorage.setItem("redirectAfterLogin", this.router.url);

// //           // ✅ Clear token and force login
// //           localStorage.removeItem("token");
// //           this.sharedService.updateTokenExpired(true); // Notify other components
// //           this.router.navigate(['/login']);
// //         }
// //         return throwError(error);
// //       })
// //     );
// //   }
// // }


// import { Injectable } from '@angular/core';
// import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { catchError } from 'rxjs/operators';
// import { Router } from '@angular/router';
// import { SharedService } from './shared.service';

// @Injectable()
// export class AuthInterceptorService implements HttpInterceptor {
//   constructor(private sharedService: SharedService, private router: Router) {}

//   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//     const token = localStorage.getItem('token');

//     if (token) {
//       req = req.clone({
//         setHeaders: { Authorization: `Bearer ${token}` }
//       });
//     }

//     return next.handle(req).pipe(
//       catchError((error: HttpErrorResponse) => {
//         if (error.status === 401) {
//           console.warn("🔴 Token expired! Redirecting to login...");

//           // ✅ Store current URL before redirecting
//           localStorage.setItem('redirectAfterLogin', window.location.pathname);

//           // ✅ Clear session and redirect
//           this.sharedService.logout();  // Clear localStorage & shared state
//           this.router.navigate(['/login']);
//         }
//         return throwError(error);
//       })
//     );
//   }
// }

import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SharedService } from './shared.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root', // ✅ Ensures service is globally available
})
export class AuthInterceptorService implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(
    private sharedService: SharedService,
    private router: Router,
    private http: HttpClient
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;
    const token = localStorage.getItem("token");

    // if (token) {
    //   req = req.clone({
    //     setHeaders: { Authorization: `Bearer ${token}` }
    //   });
    // }
    if (token) {
      authReq = this.addTokenHeader(req, token);
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
              return this.handle401Error(req, next);
          }
          return throwError(error);
      })
    );

    // return next.handle(req).pipe(
    //   catchError((error: HttpErrorResponse) => {
        
    //     if (error.status === 401) {
    //       console.warn("🔴 Token expired! Attempting refresh...");
    //       const refreshToken = localStorage.getItem('refreshToken');
    //       if (refreshToken) {
    //         // Attempt to refresh the access token
    //         return this.authService.refreshToken(refreshToken).pipe(
    //           switchMap((newTokens: any) => {
    //             localStorage.setItem('token', newTokens.token);
    //             // Retry the failed request with the new access token
    //             const newAuthReq = req.clone({
    //               setHeaders: { Authorization: `Bearer ${newTokens.token}` }
    //             });
    //             return next.handle(newAuthReq);
    //           }),
    //           catchError(refreshError => {
    //             // Refresh token is invalid or expired
    //             this.handleLogout();
    //             return throwError(refreshError);
    //           })
    //         );
    //       } else {
    //         // No refresh token available, force logout
    //         this.handleLogout();
    //       }


    //       // return this.refreshToken().pipe(
    //       //   switchMap(newToken => {
    //       //     if (newToken) {
    //       //       console.log("🔄 Token refreshed successfully!");
    //       //       localStorage.setItem("token", newToken);
        
    //       //       // Retry request with new token
    //       //       req = req.clone({
    //       //         setHeaders: { Authorization: `Bearer ${newToken}` }
    //       //       });
        
    //       //       return next.handle(req);
    //       //     } else {
    //       //       console.warn("⛔ Refresh failed, forcing logout.");
    //       //       this.handleLogout();
    //       //       return throwError(error);
    //       //     }
    //       //   }),
    //       //   catchError(() => {
    //       //     console.warn("⛔ Token refresh failed, redirecting.");
    //       //     this.handleLogout();
    //       //     return throwError(error);
    //       //   })
    //       // );
    //     }

    //     return throwError(error);
    //   })
    // );
  }

  private addTokenHeader(req: HttpRequest<any>, token: string) {
    return req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  private handle401Error(req: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
        this.isRefreshing = true;
        this.refreshTokenSubject.next(null);

        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
            return throwError("No refresh token found");
        }

        return this.sharedService.refreshToken(refreshToken).pipe(
            switchMap((newToken: any) => {
                this.isRefreshing = false;
                this.refreshTokenSubject.next(newToken.accessToken);
                localStorage.setItem("token", newToken.accessToken);
                return next.handle(this.addTokenHeader(req, newToken.accessToken));
            }),
            catchError((err) => {
                this.isRefreshing = false;
                this.sharedService.logout(); // Logout if refresh fails
                return throwError(err);
            })
        );
    } else {
        return this.refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(token => next.handle(this.addTokenHeader(req, token!)))
        );
    }
  }

  public refreshToken(): Observable<string | null> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.warn("⛔ No refresh token found.");
      return throwError(null);
    }
  
    return this.http.post<{ token: string, refreshToken: string }>(
      '/api/auth/refresh', 
      { refreshToken }
    ).pipe(
      switchMap((response) => {
        if (response.token && response.refreshToken) {
          console.log('🔄 Token refreshed successfully:', response.token);
          localStorage.setItem('token', response.token);
          localStorage.setItem('refreshToken', response.refreshToken); 
          return [response.token];  // ✅ Return new token
        } else {
          console.warn('⛔ Refresh failed: No token returned.');
          return throwError(null);
        }
      }),
      catchError((err) => {
        console.error('⛔ Refresh request failed:', err);
        return throwError(null);
      })
    );
  }

  private handleLogout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this.sharedService.logout();
    this.router.navigate(['/login']);
  }
}