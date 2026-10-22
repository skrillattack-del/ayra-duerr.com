// Re-export from the ToastProvider for backward compatibility
// The actual implementation is now in @/providers/ToastProvider

export { useToast, ToastProvider } from '@/providers/ToastProvider';
export type { Toast, TerminalNotification, NotificationStatus } from '@/providers/ToastProvider';
