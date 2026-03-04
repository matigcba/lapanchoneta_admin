import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PermissionsService } from './permissions.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private permissionsService = inject(PermissionsService);

  private apiUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private currentBranchSubject = new BehaviorSubject<any>(null);
  public currentBranch$ = this.currentBranchSubject.asObservable();

  constructor() {
    this.loadUserFromStorage();
  }

  // Modificar loadUserFromStorage - agregar al final
private loadUserFromStorage(): void {
  const token = localStorage.getItem('admin_token');
  const user = localStorage.getItem('admin_user');
  const branch = localStorage.getItem('admin_branch');
  
  if (token && user) {
    this.currentUserSubject.next(JSON.parse(user));
    if (branch) {
      this.currentBranchSubject.next(JSON.parse(branch));
    }
    
    // ✅ NUEVO: Cargar permisos
    this.permissionsService.loadMyPermissions().subscribe();
  }
}

  // Modificar el método login - agregar al final del tap, después de setBranch
  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.token) {
            localStorage.removeItem('token');

            localStorage.setItem('admin_token', response.token);
            localStorage.setItem('admin_user', JSON.stringify(response.user));

            this.currentUserSubject.next(response.user);

            if (response.branch) {
              localStorage.setItem('admin_branch', JSON.stringify(response.branch));
              this.currentBranchSubject.next(response.branch);
            }

            // ✅ NUEVO: Cargar permisos
            this.permissionsService.loadMyPermissions().subscribe();
          }
        })
      );
  }

// Modificar logout - agregar antes de router.navigate
logout(): void {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  localStorage.removeItem('admin_branch');
  this.currentUserSubject.next(null);
  this.currentBranchSubject.next(null);
  
  // ✅ NUEVO: Limpiar permisos
  this.permissionsService.clearPermissions();
  
  this.router.navigate(['/login']);
}

  getToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  getCurrentBranch(): any {
    return this.currentBranchSubject.value;
  }

  setBranch(branch: any): void {
    if (branch) {
      localStorage.setItem('admin_branch', JSON.stringify(branch));
      this.currentBranchSubject.next(branch);
    } else {
      localStorage.removeItem('admin_branch');
      this.currentBranchSubject.next(null);
    }
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const roleHierarchy: any = {
      'superadmin': 4,
      'admin': 3,
      'manager': 2,
      'employee': 1
    };

    return roleHierarchy[user.role] >= roleHierarchy[role];
  }

  // ========================================
  // NUEVOS MÉTODOS PARA EL PERFIL
  // ========================================

  /**
   * Obtener perfil del admin actual
   */
  getAdminProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/profile`)
      .pipe(
        tap(response => {
          if (response.success && response.user) {
            // Actualizar el usuario en localStorage y BehaviorSubject
            localStorage.setItem('admin_user', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Actualizar perfil del admin
   */
  updateProfile(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/profile`, data)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            // Actualizar el usuario en localStorage y BehaviorSubject
            localStorage.setItem('admin_user', JSON.stringify(response.data));
            this.currentUserSubject.next(response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Cambiar contraseña del admin
   */
  changePassword(data: { current_password: string, new_password: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/change-password`, data)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Manejo de errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
    }

    console.error('Error en AuthService:', errorMessage);
    return throwError(() => error);
  }
}