import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { FranchiseService } from 'src/app/core/services/franchise.service';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branches.component.html',
  styleUrls: ['./branches.component.scss']
})
export class BranchesComponent implements OnInit {
  private authService = inject(AuthService);
  private franchiseService = inject(FranchiseService);

  branches: any[] = [];
  filteredBranches: any[] = [];
  searchTerm = '';
  showInactive = false;
  loading = false;
  togglingId: number | null = null; // Para mostrar loading en el botón

  currentUser: any = null;

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadBranches();
  }

  loadBranches() {
    this.loading = true;
    
    this.franchiseService.getBranches(this.showInactive).subscribe({
      next: (response: any) => {
        this.branches = response?.data || response || [];
        this.filterBranches();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando sucursales:', error);
        this.branches = [];
        this.filterBranches();
        this.loading = false;
      }
    });
  }

  filterBranches() {
    let items = [...this.branches];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(branch =>
        branch.name?.toLowerCase().includes(term) ||
        branch.code?.toLowerCase().includes(term) ||
        branch.city?.toLowerCase().includes(term) ||
        branch.address?.toLowerCase().includes(term)
      );
    }

    this.filteredBranches = items;
  }

  onShowInactiveChange() {
    this.loadBranches();
  }

  /**
   * Verificar si el usuario puede gestionar sucursales
   */
  canManage(): boolean {
    const role = this.currentUser?.role;
    return role === 'superadmin' || role === 'admin';
  }

  /**
   * Activar/Desactivar sucursal
   */
  toggleStatus(branch: any) {
    const newStatus = !branch.is_active;
    const action = newStatus ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Está seguro de ${action} la sucursal "${branch.name}"?`)) {
      return;
    }
    
    this.togglingId = branch.id;
    
    this.franchiseService.toggleBranchStatus(branch.id, newStatus).subscribe({
      next: () => {
        branch.is_active = newStatus;
        this.togglingId = null;
        
        // Si ocultamos inactivas y la desactivamos, quitarla de la lista
        if (!this.showInactive && !newStatus) {
          this.filteredBranches = this.filteredBranches.filter(b => b.id !== branch.id);
          this.branches = this.branches.filter(b => b.id !== branch.id);
        }
        
        alert(`Sucursal ${newStatus ? 'activada' : 'desactivada'} correctamente`);
      },
      error: (error) => {
        console.error('Error:', error);
        alert(error.error?.message || 'Error al cambiar estado');
        this.togglingId = null;
      }
    });
  }



  formatDate(date: string | null): string {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusBadgeClass(branch: any): string {
    if (!branch.is_active) return 'badge bg-secondary';
    if (branch.is_open) return 'badge bg-success';
    return 'badge bg-warning';
  }

  getStatusText(branch: any): string {
    if (!branch.is_active) return 'Inactiva';
    if (branch.is_open) return 'Abierta';
    return 'Cerrada';
  }
}