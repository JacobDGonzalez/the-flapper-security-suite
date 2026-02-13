
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface HardeningMitigation {
  id: string;
  name: string;
  description: string;
  category: 'Network' | 'Services' | 'Hardware' | 'System';
  target: string;
  riskLevel: RiskLevel;
  isApplied: boolean;
  learnMoreLink?: string;
}

export interface ServiceStatus {
  port: number;
  name: string;
  protocol: 'TCP' | 'UDP';
  status: 'OPEN' | 'CLOSED' | 'FILTERED';
  risk: RiskLevel;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface EducationalContent {
  title: string;
  summary: string;
  technicalDetails: string;
  remediationSteps: string;
}
