import { Order, FinancialRecord, Customer, Product, CashClosingReport, CashSession, AuditLog, User } from '../../types';

export type DiagnosticStatus = 'normal' | 'monitoring' | 'warning' | 'critical';

export type AnomalyType = 
  | 'unusual_behavior'  // COMPORTAMENTO INCOMUM
  | 'risk'              // RISCO
  | 'inconsistency'     // INCONSISTÊNCIA
  | 'error'             // ERRO
  | 'failure';          // FALHA

export type DiagnosticAreaId = 
  | 'system'
  | 'orders'
  | 'finance'
  | 'cash'
  | 'inventory'
  | 'integrations'
  | 'marketplace'
  | 'users'
  | 'data';

export interface DiagnosticAreaMeta {
  id: DiagnosticAreaId;
  name: string;
  shortName: string;
  iconName: string;
  description: string;
  weight: number; // Peso no cálculo da saúde geral (soma 100)
}

export interface DiagnosticQuickAction {
  id: string;
  label: string;
  actionType: 
    | 'reconcile_cash' 
    | 'resync_webhook' 
    | 'kds_resend' 
    | 'fix_duplicate' 
    | 'adjust_stock' 
    | 'notify_manager' 
    | 'mark_resolved' 
    | 'compensate_entry'
    | 'custom';
  description: string;
  isAutomated?: boolean;
}

export interface DiagnosticAuditEntry {
  timestamp: string;
  action: string;
  user: string;
  details?: string;
  badge?: string;
}

export interface DiagnosticItem {
  id: string;
  code: string;
  title: string;
  area: DiagnosticAreaId;
  areaLabel: string;
  status: DiagnosticStatus;
  anomalyType: AnomalyType;
  detectedAt: string;
  whatWasDetected: string;
  potentialImpact: string;
  probableCause: string;
  suggestedActions: string[];
  quickAction?: DiagnosticQuickAction;
  entityType?: 'order' | 'financial_record' | 'cash_session' | 'product' | 'customer' | 'webhook' | 'user' | 'system';
  entityId?: string;
  entityReference?: string;
  financialImpactEstimated?: number;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  auditTrail: DiagnosticAuditEntry[];
  metricsContext?: Record<string, string | number>;
}

export interface AreaMetricItem {
  label: string;
  value: string | number;
  status: DiagnosticStatus;
  detail?: string;
}

export interface AreaHealthSummary {
  area: DiagnosticAreaId;
  name: string;
  score: number; // 0 a 100
  status: DiagnosticStatus;
  analyzedMetricsCount: number;
  totalAnomaliesCount: number;
  unusualCount: number;
  risksCount: number;
  inconsistenciesCount: number;
  errorsCount: number;
  failuresCount: number;
  lastScan: string;
  metrics: AreaMetricItem[];
}

export interface PlatformHealthState {
  overallScore: number; // 0 a 100
  status: DiagnosticStatus;
  label: string; // "98% — SAUDÁVEL", "84% — ATENÇÃO", "62% — AÇÃO NECESSÁRIA"
  totalChecks: number;
  lastChecked: string;
  nextCheck: string;
  areas: Record<DiagnosticAreaId, AreaHealthSummary>;
  diagnostics: DiagnosticItem[];
  trend: 'improving' | 'stable' | 'degrading';
}
