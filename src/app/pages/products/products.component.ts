import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { InventoryService } from '../../core/services/inventory.service';
import { ToastService } from '../../core/services/toast.service';
import { Product } from '../../models/product.model';
import { AppError } from '../../core/models/app-error';
import { RequestState } from '../../core/models/request-state';
import { SkeletonTableComponent } from '../../shared/components/states/skeleton-table.component';
import { ErrorStateComponent } from '../../shared/components/states/error-state.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SkeletonTableComponent,
    ErrorStateComponent,
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly inventoryService = inject(InventoryService);
  private readonly toasts = inject(ToastService);

  readonly state = new RequestState<Product[]>();

  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly modalError = signal('');
  readonly isEditing = signal(false);
  readonly imagePreview = signal<string | null>(null);

  // Plain fields: only ever changed from template events.
  searchTerm = '';
  selectedCategory = '';
  selectedFile: File | null = null;

  categories = [
    'Electronics',
    'Clothing',
    'Books',
    'Home & Garden',
    'Sports',
    'Toys',
    'Food & Beverages',
    'Other',
  ];

  form = {
    productId: 0,
    name: '',
    description: '',
    price: 0,
    category: '',
    imageUrl: '',
  };

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.state.hasData ? this.state.beginRefresh() : this.state.begin();

    // Admin loads a large page for a full management view.
    this.productService.getAll(0, 200).subscribe({
      next: (page) => this.state.succeed(page.content),
      error: (err) => this.state.fail(err),
    });
  }

  get products(): Product[] {
    return this.state.data ?? [];
  }

  /** Filtering is client-side over the loaded page, so derive rather than store. */
  get filteredProducts(): Product[] {
    const term = this.searchTerm.toLowerCase();
    return this.products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(term);
      const matchCat = this.selectedCategory ? p.category === this.selectedCategory : true;
      return matchName && matchCat;
    });
  }

  get isFiltered(): boolean {
    return !!this.searchTerm || !!this.selectedCategory;
  }

  /** Retained for the template's existing (input)/(change) bindings. */
  search(): void {}

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
  }

  // Modal -----------------------------------------------------------------

  openAddModal(): void {
    this.isEditing.set(false);
    this.form = {
      productId: 0,
      name: '',
      description: '',
      price: 0,
      category: '',
      imageUrl: '',
    };
    this.selectedFile = null;
    this.imagePreview.set(null);
    this.modalError.set('');
    this.showModal.set(true);
  }

  openEditModal(product: Product): void {
    this.isEditing.set(true);
    this.form = { ...product };
    this.selectedFile = null;
    this.imagePreview.set(product.imageUrl);
    this.modalError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalError.set('');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile = file;

    // FileReader is async, so the preview has to go through a signal or it
    // would never appear under zoneless change detection.
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  saveProduct(): void {
    this.saving.set(true);
    this.modalError.set('');

    const formData = new FormData();
    formData.append('name', this.form.name);
    formData.append('description', this.form.description);
    formData.append('price', this.form.price.toString());
    formData.append('category', this.form.category);
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    const editing = this.isEditing();
    const request = editing
      ? this.productService.update(this.form.productId, formData)
      : this.productService.create(formData);

    request.subscribe({
      next: (product) => {
        this.saving.set(false);
        this.closeModal();

        if (editing) {
          this.toasts.success(`${product.name} updated.`);
        } else {
          this.toasts.success(`${product.name} added to the catalogue.`);
          this.createInventoryRecord(product);
        }

        this.loadProducts();
      },
      error: (err: AppError) => {
        // Keep the modal open so the operator does not lose their input.
        this.modalError.set(err.message);
        this.saving.set(false);
      },
    });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    this.productService.delete(product.productId).subscribe({
      next: () => {
        this.toasts.success(`${product.name} deleted.`);
        this.loadProducts();
      },
      error: (err: AppError) => this.toasts.error(err.message, 'Could not delete product'),
    });
  }

  /**
   * A new product needs an inventory row before it can be sold.
   *
   * This used to be fired with a bare `.subscribe()`, so a failure was silent
   * and the product would sit in the catalogue permanently unsellable with
   * nobody aware. Now the operator is told to set the stock manually.
   */
  private createInventoryRecord(product: Product): void {
    this.inventoryService
      .createStock({ productId: product.productId, quantity: 0, lowStockAlert: 10 })
      .subscribe({
        error: () =>
          this.toasts.warning(
            `${product.name} was saved, but its stock record could not be created. Add it from the Inventory page.`,
            'Stock record missing'
          ),
      });
  }
}
