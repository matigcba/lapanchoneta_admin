import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ========== CUPONES ==========

  /**
   * Obtener todos los cupones (para admin)
   */
  getCoupons(includeInactive: boolean = false): Observable<any[]> {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('include_inactive', 'true');
    }
    return this.http.get<any>(`${this.apiUrl}/coupons`, { params }).pipe(
      map(response => response?.data || response || [])
    );
  }

  /**
   * Obtener un cupón por ID
   */
  getCoupon(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/coupons/${id}`).pipe(
      map(response => response?.data || response)
    );
  }

  /**
   * Crear un nuevo cupón
   */
  createCoupon(coupon: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/coupons`, coupon);
  }

  /**
   * Actualizar un cupón existente
   */
  updateCoupon(id: number, coupon: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/coupons/${id}`, coupon);
  }

  /**
   * Eliminar un cupón
   */
  deleteCoupon(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/coupons/${id}`);
  }

  /**
   * Activar/Desactivar cupón
   */
  toggleCouponStatus(id: number, isActive: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/coupons/${id}/toggle-status`, {
      is_active: isActive
    });
  }

  /**
   * Obtener historial de uso de un cupón
   */
  getCouponUsage(couponId: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/coupons/${couponId}/usage`).pipe(
      map(response => response?.data || response || [])
    );
  }

  /**
   * Obtener estadísticas de cupones
   */
  getCouponStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/coupons/stats`).pipe(
      map(response => response?.data || response)
    );
  }

  /**
   * Duplicar un cupón
   */
  duplicateCoupon(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/coupons/${id}/duplicate`, {});
  }

  /**
   * Validar código único
   */
  validateCode(code: string, excludeId?: number): Observable<any> {
    let params = new HttpParams().set('code', code);
    if (excludeId) {
      params = params.set('exclude_id', excludeId.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/coupons/validate-code`, { params });
  }

  /**
   * Obtener usuarios asignados a un cupón
   */
  getCouponUsers(couponId: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/coupons/${couponId}/users`).pipe(
      map(response => response?.data || response || [])
    );
  }

}