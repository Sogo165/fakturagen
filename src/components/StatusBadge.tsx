import { CircleCheck, Clock3, FilePenLine, TriangleAlert } from 'lucide-react';
import type { Invoice } from '../types';
import { isOverdue } from '../lib/invoice';

export function StatusBadge({ invoice }: { invoice: Invoice }) {
  const overdue = isOverdue(invoice);
  const status = overdue ? 'overdue' : invoice.status;
  const labels = {
    draft: 'Koncept',
    sent: 'K úhradě',
    paid: 'Uhrazeno',
    overdue: 'Po splatnosti',
  };
  const icons = {
    draft: <FilePenLine size={13} />,
    sent: <Clock3 size={13} />,
    paid: <CircleCheck size={13} />,
    overdue: <TriangleAlert size={13} />,
  };

  return <span className={`status status-${status}`}>{icons[status]}{labels[status]}</span>;
}
