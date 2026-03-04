import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FranchiseService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;


  // En product.service.ts, agregar estos métodos:

  getFranchises(includeInactive: boolean = false): Observable<any> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return this.http.get(`${this.apiUrl}/franchises${params}`);
  }

  getBranches(includeInactive: boolean = false): Observable<any> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return this.http.get(`${this.apiUrl}/branches${params}`);
  }

  getFranchiseBranches(franchiseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/franchises/${franchiseId}/branches`);
  }
  toggleBranchStatus(id: number, isActive: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/branches/${id}/toggle-status`, {
      is_active: isActive
    });
  }
}