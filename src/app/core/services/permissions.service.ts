import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class PermissionsService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    // Cache de permisos
    private permissionsSubject = new BehaviorSubject<any>(null);
    public permissions$ = this.permissionsSubject.asObservable();

    private loaded = false;

    /**
     * Cargar permisos del usuario actual
     */
    loadMyPermissions(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/permissions/my-permissions`).pipe(
            map(response => response.success ? response.data : null),
            tap(data => {
                if (data) {
                    this.permissionsSubject.next(data);
                    this.loaded = true;
                    localStorage.setItem('admin_permissions', JSON.stringify(data));
                }
            }),
            catchError(error => {
                console.error('Error cargando permisos:', error);
                const cached = localStorage.getItem('admin_permissions');
                if (cached) {
                    const data = JSON.parse(cached);
                    this.permissionsSubject.next(data);
                    return of(data);
                }
                return of(null);
            })
        );
    }

    /**
     * Verificar si puede acceder a un módulo
     */
    canAccess(moduleCode: string): boolean {
        const perms = this.permissionsSubject.value;
        if (!perms) return false;

        // Superadmin siempre tiene acceso
        if (perms.role === 'superadmin') return true;

        return perms.permissions[moduleCode] === true;
    }

    /**
     * Obtener el menú filtrado por permisos
     */
    getMenu(): any[] {
        const perms = this.permissionsSubject.value;
        return perms?.menu || [];
    }

    /**
     * Obtener permisos actuales
     */
    getPermissions(): any {
        return this.permissionsSubject.value?.permissions || {};
    }

    /**
     * Obtener rol actual
     */
    getRole(): string {
        return this.permissionsSubject.value?.role || 'employee';
    }

    /**
     * Verificar si ya se cargaron los permisos
     */
    isLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Limpiar permisos (al cerrar sesión)
     */
    clearPermissions(): void {
        this.permissionsSubject.next(null);
        this.loaded = false;
        localStorage.removeItem('admin_permissions');
    }

    // ========================================
    // MÉTODOS PARA ADMINISTRACIÓN DE PERMISOS
    // ========================================


    /**
     * Actualizar permisos de un rol
     */
    updateRolePermissions(role: string, permissions: any[]): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/permissions/role/${role}`, { permissions });
    }



    /**
     * Actualizar permisos de un admin
     */
    updateAdminPermissions(adminId: number, permissions: any[]): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/permissions/admin/${adminId}`, { permissions });
    }

    /**
   * Obtener todos los módulos
   */
    getModules(system: string = 'admin'): Observable<any[]> {
        return this.http.get<any>(`${this.apiUrl}/permissions/modules?system=${system}`).pipe(
            map(response => response.success ? response.data : [])
        );
    }

    /**
     * Obtener permisos de un rol
     */
    getRolePermissions(role: string, system: string = 'admin'): Observable<any[]> {
        return this.http.get<any>(`${this.apiUrl}/permissions/role/${role}?system=${system}`).pipe(
            map(response => response.success ? response.data : [])
        );
    }

    /**
     * Obtener permisos de un admin específico
     */
    getAdminPermissions(adminId: number, system: string = 'admin'): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/permissions/admin/${adminId}?system=${system}`).pipe(
            map(response => response.success ? response.data : null)
        );
    }
}