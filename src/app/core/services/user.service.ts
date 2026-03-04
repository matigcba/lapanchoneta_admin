import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() { }

  /**
   * Obtener lista de usuarios para selector
   */
  getUsersList(search?: string): Observable<any[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<any>(`${this.apiUrl}/users/list`, { params }).pipe(
      map(response => response?.data || response || [])
    );
  }

}
