import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  // Verificar si está logueado
  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Obtener el código del módulo desde la ruta
  const routePath = state.url.split('?')[0];
  const moduleCode = getModuleCodeFromRoute(routePath);

  // Si es profile, siempre permitir
  if (moduleCode === 'profile') {
    return true;
  }

  // Si no hay permisos cargados, cargarlos primero
  if (!permissionsService.isLoaded()) {
    return permissionsService.loadMyPermissions().pipe(
      map(data => {
        if (!data) {
          router.navigate(['/login']);
          return false;
        }
        return checkPermission(permissionsService, moduleCode, router);
      })
    );
  }

  return checkPermission(permissionsService, moduleCode, router);
};

function checkPermission(
  permissionsService: PermissionsService, 
  moduleCode: string, 
  router: Router
): boolean {
  if (permissionsService.canAccess(moduleCode)) {
    return true;
  }

  console.warn(`Acceso denegado al módulo: ${moduleCode}`);
  
  if (moduleCode !== 'dashboard' && permissionsService.canAccess('dashboard')) {
    router.navigate(['/dashboard']);
  } else {
    router.navigate(['/profile']);
  }
  
  return false;
}

function getModuleCodeFromRoute(route: string): string {
  const routeToModule: any = {
    '/dashboard': 'dashboard',
    '/orders': 'orders',
    '/inventory': 'inventory',
    '/stock': 'stock',
    '/cash': 'cash',
    '/report-sales': 'report_sales',
    '/report-orders': 'report_orders',
    '/coupons': 'coupons',
    '/points': 'points',
    '/employees': 'employees',
    '/branches': 'branches',
    '/franchises': 'franchises',
    '/profile': 'profile'
  };

  return routeToModule[route] || 'dashboard';
}