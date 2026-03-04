import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { BranchEventService } from '../../core/services/branch-event.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-report-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-sales.component.html',
  styleUrls: ['./report-sales.component.scss']
})
export class ReportSalesComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private branchEventService = inject(BranchEventService);
  private destroy$ = new Subject<void>();
  private apiUrl = environment.apiUrl;

  // Estado
  loading = false;
  exporting = false;

  // Multi-branch
  isMultiBranch = false;

  // Tipo de reporte
  reportType = 'products'; // products, categories, branches, employees

  // Período
  period = 'today';
  dateFrom = '';
  dateTo = '';

  // Datos
  data: any[] = [];
  summary: any = {
    total_orders: 0,
    total_revenue: 0,
    avg_ticket: 0,
    cancelled_orders: 0,
    active_days: 0,
    avg_daily_revenue: 0
  };
  trend: any[] = [];

  // Chart
  maxChartValue = 0;

  ngOnInit() {
    // Escuchar cambios de sucursal
    this.branchEventService.branchChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((branchId: number) => {
        this.isMultiBranch = (branchId === -1);
        this.loadReport();
      });

    this.authService.currentBranch$
      .pipe(takeUntil(this.destroy$))
      .subscribe(branch => {
        if (branch && !this.isMultiBranch) {
          this.loadReport();
        }
      });

    this.loadReport();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getBranchParam(): string {
    if (this.isMultiBranch) return 'all';
    const branchId = localStorage.getItem('selectedBranchId');
    return branchId || '';
  }

  loadReport() {
    this.loading = true;

    let params = new HttpParams()
      .set('branch_id', this.getBranchParam())
      .set('report_type', this.reportType)
      .set('period', this.period);

    if (this.period === 'custom') {
      if (this.dateFrom) params = params.set('date_from', this.dateFrom);
      if (this.dateTo) params = params.set('date_to', this.dateTo);
    }

    this.http.get<any>(`${this.apiUrl}/reports/sales`, { params }).subscribe({
      next: (response) => {
        if (response.success) {
          this.data = response.data || [];
          this.summary = response.summary || {};
          this.trend = response.trend || [];
          this.isMultiBranch = response.is_multi_branch || false;

          // Calcular max para el chart de barras
          this.calculateMaxChart();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando reporte:', error);
        this.data = [];
        this.loading = false;
      }
    });
  }

  calculateMaxChart() {
    if (this.reportType === 'products' || this.reportType === 'employees') {
      this.maxChartValue = Math.max(...this.data.map(d => d.total_quantity || d.total_revenue || 0), 1);
    } else if (this.reportType === 'categories' || this.reportType === 'branches') {
      this.maxChartValue = Math.max(...this.data.map(d => d.total_revenue || 0), 1);
    }
  }

  // ============================================
  // FILTROS
  // ============================================

  onReportTypeChange() {
    this.loadReport();
  }

  setPeriod(p: string) {
    this.period = p;
    if (p !== 'custom') {
      this.loadReport();
    }
  }

  applyCustomDates() {
    if (this.dateFrom && this.dateTo) {
      this.loadReport();
    }
  }

  // ============================================
  // CHART HELPERS
  // ============================================

  getBarWidth(value: number): number {
    if (this.maxChartValue === 0) return 0;
    return Math.max(2, (value / this.maxChartValue) * 100);
  }

  getBarColor(index: number): string {
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];
    return colors[index % colors.length];
  }

  getTrendMax(): number {
    return Math.max(...this.trend.map(t => t.revenue), 1);
  }

  getTrendBarHeight(value: number): number {
    const max = this.getTrendMax();
    return Math.max(4, (value / max) * 100);
  }

  formatDay(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
  }

  // ============================================
  // HELPERS GENERALES
  // ============================================

  getPeriodLabel(): string {
    const labels: { [key: string]: string } = {
      'today': 'Hoy', 'yesterday': 'Ayer', 'week': 'Última semana',
      'month': 'Último mes', 'custom': `${this.dateFrom} - ${this.dateTo}`
    };
    return labels[this.period] || 'Hoy';
  }

  getReportTypeLabel(): string {
    const labels: { [key: string]: string } = {
      'products': 'Productos más vendidos',
      'categories': 'Ventas por categoría',
      'branches': 'Ventas por sucursal',
      'employees': 'Ventas por empleado'
    };
    return labels[this.reportType] || '';
  }

  getRoleName(role: string): string {
    const names: { [key: string]: string } = {
      'superadmin': 'Super Admin', 'admin': 'Admin', 'manager': 'Gerente', 'employee': 'Empleado'
    };
    return names[role] || role;
  }

  // ============================================
  // EXPORTAR EXCEL
  // ============================================

  exportExcel() {
    if (this.data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    this.exporting = true;
    const branchLabel = this.isMultiBranch ? 'Todas las Sucursales' : 'Sucursal';

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #6366f1; color: white; font-weight: bold; }
          .number { text-align: right; }
          .header { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .subheader { color: #666; margin-bottom: 15px; }
          .summary-table { margin-bottom: 20px; }
          .summary-table td { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">${this.getReportTypeLabel()} - ${branchLabel}</div>
        <div class="subheader">Período: ${this.getPeriodLabel()} | Generado: ${new Date().toLocaleString('es-AR')}</div>
        
        <table class="summary-table">
          <tr><td>Total Órdenes:</td><td>${this.summary.total_orders}</td><td>Ingresos:</td><td>$${this.summary.total_revenue?.toFixed(2)}</td></tr>
          <tr><td>Ticket Promedio:</td><td>$${this.summary.avg_ticket?.toFixed(2)}</td><td>Promedio Diario:</td><td>$${this.summary.avg_daily_revenue?.toFixed(2)}</td></tr>
        </table>
        
        <table><thead><tr>`;

    // Headers según tipo de reporte
    if (this.reportType === 'products') {
      html += '<th>#</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Ingresos</th><th>Órdenes</th><th>Precio Prom.</th>';
    } else if (this.reportType === 'categories') {
      html += '<th>#</th><th>Categoría</th><th>Cantidad</th><th>Ingresos</th><th>Productos</th><th>Órdenes</th>';
    } else if (this.reportType === 'branches') {
      html += '<th>Sucursal</th><th>Órdenes</th><th>Ingresos</th><th>Ticket Prom.</th><th>Efectivo</th><th>Tarjeta</th><th>Transfer.</th><th>QR</th>';
    } else if (this.reportType === 'employees') {
      html += '<th>#</th><th>Empleado</th><th>Rol</th><th>Órdenes</th><th>Ingresos</th><th>Ticket Prom.</th>';
    }

    html += '</tr></thead><tbody>';

    this.data.forEach((row, i) => {
      html += '<tr>';
      if (this.reportType === 'products') {
        html += `<td>${i + 1}</td><td>${row.product_name}</td><td>${row.is_combo ? 'Combo' : 'Producto'}</td>
                 <td class="number">${row.total_quantity}</td><td class="number">$${row.total_revenue.toFixed(2)}</td>
                 <td class="number">${row.orders_count}</td><td class="number">$${row.avg_price.toFixed(2)}</td>`;
      } else if (this.reportType === 'categories') {
        html += `<td>${i + 1}</td><td>${row.category_name}</td>
                 <td class="number">${row.total_quantity}</td><td class="number">$${row.total_revenue.toFixed(2)}</td>
                 <td class="number">${row.products_count}</td><td class="number">${row.orders_count}</td>`;
      } else if (this.reportType === 'branches') {
        html += `<td>${row.branch_name}</td><td class="number">${row.orders_count}</td>
                 <td class="number">$${row.total_revenue.toFixed(2)}</td><td class="number">$${row.avg_ticket.toFixed(2)}</td>
                 <td class="number">$${row.cash_total.toFixed(2)}</td><td class="number">$${row.card_total.toFixed(2)}</td>
                 <td class="number">$${row.transfer_total.toFixed(2)}</td><td class="number">$${row.qr_total.toFixed(2)}</td>`;
      } else if (this.reportType === 'employees') {
        html += `<td>${i + 1}</td><td>${row.employee_name}</td><td>${this.getRoleName(row.employee_role)}</td>
                 <td class="number">${row.orders_count}</td><td class="number">$${row.total_revenue.toFixed(2)}</td>
                 <td class="number">$${row.avg_ticket.toFixed(2)}</td>`;
      }
      html += '</tr>';
    });

    html += '</tbody></table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const dateStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${this.reportType}_${dateStr}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.exporting = false;
  }
}