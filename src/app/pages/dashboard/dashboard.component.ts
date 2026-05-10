import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { OrderService } from '../../core/services/order.service';
import { InventoryService } from '../../core/services/inventory.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  totalProducts  = 0;
  totalOrders    = 0;
  lowStockCount  = 0;
  recentOrders:  any[] = [];
  loading        = true;
  today          = new Date();
  errors: string[] = [];

  constructor(
    private productService:   ProductService,
    private orderService:     OrderService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.errors  = [];

    let completed = 0;
    const done = () => { if (++completed === 3) this.loading = false; };

    this.productService.getAll(0, 1000).subscribe({
      next: (page) => { this.totalProducts = page.totalElements; done(); },
      error: ()     => { this.errors.push('Failed to load products.'); done(); }
    });

    this.orderService.getAll().subscribe({
      next: (o) => {
        this.totalOrders  = o.length;
        this.recentOrders = o.slice(0, 5);
        done();
      },
      error: () => { this.errors.push('Failed to load orders.'); done(); }
    });

    this.inventoryService.getLowStock().subscribe({
      next: (i) => { this.lowStockCount = i.length; done(); },
      error: ()  => { this.errors.push('Failed to load inventory.'); done(); }
    });
  }

  getStatusClass(status: string): string {
    const map: any = {
      'PENDING':    'badge bg-warning text-dark',
      'PROCESSING': 'badge bg-info',
      'SHIPPED':    'badge bg-primary',
      'DELIVERED':  'badge bg-success',
      'CANCELLED':  'badge bg-danger'
    };
    return map[status] || 'badge bg-secondary';
  }
}