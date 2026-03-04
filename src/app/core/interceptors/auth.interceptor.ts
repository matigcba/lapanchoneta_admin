import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  
  // Lista de rutas que NO necesitan token
  const excludedUrls = [
    '/admin/login',
    '/login',
    '/register'
  ];
  
  // Verificar si la URL actual está en la lista de exclusión
  const shouldExclude = excludedUrls.some(url => req.url.includes(url));
  
  console.log('URL de la petición:', req.url);
  console.log('Token disponible:', token ? 'Sí' : 'No');
  console.log('Debe excluir:', shouldExclude);
  
  // Solo agregar token si existe y la ruta no está excluida
  if (token && !shouldExclude && req.url.includes(environment.apiUrl)) {
    
    // ✅ CORRECCIÓN: Detectar si es FormData
    const isFormData = req.body instanceof FormData;
    
    // Preparar headers
    const headers: any = {
      Authorization: `Bearer ${token}`
    };
    
    // Solo agregar Content-Type si NO es FormData
    // Cuando es FormData, el navegador lo establece automáticamente con el boundary correcto
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const authReq = req.clone({
      setHeaders: headers
    });
    
    return next(authReq).pipe(
      catchError((error) => {
        console.error('Error en petición:', error);
        
        if (error.status === 401 || error.status === 403) {
          // Token inválido o expirado
          console.error('Token rechazado por el servidor');
          authService.logout();
          router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
  
  return next(req);
};