import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';
import { ProductService } from '../../core/services/product.service';
import { Inventory } from '../../models/inventory.model';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {

  Math = Math;

  inventory:       Inventory[] = [];
  products:        Product[]   = [];
  filteredInventory: Inventory[] = [];
  loading          = true;
  saving           = false;
  showModal        = false;
  successMessage   = '';
  errorMessage     = '';
  filterLowStock   = false;
  selectedItem:    Inventory | null = null;

  form = {
    quantity:      0,
    lowStockAlert: 10
  };

  constructor(
    private inventoryService: InventoryService,
    private productService:   ProductService
  ) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading = true;
    this.productService.getAll().subscribe(products => {
      this.products = products;
      this.inventoryService.getAll().subscribe({
        next: (data) => {
          this.inventory         = data;
          this.filteredInventory = data;
          this.loading           = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load inventory.';
          this.loading      = false;
        }
      });
    });
  }

  getProductName(productId: number): string {
    const p = this.products.find(p => p.productId === productId);
    return p ? p.name : `Product #${productId}`;
  }

  getProductImage(productId: number): string {
    const p = this.products.find(p => p.productId === productId);
    return p?.imageUrl || 'assets/no-image.png';
  }

  isLowStock(item: Inventory): boolean {
    return item.quantity <= item.lowStockAlert;
  }

  filterStock() {
    this.filteredInventory = this.filterLowStock
      ? this.inventory.filter(i => this.isLowStock(i))
      : this.inventory;
  }

  get lowStockCount(): number {
    return this.inventory.filter(i => this.isLowStock(i)).length;
  }

  get totalItems(): number {
    return this.inventory.reduce((sum, i) => sum + i.quantity, 0);
  }

  openRestockModal(item: Inventory) {
    this.selectedItem    = item;
    this.form.quantity      = item.quantity;
    this.form.lowStockAlert = item.lowStockAlert;
    this.showModal       = true;
  }

  closeModal() {
    this.showModal    = false;
    this.selectedItem = null;
    this.errorMessage = '';
  }

  saveStock() {
    if (!this.selectedItem) return;
    this.saving = true;
    this.inventoryService.updateStock(
        this.selectedItem.productId, {
      productId:     this.selectedItem.productId,
      quantity:      this.form.quantity,
      lowStockAlert: this.form.lowStockAlert
    }).subscribe({
      next: () => {
        this.successMessage = `Stock updated for 
          ${this.getProductName(this.selectedItem!.productId)}!`;
        this.closeModal();
        this.loadData();
        this.saving = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.errorMessage = 'Failed to update stock.';
        this.saving       = false;
      }
    });
  }
}