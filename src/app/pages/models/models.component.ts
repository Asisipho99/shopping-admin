import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ToastService } from '../../core/services/toast.service';
import { AppError } from '../../core/models/app-error';
import { RequestState } from '../../core/models/request-state';
import {
  AlgorithmScore,
  MlStatus,
  PredictionResult,
  TrainingReport,
} from '../../models/analytics.model';
import { SkeletonTableComponent } from '../../shared/components/states/skeleton-table.component';
import { ErrorStateComponent } from '../../shared/components/states/error-state.component';
import { LoadingStateComponent } from '../../shared/components/states/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/states/empty-state.component';

/** Sensible starting values for the prediction form, so it is usable immediately. */
const DEFAULT_FEATURES: Record<string, number> = {
  recency_days: 30,
  frequency: 5,
  monetary_total: 1500,
  monetary_avg_order: 300,
  total_items: 250,
  distinct_products: 30,
  avg_unit_price: 3.5,
  tenure_days: 365,
};

@Component({
  selector: 'app-models',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SkeletonTableComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  templateUrl: './models.component.html',
  styleUrls: ['./models.component.scss'],
})
export class ModelsComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly toasts = inject(ToastService);

  readonly status = new RequestState<MlStatus>();
  readonly report = new RequestState<TrainingReport>();
  readonly prediction = new RequestState<PredictionResult>();

  /** Separate from `report` because training is a long user-triggered action. */
  readonly training = signal(false);

  readonly selectedModel = signal<string>('Random Forest');
  readonly featureValues = signal<Record<string, number>>({ ...DEFAULT_FEATURES });

  /** Which metric the comparison bars are drawn for. */
  readonly metric = signal<'accuracy' | 'precision' | 'recall' | 'f1' | 'roc_auc'>(
    'roc_auc'
  );

  readonly metricOptions = [
    { key: 'roc_auc', label: 'ROC-AUC' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'precision', label: 'Precision' },
    { key: 'recall', label: 'Recall' },
    { key: 'f1', label: 'F1' },
  ] as const;

  /** Feature list comes from the trained models, falling back to the defaults. */
  readonly featureColumns = computed(() => {
    const fromStatus = this.status.data?.feature_columns ?? [];
    return fromStatus.length ? fromStatus : Object.keys(DEFAULT_FEATURES);
  });

  ngOnInit(): void {
    this.loadStatus();
    this.loadReport();
  }

  loadStatus(): void {
    this.status.hasData ? this.status.beginRefresh() : this.status.begin();
    this.analytics.getMlStatus().subscribe({
      next: (data) => {
        this.status.succeed(data);
        if (data.available_models.length && !data.available_models.includes(this.selectedModel())) {
          this.selectedModel.set(data.available_models[0]);
        }
      },
      error: (err) => this.status.fail(err),
    });
  }

  loadReport(): void {
    this.report.hasData ? this.report.beginRefresh() : this.report.begin();
    this.analytics.getComparison().subscribe({
      next: (data) => this.report.succeed(data),
      error: (err: AppError) => {
        // A missing report is an expected state before the first training run,
        // not a failure worth shouting about.
        if (err.kind === 'notFound') {
          this.report.succeed(null as unknown as TrainingReport);
        } else {
          this.report.fail(err);
        }
      },
    });
  }

  train(): void {
    this.training.set(true);
    this.toasts.info('Training four algorithms on the prepared dataset.');

    this.analytics.train().subscribe({
      next: (data) => {
        this.report.succeed(data);
        this.training.set(false);
        this.loadStatus();
        this.toasts.success(
          `Trained ${data.algorithm_count} algorithms. Best: ${data.best_supervised.algorithm}.`,
          'Training complete'
        );
      },
      error: (err: AppError) => {
        this.training.set(false);
        this.toasts.error(err.message, 'Training failed');
        if (!this.report.hasData) {
          this.report.fail(err);
        }
      },
    });
  }

  // ── Prediction form ───────────────────────────────────────────────────

  updateFeature(column: string, value: string): void {
    const parsed = Number(value);
    this.featureValues.update((current) => ({
      ...current,
      [column]: Number.isFinite(parsed) ? parsed : 0,
    }));
  }

  featureValue(column: string): number {
    return this.featureValues()[column] ?? 0;
  }

  resetFeatures(): void {
    this.featureValues.set({ ...DEFAULT_FEATURES });
    this.prediction.reset();
  }

  runPrediction(): void {
    const columns = this.featureColumns();
    const values = this.featureValues();

    // Send exactly the columns the model expects, in case the form holds extras.
    const payload: Record<string, number> = {};
    for (const column of columns) {
      payload[column] = values[column] ?? 0;
    }

    this.prediction.begin();
    this.analytics.predict(this.selectedModel(), payload).subscribe({
      next: (result) => this.prediction.succeed(result),
      error: (err: AppError) => {
        this.prediction.fail(err);
        this.toasts.error(err.message, 'Prediction failed');
      },
    });
  }

  // ── Template helpers ──────────────────────────────────────────────────

  get comparison(): AlgorithmScore[] {
    return this.report.data?.supervised_comparison ?? [];
  }

  get hasReport(): boolean {
    return !!this.report.data;
  }

  metricValue(row: AlgorithmScore): number {
    const value = row[this.metric()];
    return typeof value === 'number' ? value : 0;
  }

  /** Bar width as a percentage. Metrics are all 0-1, so scale directly. */
  barWidth(row: AlgorithmScore): number {
    return Math.round(this.metricValue(row) * 100);
  }

  isBest(row: AlgorithmScore): boolean {
    return this.report.data?.best_supervised.algorithm === row.algorithm;
  }

  /** Feature weights for whichever model is selected, capped for display. */
  get selectedFeatureWeights() {
    const weights = this.report.data?.feature_importance?.[this.selectedModel()] ?? [];
    return weights.slice(0, 8);
  }

  weightMagnitude(weight: { importance?: number; coefficient?: number }): number {
    const raw = weight.importance ?? weight.coefficient ?? 0;
    return Math.abs(raw);
  }

  weightBarWidth(weight: { importance?: number; coefficient?: number }): number {
    const all = this.selectedFeatureWeights.map((w) => this.weightMagnitude(w));
    const largest = Math.max(...all, 0.0001);
    return Math.round((this.weightMagnitude(weight) / largest) * 100);
  }

  clusterMetric(cluster: Record<string, unknown>, key: string): number | null {
    const value = cluster[key];
    return typeof value === 'number' ? value : null;
  }
}
