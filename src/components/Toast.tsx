import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.kind}`} role="status" key={toast.id}>
      {toast.kind === 'success' ? <CircleCheck size={20} /> : toast.kind === 'error' ? <CircleAlert size={20} /> : <Info size={20} />}
      <span>{toast.message}</span>
      <X size={16} className="toast-decoration" />
    </div>
  );
}
