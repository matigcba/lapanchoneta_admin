import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);

  // Datos del usuario
  user: any = null;
  loading = false;

  // Para editar perfil
  showEditModal = false;
  // Cambiar editForm para que no incluya phone
  editForm = {
    first_name: '',
    last_name: '',
    email: ''
  };

  // Para cambiar contraseña
  showPasswordModal = false;
  passwordForm = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  };

  // Validaciones
  passwordErrors: string[] = [];
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.loading = true;

    // Obtener usuario del localStorage primero
    const userData = localStorage.getItem('admin_user');
    if (userData) {
      this.user = JSON.parse(userData);
      this.initializeEditForm();
    }

    // Luego llamar al API para obtener datos actualizados
    this.authService.getAdminProfile().subscribe({
      next: (response) => {
        console.log('Perfil obtenido:', response);
        this.user = response.user || response.data || response;
        this.initializeEditForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando perfil:', error);
        this.loading = false;

        // Si hay error pero tenemos usuario en localStorage, usar ese
        if (this.user) {
          console.log('Usando datos del localStorage');
        }
      }
    });
  }

  // Actualizar initializeEditForm()
  initializeEditForm() {
    if (this.user) {
      this.editForm = {
        first_name: this.user.first_name || '',
        last_name: this.user.last_name || '',
        email: this.user.email || ''
      };
    }
  }

  // Editar perfil
  openEditModal() {
    this.initializeEditForm();
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  // Actualizar saveProfile()
  saveProfile() {
    if (!this.editForm.first_name || !this.editForm.email) {
      alert('El nombre y email son requeridos');
      return;
    }

    this.loading = true;

    this.authService.updateProfile(this.editForm).subscribe({
      next: (response) => {
        console.log('Perfil actualizado:', response);

        this.user = response.data || response.user;
        localStorage.setItem('admin_user', JSON.stringify(this.user));

        this.showEditModal = false;
        this.loading = false;
        this.showSuccessMessage('Perfil actualizado correctamente');
      },
      error: (error) => {
        console.error('Error actualizando perfil:', error);
        this.loading = false;

        const errorMessage = error.error?.message || 'Error al actualizar el perfil';
        alert(errorMessage);
      }
    });
  }

  // Cambiar contraseña
  openPasswordModal() {
    this.passwordForm = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    };
    this.passwordErrors = [];
    this.showPasswordModal = true;
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.passwordForm = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    };
    this.passwordErrors = [];
  }

  validatePassword(): boolean {
    this.passwordErrors = [];

    if (!this.passwordForm.current_password) {
      this.passwordErrors.push('Debe ingresar la contraseña actual');
    }

    if (!this.passwordForm.new_password) {
      this.passwordErrors.push('Debe ingresar la nueva contraseña');
    }

    if (this.passwordForm.new_password.length < 6) {
      this.passwordErrors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (this.passwordForm.new_password !== this.passwordForm.confirm_password) {
      this.passwordErrors.push('Las contraseñas no coinciden');
    }

    if (this.passwordForm.current_password === this.passwordForm.new_password) {
      this.passwordErrors.push('La nueva contraseña debe ser diferente a la actual');
    }

    return this.passwordErrors.length === 0;
  }

  changePassword() {
    if (!this.validatePassword()) {
      return;
    }

    this.loading = true;

    this.authService.changePassword({
      current_password: this.passwordForm.current_password,
      new_password: this.passwordForm.new_password
    }).subscribe({
      next: (response) => {
        console.log('Contraseña cambiada:', response);
        this.loading = false;
        this.showPasswordModal = false;
        this.showSuccessMessage('Contraseña actualizada correctamente');
        this.passwordForm = {
          current_password: '',
          new_password: '',
          confirm_password: ''
        };
      },
      error: (error) => {
        console.error('Error cambiando contraseña:', error);
        this.loading = false;

        if (error.status === 401) {
          alert('La contraseña actual es incorrecta');
        } else {
          const errorMessage = error.error?.message || 'Error al cambiar la contraseña';
          alert(errorMessage);
        }
      }
    });
  }

  togglePasswordVisibility(field: string) {
    switch (field) {
      case 'current':
        this.showCurrentPassword = !this.showCurrentPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  getPasswordStrength(): { label: string, color: string, width: string } {
    const password = this.passwordForm.new_password;

    if (!password) {
      return { label: '', color: '', width: '0%' };
    }

    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      return { label: 'Débil', color: 'danger', width: '33%' };
    } else if (strength <= 4) {
      return { label: 'Media', color: 'warning', width: '66%' };
    } else {
      return { label: 'Fuerte', color: 'success', width: '100%' };
    }
  }

  getRoleBadgeClass(): string {
    switch (this.user?.role) {
      case 'admin':
      case 'superadmin':
      case 'super_admin':
        return 'badge bg-danger';
      case 'manager':
        return 'badge bg-warning';
      case 'staff':
      case 'employee':
        return 'badge bg-info';
      default:
        return 'badge bg-secondary';
    }
  }

  getRoleLabel(): string {
    switch (this.user?.role) {
      case 'admin':
        return 'Administrador';
      case 'superadmin':
      case 'super_admin':
        return 'Super Administrador';
      case 'manager':
        return 'Gerente';
      case 'staff':
        return 'Personal';
      case 'employee':
        return 'Empleado';
      default:
        return this.user?.role || 'Usuario';
    }
  }

  formatDate(date: string): string {
    if (!date) return '-';

    try {
      return new Date(date).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return '-';
    }
  }

  showSuccessMessage(message: string) {
    // Aquí puedes implementar un toast o notificación más elegante
    alert(message);
  }
}