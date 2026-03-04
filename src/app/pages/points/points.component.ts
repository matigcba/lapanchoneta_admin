import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProductService } from '../../core/services/product.service';
import { PointsService } from 'src/app/core/services/puntos.service';

@Component({
  selector: 'app-points',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './points.component.html',
  styleUrl: './points.component.scss'
})
export class PointsComponent implements OnInit {
  private pointsService = inject(PointsService);
  private productService = inject(ProductService);

  // Tabs
  activeTab: 'dashboard' | 'config' | 'products' | 'users' | 'transactions' = 'dashboard';

  // Loading states
  loading = false;
  saving = false;

  // Dashboard
  stats: any = null;

  // Configuración
  config: any = null;

  // Productos canjeables
  pointsProducts: any[] = [];
  allProducts: any[] = [];
  showProductModal = false;
  editingProduct: any = null;
  currentProduct: any = this.getEmptyProduct();

  // Usuarios
  users: any[] = [];
  usersPagination: any = { page: 1, limit: 20, total: 0, pages: 0 };
  userSearchTerm = '';
  showUserModal = false;
  selectedUser: any = null;
  adjustPoints = 0;
  adjustReason = '';

  // Transacciones
  transactions: any[] = [];
  transactionsPagination: any = { page: 1, limit: 50, total: 0, pages: 0 };
  transactionTypeFilter = '';

  ngOnInit() {
    this.loadDashboard();
  }

  // ==================== TABS ====================

  setTab(tab: 'dashboard' | 'config' | 'products' | 'users' | 'transactions') {
    this.activeTab = tab;
    
    switch (tab) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'config':
        this.loadConfig();
        break;
      case 'products':
        this.loadPointsProducts();
        this.loadAllProducts();
        break;
      case 'users':
        this.loadUsers();
        break;
      case 'transactions':
        this.loadTransactions();
        break;
    }
  }

  // ==================== DASHBOARD ====================

  loadDashboard() {
    this.loading = true;
    this.pointsService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando stats:', err);
        this.loading = false;
      }
    });
  }

  // ==================== CONFIGURACIÓN ====================

  loadConfig() {
    this.loading = true;
    this.pointsService.getConfig().subscribe({
      next: (config) => {
        this.config = config;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando config:', err);
        this.loading = false;
      }
    });
  }

  saveConfig() {
    this.saving = true;
    this.pointsService.updateConfig(this.config).subscribe({
      next: (response) => {
        if (response.success !== false) {
          alert('Configuración guardada correctamente');
        } else {
          alert(response.message || 'Error al guardar');
        }
        this.saving = false;
      },
      error: (err) => {
        console.error('Error guardando config:', err);
        alert('Error al guardar la configuración');
        this.saving = false;
      }
    });
  }

  // ==================== PRODUCTOS CANJEABLES ====================

  loadPointsProducts() {
    this.loading = true;
    this.pointsService.getProducts(true).subscribe({
      next: (products) => {
        this.pointsProducts = products;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.loading = false;
      }
    });
  }

  loadAllProducts() {
    this.productService.getProducts(null, true).subscribe({
      next: (products) => {
        this.allProducts = products || [];
      },
      error: (err) => console.error('Error cargando productos:', err)
    });
  }

  getEmptyProduct(): any {
    return {
      id: null,
      product_id: null,
      points_cost: 100,
      stock_limit: null,
      per_user_limit: 1,
      starts_at: '',
      expires_at: '',
      is_active: true
    };
  }

  openProductModal(product?: any) {
    if (product) {
      this.editingProduct = product;
      this.currentProduct = { ...product };
      if (this.currentProduct.starts_at) {
        this.currentProduct.starts_at = this.formatDateForInput(this.currentProduct.starts_at);
      }
      if (this.currentProduct.expires_at) {
        this.currentProduct.expires_at = this.formatDateForInput(this.currentProduct.expires_at);
      }
    } else {
      this.editingProduct = null;
      this.currentProduct = this.getEmptyProduct();
    }
    this.showProductModal = true;
  }

  closeProductModal() {
    this.showProductModal = false;
    this.editingProduct = null;
    this.currentProduct = this.getEmptyProduct();
  }

  saveProduct() {
    if (!this.currentProduct.product_id || !this.currentProduct.points_cost) {
      alert('Producto y costo en puntos son requeridos');
      return;
    }

    this.saving = true;

    const payload = {
      ...this.currentProduct,
      starts_at: this.currentProduct.starts_at || null,
      expires_at: this.currentProduct.expires_at || null,
      stock_limit: this.currentProduct.stock_limit || null
    };

    const request = this.editingProduct
      ? this.pointsService.updateProduct(this.currentProduct.id, payload)
      : this.pointsService.createProduct(payload);

    request.subscribe({
      next: (response) => {
        if (response.success !== false) {
          this.loadPointsProducts();
          this.closeProductModal();
          alert(this.editingProduct ? 'Producto actualizado' : 'Producto creado');
        } else {
          alert(response.message || 'Error al guardar');
        }
        this.saving = false;
      },
      error: (err) => {
        console.error('Error guardando producto:', err);
        alert(err.error?.message || 'Error al guardar');
        this.saving = false;
      }
    });
  }

  deleteProduct(product: any) {
    if (!confirm(`¿Eliminar "${product.product_name}" de productos canjeables?`)) return;

    this.pointsService.deleteProduct(product.id).subscribe({
      next: (response) => {
        if (response.success !== false) {
          this.loadPointsProducts();
        } else {
          alert(response.message || 'Error al eliminar');
        }
      },
      error: (err) => {
        console.error('Error eliminando:', err);
        alert(err.error?.message || 'Error al eliminar');
      }
    });
  }

  getAvailableProducts(): any[] {
    const usedIds = this.pointsProducts.map(p => p.product_id);
    return this.allProducts.filter(p => !usedIds.includes(p.id) || p.id === this.currentProduct.product_id);
  }

  // ==================== USUARIOS ====================

  loadUsers() {
    this.loading = true;
    this.pointsService.getUsers({
      search: this.userSearchTerm,
      page: this.usersPagination.page,
      limit: this.usersPagination.limit
    }).subscribe({
      next: (response) => {
        this.users = response.data || [];
        this.usersPagination = response.pagination || this.usersPagination;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando usuarios:', err);
        this.loading = false;
      }
    });
  }

  searchUsers() {
    this.usersPagination.page = 1;
    this.loadUsers();
  }

  changeUsersPage(page: number) {
    this.usersPagination.page = page;
    this.loadUsers();
  }

  openUserModal(user: any) {
    this.selectedUser = null;
    this.adjustPoints = 0;
    this.adjustReason = '';
    
    this.pointsService.getUserPoints(user.user_id).subscribe({
      next: (userData) => {
        this.selectedUser = userData;
        this.showUserModal = true;
      },
      error: (err) => {
        console.error('Error cargando usuario:', err);
        alert('Error al cargar datos del usuario');
      }
    });
  }

  closeUserModal() {
    this.showUserModal = false;
    this.selectedUser = null;
    this.adjustPoints = 0;
    this.adjustReason = '';
  }

  adjustUserPoints() {
    if (this.adjustPoints === 0) {
      alert('Ingresa una cantidad de puntos');
      return;
    }
    if (!this.adjustReason.trim()) {
      alert('Ingresa un motivo');
      return;
    }

    this.saving = true;
    this.pointsService.adjustUserPoints(this.selectedUser.id, this.adjustPoints, this.adjustReason).subscribe({
      next: (response) => {
        if (response.success !== false) {
          alert(response.message || 'Puntos ajustados correctamente');
          this.closeUserModal();
          this.loadUsers();
        } else {
          alert(response.message || 'Error al ajustar puntos');
        }
        this.saving = false;
      },
      error: (err) => {
        console.error('Error ajustando puntos:', err);
        alert(err.error?.message || 'Error al ajustar puntos');
        this.saving = false;
      }
    });
  }

  // ==================== TRANSACCIONES ====================

  loadTransactions() {
    this.loading = true;
    this.pointsService.getTransactions({
      type: this.transactionTypeFilter || undefined,
      page: this.transactionsPagination.page,
      limit: this.transactionsPagination.limit
    }).subscribe({
      next: (response) => {
        this.transactions = response.data || [];
        this.transactionsPagination = response.pagination || this.transactionsPagination;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando transacciones:', err);
        this.loading = false;
      }
    });
  }

  filterTransactions() {
    this.transactionsPagination.page = 1;
    this.loadTransactions();
  }

  changeTransactionsPage(page: number) {
    this.transactionsPagination.page = page;
    this.loadTransactions();
  }

  // ==================== HELPERS ====================

  formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatNumber(num: number): string {
    return num?.toLocaleString('es-AR') || '0';
  }

  getTypeText(type: string): string {
    const types: any = {
      'earn': 'Ganados',
      'redeem': 'Canjeados',
      'expire': 'Vencidos',
      'adjust': 'Ajuste',
      'bonus': 'Bonificación'
    };
    return types[type] || type;
  }

  getTypeBadgeClass(type: string): string {
    const classes: any = {
      'earn': 'badge bg-success',
      'redeem': 'badge bg-primary',
      'expire': 'badge bg-secondary',
      'adjust': 'badge bg-warning',
      'bonus': 'badge bg-info'
    };
    return classes[type] || 'badge bg-secondary';
  }
}