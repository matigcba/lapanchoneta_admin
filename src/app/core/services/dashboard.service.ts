import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private getCurrentBranchId(): number | null {
    const branchId = localStorage.getItem('selectedBranchId');
    return branchId ? parseInt(branchId) : null;
  }

  getDashboardSummary(): Observable<any> {
    const branchId = this.getCurrentBranchId();
    if (!branchId) {
      throw new Error('No se ha seleccionado una sucursal');
    }
    
    const params = new HttpParams().set('branch_id', branchId.toString());
    return this.http.get<any>(`${this.apiUrl}/dashboard/summary`, { params });
  }
}