/**
 * Types mirroring the AI service's data and ML endpoints.
 *
 * The Python service uses snake_case, and these interfaces keep those names
 * rather than translating at the boundary. A single consistent shape is easier
 * to follow than one that is half-mapped.
 */

export interface DatasetFile {
  name: string;
  size_mb: number;
}

export interface DatasetSource {
  available: boolean;
  path: string;
  files: DatasetFile[];
  active?: string;
  dataset: {
    name: string;
    origin: string;
    description: string;
    why: string;
    row_limit_applied: number | null;
  };
}

export interface MissingValueRow {
  column: string;
  dtype: string;
  missing: number;
  missing_pct: number;
  present: number;
  unique: number;
}

export interface NumericSummaryRow {
  column: string;
  count: number;
  mean: number | null;
  std: number | null;
  min: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  max: number | null;
  negative_values: number;
  zero_values: number;
}

export interface QualityFinding {
  issue: string;
  column: string;
  affected_rows: number;
  affected_pct: number;
  consequence: string;
  treatment: string;
}

export interface CategoryCount {
  value: string;
  count: number;
  pct: number;
}

export interface EdaOverview {
  source_file: string | null;
  rows: number;
  columns: number;
  column_names: string[];
  memory_mb: number;
  duplicate_rows: number;
  duplicate_pct: number;
  dtypes: Record<string, string>;
}

export interface EdaReport {
  overview: EdaOverview;
  missing_values: MissingValueRow[];
  numeric_summary: NumericSummaryRow[];
  date_range: {
    available: boolean;
    earliest?: string;
    latest?: string;
    span_days?: number;
    unparseable?: number;
  };
  top_countries: CategoryCount[];
  top_products: CategoryCount[];
  quality_findings: QualityFinding[];
}

export interface CleaningStep {
  step: string;
  rows_before: number;
  rows_after: number;
  rows_removed: number;
  reason: string;
  values_imputed?: number;
  retained_pct?: number;
}

export interface PreparationReport {
  raw: EdaOverview;
  quality_findings: QualityFinding[];
  cleaning_steps: CleaningStep[];
  features: {
    customers: number;
    feature_columns: string[];
    label_column: string;
    dataset_end: string;
    feature_window_end: string;
    holdout_days: number;
    positive_label_count: number;
    positive_label_pct: number;
    note: string;
  };
  output_file: string;
}

export interface ConfusionMatrix {
  true_negative: number;
  false_positive: number;
  false_negative: number;
  true_positive: number;
}

export interface AlgorithmScore {
  algorithm: string;
  family: string;
  task: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number | null;
  confusion_matrix: ConfusionMatrix;
}

export interface ClusterProfile {
  cluster: number;
  customers: number;
  share_pct: number;
  label: string;
  repurchase_rate_pct?: number;
  median_recency_days?: number;
  median_frequency?: number;
  median_monetary_total?: number;
}

export interface SegmentationReport {
  algorithm: string;
  family: string;
  features_used: string[];
  preprocessing: string;
  chosen_k: number;
  selection_metric: string;
  candidate_scores: { k: number; silhouette: number; inertia: number }[];
  metrics: { silhouette: number; inertia: number };
  clusters: ClusterProfile[];
}

export interface FeatureWeight {
  feature: string;
  importance?: number;
  coefficient?: number;
}

export interface TrainingReport {
  trained_at: string;
  dataset: { rows_used: number; source: string };
  split: {
    feature_columns: string[];
    train_rows: number;
    test_rows: number;
    test_size: number;
    train_positive_pct: number;
    test_positive_pct: number;
    stratified: boolean;
    random_state: number;
  };
  supervised_comparison: AlgorithmScore[];
  best_supervised: { algorithm: string; chosen_by: string };
  feature_importance: Record<string, FeatureWeight[]>;
  segmentation: SegmentationReport;
  algorithm_count: number;
  algorithms: string[];
}

export interface MlStatus {
  supervised_trained: boolean;
  available_models: string[];
  feature_columns: string[];
  segmentation_trained: boolean;
  last_trained: string | null;
  algorithm_count: number;
}

export interface PredictionResult {
  prediction: number;
  meaning: string;
  probability_repurchase: number | null;
  model: string;
  segment?: number | null;
}

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

export interface Distribution {
  available: boolean;
  reason?: string;
  column?: string;
  clipped_to_percentile?: number[];
  excluded_outliers?: number;
  bins?: HistogramBin[];
}
