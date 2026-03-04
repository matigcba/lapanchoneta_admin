import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/services/auth.service';
import { ProductService } from './core/services/product.service';
import { BranchEventService } from './core/services/branch-event.service';
import { filter } from 'rxjs/operators';
import { PermissionsService } from './core/services/permissions.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  authService = inject(AuthService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private branchEventService = inject(BranchEventService);
  private permissionsService = inject(PermissionsService);

  currentUser: any = null;
  currentBranch: any = null;
  mobileMenuOpen = false;
  notificationCount = 0;
  pendingOrders = 0;
  isMobile = false;

  expandedGroups: { [key: string]: boolean } = {
    gestion: false,
    admin: false,
    reportes: false,
    app: false
  };

  currentRoute: string = '';

  // Sucursales
  availableBranches: any[] = [];
  selectedBranchId: string = '';

  constructor() {
    this.checkScreenSize();

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const previousRoute = this.currentRoute;
      this.currentRoute = event.urlAfterRedirects;

      // Si salimos de una página que soporta "Todas" y teníamos "all" seleccionado,
      // resetear a la primera sucursal
      if (this.selectedBranchId === 'all' && !this.allowsAllBranches() && this.wasOnAllBranchesPage(previousRoute)) {
        this.resetToFirstBranch();
      }
    });
  }

  /**
   * Páginas que permiten "Todas las sucursales" en el selector
   */
private allBranchesPages = ['/cash', '/report-sales', '/coupons', '/franchises', '/branches'];

  /**
   * Verifica si la página actual permite seleccionar "Todas las sucursales"
   */
  allowsAllBranches(): boolean {
    return this.allBranchesPages.some(page => this.currentRoute.startsWith(page));
  }

  /**
   * Verifica si una ruta anterior era una página que permite "Todas"
   */
  private wasOnAllBranchesPage(route: string): boolean {
    return this.allBranchesPages.some(page => route.startsWith(page));
  }

  /**
   * Resetear al primer branch disponible
   */
  private resetToFirstBranch() {
    if (this.availableBranches.length > 0) {
      this.selectedBranchId = this.availableBranches[0].id.toString();
      this.onBranchChange();
    }
  }

  /**
   * Páginas globales donde el selector se deshabilita (no se selecciona sucursal)
   */
  isGlobalPage(): boolean {
    const globalPages = ['/coupons', '/franchises', '/branches'];
    return globalPages.some(page => this.currentRoute.startsWith(page));
  }

  /**
   * Verifica si se debe mostrar la opción "Todas las sucursales" en el selector
   */
  showAllBranchesOption(): boolean {
    // Solo mostrar si: la página lo permite Y el usuario es admin/superadmin
    return this.allowsAllBranches() && (this.hasRole('superadmin') || this.hasRole('admin'));
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }

    const storedBranch = localStorage.getItem('admin_branch');
    if (storedBranch) {
      this.currentBranch = JSON.parse(storedBranch);
      this.selectedBranchId = this.currentBranch.id?.toString() || '';
    }

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadUserBranches();
      } else if (!this.router.url.includes('/login')) {
        this.router.navigate(['/login']);
      }
    });

    this.authService.currentBranch$.subscribe(branch => {
      this.currentBranch = branch;
      if (branch) {
        this.selectedBranchId = branch.id?.toString() || '';
      }
    });

    this.permissionsService.permissions$.subscribe(perms => {
      if (perms) {
        console.log('Permisos cargados:', perms.role, Object.keys(perms.permissions).filter(k => perms.permissions[k]));
      }
    });
  }

  canAccessModule(moduleCode: string): boolean {
    return this.permissionsService.canAccess(moduleCode);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      this.closeAllGroups();
    }
  }

  openMobileMenu() {
    this.mobileMenuOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
    this.closeAllGroups();
  }

  toggleGroup(groupName: string) {
    if (this.isMobile) {
      this.expandedGroups[groupName] = !this.expandedGroups[groupName];
    }
  }

  closeAllGroups() {
    Object.keys(this.expandedGroups).forEach(key => {
      this.expandedGroups[key] = false;
    });
  }

  isGroupExpanded(groupName: string): boolean {
    return this.expandedGroups[groupName] || false;
  }

  loadUserBranches() {
    if (this.hasRole('superadmin')) {
      this.loadAllBranches();
    } else if (this.hasRole('admin')) {
      this.loadFranchiseBranches();
    } else if (this.currentUser?.branch_id) {
      this.availableBranches = [{
        id: this.currentUser.branch_id,
        name: this.currentUser.branch_name || 'Mi Sucursal',
        city: this.currentUser.branch_city || ''
      }];
      this.selectedBranchId = this.currentUser.branch_id.toString();
      this.selectDefaultBranch();
    }
  }

  loadAllBranches() {
    this.productService.getBranches().subscribe({
      next: (response) => {
        this.availableBranches = response.data || response;
        this.selectDefaultBranch();
      },
      error: (error) => {
        console.error('Error cargando sucursales:', error);
        this.setTestBranches();
        this.selectDefaultBranch();
      }
    });
  }

  loadFranchiseBranches() {
    if (this.currentUser?.franchise_id) {
      this.productService.getFranchiseBranches(this.currentUser.franchise_id).subscribe({
        next: (response) => {
          this.availableBranches = response.data || response;
          this.selectDefaultBranch();
        },
        error: (error) => {
          console.error('Error cargando sucursales de franquicia:', error);
          this.setTestBranches();
          this.selectDefaultBranch();
        }
      });
    }
  }

  setTestBranches() {
    this.availableBranches = [
      { id: 1, name: 'Sucursal Centro', city: 'Villa María' },
      { id: 2, name: 'Sucursal Norte', city: 'Villa María' },
      { id: 3, name: 'Sucursal Sur', city: 'Villa María' }
    ];
  }

  selectDefaultBranch() {
    if (this.availableBranches.length > 0) {
      if (this.selectedBranchId && this.selectedBranchId !== 'all') {
        const exists = this.availableBranches.find(b => b.id.toString() === this.selectedBranchId);
        if (exists) {
          this.onBranchChange();
          return;
        }
      }

      this.selectedBranchId = this.availableBranches[0].id.toString();
      this.onBranchChange();
    }
  }

  onBranchChange(): void {
    // Si seleccionó "Todas las sucursales"
    if (this.selectedBranchId === 'all') {
      // Emitir evento especial para que Caja lo detecte
      this.branchEventService.emitBranchChange(-1); // -1 = todas
      console.log('Sucursal cambiada a: Todas las sucursales');
      return;
    }

    if (this.selectedBranchId) {
      localStorage.setItem('selectedBranchId', this.selectedBranchId.toString());

      this.currentBranch = this.availableBranches.find(
        b => b.id === parseInt(this.selectedBranchId)
      );

      this.productService.setCurrentBranch(parseInt(this.selectedBranchId));
      this.branchEventService.emitBranchChange(parseInt(this.selectedBranchId));
    }

    const branch = this.availableBranches.find(b => b.id.toString() === this.selectedBranchId);

    if (branch) {
      this.authService.setBranch(branch);
      this.currentBranch = branch;
      console.log('Sucursal cambiada a:', branch.name);
    }
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  getRoleName(role: string): string {
    const roleNames: any = {
      'superadmin': 'Super Admin',
      'admin': 'Administrador',
      'manager': 'Gerente',
      'employee': 'Empleado'
    };
    return roleNames[role] || role;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      if (this.mobileMenuOpen) {
        this.closeMobileMenu();
      }
      this.authService.logout();
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }
}