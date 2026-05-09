export interface Inventory {
  inventoryId:   number;
  productId:     number;
  quantity:      number;
  lowStockAlert: number;
  updatedAt:     string;
}

export interface StockResponse {
  productId: number;
  quantity:  number;
  lowStock:  boolean;
  message:   string;
}