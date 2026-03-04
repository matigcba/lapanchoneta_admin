import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/orders`;
  
  getCurrentBranchId(): number | null {
    const branchId = localStorage.getItem('selectedBranchId');
    return branchId ? parseInt(branchId) : null;
  }
  
  // Obtener pedidos con filtros
  getOrders(filters?: any): Observable<any> {
    const branchId = this.getCurrentBranchId();
    if (!branchId) {
      throw new Error('No se ha seleccionado una sucursal');
    }
    
    let params = new HttpParams()
      .set('branch_id', branchId.toString());
    
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.date_from) params = params.set('date_from', filters.date_from);
      if (filters.date_to) params = params.set('date_to', filters.date_to);
      if (filters.search) params = params.set('search', filters.search);
    }
    
    return this.http.get<any>(this.apiUrl, { params });
  }
  
  // Obtener un pedido específico con sus items
  getOrder(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
  
  // Actualizar estado del pedido
  updateOrderStatus(id: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/status`, { status });
  }
  
  // Actualizar estado de pago
  updatePaymentStatus(id: number, paymentStatus: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/payment-status`, { payment_status: paymentStatus });
  }
  
  // Cancelar pedido
  cancelOrder(id: number, reason: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/cancel`, { reason });
  }
  
  // Obtener resumen del día
  getDailySummary(date?: string): Observable<any> {
    const branchId = this.getCurrentBranchId();
    let params = new HttpParams()
      .set('branch_id', branchId!.toString());
    
    if (date) {
      params = params.set('date', date);
    }
    
    return this.http.get<any>(`${this.apiUrl}/summary`, { params });
  }
}