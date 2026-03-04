import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import localeEs from '@angular/common/locales/es';
import { DashboardService } from '../../core/services/dashboard.service';

registerLocaleData(localeEs);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private subscriptions: Subscription[] = [];

  loading = false;
  today = new Date();

  currentUser: any = null;
  currentBranch: any = null;
  currentBranchName: string = '';

  // Estadísticas principales
  todaySales: number = 0;
  salesChange: number = 0;
  todayOrders: number = 0;
  pendingOrders: number = 0;
  lowStockCount: number = 0;
  totalProducts: number = 0;
  totalCombos: number = 0;
  totalIngredients: number = 0;

  // Datos para gráficos y listas
  weeklyData: any[] = [];
  weeklyTotal: number = 0;
  lowStockItems: any[] = [];
  recentOrders: any[] = [];
  topProducts: any[] = [];

  // Estado de caja
  cashStatus: any = null;

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.currentBranch = this.authService.getCurrentBranch();
    
    if (this.currentBranch) {
      this.currentBranchName = this.currentBranch.name || 'Sucursal';
    }
    
    const branchSub = this.authService.currentBranch$.subscribe(branch => {
      if (branch) {
        this.currentBranch = branch;
        this.currentBranchName = branch.name || 'Sucursal';
        this.loadDashboardData();
      }
    });
    this.subscriptions.push(branchSub);

    const userSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
      }
    });
    this.subscriptions.push(userSub);
    
    this.loadDashboardData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadDashboardData() {
    this.loading = true;
    this.lowStockItems = [];
    this.lowStockCount = 0;
    
    // Cargar resumen del dashboard (ventas, pedidos, etc.)
    this.loadDashboardSummary();
    
    // Cargar datos de inventario (stock bajo)
    this.loadInventoryStats();

    setTimeout(() => {
      this.loading = false;
    }, 1500);
  }

  refreshData() {
    this.loadDashboardData();
  }

  // ============================================
  // CARGAR RESUMEN DEL DASHBOARD
  // ============================================
  loadDashboardSummary() {
    this.dashboardService.getDashboardSummary().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const data = response.data;
          
          // Estadísticas de hoy
          this.todaySales = data.today.sales || 0;
          this.todayOrders = data.today.orders || 0;
          this.pendingOrders = data.today.pending || 0;
          this.salesChange = data.today.sales_change || 0;
          
          // Datos semanales
          this.weeklyData = data.weekly.data || [];
          this.weeklyTotal = data.weekly.total || 0;
          
          // Últimos pedidos
          this.recentOrders = data.recent_orders || [];
          
          // Productos más vendidos
          this.topProducts = data.top_products || [];
          
          // Estado de caja
          this.cashStatus = data.cash_status;
        }
      },
      error: (error) => {
        console.error('Error cargando resumen del dashboard:', error);
      }
    });
  }

  // ============================================
  // CARGAR ESTADÍSTICAS DE INVENTARIO
  // ============================================
  loadInventoryStats() {
    // Cargar productos
    this.productService.getProducts().subscribe({
      next: (response: any) => {
        const products = response?.data || response || [];
        this.totalProducts = products.filter((p: any) => p.is_active).length;
        
        const lowStock = products.filter((p: any) => 
          p.is_active && p.stock !== undefined && p.stock !== null && 
          p.min_stock && p.stock <= p.min_stock
        );
        this.addToLowStockItems(lowStock, 'Producto');
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.totalProducts = 0;
      }
    });

    // Cargar combos
    this.productService.getCombos().subscribe({
      next: (response: any) => {
        const combos = response?.data || response || [];
        this.totalCombos = combos.filter((c: any) => c.is_active).length;
      },
      error: (error) => {
        console.error('Error cargando combos:', error);
        this.totalCombos = 0;
      }
    });

    // Cargar ingredientes
    this.productService.getIngredients().subscribe({
      next: (response: any) => {
        const ingredients = response?.data || response || [];
        this.totalIngredients = ingredients.filter((i: any) => i.is_active).length;
        
        const lowStock = ingredients.filter((i: any) => 
          i.is_active && i.stock !== undefined && i.stock !== null && 
          i.min_stock && i.stock <= i.min_stock
        );
        this.addToLowStockItems(lowStock, 'Ingrediente');
      },
      error: (error) => {
        console.error('Error cargando ingredientes:', error);
        this.totalIngredients = 0;
      }
    });
  }

  addToLowStockItems(items: any[], type: string) {
    items.forEach(item => {
      this.lowStockItems.push({
        ...item,
        type: type
      });
    });
    this.lowStockCount = this.lowStockItems.length;
    this.lowStockItems.sort((a, b) => a.stock - b.stock);
  }

  // ============================================
  // HELPERS
  // ============================================
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  getUserFirstName(): string {
    if (!this.currentUser) return 'Usuario';
    const name = this.currentUser.name || this.currentUser.first_name || this.currentUser.username || 'Usuario';
    return name.split(' ')[0];
  }

  getBarHeight(amount: number): number {
    if (this.weeklyData.length === 0) return 0;
    const maxAmount = Math.max(...this.weeklyData.map(d => d.amount));
    return maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  }

  getOrderStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'pending': 'bi-clock',
      'confirmed': 'bi-check',
      'preparing': 'bi-fire',
      'ready': 'bi-bag-check',
      'completed': 'bi-check-circle-fill',
      'cancelled': 'bi-x-circle'
    };
    return icons[status] || 'bi-question-circle';
  }

  getOrderStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'pending': 'warning',
      'confirmed': 'info',
      'preparing': 'primary',
      'ready': 'success',
      'completed': 'success',
      'cancelled': 'danger'
    };
    return classes[status] || 'secondary';
  }

  goToInventory() {
    window.location.href = '/inventory';
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }
}