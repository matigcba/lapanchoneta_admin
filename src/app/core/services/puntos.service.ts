import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PointsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ==================== CONFIGURACIÓN ====================

  getConfig(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/points/config`).pipe(
      map(response => response?.data || response)
    );
  }

  updateConfig(config: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/points/config`, config);
  }

  // ==================== ESTADÍSTICAS ====================

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/points/stats`).pipe(
      map(response => response?.data || response)
    );
  }

  // ==================== USUARIOS ====================

  getUsers(params: { search?: string; page?: number; limit?: number } = {}): Observable<any> {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<any>(`${this.apiUrl}/points/users`, { params: httpParams });
  }

  getUserPoints(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/points/users/${userId}`).pipe(
      map(response => response?.data || response)
    );
  }

  adjustUserPoints(userId: number, points: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/points/users/${userId}/adjust`, {
      points,
      reason
    });
  }

  // ==================== TRANSACCIONES ====================

  getTransactions(params: { type?: string; user_id?: number; page?: number; limit?: number } = {}): Observable<any> {
    let httpParams = new HttpParams();
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.user_id) httpParams = httpParams.set('user_id', params.user_id.toString());
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<any>(`${this.apiUrl}/points/transactions`, { params: httpParams });
  }

  // ==================== PRODUCTOS CANJEABLES ====================

  getProducts(includeInactive: boolean = false): Observable<any[]> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('include_inactive', 'true');

    return this.http.get<any>(`${this.apiUrl}/points/products`, { params }).pipe(
      map(response => response?.data || response || [])
    );
  }

  createProduct(product: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/points/products`, product);
  }

  updateProduct(id: number, product: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/points/products/${id}`, product);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/points/products/${id}`);
  }
}