import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { Order } from '../../models/order.model';
import { AppError } from '../../core/models/app-error';
import { RequestState } from '../../core/models/request-state';
import { SkeletonTableComponent } from '../../shared/components/states/skeleton-table.component';
import { ErrorStateComponent } from '../../shared/components/states/error-state.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonTableComponent, ErrorStateComponent],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
})
export class OrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toasts = inject(ToastService);

  readonly state = new RequestState<Order[]>();

  readonly updating = signal(false);
  readonly showModal = signal(false);
  readonly modalError = signal('');

  selectedOrder: Order | null = null;
  newStatus = '';

  // Plain fields: only changed from template events.
  filterStatus = '';
  searchCustomerId = '';

  statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.state.hasData ? this.state.beginRefresh() : this.state.begin();

    this.orderService.getAll().subscribe({
      next: (data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.state.succeed(sorted);
      },
      error: (err) => this.state.fail(err),
    });
  }

  get orders(): Order[] {
    return this.state.data ?? [];
  }

  /** Derived rather than stored, so it cannot drift from the loaded list. */
  get filteredOrders(): Order[] {
    return this.orders.filter((o) => {
      const matchStatus = this.filterStatus ? o.status === this.filterStatus : true;
      const matchCustomer = this.searchCustomerId
        ? o.customerId.toString().includes(this.searchCustomerId)
        : true;
      return matchStatus && matchCustomer;
    });
  }

  get isFiltered(): boolean {
    return !!this.filterStatus || !!this.searchCustomerId;
  }

  /** Retained for the template's existing (change)/(input) bindings. */
  filter(): void {}

  clearFilters(): void {
    this.filterStatus = '';
    this.searchCustomerId = '';
  }

  // Modal -----------------------------------------------------------------

  openOrderModal(order: Order): void {
    this.selectedOrder = order;
    this.newStatus = order.status;
    this.modalError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedOrder = null;
    this.modalError.set('');
  }

  /**
   * The previous version wrapped this in a manual 15-second setTimeout to reset
   * a stuck spinner. That is no longer needed: the error interceptor applies a
   * request timeout centrally and surfaces it as a normal failure, so there is
   * one timeout policy for the whole app instead of one per call site.
   */
  updateStatus(): void {
    if (!this.selectedOrder) return;

    const order = this.selectedOrder;
    const target = this.newStatus;

    this.updating.set(true);
    this.modalError.set('');

    this.orderService.updateStatus(order.orderId, target).subscribe({
      next: () => {
        this.updating.set(false);
        this.closeModal();
        this.toasts.success(`Order #${order.orderId} updated to ${target}.`);
        this.loadOrders();
      },
      error: (err: AppError) => {
        // An illegal transition comes back as a 409 with the allowed set named,
        // which is far more useful than a generic failure message.
        this.modalError.set(err.message);
        this.updating.set(false);
      },
    });
  }

  cancelOrder(order: Order): void {
    if (!confirm(`Cancel order #${order.orderId}?`)) return;

    this.orderService.cancelOrder(order.orderId).subscribe({
      next: () => {
        this.toasts.success(`Order #${order.orderId} cancelled.`);
        this.loadOrders();
      },
      error: (err: AppError) => this.toasts.error(err.message, 'Could not cancel order'),
    });
  }

  // Presentation ----------------------------------------------------------

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      PENDING: '#f59e0b',
      PROCESSING: '#3b82f6',
      SHIPPED: '#8b5cf6',
      DELIVERED: '#10b981',
      CANCELLED: '#ef4444',
    };
    return map[status] || '#94a3b8';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge bg-warning text-dark',
      PROCESSING: 'badge bg-info text-white',
      SHIPPED: 'badge bg-primary',
      DELIVERED: 'badge bg-success',
      CANCELLED: 'badge bg-danger',
    };
    return map[status] || 'badge bg-secondary';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'bi-clock',
      PROCESSING: 'bi-gear',
      SHIPPED: 'bi-truck',
      DELIVERED: 'bi-check-circle',
      CANCELLED: 'bi-x-circle',
    };
    return map[status] || 'bi-circle';
  }

  countByStatus(status: string): number {
    return this.orders.filter((o) => o.status === status).length;
  }

  getOrderTotal(order: Order): number {
    return (
      order.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ||
      order.totalAmount
    );
  }
}
