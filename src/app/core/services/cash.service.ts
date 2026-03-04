import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CashService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    // Obtener branch_id del localStorage
    private getCurrentBranchId(): number | null {
        const branchId = localStorage.getItem('selectedBranchId');
        return branchId ? parseInt(branchId) : null;
    }

    setCurrentBranch(branchId: number): void {
        localStorage.setItem('selectedBranchId', branchId.toString());
    }

    getCurrentBranch(): number | null {
        return this.getCurrentBranchId();
    }

    /**
     * Obtener transacciones con filtros
     * branchOverride: si es 'all', trae de todas las sucursales
     */
    getCashTransactions(filters: any = {}, branchOverride?: string | number): Observable<any> {
        const branchValue = branchOverride || this.getCurrentBranch();
        let params = new HttpParams().set('branch_id', branchValue!.toString());

        Object.keys(filters).forEach(key => {
            if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
                params = params.set(key, filters[key]);
            }
        });

        return this.http.get<any>(`${this.apiUrl}/cash/transactions`, { params });
    }

    getCashTransactionById(id: number): Observable<any> {
        const params = new HttpParams().set('branch_id', this.getCurrentBranch()!.toString());
        return this.http.get<any>(`${this.apiUrl}/cash/transactions/${id}`, { params });
    }

    getCashSessions(filters: any = {}): Observable<any> {
        let params = new HttpParams().set('branch_id', this.getCurrentBranch()!.toString());

        Object.keys(filters).forEach(key => {
            if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
                params = params.set(key, filters[key]);
            }
        });

        return this.http.get<any>(`${this.apiUrl}/cash/sessions`, { params });
    }

    getCurrentCashSession(): Observable<any> {
        const params = new HttpParams().set('branch_id', this.getCurrentBranch()!.toString());
        return this.http.get<any>(`${this.apiUrl}/cash/sessions/current`, { params });
    }

    getCashSummary(filters: any = {}): Observable<any> {
        let params = new HttpParams().set('branch_id', this.getCurrentBranch()!.toString());

        Object.keys(filters).forEach(key => {
            if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
                params = params.set(key, filters[key]);
            }
        });

        return this.http.get<any>(`${this.apiUrl}/cash/summary`, { params });
    }

    getCashTransactionTypes(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/cash/transaction-types`);
    }
}