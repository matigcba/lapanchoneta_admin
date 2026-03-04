import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/staff`;
  
  getCurrentBranchId(): number | null {
    const branchId = localStorage.getItem('selectedBranchId');
    return branchId ? parseInt(branchId) : null;
  }
  
  getStaff(includeInactive: boolean = false): Observable<any> {
    const branchId = this.getCurrentBranchId();
    if (!branchId) {
      throw new Error('No se ha seleccionado una sucursal');
    }
    
    let params = new HttpParams()
      .set('branch_id', branchId.toString());
    
    if (includeInactive) {
      params = params.set('include_inactive', 'true');
    }
    
    return this.http.get<any>(this.apiUrl, { params });
  }
  
  getStaffMember(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
  
  // NUEVO MÉTODO: Obtener todas las sucursales disponibles
  getBranches(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/branches`);
  }
  
  // NUEVO MÉTODO: Obtener sucursales de un usuario específico
  getUserBranches(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${userId}/branches`);
  }
  
  createStaff(data: any): Observable<any> {
    // Asegurar que tenga el branch_id si no viene branches
    if (!data.branches && !data.branch_id) {
      data.branch_id = this.getCurrentBranchId();
    }
    
    return this.http.post<any>(this.apiUrl, data);
  }
  
  updateStaff(id: number, data: any): Observable<any> {
    // No enviar password si está vacío
    if (data.password === '' || data.password === null) {
      delete data.password;
    }
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }
  
  deleteStaff(id: number): Observable<any> {
    const branchId = this.getCurrentBranchId();
    const params = new HttpParams().set('branch_id', branchId!.toString());
    
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { params });
  }
  
  toggleStaffStatus(id: number, isActive: boolean): Observable<any> {
    return this.updateStaff(id, { is_active: isActive });
  }
  
  changePassword(id: number, newPassword: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/password`, { 
      password: newPassword 
    });
  }
  
  // Obtener estadísticas del personal
  getStaffStats(branchId?: number): Observable<any> {
    const branch = branchId || this.getCurrentBranchId();
    const params = new HttpParams().set('branch_id', branch!.toString());
    
    return this.http.get<any>(`${this.apiUrl}/stats`, { params });
  }
}