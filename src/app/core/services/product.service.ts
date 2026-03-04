import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Obtener branch_id del localStorage
  private getCurrentBranchId(): number | null {
    const branchId = localStorage.getItem('selectedBranchId');
    return branchId ? parseInt(branchId) : null;
  }

  // Método para establecer la sucursal actual
  setCurrentBranch(branchId: number): void {
    localStorage.setItem('selectedBranchId', branchId.toString());
  }

  getCurrentBranch(): number | null {
    return this.getCurrentBranchId();
  }

  // ========== CATEGORÍAS ==========
  getCategories(includeProducts: boolean = false, includeInactive: boolean = false): Observable<any[]> {
    let params = new HttpParams();
    const branchId = this.getCurrentBranchId();

    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }
    if (includeProducts) {
      params = params.set('with_products', 'true');
    }
    if (includeInactive) {
      params = params.set('include_inactive', 'true');
    }

    return this.http.get<any>(`${this.apiUrl}/categories`, { params }).pipe(
      map(response => response?.data || response || [])
    );
  }

  getCategory(id: number, includeProducts: boolean = false): Observable<any> {
    let params = new HttpParams();
    const branchId = this.getCurrentBranchId();

    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }
    if (includeProducts) {
      params = params.set('with_products', 'true');
    }

    return this.http.get<any>(`${this.apiUrl}/categories/${id}`, { params });
  }

  createCategory(category: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/categories`, category);
  }

  updateCategory(id: number, category: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/categories/${id}`, category);
  }

  deleteCategory(id: number, force: boolean = false): Observable<void> {
    let params = new HttpParams();
    const branchId = this.getCurrentBranchId();

    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }
    if (force) {
      params = params.set('force', 'true');
    }

    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`, { params });
  }

  reorderCategories(orders: Array<{ id: number, display_order: number }>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/categories/reorder`, { orders });
  }

  // ========== PRODUCTOS ==========
  getProducts(filters?: any, includeInactive: boolean = false): Observable<any[]> {
    let httpParams = new HttpParams();
    const branchId = this.getCurrentBranchId();

    if (branchId) {
      httpParams = httpParams.set('branch_id', branchId.toString());
    }

    if (includeInactive) {
      httpParams = httpParams.set('include_inactive', 'true');
    }

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          httpParams = httpParams.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/products`, { params: httpParams }).pipe(
      map(response => response?.data || response || [])
    );
  }

  getProduct(id: number): Observable<any> {
    let params = new HttpParams();
    const branchId = this.getCurrentBranchId();

    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/products/${id}`, { params });
  }

  createProduct(product: any): Observable<any> {
    const branchId = this.getCurrentBranchId();
    const productWithBranch = {
      ...product,
      branch_id: branchId
    };
    return this.http.post<any>(`${this.apiUrl}/products`, productWithBranch);
  }

  updateProduct(id: number, product: any): Observable<any> {
    const branchId = this.getCurrentBranchId();
    const productWithBranch = {
      ...product,
      branch_id: branchId
    };
    return this.http.put<any>(`${this.apiUrl}/products/${id}`, productWithBranch);
  }

  deleteProduct(id: number): Observable<void> {
    let params = new HttpParams();
    const branchId = this.getCurrentBranchId();

    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }

    return this.http.delete<void>(`${this.apiUrl}/products/${id}`, { params });
  }



  // ========== INGREDIENTES ==========
  getIngredients(includeInactive: boolean = false): Observable<any> {
    const branchId = this.getCurrentBranch();
    let params = new HttpParams();

    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }
    if (includeInactive) {
      params = params.set('include_inactive', 'true');
    }

    return this.http.get(`${this.apiUrl}/ingredients`, { params });
  }

  createIngredient(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ingredients`, {
      ...data,
      branch_id: this.getCurrentBranch()
    });
  }

  updateIngredient(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/ingredients/${id}`, data);
  }

  deleteIngredient(id: number): Observable<any> {
    let params = new HttpParams();
    const branchId = this.getCurrentBranchId();

    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }

    return this.http.delete(`${this.apiUrl}/ingredients/${id}`, { params });
  }

  // ========== RECETAS ==========
  getProductRecipe(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/products/${productId}/recipe`);
  }

  saveProductRecipe(productId: number, ingredients: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/products/${productId}/recipe`, {
      ingredients
    });
  }

  deleteProductRecipe(productId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${productId}/recipe`);
  }


  // ========== SUCURSALES ==========
  getBranches(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/branches`);
  }

  getBranch(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/branches/${id}`);
  }

  getFranchiseBranches(franchiseId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/franchises/${franchiseId}/branches`);
  }

  createBranch(branch: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/branches`, branch);
  }

  updateBranch(id: number, branch: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/branches/${id}`, branch);
  }

  deleteBranch(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/branches/${id}`);
  }

// ============================================
// MÉTODOS DE STOCK
// ============================================

/**
 * Obtener movimientos de stock
 */
getStockMovements(branchId?: number, itemId?: number, itemType?: string): Observable<any> {
  let params = new HttpParams().set('branch_id', (branchId || this.getCurrentBranch()).toString());
  
  if (itemId) {
    params = params.set('item_id', itemId.toString());
  }
  if (itemType) {
    params = params.set('item_type', itemType);
  }
  
  return this.http.get<any>(`${this.apiUrl}/stock/movements`, { params });
}

/**
 * Actualizar stock de producto (solo productos simples)
 */
updateProductStock(productId: number, quantity: number, movementType: string, reason: string): Observable<any> {
  const params = new HttpParams().set('branch_id', this.getCurrentBranch().toString());
  
  return this.http.post<any>(`${this.apiUrl}/products/${productId}/stock`, {
    quantity,
    movement_type: movementType,
    reason
  }, { params });
}

/**
 * Actualizar stock de ingrediente (recalcula productos con receta)
 */
updateIngredientStock(ingredientId: number, quantity: number, movementType: string, reason: string): Observable<any> {
  const params = new HttpParams().set('branch_id', this.getCurrentBranch().toString());
  
  return this.http.post<any>(`${this.apiUrl}/ingredients/${ingredientId}/stock`, {
    quantity,
    movement_type: movementType,
    reason
  }, { params });
}




  // ========== UTILIDADES ==========
  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload`, formData);
  }



  // ============================================
  // MÉTODOS DE COMBOS
  // ============================================

  getCombos(includeInactive: boolean = false): Observable<any> {
    const branchId = this.getCurrentBranch();
    const params = new HttpParams()
      .set('branch_id', branchId.toString())
      .set('include_inactive', includeInactive.toString());

    return this.http.get(`${this.apiUrl}/combos`, { params });
  }

  getCombo(id: number): Observable<any> {
    const branchId = this.getCurrentBranch();
    const params = new HttpParams().set('branch_id', branchId.toString());

    return this.http.get(`${this.apiUrl}/combos/${id}`, { params });
  }

  createCombo(combo: any): Observable<any> {
    const branchId = this.getCurrentBranch();
    const comboData = { ...combo, branch_id: branchId };

    return this.http.post(`${this.apiUrl}/combos`, comboData);
  }

  updateCombo(id: number, combo: any): Observable<any> {
    const branchId = this.getCurrentBranch();
    const comboData = { ...combo, branch_id: branchId };

    return this.http.put(`${this.apiUrl}/combos/${id}`, comboData);
  }

  deleteCombo(id: number): Observable<any> {
    const branchId = this.getCurrentBranch();
    const params = new HttpParams().set('branch_id', branchId.toString());

    return this.http.delete(`${this.apiUrl}/combos/${id}`, { params });
  }


  getComboById(id: number): Observable<any> {
    const branchId = this.getCurrentBranch();
    return this.http.get(`${this.apiUrl}/combos/${id}?branch_id=${branchId}`);
  }

  // ============================================
  // MÉTODOS PARA SALSAS
  // ============================================

  getSauces(includeInactive: boolean = false): Observable<any> {
    const branchId = this.getCurrentBranch();
    let params = new HttpParams().set('branch_id', branchId!.toString());

    if (includeInactive) {
      params = params.set('include_inactive', 'true');
    }

    return this.http.get(`${this.apiUrl}/sauces`, { params });
  }

  getSauceById(id: number): Observable<any> {
    const branchId = this.getCurrentBranch();
    const params = new HttpParams().set('branch_id', branchId!.toString());

    return this.http.get(`${this.apiUrl}/sauces/${id}`, { params });
  }

  createSauce(data: any): Observable<any> {
    const branchId = this.getCurrentBranch();
    return this.http.post(`${this.apiUrl}/sauces`, {
      ...data,
      branch_id: branchId
    });
  }

  updateSauce(id: number, data: any): Observable<any> {
    const branchId = this.getCurrentBranch();
    return this.http.put(`${this.apiUrl}/sauces/${id}`, {
      ...data,
      branch_id: branchId
    });
  }

  deleteSauce(id: number): Observable<any> {
    const branchId = this.getCurrentBranch();
    const params = new HttpParams().set('branch_id', branchId!.toString());

    return this.http.delete(`${this.apiUrl}/sauces/${id}`, { params });
  }

  // ============================================
  // MÉTODOS PARA ADEREZOS
  // ============================================

  getToppings(includeInactive: boolean = false): Observable<any> {
    const branchId = this.getCurrentBranch();
    let params = new HttpParams().set('branch_id', branchId!.toString());

    if (includeInactive) {
      params = params.set('include_inactive', 'true');
    }

    return this.http.get(`${this.apiUrl}/toppings`, { params });
  }

  getToppingById(id: number): Observable<any> {
    const branchId = this.getCurrentBranch();
    const params = new HttpParams().set('branch_id', branchId!.toString());

    return this.http.get(`${this.apiUrl}/toppings/${id}`, { params });
  }

  createTopping(data: any): Observable<any> {
    const branchId = this.getCurrentBranch();
    return this.http.post(`${this.apiUrl}/toppings`, {
      ...data,
      branch_id: branchId
    });
  }

  updateTopping(id: number, data: any): Observable<any> {
    const branchId = this.getCurrentBranch();
    return this.http.put(`${this.apiUrl}/toppings/${id}`, {
      ...data,
      branch_id: branchId
    });
  }

  deleteTopping(id: number): Observable<any> {
    const branchId = this.getCurrentBranch();
    const params = new HttpParams().set('branch_id', branchId!.toString());

    return this.http.delete(`${this.apiUrl}/toppings/${id}`, { params });
  }



// ========== TRANSFERENCIAS DE STOCK ==========

/**
 * Transferir stock de una sucursal a otra
 */
transferStock(data: {
  from_branch_id: number;
  to_branch_id: number;
  item_type: 'product' | 'ingredient';
  item_id: number;
  quantity: number;
  reason: string;
}): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/stock/transfer`, data);
}

/**
 * Obtener historial de transferencias
 */
getStockTransfers(branchId?: number, itemType?: string): Observable<any> {
  let params = new HttpParams();
  
  if (branchId) {
    params = params.set('branch_id', branchId.toString());
  }
  if (itemType && itemType !== 'all') {
    params = params.set('item_type', itemType);
  }
  
  return this.http.get<any>(`${this.apiUrl}/stock/transfers`, { params });
}

}