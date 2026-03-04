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

  // Transferencias
  transfers: any[] = [];
  filteredTransfers: any[] = [];
  transferTypeFilter = 'all'; // 'all', 'product', 'ingredient'

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

  // Modal de transferencia
  showTransferModal = false;
  transferItemType: 'product' | 'ingredient' = 'product';
  transferItemId: number | null = null;
  transferItemName: string = '';
  transferFromStock: number = 0;
  transferQuantity: number = 0;
  transferReason: string = '';
  transferToBranchId: number | null = null;
  allBranches: any[] = [];
  availableItems: any[] = []; // Items del tipo seleccionado para el dropdown
  transferSaving = false;

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
    this.loadBranches();
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
    this.loadTransfers();

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
    this.ingredients.forEach(ingredient => {
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

  loadTransfers() {
    this.productService.getStockTransfers(this.currentBranchId!).subscribe({
      next: (response: any) => {
        this.transfers = response?.data || [];
        this.filterTransfers();
      },
      error: (error) => {
        console.error('Error cargando transferencias:', error);
        this.transfers = [];
        this.filterTransfers();
      }
    });
  }

  loadBranches() {
    this.productService.getBranches().subscribe({
      next: (response: any) => {
        const branches = response?.data || response || [];
        this.allBranches = branches.filter((b: any) => b.is_active);
      },
      error: (error) => {
        console.error('Error cargando sucursales:', error);
        this.allBranches = [];
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

    if (this.productTypeFilter === 'simple') {
      filtered = filtered.filter(p => !p.has_recipe);
    } else if (this.productTypeFilter === 'recipe') {
      filtered = filtered.filter(p => p.has_recipe);
    }

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

    if (this.movementTypeFilter !== 'all') {
      filtered = filtered.filter(m => m.item_type === this.movementTypeFilter);
    }

    if (this.movementFilter !== 'all') {
      filtered = filtered.filter(m => m.movement_type === this.movementFilter);
    }

    this.filteredMovements = filtered;
  }

  filterTransfers() {
    let filtered = [...this.transfers];

    if (this.transferTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.item_type === this.transferTypeFilter);
    }

    this.filteredTransfers = filtered;
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
  // MODAL DE TRANSFERENCIA
  // ============================================

  /**
   * Abrir modal de transferencia desde un item específico (producto o ingrediente)
   */
  openTransferFromItem(item: any, type: 'product' | 'ingredient') {
    this.transferItemType = type;
    this.transferItemId = item.id;
    this.transferItemName = item.name;
    this.transferFromStock = item.stock || 0;
    this.transferQuantity = 0;
    this.transferReason = '';
    this.transferToBranchId = null;
    this.transferSaving = false;

    // Cargar items disponibles del tipo seleccionado
    this.updateAvailableItems();

    this.showTransferModal = true;
  }

  /**
   * Abrir modal de transferencia genérico (desde el botón del header)
   */
  openTransferModal() {
    this.transferItemType = 'product';
    this.transferItemId = null;
    this.transferItemName = '';
    this.transferFromStock = 0;
    this.transferQuantity = 0;
    this.transferReason = '';
    this.transferToBranchId = null;
    this.transferSaving = false;

    this.updateAvailableItems();

    this.showTransferModal = true;
  }

  closeTransferModal() {
    this.showTransferModal = false;
    this.transferItemId = null;
    this.transferItemName = '';
    this.transferFromStock = 0;
    this.transferQuantity = 0;
    this.transferReason = '';
    this.transferToBranchId = null;
  }

  /**
   * Actualizar lista de items disponibles según el tipo seleccionado
   */
  updateAvailableItems() {
    if (this.transferItemType === 'product') {
      // Solo productos simples (sin receta)
      this.availableItems = this.products.filter(p => !p.has_recipe);
    } else {
      this.availableItems = [...this.ingredients];
    }
  }

  /**
   * Cuando cambia el tipo de item en el modal
   */
  onTransferItemTypeChange() {
    this.transferItemId = null;
    this.transferItemName = '';
    this.transferFromStock = 0;
    this.updateAvailableItems();
  }

  /**
   * Cuando selecciona un item en el dropdown
   */
  onTransferItemChange() {
    if (!this.transferItemId) {
      this.transferItemName = '';
      this.transferFromStock = 0;
      return;
    }

    const item = this.availableItems.find(i => i.id == this.transferItemId);
    if (item) {
      this.transferItemName = item.name;
      this.transferFromStock = item.stock || 0;
    }
  }

  /**
   * Sucursales destino disponibles (todas menos la actual)
   */
  getDestinationBranches(): any[] {
    return this.allBranches.filter(b => b.id !== this.currentBranchId);
  }

  /**
   * Validar si se puede confirmar la transferencia
   */
  canConfirmTransfer(): boolean {
    return !!(
      this.transferItemId &&
      this.transferToBranchId &&
      this.transferQuantity > 0 &&
      this.transferQuantity <= this.transferFromStock &&
      this.transferReason?.trim() &&
      !this.transferSaving
    );
  }

  /**
   * Stock resultante después de la transferencia (en origen)
   */
  getTransferNewStock(): number {
    return Math.max(0, this.transferFromStock - (this.transferQuantity || 0));
  }

  /**
   * Confirmar y ejecutar la transferencia
   */
  confirmTransfer() {
    if (!this.canConfirmTransfer()) {
      alert('Por favor complete todos los campos correctamente');
      return;
    }

    const destBranch = this.allBranches.find((b: any) => b.id == this.transferToBranchId);
    const destName = destBranch?.name || 'Destino';

    const confirmMsg = `¿Confirmar transferencia?\n\n` +
      `${this.transferItemName}\n` +
      `Cantidad: ${this.transferQuantity}\n` +
      `Destino: ${destName}\n\n` +
      `Stock actual: ${this.transferFromStock} → ${this.getTransferNewStock()}`;

    if (!confirm(confirmMsg)) {
      return;
    }

    this.transferSaving = true;

    this.productService.transferStock({
      from_branch_id: this.currentBranchId!,
      to_branch_id: this.transferToBranchId!,
      item_type: this.transferItemType,
      item_id: this.transferItemId!,
      quantity: this.transferQuantity,
      reason: this.transferReason
    }).subscribe({
      next: (response: any) => {
        this.transferSaving = false;

        if (response.success) {
          let msg = 'Transferencia realizada exitosamente';

          if (response.data?.affected_products > 0) {
            msg += `\n${response.data.affected_products} producto(s) con receta fueron recalculados.`;
          }

          alert(msg);
          this.closeTransferModal();
          this.loadData();
        } else {
          alert(response.message || 'Error al realizar la transferencia');
        }
      },
      error: (error: any) => {
        this.transferSaving = false;
        console.error('Error en transferencia:', error);
        alert(error.error?.message || 'Error al realizar la transferencia');
      }
    });
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
      case 'transferencia_entrada':
        return 'bi bi-box-arrow-in-down text-success';
      case 'transferencia_salida':
        return 'bi bi-box-arrow-up text-danger';
      default:
        return 'bi bi-circle text-secondary';
    }
  }

  getMovementLabel(type: string): string {
    switch (type) {
      case 'entrada': return 'Entrada';
      case 'salida': return 'Salida';
      case 'ajuste': return 'Ajuste';
      case 'transferencia_entrada': return 'Transfer. Entrada';
      case 'transferencia_salida': return 'Transfer. Salida';
      default: return type;
    }
  }

  /**
   * Helper para saber si la sucursal actual es la origen o destino de una transferencia
   */
  getTransferDirection(transfer: any): 'out' | 'in' {
    return transfer.from_branch_id === this.currentBranchId ? 'out' : 'in';
  }
}