import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { InventoryService } from '../../core/services/inventory.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {

  products:       Product[] = [];
  filteredProducts: Product[] = [];
  loading         = true;
  saving          = false;
  searchTerm      = '';
  selectedCategory = '';
  showModal       = false;
  isEditing       = false;
  selectedFile:   File | null = null;
  imagePreview:   string | null = null;
  successMessage  = '';
  errorMessage    = '';

  categories = [
    'Electronics', 'Clothing', 'Books', 'Home & Garden',
    'Sports', 'Toys', 'Food & Beverages', 'Other'
  ];

  form = {
    productId:   0,
    name:        '',
    description: '',
    price:       0,
    category:    '',
    imageUrl:    ''
  };

  constructor(
    private productService:   ProductService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit() { this.loadProducts(); }

  loadProducts() {
    this.loading = true;
    // Admin loads all products (large page size) for full management view
    this.productService.getAll(0, 200).subscribe({
      next: (page) => {
        this.products         = page.content;
        this.filteredProducts = page.content;
        this.loading          = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load products.';
        this.loading      = false;
      }
    });
  }

  search() {
    this.filteredProducts = this.products.filter(p => {
      const matchName = p.name.toLowerCase()
                         .includes(this.searchTerm.toLowerCase());
      const matchCat  = this.selectedCategory
                        ? p.category === this.selectedCategory
                        : true;
      return matchName && matchCat;
    });
  }

  openAddModal() {
    this.isEditing    = false;
    this.form         = { productId: 0, name: '', description: '',
                          price: 0, category: '', imageUrl: '' };
    this.selectedFile = null;
    this.imagePreview = null;
    this.showModal    = true;
  }

  openEditModal(product: Product) {
    this.isEditing    = true;
    this.form         = { ...product };
    this.selectedFile = null;
    this.imagePreview = product.imageUrl;
    this.showModal    = true;
  }

  closeModal() {
    this.showModal    = false;
    this.errorMessage = '';
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      // Show preview
      const reader      = new FileReader();
      reader.onload     = (e: any) => this.imagePreview = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  saveProduct() {
    this.saving = true;
    const formData = new FormData();
    formData.append('name',        this.form.name);
    formData.append('description', this.form.description);
    formData.append('price',       this.form.price.toString());
    formData.append('category',    this.form.category);

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    if (this.isEditing) {
      this.productService.update(this.form.productId, formData).subscribe({
        next: () => {
          this.successMessage = 'Product updated successfully!';
          this.closeModal();
          this.loadProducts();
          this.saving = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: () => {
          this.errorMessage = 'Failed to update product.';
          this.saving       = false;
        }
      });
    } else {
      this.productService.create(formData).subscribe({
        next: (product) => {
          // Auto-create inventory record with 0 stock
          this.inventoryService.createStock({
            productId:     product.productId,
            quantity:      0,
            lowStockAlert: 10
          }).subscribe();

          this.successMessage = 'Product added successfully!';
          this.closeModal();
          this.loadProducts();
          this.saving = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: () => {
          this.errorMessage = 'Failed to add product.';
          this.saving       = false;
        }
      });
    }
  }

  deleteProduct(product: Product) {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    this.productService.delete(product.productId).subscribe({
      next: () => {
        this.successMessage = 'Product deleted successfully!';
        this.loadProducts();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => this.errorMessage = 'Failed to delete product.'
    });
  }
}