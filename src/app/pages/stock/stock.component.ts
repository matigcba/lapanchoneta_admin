import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.scss']
})
export class StockComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  // Estado
  loading = false;
  saving = false;
  activeTab = 'products';

  // Datos
  products: any[] = [];
  filteredProducts: any[] = [];
  ingredients: any[] = [];
  filteredIngredients: any[] = [];
  movements: any[] = [];
  filteredMovements: any[] = [];

  // Categorización de stock
  criticalStock: any[] = [];
  lowStock: any[] = [];
  normalStock: any[] = [];

  // Filtros
  searchTerm = '';
  ingredientSearchTerm = '';
  productTypeFilter = 'all';
  movementTypeFilter = 'all';
  movementFilter = 'all';

  // Sucursal
  currentBranchId: number | null = null;

  // Modal de ajuste
  showAdjustModal = false;
  selectedItem: any = null;
  selectedItemType: 'product' | 'ingredient' = 'product';
  adjustmentType: 'add' | 'remove' = 'add';
  adjustmentQuantity: number = 0;
  adjustmentReason = '';

  // Modal de historial
  showHistoryModal = false;
  itemHistory: any[] = [];

  ngOnInit() {
    this.currentBranchId = this.productService.getCurrentBranch();

    // Suscribirse a cambios de sucursal
    this.authService.currentBranch$
      .pipe(takeUntil(this.destroy$))
      .subscribe(branch => {
        if (branch && branch.id !== this.currentBranchId) {
          this.currentBranchId = branch.id;
          this.loadData();
        }
      });

    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading = true;
    this.loadProducts();
    this.loadIngredients();
    this.loadMovements();

    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  loadProducts() {
    this.productService.getProducts().subscribe({
      next: (response: any) => {
        this.products = (response?.data || response || []).filter((p: any) => p.is_active);
        this.filterProducts();
        this.categorizeStock();
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.products = [];
        this.filterProducts();
      }
    });
  }

  loadIngredients() {
    this.productService.getIngredients().subscribe({
      next: (response: any) => {
        this.ingredients = (response?.data || response || []).filter((i: any) => i.is_active);
        
        // Cargar información de uso en recetas
        this.loadIngredientUsage();
        this.filterIngredients();
        this.categorizeStock();
      },
      error: (error) => {
        console.error('Error cargando ingredientes:', error);
        this.ingredients = [];
        this.filterIngredients();
      }
    });
  }

  loadIngredientUsage() {
    // Contar en cuántos productos se usa cada ingrediente
    this.ingredients.forEach(ingredient => {
      // TODO: Implementar endpoint para obtener uso real
      // Por ahora se puede calcular del lado del cliente si tienes las recetas
      ingredient.usage_count = ingredient.usage_count || 0;
    });
  }

  loadMovements() {
    this.productService.getStockMovements().subscribe({
      next: (response: any) => {
        this.movements = response?.data || [];
        this.filterMovements();
      },
      error: (error) => {
        console.error('Error cargando movimientos:', error);
        this.movements = [];
        this.filterMovements();
      }
    });
  }

  // ============================================
  // FILTROS
  // ============================================

  changeTab(tab: string) {
    this.activeTab = tab;
  }

  filterProducts() {
    let filtered = [...this.products];

    // Filtro por tipo
    if (this.productTypeFilter === 'simple') {
      filtered = filtered.filter(p => !p.has_recipe);
    } else if (this.productTypeFilter === 'recipe') {
      filtered = filtered.filter(p => p.has_recipe);
    }

    // Filtro por búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.category_name?.toLowerCase().includes(term)
      );
    }

    this.filteredProducts = filtered;
  }

  filterIngredients() {
    let filtered = [...this.ingredients];

    if (this.ingredientSearchTerm) {
      const term = this.ingredientSearchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(term) ||
        i.unit?.toLowerCase().includes(term)
      );
    }

    this.filteredIngredients = filtered;
  }

  filterMovements() {
    let filtered = [...this.movements];

    // Filtro por tipo de item
    if (this.movementTypeFilter !== 'all') {
      filtered = filtered.filter(m => m.item_type === this.movementTypeFilter);
    }

    // Filtro por tipo de movimiento
    if (this.movementFilter !== 'all') {
      filtered = filtered.filter(m => m.movement_type === this.movementFilter);
    }

    this.filteredMovements = filtered;
  }

  // ============================================
  // CATEGORIZACIÓN DE STOCK
  // ============================================

  categorizeStock() {
    const allItems = [...this.products, ...this.ingredients];

    this.criticalStock = allItems.filter(item => this.getStockStatus(item) === 'critical');
    this.lowStock = allItems.filter(item => this.getStockStatus(item) === 'low');
    this.normalStock = allItems.filter(item => this.getStockStatus(item) === 'normal');
  }

  getStockStatus(item: any): string {
    const stock = item.stock || 0;
    const minStock = item.min_stock || 0;

    if (minStock === 0) return 'normal';
    if (stock <= minStock) return 'critical';
    if (stock <= minStock * 1.5) return 'low';
    return 'normal';
  }

  getStockStatusLabel(item: any): string {
    const status = this.getStockStatus(item);
    switch (status) {
      case 'critical': return 'Crítico';
      case 'low': return 'Bajo';
      default: return 'Normal';
    }
  }

  // ============================================
  // MODAL DE AJUSTE
  // ============================================

  adjustStock(item: any, type: 'product' | 'ingredient') {
    this.selectedItem = item;
    this.selectedItemType = type;
    this.adjustmentQuantity = 0;
    this.adjustmentReason = '';
    this.adjustmentType = 'add';
    this.showAdjustModal = true;
  }

  closeAdjustModal() {
    this.showAdjustModal = false;
    this.selectedItem = null;
    this.adjustmentQuantity = 0;
    this.adjustmentReason = '';
  }

  getNewStock(): number {
    const currentStock = this.selectedItem?.stock || 0;
    const quantity = this.adjustmentQuantity || 0;

    if (this.adjustmentType === 'add') {
      return currentStock + quantity;
    } else {
      return Math.max(0, currentStock - quantity);
    }
  }

  confirmAdjustment() {
    if (!this.adjustmentQuantity || this.adjustmentQuantity <= 0 || !this.adjustmentReason?.trim()) {
      alert('Por favor complete cantidad y motivo');
      return;
    }

    this.saving = true;

    const movementType = this.adjustmentType === 'add' ? 'entrada' : 'salida';

    if (this.selectedItemType === 'product') {
      this.productService.updateProductStock(
        this.selectedItem.id,
        this.adjustmentQuantity,
        movementType,
        this.adjustmentReason
      ).subscribe({
        next: (response) => {
          this.handleAdjustmentSuccess(response);
        },
        error: (error) => {
          this.handleAdjustmentError(error);
        }
      });
    } else {
      this.productService.updateIngredientStock(
        this.selectedItem.id,
        this.adjustmentQuantity,
        movementType,
        this.adjustmentReason
      ).subscribe({
        next: (response) => {
          this.handleAdjustmentSuccess(response);
        },
        error: (error) => {
          this.handleAdjustmentError(error);
        }
      });
    }
  }

  handleAdjustmentSuccess(response: any) {
    this.saving = false;
    this.closeAdjustModal();
    this.loadData();

    const message = this.selectedItemType === 'ingredient' && response.affected_products
      ? `Stock actualizado correctamente.\n${response.affected_products} producto(s) con receta fueron recalculados.`
      : 'Stock actualizado correctamente';

    alert(message);
  }

  handleAdjustmentError(error: any) {
    this.saving = false;
    console.error('Error actualizando stock:', error);
    alert(error.error?.message || 'Error al actualizar el stock');
  }

  // ============================================
  // MODAL DE HISTORIAL
  // ============================================

  viewHistory(item: any, type: 'product' | 'ingredient') {
    this.selectedItem = item;
    this.selectedItemType = type;
    this.itemHistory = [];

    const itemId = item.id;
    
    this.productService.getStockMovements(this.currentBranchId!, itemId, type).subscribe({
      next: (response: any) => {
        this.itemHistory = response?.data || [];
        this.showHistoryModal = true;
      },
      error: (error) => {
        console.error('Error cargando historial:', error);
        this.itemHistory = [];
        this.showHistoryModal = true;
      }
    });
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
    this.itemHistory = [];
    this.selectedItem = null;
  }

  // ============================================
  // HELPERS
  // ============================================

  getMovementIcon(movement: any): string {
    const type = movement.movement_type || movement.type;
    switch (type) {
      case 'entrada':
        return 'bi bi-arrow-down-circle-fill text-success';
      case 'salida':
        return 'bi bi-arrow-up-circle-fill text-danger';
      case 'ajuste':
        return 'bi bi-arrow-left-right text-info';
      default:
        return 'bi bi-circle text-secondary';
    }
  }

  getMovementLabel(type: string): string {
    switch (type) {
      case 'entrada': return 'Entrada';
      case 'salida': return 'Salida';
      case 'ajuste': return 'Ajuste';
      default: return type;
    }
  }
}