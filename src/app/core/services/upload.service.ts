import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/upload`;

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    // Usar 'fileKey' como en tu otra app
    formData.append('fileKey', file, file.name);

    console.log('Uploading file:', file.name, file.size, file.type);

    return this.http.post<any>(`${this.apiUrl}/image`, formData).pipe(
      map(response => response),
      catchError(error => {
        console.error('Error uploading image:', error);
        return of({
          success: false,
          message: error.error?.message || 'Error al subir imagen'
        });
      })
    );
  }

  // Método alternativo más simple sin progreso
  uploadImageSimple(file: File, itemId?: number, type: string = 'product'): Observable<any> {
    const formData: FormData = new FormData();

    // IMPORTANTE: Usar exactamente el mismo formato que funciona
    formData.append('fileKey', file, file.name);

    if (itemId) {
      formData.append('id', JSON.stringify(itemId)); // Serializar como en el código que funciona
    }

    // Normalizar el tipo para que siempre sea plural
    let normalizedType = type;
    if (type === 'product') normalizedType = 'products';
    if (type === 'category') normalizedType = 'categories';
    if (type === 'ingredient') normalizedType = 'ingredients';
    if (type === 'combo') normalizedType = 'combos';

    formData.append('type', JSON.stringify(normalizedType)); // Serializar también

    // NO agregar Content-Type header, dejar que el navegador lo maneje
    return this.http.post<any>(`${this.apiUrl}/image`, formData);
  }

  deleteImage(url: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/image`, {
      body: { url }
    });
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido. Solo JPG, PNG, GIF o WEBP'
      };
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'La imagen es demasiado grande. Máximo 5MB'
      };
    }

    return { valid: true };
  }
}