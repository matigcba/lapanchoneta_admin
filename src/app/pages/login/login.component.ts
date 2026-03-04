import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  credentials: any = {
    username: '',
    password: ''
  };
  
  rememberMe = false;
  loading = false;
  errorMessage = '';
  
  ngOnInit() {
    // Si ya está logueado, redirigir
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
    
    // Cargar credenciales guardadas si existen
    const savedUsername = localStorage.getItem('remembered_username');
    if (savedUsername) {
      this.credentials.username = savedUsername;
      this.rememberMe = true;
    }
  }
  
  onSubmit() {
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }
    
    this.loading = true;
    this.errorMessage = '';
    
    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        if (response.success) {
          // Guardar username si "recordarme" está marcado
          if (this.rememberMe) {
            localStorage.setItem('remembered_username', this.credentials.username);
          } else {
            localStorage.removeItem('remembered_username');
          }
          
          // Redirigir a la página solicitada o al dashboard
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigate([returnUrl]);
        } else {
          this.errorMessage = response.message || 'Error al iniciar sesión';
          this.loading = false;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error de login:', error);
        
        if (error.status === 401) {
          this.errorMessage = 'Usuario o contraseña incorrectos';
        } else if (error.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor';
        } else {
          this.errorMessage = error.error?.message || 'Error al iniciar sesión. Por favor intente nuevamente.';
        }
      }
    });
  }
}