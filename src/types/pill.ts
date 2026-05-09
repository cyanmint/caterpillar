export type PillShape = 'oblong' | 'round' | 'capsule' | 'triangle';
export type PillDivider = 'none' | 'half' | 'quarter';

export interface PillTemplatePayload {
  drugName: string;
  dosageLabel: string;
  pillsPerBox: number;
  shape: PillShape;
  primaryColor: string;
  secondaryColor?: string;
  divider: PillDivider;
  svg: string;
  imprint?: string;
  isHighContrast: boolean;
}

export interface LocalPillTemplate extends PillTemplatePayload {
  localId: string;
  createdAt: string;
  syncStatus: 'local-only' | 'synced' | 'sync-failed';
  remoteId?: string;
}
