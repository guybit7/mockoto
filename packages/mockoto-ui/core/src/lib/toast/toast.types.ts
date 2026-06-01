export type ToastLevel = 'success' | 'warning' | 'danger' | 'info';

export interface Toast {
  id: string;
  level: ToastLevel;
  message: string;
  durationMs?: number;
}

export type ToastInput = Omit<Toast, 'id'>;
