import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Inventory, StockResponse } from '../../models/inventory.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InventoryService {

  private url = `${environment.inventoryServiceUrl}/inventory`;

  constructor(private http: HttpClient) {}

  private normalizeDate(val: any): string {
    if (!val) return val;
    return Array.isArray(val)
      ? new Date(val[0], val[1] - 1, val[2], val[3] ?? 0, val[4] ?? 0, val[5] ?? 0).toISOString()
      : val;
  }

  private normalize(i: any): Inventory {
    return { ...i, updatedAt: this.normalizeDate(i.updatedAt) };
  }

  getAll(): Observable<Inventory[]> {
    return this.http.get<any[]>(this.url).pipe(
      map(list => list.map(i => this.normalize(i)))
    );
  }

  getStock(productId: number): Observable<StockResponse> {
    return this.http.get<StockResponse>(`${this.url}/product/${productId}`);
  }

  getLowStock(): Observable<Inventory[]> {
    return this.http.get<any[]>(`${this.url}/low-stock`).pipe(
      map(list => list.map(i => this.normalize(i)))
    );
  }

  createStock(data: any): Observable<Inventory> {
    return this.http.post<any>(this.url, data).pipe(
      map(i => this.normalize(i))
    );
  }

  updateStock(productId: number, data: any): Observable<Inventory> {
    return this.http.put<any>(`${this.url}/product/${productId}`, data).pipe(
      map(i => this.normalize(i))
    );
  }
}