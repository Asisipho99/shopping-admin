import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DatasetSource,
  Distribution,
  EdaReport,
  MlStatus,
  PredictionResult,
  PreparationReport,
  TrainingReport,
} from '../../models/analytics.model';

/**
 * Talks to the AI service's dataset and machine-learning endpoints.
 *
 * Unlike the other base URLs in `environment`, `aiServiceUrl` carries no `/api`
 * suffix, so the paths below include it.
 *
 * Every response is wrapped by the Python service in `{ success, data }`, so
 * this service unwraps `data` and hands components the payload directly.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.aiServiceUrl;

  private unwrap<T>(source: Observable<{ success: boolean; data: T }>): Observable<T> {
    return source.pipe(map((response) => response.data));
  }

  // ── Dataset and EDA ──────────────────────────────────────────────────

  /** Which dataset is loaded, and where it came from. */
  getSource(): Observable<DatasetSource> {
    return this.unwrap(
      this.http.get<{ success: boolean; data: DatasetSource }>(
        `${this.url}/api/data/source`
      )
    );
  }

  /** Profile of the raw dataset, before any cleaning. */
  getEda(): Observable<EdaReport> {
    return this.unwrap(
      this.http.get<{ success: boolean; data: EdaReport }>(`${this.url}/api/data/eda`)
    );
  }

  /** Histogram of one numeric column. */
  getDistribution(column: string, bins = 20): Observable<Distribution> {
    return this.unwrap(
      this.http.get<{ success: boolean; data: Distribution }>(
        `${this.url}/api/data/distribution/${column}?bins=${bins}`
      )
    );
  }

  /**
   * Run the cleaning and feature-engineering pipeline.
   *
   * Slow on the full dataset - it reads about a million rows - so the caller
   * should show progress rather than a brief spinner.
   */
  prepare(): Observable<PreparationReport> {
    return this.unwrap(
      this.http.post<{ success: boolean; data: PreparationReport }>(
        `${this.url}/api/data/prepare`,
        {}
      )
    );
  }

  // ── Machine learning ─────────────────────────────────────────────────

  /** Which models are trained and ready. */
  getMlStatus(): Observable<MlStatus> {
    return this.unwrap(
      this.http.get<{ success: boolean; data: MlStatus }>(`${this.url}/api/ml/status`)
    );
  }

  /** Train all four algorithms and return the comparison. */
  train(): Observable<TrainingReport> {
    return this.unwrap(
      this.http.post<{ success: boolean; data: TrainingReport }>(
        `${this.url}/api/ml/train`,
        {}
      )
    );
  }

  /** The comparison from the last training run. */
  getComparison(): Observable<TrainingReport> {
    return this.unwrap(
      this.http.get<{ success: boolean; data: TrainingReport }>(
        `${this.url}/api/ml/comparison`
      )
    );
  }

  /** Score a single customer against a chosen model. */
  predict(model: string, features: Record<string, number>): Observable<PredictionResult> {
    return this.unwrap(
      this.http.post<{ success: boolean; data: PredictionResult }>(
        `${this.url}/api/ml/predict`,
        { model, features }
      )
    );
  }
}
