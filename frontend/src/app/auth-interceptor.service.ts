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
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SharedService } from './shared.service';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class AuthInterceptorService implements HttpInterceptor {
  constructor(
    private sharedService: SharedService,
    private router: Router,
    private http: HttpClient
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let token = localStorage.getItem('token');

    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // if (error.status === 401) {
        //   console.warn('🔴 Token expired! Attempting refresh...');

        //   return this.refreshToken().pipe(
        //     switchMap((newToken) => {
        //       if (newToken) {
        //         console.log('🔄 Token refreshed successfully!');
        //         localStorage.setItem('token', newToken);

        //         // Retry the failed request with the new token
        //         req = req.clone({
        //           setHeaders: { Authorization: `Bearer ${newToken}` }
        //         });

        //         return next.handle(req);
        //       } else {
        //         console.warn('⛔ Token refresh failed. Redirecting to login.');
        //         this.handleLogout();
        //         return throwError(error);
        //       }
        //     }),
        //     catchError(() => {
        //       console.warn('⛔ Token refresh request failed. Redirecting to login.');
        //       this.handleLogout();
        //       return throwError(error);
        //     })
        //   );
        // }
        if (error.status === 401) {
          console.warn("🔴 Token expired! Attempting refresh...");
        
          return this.refreshToken().pipe(
            switchMap(newToken => {
              if (newToken) {
                console.log("🔄 Token refreshed successfully!");
                localStorage.setItem("token", newToken);
        
                // Retry request with new token
                req = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
        
                return next.handle(req);
              } else {
                console.warn("⛔ Refresh failed, forcing logout.");
                this.handleLogout();
                return throwError(error);
              }
            }),
            catchError(() => {
              console.warn("⛔ Token refresh failed, redirecting.");
              this.handleLogout();
              return throwError(error);
            })
          );
        }

        return throwError(error);
      })
    );
  }

  // private refreshToken(): Observable<string | null> {
  //   const refreshToken = localStorage.getItem('refreshToken');
  //   if (!refreshToken) {
  //     return throwError(null);
  //   }

  //   return this.http.post<{ token: string }>('/api/auth/refresh', { refreshToken }).pipe(
  //     switchMap((response) => {
  //       return response.token ? [response.token] : throwError(null);
  //     }),
  //     catchError(() => throwError(null))
  //   );
  // }
  private refreshToken(): Observable<string | null> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.warn("⛔ No refresh token found.");
      return throwError(null);
    }
  
    return this.http.post<{ token: string }>('/api/auth/refresh', { refreshToken }).pipe(
      switchMap((response) => {
        if (response.token) {
          console.log('🔄 Token refreshed successfully:', response.token);
          localStorage.setItem('token', response.token);
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