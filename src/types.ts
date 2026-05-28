export enum AnchorTagType {
  SECURITY_CHECK = "Security Check",
  DATA_AUDIT = "Data Audit",
  DEPRECATED_WARNING = "Deprecated Warning",
  EXTERNAL_API = "External API",
  DATABASE_QUERY = "Database Query",
  PERFORMANCE_CRITICAL = "Performance Critical",
  TELEMETRY_LOG = "Telemetry Log",
  BUSINESS_LOGIC = "Business Logic",
}

export interface AnchorTag {
  id: string;
  name: string;
  type: AnchorTagType;
  file: string;
  purpose: string;
  severity: "low" | "medium" | "high";
  createdBy: string;
  createdAt: string;
}

export interface TriggerRule {
  id: string;
  name: string;
  event: "git-commit" | "ci-build" | "weekly-cron" | "manual-run";
  description: string;
  isActive: boolean;
}

export interface TagVariable {
  id: string;
  name: string;
  type: "string" | "boolean" | "list";
  value: string;
  description: string;
}

export interface CodeFile {
  name: string;
  language: string;
  description: string;
  content: string;
}
