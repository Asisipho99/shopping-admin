import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Order } from '../../models/order.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrderService {

  private url = `${environment.orderServiceUrl}/orders`;

  constructor(private http: HttpClient) {}

  private normalizeDate(val: any): string {
    if (!val) return val;
    return Array.isArray(val)
      ? new Date(val[0], val[1] - 1, val[2], val[3] ?? 0, val[4] ?? 0, val[5] ?? 0).toISOString()
      : val;
  }

  private normalize(o: any): Order {
    return { ...o, createdAt: this.normalizeDate(o.createdAt) };
  }

  getAll(): Observable<Order[]> {
    return this.http.get<any[]>(this.url).pipe(
      map(list => list.map(o => this.normalize(o)))
    );
  }

  getById(id: number): Observable<Order> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(o => this.normalize(o))
    );
  }

  getByCustomer(customerId: number): Observable<Order[]> {
    return this.http.get<any[]>(`${this.url}/customer/${customerId}`).pipe(
      map(list => list.map(o => this.normalize(o)))
    );
  }

  updateStatus(orderId: number, status: string): Observable<Order> {
    return this.http.put<any>(`${this.url}/${orderId}/status?status=${status}`, {}).pipe(
      map(o => this.normalize(o)),
      catchError(err => throwError(() => err))
    );
  }

  cancelOrder(orderId: number): Observable<Order> {
    return this.http.put<any>(`${this.url}/${orderId}/cancel`, {}).pipe(
      map(o => this.normalize(o)),
      catchError(err => throwError(() => err))
    );
  }}