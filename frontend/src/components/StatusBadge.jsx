import { STATUS_BY_VALUE } from '../utils/constants';

export default function StatusBadge({ status }) {
  const info = STATUS_BY_VALUE[status];
  if (!info) return null;
  return (
    <span className="badge" style={{ '--badge-color': info.color }}>
      {info.short}
    </span>
  );
}
