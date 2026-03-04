import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../core/services/staff.service';
import { BranchEventService } from '../../core/services/branch-event.service';
import { AuthService } from '../../core/services/auth.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff.component.html',
  styleUrls: ['./staff.component.scss']
})
export class StaffComponent implements OnInit, OnDestroy {
  private staffService = inject(StaffService);
  private branchEventService = inject(BranchEventService);
  private authService = inject(AuthService);
  private permissionsService = inject(PermissionsService);
  private destroy$ = new Subject<void>();
  
  staff: any[] = [];
  filteredStaff: any[] = [];
  searchTerm = '';
  showInactive = false;
  currentBranchId: number | null = null;
  currentUser: any = null;
  loading = false;
  
  // Tabs
  activeTab: 'employees' | 'role_permissions' = 'employees';
  
  // Modal de usuario
  showModal = false;
  editingStaff = false;
  currentStaff: any = {};
  saving = false;
  showPassword = false;

  availableBranches: any[] = [];
  selectedBranches: number[] = [];
  loadingBranches = false;
  
  // Modal de permisos individuales
  showPermissionsModal = false;
  permissionsStaff: any = null;
  staffPermissions: any[] = [];
  loadingPermissions = false;
  savingPermissions = false;
  useRolePermissions = true;
  
  // Permisos por rol
  selectedRole: string = 'employee';
  rolePermissions: any[] = [];
  loadingRolePermissions = false;
  savingRolePermissions = false;
  
  // Módulos disponibles
  modules: any[] = [];
  
  // Roles disponibles
  roles = [
    { value: 'employee', label: 'Vendedor', color: 'info' },
    { value: 'manager', label: 'Supervisor', color: 'warning' },
    { value: 'admin', label: 'Administrador', color: 'success' }
  ];
  
  editableRoles = [
    { value: 'employee', label: 'Vendedor' },
    { value: 'manager', label: 'Supervisor' },
    { value: 'admin', label: 'Administrador' }
  ];
  
  ngOnInit() {
    this.currentBranchId = this.staffService.getCurrentBranchId();
    this.currentUser = this.authService.getCurrentUser();
    
    if (this.currentUser?.role === 'superadmin') {
      this.roles.push({ value: 'superadmin', label: 'Super Admin', color: 'danger' });
    }
    
    this.branchEventService.branchChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe(branchId => {
        if (branchId !== this.currentBranchId) {
          this.currentBranchId = branchId;
          this.loadStaff();
        }
      });
    
    this.loadBranches();
    this.loadStaff();
    this.loadModules();
  }

  loadBranches() {
    this.loadingBranches = true;
    
    this.staffService.getBranches().subscribe({
      next: (response) => {
        this.availableBranches = response.data || [];
        this.loadingBranches = false;
      },
      error: (error) => {
        console.error('Error cargando sucursales:', error);
        this.availableBranches = [];
        this.loadingBranches = false;
      }
    });
  }
  
  loadModules() {
    this.permissionsService.getModules().subscribe({
      next: (modules) => {
        this.modules = modules.filter((m: any) => m.code !== 'profile');
      },
      error: (error) => {
        console.error('Error cargando módulos:', error);
      }
    });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ========================================
  // TABS
  // ========================================
  
  setActiveTab(tab: 'employees' | 'role_permissions') {
    this.activeTab = tab;
    
    if (tab === 'role_permissions' && this.rolePermissions.length === 0) {
      this.loadRolePermissions();
    }
  }
  
  // ========================================
  // EMPLEADOS
  // ========================================
  
  loadStaff() {
    this.loading = true;
    
    this.staffService.getStaff(this.showInactive).subscribe({
      next: (response) => {
        this.staff = response.data || [];
        this.filterStaff();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando personal:', error);
        this.staff = [];
        this.loading = false;
      }
    });
  }
  
  onShowInactiveChange() {
    this.loadStaff();
  }
  
  filterStaff() {
    let filtered = [...this.staff];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(member => 
        member.username?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.first_name?.toLowerCase().includes(term) ||
        member.last_name?.toLowerCase().includes(term) ||
        member.role_display?.toLowerCase().includes(term)
      );
    }
    
    this.filteredStaff = filtered;
  }
  
  openModal() {
    this.currentStaff = {
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'employee',
      is_active: true
    };
    
    this.selectedBranches = [this.currentBranchId!];
    this.editingStaff = false;
    this.showModal = true;
    this.showPassword = false;
  }
  
  editStaff(member: any) {
    this.currentStaff = { ...member };
    delete this.currentStaff.password;
    
    if (member.branches && Array.isArray(member.branches)) {
      this.selectedBranches = member.branches.map((b: any) => 
        typeof b === 'object' ? b.id : parseInt(b)
      );
    } else {
      this.loadUserBranches(member.id);
    }
    
    this.editingStaff = true;
    this.showModal = true;
    this.showPassword = false;
  }

  loadUserBranches(userId: number) {
    this.staffService.getUserBranches(userId).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          this.selectedBranches = response.data.map((b: any) => b.id);
        } else {
          this.selectedBranches = [this.currentStaff.primary_branch_id || this.currentStaff.branch_id];
        }
      },
      error: (error) => {
        console.error('Error cargando sucursales del usuario:', error);
        this.selectedBranches = [this.currentStaff.primary_branch_id || this.currentStaff.branch_id];
      }
    });
  }
  
  toggleBranch(branchId: number) {
    const index = this.selectedBranches.indexOf(branchId);
    if (index > -1) {
      this.selectedBranches.splice(index, 1);
    } else {
      this.selectedBranches.push(branchId);
    }
  }
  
  selectAllBranches() {
    this.selectedBranches = this.availableBranches.map(b => b.id);
  }
  
  clearBranches() {
    this.selectedBranches = [];
  }
  
  closeModal() {
    this.showModal = false;
    this.currentStaff = {};
    this.showPassword = false;
  }
  
  saveStaff() {
    if (!this.validateStaff()) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    
    if (this.selectedBranches.length === 0) {
      alert('Debe seleccionar al menos una sucursal');
      return;
    }
    
    this.saving = true;
    
    const staffData = {
      ...this.currentStaff,
      branches: this.selectedBranches
    };
    
    const request = this.editingStaff
      ? this.staffService.updateStaff(this.currentStaff.id, staffData)
      : this.staffService.createStaff(staffData);
    
    request.subscribe({
      next: () => {
        this.loadStaff();
        this.closeModal();
        this.showSuccessMessage();
      },
      error: (error) => {
        console.error('Error:', error);
        alert(error.error?.message || 'Error al guardar');
        this.saving = false;
      },
      complete: () => {
        this.saving = false;
      }
    });
  }
  
  validateStaff(): boolean {
    if (!this.editingStaff && !this.currentStaff.password) {
      return false;
    }
    
    return !!(
      this.currentStaff.username &&
      this.currentStaff.email &&
      this.currentStaff.first_name &&
      this.currentStaff.last_name &&
      this.currentStaff.role
    );
  }
  
  toggleStatus(member: any) {
    const newStatus = !member.is_active;
    
    this.staffService.toggleStaffStatus(member.id, newStatus).subscribe({
      next: () => {
        member.is_active = newStatus;
        this.showSuccessMessage();
      },
      error: (error) => {
        console.error('Error:', error);
        alert('Error al cambiar estado');
      }
    });
  }
  
  deleteStaff(member: any) {
    if (member.id === this.currentUser?.id) {
      alert('No puedes eliminarte a ti mismo');
      return;
    }
    
    if (!confirm(`¿Está seguro de eliminar a ${member.first_name} ${member.last_name}?`)) {
      return;
    }
    
    this.staffService.deleteStaff(member.id).subscribe({
      next: () => {
        this.loadStaff();
        this.showDeleteMessage();
      },
      error: (error) => {
        console.error('Error:', error);
        alert(error.error?.message || 'Error al eliminar');
      }
    });
  }
  
  // ========================================
  // PERMISOS INDIVIDUALES
  // ========================================
  
  openPermissionsModal(member: any) {
    this.permissionsStaff = member;
    this.showPermissionsModal = true;
    this.loadStaffPermissions(member.id);
  }
  
  closePermissionsModal() {
    this.showPermissionsModal = false;
    this.permissionsStaff = null;
    this.staffPermissions = [];
  }
  
  loadStaffPermissions(adminId: number) {
    this.loadingPermissions = true;
    
    this.permissionsService.getAdminPermissions(adminId).subscribe({
      next: (data) => {
        if (data) {
          this.staffPermissions = data.permissions || [];
          // Verificar si tiene permisos personalizados
          this.useRolePermissions = !this.staffPermissions.some((p: any) => p.is_custom);
        }
        this.loadingPermissions = false;
      },
      error: (error) => {
        console.error('Error cargando permisos:', error);
        this.loadingPermissions = false;
      }
    });
  }
  
  toggleUseRolePermissions() {
    this.useRolePermissions = !this.useRolePermissions;
    
    if (this.useRolePermissions) {
      // Resetear a permisos del rol
      this.staffPermissions.forEach(p => {
        p.can_access = p.role_access;
        p.is_custom = false;
      });
    }
  }
  
  toggleStaffPermission(permission: any) {
    if (this.useRolePermissions) return;
    
    permission.can_access = !permission.can_access;
    permission.is_custom = permission.can_access !== permission.role_access;
  }
  
  resetToRolePermissions() {
    if (!confirm('¿Resetear permisos a los del rol? Se perderán los cambios personalizados.')) {
      return;
    }
    
    this.staffPermissions.forEach(p => {
      p.can_access = p.role_access;
      p.is_custom = false;
    });
    
    this.useRolePermissions = true;
    this.saveStaffPermissions();
  }
  
  saveStaffPermissions() {
    this.savingPermissions = true;
    
    // Si usa permisos del rol, enviar array vacío para limpiar personalizados
    const permissionsToSave = this.useRolePermissions 
      ? [] 
      : this.staffPermissions.filter(p => p.is_custom).map(p => ({
          module_id: p.module_id,
          can_access: p.can_access,
          is_custom: true
        }));
    
    this.permissionsService.updateAdminPermissions(this.permissionsStaff.id, permissionsToSave).subscribe({
      next: () => {
        alert('Permisos actualizados correctamente');
        this.savingPermissions = false;
        this.closePermissionsModal();
      },
      error: (error) => {
        console.error('Error guardando permisos:', error);
        alert('Error al guardar permisos');
        this.savingPermissions = false;
      }
    });
  }
  
  // ========================================
  // PERMISOS POR ROL
  // ========================================
  
  loadRolePermissions() {
    this.loadingRolePermissions = true;
    
    this.permissionsService.getRolePermissions(this.selectedRole).subscribe({
      next: (permissions) => {
        this.rolePermissions = permissions;
        this.loadingRolePermissions = false;
      },
      error: (error) => {
        console.error('Error cargando permisos del rol:', error);
        this.loadingRolePermissions = false;
      }
    });
  }
  
  onRoleChange() {
    this.loadRolePermissions();
  }
  
  toggleRolePermission(permission: any) {
    permission.can_access = !permission.can_access;
  }
  
  saveRolePermissions() {
    this.savingRolePermissions = true;
    
    const permissionsToSave = this.rolePermissions.map(p => ({
      module_id: p.module_id,
      can_access: p.can_access
    }));
    
    this.permissionsService.updateRolePermissions(this.selectedRole, permissionsToSave).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Permisos del rol actualizados correctamente');
          // Recargar permisos del usuario actual si es necesario
          this.permissionsService.loadMyPermissions().subscribe();
        }
        this.savingRolePermissions = false;
      },
      error: (error) => {
        console.error('Error guardando permisos:', error);
        alert(error.error?.message || 'Error al guardar permisos');
        this.savingRolePermissions = false;
      }
    });
  }
  
  // ========================================
  // HELPERS
  // ========================================
  
  getRoleBadgeClass(role: string): string {
    const roleConfig = this.roles.find(r => r.value === role);
    return roleConfig ? `badge bg-${roleConfig.color}` : 'badge bg-secondary';
  }
  
  getRoleLabel(role: string): string {
    const roleConfig = this.roles.find(r => r.value === role);
    return roleConfig?.label || role;
  }
  
  canEdit(member: any): boolean {
    if (member.id === this.currentUser?.id) return true;
    if (this.currentUser?.role === 'superadmin') return true;
    if (this.currentUser?.role === 'admin') {
      return member.role !== 'superadmin' && member.role !== 'admin';
    }
    return false;
  }
  
  canEditPermissions(member: any): boolean {
    // Solo superadmin y admin pueden editar permisos
    if (!['superadmin', 'admin'].includes(this.currentUser?.role)) return false;
    // No puede editar sus propios permisos
    if (member.id === this.currentUser?.id) return false;
    // No puede editar permisos de superadmin
    if (member.role === 'superadmin') return false;
    // Admin no puede editar permisos de otro admin
    if (this.currentUser?.role === 'admin' && member.role === 'admin') return false;
    
    return true;
  }
  
  isSuperadmin(): boolean {
    return this.currentUser?.role === 'superadmin';
  }
  
  showSuccessMessage() {
    alert(`Usuario ${this.editingStaff ? 'actualizado' : 'creado'} exitosamente`);
  }
  
  showDeleteMessage() {
    alert('Usuario eliminado exitosamente');
  }
  
  formatDate(date: any): string {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString();
  }

  // Obtener permisos activos del rol
getActiveRolePermissions(): any[] {
  return this.staffPermissions.filter(p => p.role_access);
}

// Obtener permisos denegados del rol
getDeniedRolePermissions(): any[] {
  return this.staffPermissions.filter(p => !p.role_access);
}

}