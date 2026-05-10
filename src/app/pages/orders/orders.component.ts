import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {

  orders:          Order[] = [];
  filteredOrders:  Order[] = [];
  loading          = true;
  updating         = false;
  selectedOrder:   Order | null = null;
  showModal        = false;
  newStatus        = '';
  successMessage   = '';
  errorMessage     = '';
  filterStatus     = '';
  searchCustomerId = '';

  statuses = ['PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED'];

  constructor(private orderService: OrderService) {}

  ngOnInit() { this.loadOrders(); }

  loadOrders() {
    this.loading = true;
    this.orderService.getAll().subscribe({
      next: (data) => {
        this.orders         = data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.filteredOrders = this.orders;
        this.loading        = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load orders.';
        this.loading      = false;
      }
    });
  }

  filter() {
    this.filteredOrders = this.orders.filter(o => {
      const matchStatus   = this.filterStatus
                            ? o.status === this.filterStatus : true;
      const matchCustomer = this.searchCustomerId
                            ? o.customerId.toString()
                              .includes(this.searchCustomerId) : true;
      return matchStatus && matchCustomer;
    });
  }

  openOrderModal(order: Order) {
    this.selectedOrder = order;
    this.newStatus     = order.status;
    this.showModal     = true;
  }

  closeModal() {
    this.showModal     = false;
    this.selectedOrder = null;
    this.errorMessage  = '';
  }

  updateStatus() {
    if (!this.selectedOrder) return;
    this.updating = true;
    this.orderService.updateStatus(
        this.selectedOrder.orderId, this.newStatus).subscribe({
      next: () => {
        this.successMessage = `Order #${this.selectedOrder!.orderId} updated to ${this.newStatus}!`;
        this.updating = false;
        this.closeModal();
        this.loadOrders();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.errorMessage = 'Failed to update order status.';
        this.updating     = false;
      }
    });
  }

  cancelOrder(order: Order) {
    if (!confirm(`Cancel order #${order.orderId}?`)) return;
    this.orderService.cancelOrder(order.orderId).subscribe({
      next: () => {
        this.successMessage = `Order #${order.orderId} cancelled.`;
        this.loadOrders();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => this.errorMessage = 'Failed to cancel order.'
    });
  }

  getStatusColor(status: string): string {
    const map: any = {
      'PENDING':    '#f59e0b',
      'PROCESSING': '#3b82f6',
      'SHIPPED':    '#8b5cf6',
      'DELIVERED':  '#10b981',
      'CANCELLED':  '#ef4444'
    };
    return map[status] || '#94a3b8';
  }

  getStatusClass(status: string): string {
    const map: any = {
      'PENDING':    'badge bg-warning text-dark',
      'PROCESSING': 'badge bg-info text-white',
      'SHIPPED':    'badge bg-primary',
      'DELIVERED':  'badge bg-success',
      'CANCELLED':  'badge bg-danger'
    };
    return map[status] || 'badge bg-secondary';
  }

  getStatusIcon(status: string): string {
    const map: any = {
      'PENDING':    'bi-clock',
      'PROCESSING': 'bi-gear',
      'SHIPPED':    'bi-truck',
      'DELIVERED':  'bi-check-circle',
      'CANCELLED':  'bi-x-circle'
    };
    return map[status] || 'bi-circle';
  }

  countByStatus(status: string): number {
    return this.orders.filter(o => o.status === status).length;
  }

  getOrderTotal(order: Order): number {
    return order.items?.reduce((sum, item) =>
      sum + (item.quantity * item.unitPrice), 0) || order.totalAmount;
  }
}