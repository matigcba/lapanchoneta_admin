import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/services/auth.service';
import { ProductService } from './core/services/product.service';
import { BranchEventService } from './core/services/branch-event.service';
import { filter } from 'rxjs/operators'; // Agregar esto
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
  // Agregar inject después de los otros
  private permissionsService = inject(PermissionsService);

  currentUser: any = null;
  currentBranch: any = null;
  mobileMenuOpen = false;  // Variable para el menú móvil horizontal
  notificationCount = 0;
  pendingOrders = 0;  // Variable para pedidos pendientes
  isMobile = false;

  // Grupos expandidos en móvil
  expandedGroups: { [key: string]: boolean } = {
    gestion: false,
    admin: false,
    reportes: false,
    app: false
  };

  // AGREGAR: Ruta actual
  currentRoute: string = '';

  // Sucursales
  availableBranches: any[] = [];
  selectedBranchId: string = '';

  constructor() {
    this.checkScreenSize();

    // AGREGAR: Detectar cambios de ruta
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.currentRoute = event.urlAfterRedirects;
    });
  }

  // AGREGAR: Método para saber si es página global
  isGlobalPage(): boolean {
    const globalPages = ['/coupons', '/franchises', '/branches'];
    return globalPages.some(page => this.currentRoute.startsWith(page));
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768; // Cambiado a 768 para coincidir con $mobile-breakpoint

    // En desktop, cerrar el menú móvil si está abierto
    if (!this.isMobile && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  ngOnInit() {
    // Cargar usuario del localStorage si existe
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }

    // Cargar sucursal guardada
    const storedBranch = localStorage.getItem('admin_branch');
    if (storedBranch) {
      this.currentBranch = JSON.parse(storedBranch);
      this.selectedBranchId = this.currentBranch.id?.toString() || '';
    }

    // Suscribirse a los cambios de usuario
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadUserBranches();
      } else if (!this.router.url.includes('/login')) {
        this.router.navigate(['/login']);
      }
    });

    // Suscribirse a los cambios de sucursal
    this.authService.currentBranch$.subscribe(branch => {
      this.currentBranch = branch;
      if (branch) {
        this.selectedBranchId = branch.id?.toString() || '';
      }
    });

    // Suscribirse a los permisos
    this.permissionsService.permissions$.subscribe(perms => {
      if (perms) {
        console.log('Permisos cargados:', perms.role, Object.keys(perms.permissions).filter(k => perms.permissions[k]));
      }
    });
  }

  canAccessModule(moduleCode: string): boolean {
  return this.permissionsService.canAccess(moduleCode);
}

  // Funciones para el menú móvil horizontal
  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;

    // Prevenir/permitir scroll del body cuando el menú está abierto/cerrado
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Cerrar todos los grupos al cerrar el menú
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
    // Cerrar todos los grupos al cerrar el menú
    this.closeAllGroups();
  }

  // Toggle para expandir/contraer grupos en móvil
  toggleGroup(groupName: string) {
    // Solo funciona en móvil
    if (this.isMobile) {
      this.expandedGroups[groupName] = !this.expandedGroups[groupName];
    }
  }

  // Cerrar todos los grupos
  closeAllGroups() {
    Object.keys(this.expandedGroups).forEach(key => {
      this.expandedGroups[key] = false;
    });
  }

  // Verificar si un grupo está expandido
  isGroupExpanded(groupName: string): boolean {
    return this.expandedGroups[groupName] || false;
  }

  loadUserBranches() {
    // Cargar sucursales según el rol del usuario
    if (this.hasRole('superadmin')) {
      // Superadmin ve todas las sucursales
      this.loadAllBranches();
    } else if (this.hasRole('admin')) {
      // Admin ve sucursales de su franquicia
      this.loadFranchiseBranches();
    } else if (this.currentUser?.branch_id) {
      // Manager/Employee solo ve su sucursal asignada
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
    // Llamar al servicio para obtener todas las sucursales
    this.productService.getBranches().subscribe({
      next: (response) => {
        this.availableBranches = response.data || response;

        // Seleccionar sucursal por defecto
        this.selectDefaultBranch();
      },
      error: (error) => {
        console.error('Error cargando sucursales:', error);
        // Usar datos de prueba si falla
        this.setTestBranches();
        this.selectDefaultBranch();
      }
    });
  }

  loadFranchiseBranches() {
    // Cargar solo las sucursales de la franquicia del admin
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
    // Datos de prueba para desarrollo
    this.availableBranches = [
      { id: 1, name: 'Sucursal Centro', city: 'Villa María' },
      { id: 2, name: 'Sucursal Norte', city: 'Villa María' },
      { id: 3, name: 'Sucursal Sur', city: 'Villa María' }
    ];
  }

  selectDefaultBranch() {
    // SIEMPRE seleccionar una sucursal
    if (this.availableBranches.length > 0) {
      // Si ya hay una sucursal seleccionada y existe en la lista, mantenerla
      if (this.selectedBranchId) {
        const exists = this.availableBranches.find(b => b.id.toString() === this.selectedBranchId);
        if (exists) {
          this.onBranchChange();
          return;
        }
      }

      // Si no hay sucursal seleccionada o no existe, seleccionar la primera
      this.selectedBranchId = this.availableBranches[0].id.toString();
      this.onBranchChange();
    }
  }

  onBranchChange(): void {
    if (this.selectedBranchId) {
      // Guardar en localStorage
      localStorage.setItem('selectedBranchId', this.selectedBranchId.toString());

      // Actualizar la sucursal actual
      this.currentBranch = this.availableBranches.find(
        b => b.id === parseInt(this.selectedBranchId)
      );

      // Actualizar en el servicio
      this.productService.setCurrentBranch(parseInt(this.selectedBranchId));

      // EMITIR EVENTO en lugar de recargar
      this.branchEventService.emitBranchChange(parseInt(this.selectedBranchId));
    }

    // Buscar la sucursal seleccionada
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
      // Cerrar menú móvil antes de logout
      if (this.mobileMenuOpen) {
        this.closeMobileMenu();
      }
      this.authService.logout();
    }
  }

  ngOnDestroy() {
    // Limpiar cualquier estilo aplicado al body
    document.body.style.overflow = '';
  }
}