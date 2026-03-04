import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-report-sales',
  standalone: true,
  imports: [],
  templateUrl: './report-sales.component.html',
  styleUrl: './report-sales.component.scss'
})
export class ReportSalesComponent {
  private router = inject(Router);

  goBack() {
    this.router.navigate(['/dashboard']);
  }
  
}
