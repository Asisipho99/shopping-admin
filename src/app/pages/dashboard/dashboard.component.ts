import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { OrderService } from '../../core/services/order.service';
import { InventoryService } from '../../core/services/inventory.service';
import { Order } from '../../models/order.model';
import { RequestState } from '../../core/models/request-state';
import { SkeletonTableComponent } from '../../shared/components/states/skeleton-table.component';
import { ErrorStateComponent } from '../../shared/components/states/error-state.component';
import { EmptyStateComponent } from '../../shared/components/states/empty-state.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SkeletonTableComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly inventoryService = inject(InventoryService);

  /**
   * Each tile owns its own state.
   *
   * Previously a single `loading` flag plus a shared `errors` string array meant
   * one failing call pushed a generic banner and the other two tiles still
   * rendered a bare 0, which reads as "there are no products" rather than "we
   * could not load the product count". Separate states let each tile say which
   * of those it means, and be retried on its own.
   */
  readonly products = new RequestState<number>();
  readonly orders = new RequestState<Order[]>();
  readonly lowStock = new RequestState<number>();

  today = new Date();

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loadProducts();
    this.loadOrders();
    this.loadLowStock();
  }

  loadProducts(): void {
    this.products.hasData ? this.products.beginRefresh() : this.products.begin();
    this.productService.getAll(0, 1000).subscribe({
      next: (page) => this.products.succeed(page.totalElements),
      error: (err) => this.products.fail(err),
    });
  }

  loadOrders(): void {
    this.orders.hasData ? this.orders.beginRefresh() : this.orders.begin();
    this.orderService.getAll().subscribe({
      next: (list) => this.orders.succeed(list),
      error: (err) => this.orders.fail(err),
    });
  }

  loadLowStock(): void {
    this.lowStock.hasData ? this.lowStock.beginRefresh() : this.lowStock.begin();
    this.inventoryService.getLowStock().subscribe({
      next: (list) => this.lowStock.succeed(list.length),
      error: (err) => this.lowStock.fail(err),
    });
  }

  // Template helpers ------------------------------------------------------

  get totalProducts(): number {
    return this.products.data ?? 0;
  }

  get totalOrders(): number {
    return this.orders.data?.length ?? 0;
  }

  get lowStockCount(): number {
    return this.lowStock.data ?? 0;
  }

  get recentOrders(): Order[] {
    return (this.orders.data ?? []).slice(0, 5);
  }

  /** True when at least one tile could not load, so we can offer one retry. */
  get anyFailed(): boolean {
    return this.products.isFailed || this.orders.isFailed || this.lowStock.isFailed;
  }

  get isBusy(): boolean {
    return this.products.isBusy || this.orders.isBusy || this.lowStock.isBusy;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge bg-warning text-dark',
      PROCESSING: 'badge bg-info',
      SHIPPED: 'badge bg-primary',
      DELIVERED: 'badge bg-success',
      CANCELLED: 'badge bg-danger',
    };
    return map[status] || 'badge bg-secondary';
  }
}
