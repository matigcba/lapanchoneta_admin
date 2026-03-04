import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CouponService } from '../../core/services/coupon.service';
import { FranchiseService } from '../../core/services/franchise.service';
import { ProductService } from '../../core/services/product.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupons.component.html',
  styleUrl: './coupons.component.scss'
})
export class CouponsComponent implements OnInit {
  private router = inject(Router);
  private couponService = inject(CouponService);
  private franchiseService = inject(FranchiseService);
  private productService = inject(ProductService);
  private userService = inject(UserService);

  // Estado
  loading = false;
  saving = false;
  showModal = false;
  showUsageModal = false;
  editingCoupon: any = null;

  // Datos
  coupons: any[] = [];
  filteredCoupons: any[] = [];
  couponUsage: any[] = [];
  loadingUsage = false;
  branches: any[] = [];
  products: any[] = [];

  // Filtros
  searchTerm = '';
  showInactive = false;
  filterStatus = 'all';

  // Cupón actual para modal
  currentCoupon: any = this.getEmptyCoupon();
  selectedBranches: number[] = [];
  selectedProducts: number[] = [];
  selectedCouponForUsage: any = null;

  // Usuarios específicos
  userSearchTerm = '';
  userSearchResults: any[] = [];
  selectedUsersData: any[] = [];
  loadingUsers = false;
  showUserResults = false;
  private searchTimeout: any;

  // Stats
  stats = {
    total: 0,
    active: 0,
    expired: 0,
    scheduled: 0,
    totalUses: 0
  };

  // Getter para obtener solo los IDs (para enviar al backend)
  get selectedUserIds(): number[] {
    return this.selectedUsersData.map(u => u.id);
  }

  ngOnInit() {
    this.loadCoupons();
    this.loadBranches();
    this.loadProducts();
  }

  getEmptyCoupon(): any {
    return {
      id: null,
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_purchase_amount: null,
      max_discount_amount: null,
      max_uses: null,
      max_uses_per_user: 1,
      starts_at: '',
      expires_at: '',
      applicable_branches: null,
      applicable_products: null,
      is_active: true,
      is_user_specific: false
    };
  }

  // ==================== CARGA DE DATOS ====================

  loadCoupons() {
    this.loading = true;
    this.couponService.getCoupons(this.showInactive).subscribe({
      next: (coupons) => {
        this.coupons = coupons;
        this.calculateStats();
        this.filterCoupons();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando cupones:', err);
        this.loading = false;
      }
    });
  }

  loadBranches() {
    this.franchiseService.getBranches(true).subscribe({
      next: (response) => {
        this.branches = response?.data || response || [];
      },
      error: (err) => console.error('Error cargando sucursales:', err)
    });
  }

  loadProducts() {
    this.productService.getProducts(null, true).subscribe({
      next: (products) => {
        this.products = products || [];
      },
      error: (err) => console.error('Error cargando productos:', err)
    });
  }

  // ==================== ESTADÍSTICAS ====================

  calculateStats() {
    this.stats = {
      total: this.coupons.length,
      active: this.coupons.filter(c => this.getCouponStatus(c) === 'active').length,
      expired: this.coupons.filter(c => this.getCouponStatus(c) === 'expired').length,
      scheduled: this.coupons.filter(c => this.getCouponStatus(c) === 'scheduled').length,
      totalUses: this.coupons.reduce((sum, c) => sum + (c.current_uses || 0), 0)
    };
  }

  getCouponStatus(coupon: any): string {
    const now = new Date();
    if (!coupon.is_active) return 'inactive';
    if (coupon.starts_at && new Date(coupon.starts_at) > now) return 'scheduled';
    if (coupon.expires_at && new Date(coupon.expires_at) < now) return 'expired';
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) return 'depleted';
    return 'active';
  }

  getStatusBadgeClass(coupon: any): string {
    const status = this.getCouponStatus(coupon);
    const classes: any = {
      'active': 'badge bg-success',
      'inactive': 'badge bg-secondary',
      'expired': 'badge bg-danger',
      'scheduled': 'badge bg-info',
      'depleted': 'badge bg-warning text-dark'
    };
    return classes[status] || 'badge bg-secondary';
  }

  getStatusText(coupon: any): string {
    const status = this.getCouponStatus(coupon);
    const texts: any = {
      'active': 'Activo',
      'inactive': 'Inactivo',
      'expired': 'Expirado',
      'scheduled': 'Programado',
      'depleted': 'Agotado'
    };
    return texts[status] || 'Desconocido';
  }

  // ==================== FILTROS ====================

  filterCoupons() {
    let filtered = [...this.coupons];

    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(c => this.getCouponStatus(c) === this.filterStatus);
    }

    if (!this.showInactive) {
      filtered = filtered.filter(c => c.is_active);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.code?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term)
      );
    }

    this.filteredCoupons = filtered;
  }

  onShowInactiveChange() {
    this.loadCoupons();
  }

  setFilterStatus(status: string) {
    this.filterStatus = status;
    this.filterCoupons();
  }

  // ==================== MODAL CREAR/EDITAR ====================

  openModal(coupon?: any) {
    if (coupon) {
      this.editingCoupon = coupon;
      this.currentCoupon = { ...coupon };
      this.selectedBranches = coupon.applicable_branches ? [...coupon.applicable_branches] : [];
      this.selectedProducts = coupon.applicable_products ? [...coupon.applicable_products] : [];

      if (this.currentCoupon.starts_at) {
        this.currentCoupon.starts_at = this.formatDateForInput(this.currentCoupon.starts_at);
      }
      if (this.currentCoupon.expires_at) {
        this.currentCoupon.expires_at = this.formatDateForInput(this.currentCoupon.expires_at);
      }

      // Cargar usuarios asignados si es específico
      if (coupon.is_user_specific) {
        this.couponService.getCouponUsers(coupon.id).subscribe({
          next: (users) => {
            this.selectedUsersData = users;
          },
          error: () => {
            this.selectedUsersData = [];
          }
        });
      } else {
        this.selectedUsersData = [];
      }
    } else {
      this.editingCoupon = null;
      this.currentCoupon = this.getEmptyCoupon();
      this.selectedBranches = [];
      this.selectedProducts = [];
      this.selectedUsersData = [];
    }

    // Limpiar búsqueda de usuarios
    this.userSearchTerm = '';
    this.userSearchResults = [];
    this.showUserResults = false;

    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingCoupon = null;
    this.currentCoupon = this.getEmptyCoupon();
    this.selectedBranches = [];
    this.selectedProducts = [];
    this.selectedUsersData = [];
    this.userSearchTerm = '';
    this.userSearchResults = [];
    this.showUserResults = false;
  }

  formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  }

  formatDateDisplay(dateStr: string): string {
    if (!dateStr) return 'Sin definir';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.currentCoupon.code = code;
  }

  // ==================== SELECCIÓN DE SUCURSALES/PRODUCTOS ====================

  toggleBranch(branchId: number) {
    const index = this.selectedBranches.indexOf(branchId);
    if (index > -1) {
      this.selectedBranches.splice(index, 1);
    } else {
      this.selectedBranches.push(branchId);
    }
  }

  toggleProduct(productId: number) {
    const index = this.selectedProducts.indexOf(productId);
    if (index > -1) {
      this.selectedProducts.splice(index, 1);
    } else {
      this.selectedProducts.push(productId);
    }
  }

  selectAllBranches() {
    this.selectedBranches = this.branches.map(b => b.id);
  }

  clearBranches() {
    this.selectedBranches = [];
  }

  selectAllProducts() {
    this.selectedProducts = this.products.map(p => p.id);
  }

  clearProducts() {
    this.selectedProducts = [];
  }

  // ==================== USUARIOS ESPECÍFICOS ====================

  onUserSearch() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (this.userSearchTerm.length < 3) {
      this.userSearchResults = [];
      this.showUserResults = false;
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.searchUsers();
    }, 300);
  }

  searchUsers() {
    if (this.userSearchTerm.length < 3) return;

    this.loadingUsers = true;
    this.showUserResults = true;

    this.userService.getUsersList(this.userSearchTerm).subscribe({
      next: (users) => {
        this.userSearchResults = users;
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Error buscando usuarios:', err);
        this.userSearchResults = [];
        this.loadingUsers = false;
      }
    });
  }

  addUser(user: any) {
    if (this.isUserSelected(user.id)) return;

    this.selectedUsersData.push(user);
    this.userSearchTerm = '';
    this.userSearchResults = [];
    this.showUserResults = false;
  }

  removeUser(userId: number) {
    this.selectedUsersData = this.selectedUsersData.filter(u => u.id !== userId);
  }

  clearAllUsers() {
    this.selectedUsersData = [];
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUsersData.some(u => u.id === userId);
  }

  // ==================== GUARDAR CUPÓN ====================

  saveCoupon() {
    if (!this.validateCoupon()) return;

    if (this.currentCoupon.is_user_specific && this.selectedUsersData.length === 0) {
      alert('Debes seleccionar al menos un usuario para cupones específicos');
      return;
    }

    this.saving = true;
    this.currentCoupon.code = this.currentCoupon.code.toUpperCase().trim();

    const payload = {
      ...this.currentCoupon,
      applicable_branches: this.selectedBranches.length > 0 ? this.selectedBranches : null,
      applicable_products: this.selectedProducts.length > 0 ? this.selectedProducts : null,
      assigned_users: this.currentCoupon.is_user_specific ? this.selectedUserIds : [],
      starts_at: this.currentCoupon.starts_at || null,
      expires_at: this.currentCoupon.expires_at || null,
      min_purchase_amount: this.currentCoupon.min_purchase_amount || null,
      max_discount_amount: this.currentCoupon.max_discount_amount || null,
      max_uses: this.currentCoupon.max_uses || null
    };

    const request = this.editingCoupon
      ? this.couponService.updateCoupon(this.currentCoupon.id, payload)
      : this.couponService.createCoupon(payload);

    request.subscribe({
      next: (response: any) => {
        if (response.success !== false) {
          this.loadCoupons();
          this.closeModal();
          alert(this.editingCoupon ? 'Cupón actualizado correctamente' : 'Cupón creado exitosamente');
        } else {
          alert(response.message || 'Error al guardar');
        }
        this.saving = false;
      },
      error: (err) => {
        console.error('Error guardando cupón:', err);
        alert(err.error?.message || 'Error al guardar el cupón');
        this.saving = false;
      }
    });
  }

  validateCoupon(): boolean {
    if (!this.currentCoupon.code?.trim()) {
      alert('El código es requerido');
      return false;
    }
    if (!this.currentCoupon.discount_value || this.currentCoupon.discount_value <= 0) {
      alert('El valor del descuento debe ser mayor a 0');
      return false;
    }
    if (this.currentCoupon.discount_type === 'percentage' && this.currentCoupon.discount_value > 100) {
      alert('El porcentaje no puede ser mayor a 100%');
      return false;
    }
    return true;
  }

  // ==================== ACCIONES ====================

  toggleStatus(coupon: any) {
    const newStatus = !coupon.is_active;
    const action = newStatus ? 'activar' : 'desactivar';

    if (!confirm(`¿Estás seguro de ${action} el cupón "${coupon.code}"?`)) return;

    this.couponService.toggleCouponStatus(coupon.id, newStatus).subscribe({
      next: () => {
        coupon.is_active = newStatus;
        this.calculateStats();
        this.filterCoupons();
      },
      error: (err) => {
        console.error('Error:', err);
        alert('Error al cambiar el estado');
      }
    });
  }

  deleteCoupon(coupon: any) {
    if (coupon.current_uses > 0) {
      alert('No se puede eliminar un cupón que ya ha sido usado. Puedes desactivarlo.');
      return;
    }

    if (!confirm(`¿Eliminar el cupón "${coupon.code}"? Esta acción no se puede deshacer.`)) return;

    this.couponService.deleteCoupon(coupon.id).subscribe({
      next: () => {
        this.loadCoupons();
      },
      error: (err) => {
        console.error('Error:', err);
        alert(err.error?.message || 'Error al eliminar el cupón');
      }
    });
  }

  duplicateCoupon(coupon: any) {
    this.openModal();
    this.currentCoupon = {
      ...coupon,
      id: null,
      code: coupon.code + '_COPY',
      current_uses: 0,
      is_active: false,
      is_user_specific: false
    };
    this.selectedBranches = coupon.applicable_branches ? [...coupon.applicable_branches] : [];
    this.selectedProducts = coupon.applicable_products ? [...coupon.applicable_products] : [];
    this.selectedUsersData = [];
  }

  // ==================== MODAL DE USO ====================

  openUsageModal(coupon: any) {
    this.selectedCouponForUsage = coupon;
    this.showUsageModal = true;
    this.loadCouponUsage(coupon.id);
  }

  closeUsageModal() {
    this.showUsageModal = false;
    this.selectedCouponForUsage = null;
    this.couponUsage = [];
  }

  loadCouponUsage(couponId: number) {
    this.loadingUsage = true;
    this.couponService.getCouponUsage(couponId).subscribe({
      next: (usage) => {
        this.couponUsage = usage;
        this.loadingUsage = false;
      },
      error: (err) => {
        console.error('Error cargando uso:', err);
        this.loadingUsage = false;
      }
    });
  }

  // ==================== HELPERS ====================

  getDiscountDisplay(coupon: any): string {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return `$${coupon.discount_value.toLocaleString('es-AR')}`;
  }

  getUsageDisplay(coupon: any): string {
    if (coupon.max_uses) {
      return `${coupon.current_uses} / ${coupon.max_uses}`;
    }
    return `${coupon.current_uses} (ilimitado)`;
  }

  getDaysRemaining(coupon: any): number | null {
    if (!coupon.expires_at) return null;
    const now = new Date();
    const expires = new Date(coupon.expires_at);
    const diff = expires.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}