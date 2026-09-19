import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventoryService } from '../../core/services/inventory.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { Inventory } from '../../models/inventory.model';
import { Product } from '../../models/product.model';
import { AppError } from '../../core/models/app-error';
import { RequestState } from '../../core/models/request-state';
import { SkeletonTableComponent } from '../../shared/components/states/skeleton-table.component';
import { ErrorStateComponent } from '../../shared/components/states/error-state.component';
import { EmptyStateComponent } from '../../shared/components/states/empty-state.component';

interface InventoryData {
  inventory: Inventory[];
  products: Product[];
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SkeletonTableComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
})
export class InventoryComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly toasts = inject(ToastService);

  Math = Math;

  readonly state = new RequestState<InventoryData>();

  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly modalError = signal('');

  /**
   * Plain field, not a signal: it is only ever changed by the checkbox, and a
   * template event already schedules a change detection pass. It also has to
   * stay a plain property for two-way [(ngModel)] binding.
   */
  filterLowStock = false;

  selectedItem: Inventory | null = null;

  form = {
    quantity: 0,
    lowStockAlert: 10,
  };

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Loads products and inventory together.
   *
   * The previous version nested the inventory call inside the products
   * subscription and gave the products call no error handler at all, so if the
   * product service failed the page stayed on its spinner forever with nothing
   * to explain why. forkJoin fails as a unit, which the error state can report.
   */
  loadData(): void {
    this.state.hasData ? this.state.beginRefresh() : this.state.begin();

    forkJoin({
      products: this.productService.getAll(0, 200),
      inventory: this.inventoryService.getAll(),
    }).subscribe({
      next: ({ products, inventory }) =>
        this.state.succeed({ products: products.content, inventory }),
      error: (err) => this.state.fail(err),
    });
  }

  // Derived views ---------------------------------------------------------

  get inventory(): Inventory[] {
    return this.state.data?.inventory ?? [];
  }

  get products(): Product[] {
    return this.state.data?.products ?? [];
  }

  get filteredInventory(): Inventory[] {
    return this.filterLowStock
      ? this.inventory.filter((i) => this.isLowStock(i))
      : this.inventory;
  }

  get lowStockCount(): number {
    return this.inventory.filter((i) => this.isLowStock(i)).length;
  }

  get totalItems(): number {
    return this.inventory.reduce((sum, i) => sum + i.quantity, 0);
  }

  getProductName(productId: number): string {
    return this.products.find((p) => p.productId === productId)?.name ?? `Product #${productId}`;
  }

  getProductImage(productId: number): string {
    return this.products.find((p) => p.productId === productId)?.imageUrl || '';
  }

  isLowStock(item: Inventory): boolean {
    return item.quantity <= item.lowStockAlert;
  }

  /**
   * No-op retained for the checkbox's (change) binding. The filtered list is
   * derived by the getter above, so there is nothing to recompute here.
   */
  filterStock(): void {}

  // Modal -----------------------------------------------------------------

  openRestockModal(item: Inventory): void {
    this.selectedItem = item;
    this.form.quantity = item.quantity;
    this.form.lowStockAlert = item.lowStockAlert;
    this.modalError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedItem = null;
    this.modalError.set('');
  }

  saveStock(): void {
    if (!this.selectedItem) return;

    const item = this.selectedItem;
    const name = this.getProductName(item.productId);

    this.saving.set(true);
    this.modalError.set('');

    this.inventoryService
      .updateStock(item.productId, {
        productId: item.productId,
        quantity: this.form.quantity,
        lowStockAlert: this.form.lowStockAlert,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.toasts.success(`Stock updated for ${name}.`);
          this.loadData();
        },
        error: (err: AppError) => {
          // Keep the modal open and report inline, so the operator does not
          // lose the values they just typed.
          this.modalError.set(err.message);
          this.saving.set(false);
        },
      });
  }
}
