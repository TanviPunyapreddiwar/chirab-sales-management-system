import { OfferStatus } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/format';
import clsx from 'clsx';

interface Props {
  status: OfferStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <span className={clsx(
      'inline-flex items-center font-medium rounded-full',
      STATUS_COLORS[status],
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
    )}>
      {STATUS_LABELS[status]}
    </span>
  );
}
