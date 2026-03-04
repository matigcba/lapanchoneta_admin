import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { CashService } from '../../core/services/cash.service';

@Component({
  selector: 'app-cash',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash.component.html',
  styleUrls: ['./cash.component.scss']
})
export class CashComponent implements OnInit, OnDestroy {
  private cashService = inject(CashService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Estado
  loading = false;
  exporting = false;
  
  // Datos
  transactions: any[] = [];
  transactionTypes: any[] = [];
  
  
// Resumen
summary = {
  total_in: 0,
  total_out: 0,
  balance: 0,
  completed_count: 0,
  voided_count: 0,
  // Ventas por método
  cash_total: 0,
  card_total: 0,
  transfer_total: 0,
  qr_total: 0,
  other_total: 0,
  // Movimientos de caja
  deposits_total: 0,
  withdrawals_total: 0,
  expenses_total: 0
};

// Sesiones disponibles (para filtro)
availableSessions: any[] = [];
  
  filters: any = {
  date_filter: 'today',
  date_from: '',
  date_to: '',
  type: '',
  payment_method: '',
  movement_type: '',
  status: '',
  search: '',
  session_status: ''  // NUEVO: 'open', 'closed', o '' para todas
};
  
  // Paginación
  currentPage = 1;
  itemsPerPage = 25;
  totalItems = 0;
  totalPages = 1;
  pageSizeOptions = [25, 50, 100, 200];
  
  // Modal
  showDetailModal = false;
  selectedTransaction: any = null;
  
  // Print
  showPrintModal = false;

  // Método helper para total de ventas
getTotalSales(): number {
  return this.summary.cash_total + 
         this.summary.card_total + 
         this.summary.transfer_total + 
         this.summary.qr_total + 
         this.summary.other_total;
}


  ngOnInit() {
    // Debounce para búsqueda
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadData();
    });

    // Suscribirse a cambios de sucursal
    this.authService.currentBranch$
      .pipe(takeUntil(this.destroy$))
      .subscribe(branch => {
        if (branch) {
          this.loadData();
        }
      });
    
    // Cargar tipos de transacción
    this.loadTransactionTypes();
    
    // Cargar datos iniciales
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

 loadData() {
  this.loading = true;
  
  const params: any = {
    ...this.filters,
    page: this.currentPage,
    limit: this.itemsPerPage
  };
  
  // Limpiar params vacíos
  Object.keys(params).forEach(key => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) {
      delete params[key];
    }
  });
  
  this.cashService.getCashTransactions(params).subscribe({
    next: (response: any) => {
      if (response.success) {
        this.transactions = response.data || [];
        
        // Paginación
        if (response.pagination) {
          this.totalItems = response.pagination.total || 0;
          this.totalPages = response.pagination.pages || Math.ceil(this.totalItems / this.itemsPerPage);
        }
        
        // Resumen del backend
        if (response.summary) {
          this.summary = {
            total_in: parseFloat(response.summary.total_in) || 0,
            total_out: parseFloat(response.summary.total_out) || 0,
            balance: parseFloat(response.summary.balance) || 0,
            completed_count: response.summary.completed_count || 0,
            voided_count: response.summary.voided_count || 0,
            // Ventas por método de pago
            cash_total: parseFloat(response.summary.cash_total) || 0,
            card_total: parseFloat(response.summary.card_total) || 0,
            transfer_total: parseFloat(response.summary.transfer_total) || 0,
            qr_total: parseFloat(response.summary.qr_total) || 0,
            other_total: parseFloat(response.summary.other_total) || 0,
            // Movimientos de caja
            deposits_total: parseFloat(response.summary.deposits_total) || 0,
            withdrawals_total: parseFloat(response.summary.withdrawals_total) || 0,
            expenses_total: parseFloat(response.summary.expenses_total) || 0
          };
          
          console.log('Summary del backend:', response.summary);
        } else {
          this.calculateSummaryFromData();
        }
        
        // Guardar sesiones disponibles si vienen
        if (response.available_sessions) {
          this.availableSessions = response.available_sessions;
        }
      }
      this.loading = false;
    },
    error: (error) => {
      console.error('Error cargando transacciones:', error);
      this.loading = false;
    }
  });
}

/**
 * Calcular totales por método de pago desde las transacciones
 */
calculatePaymentMethodTotals() {
  // Solo transacciones completadas (no anuladas)
  const validTransactions = this.transactions.filter(t => t.status !== 'voided');
  
  // Efectivo
  this.summary.cash_total = validTransactions
    .filter(t => t.payment_method === 'cash')
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount) || 0;
      return t.movement_type === 'in' ? sum + amount : sum - amount;
    }, 0);
  
  // Tarjeta
  this.summary.card_total = validTransactions
    .filter(t => t.payment_method === 'card')
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount) || 0;
      return t.movement_type === 'in' ? sum + amount : sum - amount;
    }, 0);
  
  // Transferencia
  this.summary.transfer_total = validTransactions
    .filter(t => t.payment_method === 'transfer')
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount) || 0;
      return t.movement_type === 'in' ? sum + amount : sum - amount;
    }, 0);
  
  // QR / MercadoPago (sumarlo a transferencia o mostrar aparte)
  const qrTotal = validTransactions
    .filter(t => t.payment_method === 'qr' || t.payment_method === 'mercadopago')
    .reduce((sum, t) => {
      const amount = parseFloat(t.amount) || 0;
      return t.movement_type === 'in' ? sum + amount : sum - amount;
    }, 0);
  
  // Sumar QR a transferencia (o podés crear un campo aparte)
  this.summary.transfer_total += qrTotal;
}

/**
 * Calcular todo el resumen desde los datos
 */
calculateSummaryFromData() {
  const validTransactions = this.transactions.filter(t => t.status !== 'voided');
  
  this.summary.total_in = validTransactions
    .filter(t => t.movement_type === 'in')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  
  this.summary.total_out = validTransactions
    .filter(t => t.movement_type === 'out')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  
  this.summary.balance = this.summary.total_in - this.summary.total_out;
  this.summary.completed_count = validTransactions.length;
  this.summary.voided_count = this.transactions.filter(t => t.status === 'voided').length;
  
  // Calcular por método de pago
  this.calculatePaymentMethodTotals();
}

getBankTotal(): number {
  return this.summary.card_total + 
         this.summary.transfer_total + 
         this.summary.qr_total + 
         this.summary.other_total;
}
 
  loadTransactionTypes() {
    this.cashService.getCashTransactionTypes().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.transactionTypes = response.data;
        } else {
          this.setDefaultTransactionTypes();
        }
      },
      error: () => {
        this.setDefaultTransactionTypes();
      }
    });
  }

  setDefaultTransactionTypes() {
    this.transactionTypes = [
      { id: 'opening', name: 'Apertura de Caja' },
      { id: 'closing', name: 'Cierre de Caja' },
      { id: 'shift_open', name: 'Apertura de Turno' },
      { id: 'shift_close', name: 'Cierre de Turno' },
      { id: 'sale', name: 'Venta' },
      { id: 'order', name: 'Comanda' },
      { id: 'deposit', name: 'Depósito' },
      { id: 'withdrawal', name: 'Retiro' },
      { id: 'expense', name: 'Gasto' },
      { id: 'collection', name: 'Cobro' },
      { id: 'adjustment', name: 'Ajuste' },
      { id: 'void', name: 'Anulación' },
      { id: 'refund', name: 'Devolución' }
    ];
  }

  refreshData() {
    this.loadData();
  }

  // ============================================
  // FILTROS
  // ============================================

  onSearchChange() {
    this.searchSubject.next(this.filters.search);
  }

  setDateFilter(filter: string) {
    this.filters.date_filter = filter;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch(filter) {
      case 'today':
        this.filters.date_from = this.formatDate(today);
        this.filters.date_to = this.formatDate(today);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        this.filters.date_from = this.formatDate(yesterday);
        this.filters.date_to = this.formatDate(yesterday);
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        this.filters.date_from = this.formatDate(weekAgo);
        this.filters.date_to = this.formatDate(today);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        this.filters.date_from = this.formatDate(monthAgo);
        this.filters.date_to = this.formatDate(today);
        break;
      case 'custom':
        // No cambiar fechas, el usuario las seleccionará
        return;
    }
    
    this.currentPage = 1;
    this.loadData();
  }

  showCustomDateFilter() {
    this.filters.date_filter = 'custom';
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.filters.date_to = this.formatDate(today);
    this.filters.date_from = this.formatDate(weekAgo);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadData();
  }

  clearDateFilter() {
    this.filters.date_filter = 'today';
    this.setDateFilter('today');
  }

  clearAllFilters() {
    this.filters = {
      date_filter: 'today',
      date_from: '',
      date_to: '',
      type: '',
      payment_method: '',
      movement_type: '',
      status: '',
      search: ''
    };
    this.currentPage = 1;
    this.setDateFilter('today');
  }

  hasActiveFilters(): boolean {
    return !!(
      (this.filters.date_filter && this.filters.date_filter !== 'today') ||
      this.filters.type ||
      this.filters.payment_method ||
      this.filters.movement_type ||
      this.filters.status ||
      this.filters.search
    );
  }

  getDateFilterLabel(): string {
    const labels: { [key: string]: string } = {
      'today': 'Hoy',
      'yesterday': 'Ayer',
      'week': 'Última semana',
      'month': 'Último mes',
      'custom': `${this.filters.date_from || ''} - ${this.filters.date_to || ''}`
    };
    return labels[this.filters.date_filter] || 'Hoy';
  }

  // ============================================
  // PAGINACIÓN
  // ============================================

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage - 1);
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.loadData();
  }

  getShowingFrom(): number {
    if (this.totalItems === 0) return 0;
    return ((this.currentPage - 1) * this.itemsPerPage) + 1;
  }

  getShowingTo(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
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

  // ============================================
  // HELPERS
  // ============================================

  getTypeName(type: string): string {
    const typeObj = this.transactionTypes.find(t => t.id === type);
    if (typeObj) return typeObj.name;
    
    const names: { [key: string]: string } = {
      'opening': 'Apertura de Caja',
      'closing': 'Cierre de Caja',
      'shift_open': 'Apertura de Turno',
      'shift_close': 'Cierre de Turno',
      'sale': 'Venta',
      'order': 'Comanda',
      'deposit': 'Depósito',
      'withdrawal': 'Retiro',
      'expense': 'Gasto',
      'collection': 'Cobro',
      'adjustment': 'Ajuste',
      'void': 'Anulación',
      'void_invoice': 'Anul. Facturación',
      'credit_note': 'Nota de Crédito',
      'refund': 'Devolución'
    };
    return names[type] || type || 'Otro';
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'opening': 'bi-door-open',
      'closing': 'bi-door-closed',
      'shift_open': 'bi-person-plus',
      'shift_close': 'bi-person-dash',
      'sale': 'bi-cart-check',
      'order': 'bi-receipt',
      'deposit': 'bi-cash-stack',
      'withdrawal': 'bi-cash',
      'expense': 'bi-wallet2',
      'collection': 'bi-credit-card',
      'adjustment': 'bi-sliders',
      'void': 'bi-x-circle',
      'void_invoice': 'bi-file-x',
      'credit_note': 'bi-file-earmark-minus',
      'refund': 'bi-arrow-return-left'
    };
    return icons[type] || 'bi-question-circle';
  }

  getTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'opening': '#22c55e',
      'closing': '#64748b',
      'shift_open': '#3b82f6',
      'shift_close': '#8b5cf6',
      'sale': '#22c55e',
      'order': '#6366f1',
      'deposit': '#10b981',
      'withdrawal': '#ef4444',
      'expense': '#f59e0b',
      'collection': '#3b82f6',
      'adjustment': '#64748b',
      'void': '#ef4444',
      'void_invoice': '#dc2626',
      'credit_note': '#eab308',
      'refund': '#ef4444'
    };
    return colors[type] || '#64748b';
  }

  getPaymentMethodName(method: string): string {
    const names: { [key: string]: string } = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'qr': 'QR',
      'mercadopago': 'MercadoPago',
      'multiple': 'Múltiple',
      'other': 'Otro'
    };
    return names[method] || method || 'Efectivo';
  }

  getPaymentIcon(method: string): string {
    const icons: { [key: string]: string } = {
      'cash': 'bi-cash',
      'card': 'bi-credit-card',
      'transfer': 'bi-bank',
      'qr': 'bi-qr-code',
      'mercadopago': 'bi-qr-code',
      'multiple': 'bi-wallet2',
      'other': 'bi-wallet'
    };
    return icons[method] || 'bi-wallet';
  }

  getStatusName(status: string): string {
    const names: { [key: string]: string } = {
      'completed': 'Completada',
      'voided': 'Anulada',
      'pending': 'Pendiente'
    };
    return names[status] || status || 'Completada';
  }

  // ============================================
  // MODAL
  // ============================================

  viewTransaction(transaction: any) {
    this.selectedTransaction = transaction;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedTransaction = null;
  }

  // ============================================
  // IMPRIMIR
  // ============================================

  printTransaction(transaction: any) {
    const printContent = this.generatePrintContent(transaction);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    }
  }

  generatePrintContent(transaction: any): string {
    const branch = this.authService.getCurrentBranch();
    const branchName = branch?.name || 'La Panchoneta';
    const branchAddress = branch?.address || '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante #${transaction.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 280px;
            padding: 10px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .header p {
            font-size: 10px;
            color: #666;
          }
          .title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
            text-transform: uppercase;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
          .row .label {
            color: #666;
          }
          .row .value {
            font-weight: bold;
            text-align: right;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .amount-row {
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0;
          }
          .amount-row.income .value { color: #22c55e; }
          .amount-row.expense .value { color: #ef4444; }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
            color: #666;
          }
          .voided {
            background: #fee2e2;
            padding: 8px;
            text-align: center;
            color: #dc2626;
            font-weight: bold;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${branchName}</h1>
          ${branchAddress ? `<p>${branchAddress}</p>` : ''}
        </div>
        
        <div class="title">Comprobante de Caja</div>
        
        <div class="row">
          <span class="label">N° Transacción:</span>
          <span class="value">#${transaction.id}</span>
        </div>
        
        <div class="row">
          <span class="label">Fecha:</span>
          <span class="value">${new Date(transaction.created_at).toLocaleDateString('es-AR')}</span>
        </div>
        
        <div class="row">
          <span class="label">Hora:</span>
          <span class="value">${new Date(transaction.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row">
          <span class="label">Tipo:</span>
          <span class="value">${this.getTypeName(transaction.transaction_type)}</span>
        </div>
        
        <div class="row">
          <span class="label">Método:</span>
          <span class="value">${this.getPaymentMethodName(transaction.payment_method)}</span>
        </div>
        
        ${transaction.description ? `
        <div class="row">
          <span class="label">Descripción:</span>
          <span class="value">${transaction.description}</span>
        </div>
        ` : ''}
        
        ${transaction.invoice_number ? `
        <div class="row">
          <span class="label">Factura:</span>
          <span class="value">${transaction.invoice_number}</span>
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="row amount-row ${transaction.movement_type === 'in' ? 'income' : 'expense'}">
          <span class="label">MONTO:</span>
          <span class="value">${transaction.movement_type === 'in' ? '+' : '-'}$${parseFloat(transaction.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
        </div>
        
        ${transaction.status === 'voided' ? `
        <div class="voided">
          ⚠️ TRANSACCIÓN ANULADA
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="row">
          <span class="label">Usuario:</span>
          <span class="value">${transaction.admin_name || transaction.admin_username || '-'}</span>
        </div>
        
        <div class="footer">
          <p>Impreso: ${new Date().toLocaleString('es-AR')}</p>
          <p>¡Gracias!</p>
        </div>
      </body>
      </html>
    `;
  }

  // ============================================
  // EXPORTAR
  // ============================================

  exportData() {
    this.exporting = true;
    
    // Cargar todos los datos sin paginación para exportar
    const params: any = {
      ...this.filters,
      limit: 10000 // Obtener todos
    };
    
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });
    
    this.cashService.getCashTransactions(params).subscribe({
      next: (response: any) => {
        const data = response.data || this.transactions;
        this.downloadCSV(data);
        this.exporting = false;
      },
      error: (error) => {
        console.error('Error exportando:', error);
        // Exportar con datos actuales
        this.downloadCSV(this.transactions);
        this.exporting = false;
      }
    });
  }

  downloadCSV(data: any[]) {
    if (data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    const headers = [
      'ID',
      'Fecha',
      'Hora',
      'Tipo',
      'Descripción',
      'Método de Pago',
      'Movimiento',
      'Monto',
      'Estado',
      'Usuario',
      'Factura'
    ];
    
    const rows = data.map(t => [
      t.id,
      new Date(t.created_at).toLocaleDateString('es-AR'),
      new Date(t.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      this.getTypeName(t.transaction_type),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      this.getPaymentMethodName(t.payment_method),
      t.movement_type === 'in' ? 'Entrada' : 'Salida',
      `"${(t.movement_type === 'in' ? '+' : '-')}${parseFloat(t.amount).toFixed(2)}"`,
      this.getStatusName(t.status),
      t.admin_name || t.admin_username || '',
      t.invoice_number || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Agregar BOM para Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Crear nombre de archivo
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `caja_${this.getDateFilterLabel().replace(/\s/g, '_')}_${dateStr}.csv`;
    
    // Descargar
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(link.href);
  }

  exportExcel() {
    // Alternativa: exportar como Excel usando datos en formato tabla HTML
    this.exporting = true;
    
    const params: any = {
      ...this.filters,
      limit: 10000
    };
    
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });
    
    this.cashService.getCashTransactions(params).subscribe({
      next: (response: any) => {
        const data = response.data || this.transactions;
        this.downloadExcel(data);
        this.exporting = false;
      },
      error: () => {
        this.downloadExcel(this.transactions);
        this.exporting = false;
      }
    });
  }

  downloadExcel(data: any[]) {
    if (data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const branch = this.authService.getCurrentBranch();
    const branchName = branch?.name || 'Sucursal';
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #6366f1; color: white; font-weight: bold; }
          .income { color: #22c55e; }
          .expense { color: #ef4444; }
          .voided { background-color: #fee2e2; text-decoration: line-through; }
          .header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          .subheader { color: #666; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">Reporte de Caja - ${branchName}</div>
        <div class="subheader">Período: ${this.getDateFilterLabel()} | Generado: ${new Date().toLocaleString('es-AR')}</div>
        
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Método</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    data.forEach(t => {
      const rowClass = t.status === 'voided' ? 'voided' : '';
      const amountClass = t.movement_type === 'in' ? 'income' : 'expense';
      
      html += `
        <tr class="${rowClass}">
          <td>${t.id}</td>
          <td>${new Date(t.created_at).toLocaleDateString('es-AR')}</td>
          <td>${new Date(t.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${this.getTypeName(t.transaction_type)}</td>
          <td>${t.description || '-'}</td>
          <td>${this.getPaymentMethodName(t.payment_method)}</td>
          <td class="${amountClass}">${t.movement_type === 'in' ? '+' : '-'}$${parseFloat(t.amount).toFixed(2)}</td>
          <td>${this.getStatusName(t.status)}</td>
          <td>${t.admin_name || t.admin_username || '-'}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6" style="text-align: right; font-weight: bold;">Total Entradas:</td>
              <td class="income" style="font-weight: bold;">+$${this.summary.total_in.toFixed(2)}</td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td colspan="6" style="text-align: right; font-weight: bold;">Total Salidas:</td>
              <td class="expense" style="font-weight: bold;">-$${this.summary.total_out.toFixed(2)}</td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td colspan="6" style="text-align: right; font-weight: bold;">Balance:</td>
              <td style="font-weight: bold;">$${this.summary.balance.toFixed(2)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `caja_${dateStr}.xls`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(link.href);
  }
}