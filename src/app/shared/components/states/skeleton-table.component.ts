import { Component, Input } from '@angular/core';

/**
 * Placeholder rows shaped like the admin data tables.
 *
 * The admin screens are tables rather than card grids, so this is the table
 * equivalent of the customer app's skeleton grid. Preferred over a bare spinner
 * because the layout does not jump when the real rows arrive, and the operator
 * can see roughly how much is coming.
 */
@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  template: `
    <div class="table-responsive" aria-busy="true" role="status">
      <span class="visually-hidden">{{ message }}</span>
      <table class="table align-middle mb-0">
        @if (headers.length) {
          <thead>
            <tr>
              @for (h of headers; track h) {
                <th>{{ h }}</th>
              }
            </tr>
          </thead>
        }
        <tbody>
          @for (row of rowList; track row) {
            <tr>
              @for (col of colList; track col) {
                <td>
                  <div class="sk sk-line" [style.width.%]="widthFor(col)"></div>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .sk {
        background: linear-gradient(90deg, #eef1f5 25%, #e2e7ee 37%, #eef1f5 63%);
        background-size: 400% 100%;
        animation: sk-shimmer 1.3s ease-in-out infinite;
        border-radius: 6px;
      }
      .sk-line {
        height: 0.75rem;
      }
      @keyframes sk-shimmer {
        0% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0 50%;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .sk {
          animation: none;
        }
      }
    `,
  ],
})
export class SkeletonTableComponent {
  @Input() rows = 6;
  @Input() cols = 5;
  /** Optional header labels, so the skeleton matches the real table. */
  @Input() headers: string[] = [];
  @Input() message = 'Loading...';

  get rowList(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }

  get colList(): number[] {
    return Array.from({ length: this.cols }, (_, i) => i);
  }

  /** Vary the bar widths so it reads as content rather than a grid. */
  widthFor(col: number): number {
    const pattern = [70, 45, 85, 55, 40, 60];
    return pattern[col % pattern.length];
  }
}
