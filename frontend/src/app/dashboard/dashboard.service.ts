import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MilesService {
  private apiUrl = `${environment.apiUrl}/api/miles`; // ✅ Replace with backend API

  constructor(private http: HttpClient, private socket: Socket) {}

  // ✅ Fetch total miles and logs
  getMiles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/`);
  }

  // ✅ Log new miles
  logMiles(miles: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/log`, { miles });
  }

  // ✅ Listen for real-time updates
  onMilesUpdated(): Observable<any> {
    return this.socket.fromEvent('updateMiles'); // ✅ Listen for 'updateMiles' event
  }
}
