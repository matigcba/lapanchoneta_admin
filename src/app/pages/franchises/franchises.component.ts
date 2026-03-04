import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { FranchiseService } from 'src/app/core/services/franchise.service';

@Component({
  selector: 'app-franchises',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './franchises.component.html',
  styleUrls: ['./franchises.component.scss']
})
export class FranchisesComponent implements OnInit {
  private authService = inject(AuthService);
  private franchiseService = inject(FranchiseService);

  franchises: any[] = [];
  filteredFranchises: any[] = [];
  searchTerm = '';
  showInactive = false;
  loading = false;

  currentUser: any = null;

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadFranchises();
  }

  loadFranchises() {
    this.loading = true;
    
    this.franchiseService.getFranchises(this.showInactive).subscribe({
      next: (response: any) => {
        this.franchises = response?.data || response || [];
        this.filterFranchises();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando franquicias:', error);
        this.franchises = [];
        this.filterFranchises();
        this.loading = false;
      }
    });
  }

  filterFranchises() {
    let items = [...this.franchises];

    if (this.searchTerm) {
      items = items.filter(franchise =>
        franchise.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        franchise.legal_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        franchise.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    this.filteredFranchises = items;
  }

  onShowInactiveChange() {
    this.loadFranchises();
  }

  formatDate(date: string | null): string {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'text-success' : 'text-danger';
  }
}