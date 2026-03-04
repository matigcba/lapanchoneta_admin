import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-report-orders',
  standalone: true,
  imports: [],
  templateUrl: './report-orders.component.html',
  styleUrl: './report-orders.component.scss'
})
export class ReportOrdersComponent {
  private router = inject(Router);

  goBack() {
    this.router.navigate(['/dashboard']);
  }
  
}
