import { CircleCheck, Clock3, FilePenLine, TriangleAlert } from 'lucide-react';
import type { Invoice } from '../types';
import { isOverdue } from '../lib/invoice';
import { useI18n } from '../i18n';

export function StatusBadge({ invoice }: { invoice: Invoice }) {
  const { t } = useI18n();
  const overdue = isOverdue(invoice);
  const status = overdue ? 'overdue' : invoice.status;
  const labels = {
    draft: t('status.draft'),
    sent: t('status.sent'),
    paid: t('status.paid'),
    overdue: t('status.overdue'),
  };
  const icons = {
    draft: <FilePenLine size={13} />,
    sent: <Clock3 size={13} />,
    paid: <CircleCheck size={13} />,
    overdue: <TriangleAlert size={13} />,
  };

  return <span className={`status status-${status}`}>{icons[status]}{labels[status]}</span>;
}
