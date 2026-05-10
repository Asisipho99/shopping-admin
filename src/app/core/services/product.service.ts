import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../../models/product.model';
import { environment } from '../../../environments/environment';

export interface PageResponse<T> {
  content:       T[];
  page:          number;
  size:          number;
  totalElements: number;
  totalPages:    number;
  last:          boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductService {

  private url = `${environment.productServiceUrl}/products`;

  constructor(private http: HttpClient) {}

  private normalize(p: any): Product {
    return {
      ...p,
      price: Number(p.price),
      createdAt: Array.isArray(p.createdAt)
        ? new Date(p.createdAt[0], p.createdAt[1] - 1, p.createdAt[2],
                   p.createdAt[3] ?? 0, p.createdAt[4] ?? 0, p.createdAt[5] ?? 0).toISOString()
        : p.createdAt
    };
  }

  getAll(page = 0, size = 20): Observable<PageResponse<Product>> {
    return this.http.get<any>(`${this.url}?page=${page}&size=${size}`).pipe(
      map(res => ({ ...res, content: res.content.map((p: any) => this.normalize(p)) }))
    );
  }

  getById(id: number): Observable<Product> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(p => this.normalize(p))
    );
  }

  create(formData: FormData): Observable<Product> {
    return this.http.post<any>(this.url, formData).pipe(
      map(p => this.normalize(p))
    );
  }

  update(id: number, formData: FormData): Observable<Product> {
    return this.http.put<any>(`${this.url}/${id}`, formData).pipe(
      map(p => this.normalize(p))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  searchByName(name: string): Observable<Product[]> {
    return this.http.get<any[]>(`${this.url}?name=${name}`).pipe(
      map(list => list.map(p => this.normalize(p)))
    );
  }

  getByCategory(category: string): Observable<Product[]> {
    return this.http.get<any[]>(`${this.url}?category=${category}`).pipe(
      map(list => list.map(p => this.normalize(p)))
    );
  }
}