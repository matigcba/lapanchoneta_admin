import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../../core/services/orders.service';
import { BranchEventService } from '../../core/services/branch-event.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  private ordersService = inject(OrdersService);
  private branchEventService = inject(BranchEventService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  orders: any[] = [];
  filteredOrders: any[] = [];
  paginatedOrders: any[] = [];
  selectedOrder: any = null;
  currentBranchId: number | null = null;
  loading = false;
  
  // Filtros
  searchTerm = '';
  selectedSource = '';
  selectedStatus = '';
  selectedPaymentStatus = '';
  selectedDate = this.getTodayDate();
  activeTab = 'all';
  
  // Paginación
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 1;
  pageSizeOptions = [12, 24, 48, 100];
  
  // Estadísticas
  stats = {
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0
  };
  
  // Modal
  showOrderModal = false;
  
  ngOnInit() {
    this.currentBranchId = this.ordersService.getCurrentBranchId();
    
    // Debounce para búsqueda
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.filterOrders();
    });
    
    this.branchEventService.branchChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe(branchId => {
        if (branchId !== this.currentBranchId) {
          this.currentBranchId = branchId;
          this.loadOrders();
        }
      });
    
    this.loadOrders();
    
    // Auto-refresh cada 30 segundos
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadOrders(true));
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadOrders(silent: boolean = false) {
    if (!silent) this.loading = true;
    
    const filters: any = {
      date_from: this.selectedDate,
      date_to: this.selectedDate
    };
    
    this.ordersService.getOrders(filters).subscribe({
      next: (response) => {
        this.orders = response.data || response || [];
        this.calculateStats();
        this.filterOrders();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando pedidos:', error);
        this.orders = [];
        this.loading = false;
      }
    });
  }
  
  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
  }
  
  filterOrders() {
    let filtered = [...this.orders];
    
    // Filtrar por tab activo
    if (this.activeTab !== 'all') {
      switch(this.activeTab) {
        case 'pending':
          filtered = filtered.filter(o => o.status === 'confirmed' || o.status === 'pending');
          break;
        case 'preparing':
          filtered = filtered.filter(o => o.status === 'preparing' || o.status === 'ready');
          break;
        case 'completed':
          filtered = filtered.filter(o => o.status === 'completed');
          break;
        case 'cancelled':
          filtered = filtered.filter(o => o.status === 'cancelled');
          break;
      }
    }
    
    // Filtrar por origen
    if (this.selectedSource) {
      filtered = filtered.filter(o => o.order_source === this.selectedSource);
    }
    
    // Filtrar por estado de pago
    if (this.selectedPaymentStatus) {
      filtered = filtered.filter(o => o.payment_status === this.selectedPaymentStatus);
    }
    
    // Filtrar por búsqueda
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order => 
        (order.order_number && order.order_number.toLowerCase().includes(term)) ||
        (order.user_name && order.user_name.toLowerCase().includes(term)) ||
        (order.admin_name && order.admin_name.toLowerCase().includes(term)) ||
        (order.customer_phone && order.customer_phone.includes(term)) ||
        (order.id && order.id.toString().includes(term))
      );
    }
    
    // Ordenar: pendientes primero, luego por fecha
    filtered.sort((a, b) => {
      const statusPriority: any = {
        'confirmed': 0,
        'pending': 1,
        'preparing': 2,
        'ready': 3,
        'completed': 4,
        'cancelled': 5
      };
      
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    this.filteredOrders = filtered;
    this.updatePagination();
  }
  
  // ========== PAGINACIÓN ==========
  
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
    this.paginateOrders();
  }
  
  paginateOrders() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedOrders = this.filteredOrders.slice(start, end);
  }
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateOrders();
      // Scroll arriba
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  nextPage() {
    this.goToPage(this.currentPage + 1);
  }
  
  prevPage() {
    this.goToPage(this.currentPage - 1);
  }
  
  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagination();
  }
  
  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
  
  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }
  
  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredOrders.length);
  }
  
  calculateStats() {
    this.stats.totalOrders = this.orders.length;
    this.stats.totalRevenue = this.orders
      .filter(o => o.status !== 'cancelled' && o.payment_status === 'paid')
      .reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    this.stats.pendingOrders = this.orders.filter(o => o.status === 'confirmed' || o.status === 'pending').length;
    this.stats.preparingOrders = this.orders.filter(o => o.status === 'preparing').length;
    this.stats.readyOrders = this.orders.filter(o => o.status === 'ready').length;
    this.stats.completedOrders = this.orders.filter(o => o.status === 'completed').length;
    this.stats.cancelledOrders = this.orders.filter(o => o.status === 'cancelled').length;
  }
  
  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.currentPage = 1;
    this.filterOrders();
  }
  
  clearFilters() {
    this.searchTerm = '';
    this.selectedSource = '';
    this.selectedPaymentStatus = '';
    this.activeTab = 'all';
    this.currentPage = 1;
    this.filterOrders();
  }
  
  viewOrder(order: any) {
    this.ordersService.getOrder(order.id).subscribe({
      next: (response) => {
        this.selectedOrder = response.data || response;
        this.showOrderModal = true;
      },
      error: (error) => {
        console.error('Error cargando detalles:', error);
      }
    });
  }
  
  closeOrderModal() {
    this.showOrderModal = false;
    this.selectedOrder = null;
  }
  
  // ========== HELPERS DE ESTADO ==========
  
  getStatusIcon(status: string): string {
    const icons: any = {
      'pending': 'bi bi-clock',
      'confirmed': 'bi bi-check-circle',
      'preparing': 'bi bi-fire',
      'ready': 'bi bi-bag-check',
      'completed': 'bi bi-check-circle-fill',
      'cancelled': 'bi bi-x-circle'
    };
    return icons[status] || 'bi bi-clock';
  }
  
  getStatusBadgeClass(status: string): string {
    const classes: any = {
      'pending': 'badge bg-secondary',
      'confirmed': 'badge bg-info',
      'preparing': 'badge bg-warning text-dark',
      'ready': 'badge bg-success',
      'completed': 'badge bg-secondary',
      'cancelled': 'badge bg-danger'
    };
    return classes[status] || 'badge bg-secondary';
  }
  
  getStatusLabel(status: string): string {
    const labels: any = {
      'pending': 'Pendiente',
      'confirmed': 'Confirmado',
      'preparing': 'Preparando',
      'ready': 'Listo',
      'completed': 'Completado',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  }
  
  // ========== HELPERS DE ORIGEN ==========
  
  getSourceIcon(source: string): string {
    const icons: any = {
      'pos': 'bi bi-shop',
      'app': 'bi bi-phone',
      'pedidos_ya': 'bi bi-bicycle',
      'rappi': 'bi bi-bag',
      'uber_eats': 'bi bi-car-front'
    };
    return icons[source] || 'bi bi-cart';
  }
  
  getSourceName(source: string): string {
    const names: any = {
      'pos': 'POS',
      'app': 'App',
      'pedidos_ya': 'PedidosYa',
      'rappi': 'Rappi',
      'uber_eats': 'Uber Eats'
    };
    return names[source] || source || 'POS';
  }
  
  getSourceColor(source: string): string {
    const colors: any = {
      'pos': '#6366f1',
      'app': '#3b82f6',
      'pedidos_ya': '#ef4444',
      'rappi': '#f97316',
      'uber_eats': '#000000'
    };
    return colors[source] || '#6b7280';
  }
  
  // ========== HELPERS DE PAGO ==========
  
  getPaymentIcon(method: string): string {
    const icons: any = {
      'cash': 'bi bi-cash-stack',
      'card': 'bi bi-credit-card',
      'transfer': 'bi bi-bank',
      'qr': 'bi bi-qr-code',
      'mercadopago': 'bi bi-qr-code',
      'multiple': 'bi bi-wallet2'
    };
    return icons[method] || 'bi bi-wallet';
  }
  
  getPaymentColor(method: string): string {
    const colors: any = {
      'cash': '#22c55e',
      'card': '#3b82f6',
      'transfer': '#8b5cf6',
      'qr': '#6366f1',
      'mercadopago': '#00bcff',
      'multiple': '#f59e0b'
    };
    return colors[method] || '#6b7280';
  }
  
  getPaymentMethodLabel(method: string): string {
    const labels: any = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'qr': 'QR',
      'mercadopago': 'MercadoPago',
      'multiple': 'Múltiple'
    };
    return labels[method] || method || 'Efectivo';
  }
  
  // ========== HELPERS GENERALES ==========
  
  getOrderTypeLabel(type: string): string {
    const labels: any = {
      'local': 'Para comer aquí',
      'takeaway': 'Para llevar',
      'delivery': 'Delivery',
      'pickup': 'Retiro en local'
    };
    return labels[type] || type || 'Local';
  }
  
  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  formatDateTime(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  getTimeAgo(date: string): string {
    if (!date) return '';
    const now = new Date();
    const orderDate = new Date(date);
    const diff = Math.floor((now.getTime() - orderDate.getTime()) / 1000);
    
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }
}