import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ToastService } from '../../core/services/toast.service';
import { AppError } from '../../core/models/app-error';
import { RequestState } from '../../core/models/request-state';
import {
  DatasetSource,
  EdaReport,
  PreparationReport,
} from '../../models/analytics.model';
import { SkeletonTableComponent } from '../../shared/components/states/skeleton-table.component';
import { ErrorStateComponent } from '../../shared/components/states/error-state.component';
import { LoadingStateComponent } from '../../shared/components/states/loading-state.component';

@Component({
  selector: 'app-dataset',
  standalone: true,
  imports: [
    CommonModule,
    SkeletonTableComponent,
    ErrorStateComponent,
    LoadingStateComponent,
  ],
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.scss'],
})
export class DatasetComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly toasts = inject(ToastService);

  readonly source = new RequestState<DatasetSource>();
  readonly eda = new RequestState<EdaReport>();

  /**
   * The preparation run is separate state because it is a user-triggered
   * action over roughly a million rows, not something loaded on arrival.
   */
  readonly preparation = new RequestState<PreparationReport>();

  /** Which quality finding's detail is expanded. */
  readonly expandedFinding = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSource();
    this.loadEda();
  }

  loadSource(): void {
    this.source.hasData ? this.source.beginRefresh() : this.source.begin();
    this.analytics.getSource().subscribe({
      next: (data) => this.source.succeed(data),
      error: (err) => this.source.fail(err),
    });
  }

  loadEda(): void {
    this.eda.hasData ? this.eda.beginRefresh() : this.eda.begin();
    this.analytics.getEda().subscribe({
      next: (data) => this.eda.succeed(data),
      error: (err) => this.eda.fail(err),
    });
  }

  runPreparation(): void {
    this.preparation.begin();
    this.toasts.info('Cleaning the dataset. This reads the full file and takes a moment.');

    this.analytics.prepare().subscribe({
      next: (report) => {
        this.preparation.succeed(report);
        this.toasts.success(
          `Retained ${this.retainedPct(report)}% of rows and built features for ` +
            `${report.features.customers.toLocaleString()} customers.`,
          'Preparation complete'
        );
      },
      error: (err: AppError) => {
        this.preparation.fail(err);
        this.toasts.error(err.message, 'Preparation failed');
      },
    });
  }

  toggleFinding(issue: string): void {
    this.expandedFinding.update((current) => (current === issue ? null : issue));
  }

  // ── Template helpers ──────────────────────────────────────────────────

  /** Only columns that actually have nulls; the rest is noise. */
  get columnsWithMissing() {
    return (this.eda.data?.missing_values ?? []).filter((row) => row.missing > 0);
  }

  get columnsWithoutMissing(): number {
    const all = this.eda.data?.missing_values ?? [];
    return all.length - all.filter((row) => row.missing > 0).length;
  }

  /** The final TOTAL row of the cleaning trail, which reconciles the whole run. */
  get cleaningTotal() {
    return (this.preparation.data?.cleaning_steps ?? []).find((s) => s.step === 'TOTAL');
  }

  /** Every step except the TOTAL summary. */
  get cleaningSteps() {
    return (this.preparation.data?.cleaning_steps ?? []).filter(
      (s) => s.step !== 'TOTAL'
    );
  }

  retainedPct(report: PreparationReport): number {
    return (
      report.cleaning_steps.find((s) => s.step === 'TOTAL')?.retained_pct ?? 0
    );
  }

  /** Width of the removal bar, relative to the largest single removal. */
  removalBarWidth(rowsRemoved: number): number {
    const steps = this.cleaningSteps;
    const worst = Math.max(...steps.map((s) => s.rows_removed), 1);
    return Math.round((rowsRemoved / worst) * 100);
  }

  get isBusy(): boolean {
    return this.source.isBusy || this.eda.isBusy;
  }
}
