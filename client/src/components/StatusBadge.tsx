interface Props {
  status: string;
}

const classMap: Record<string, string> = {
  Open: 'badge badge--status-open',
  'In Progress': 'badge badge--status-in-progress',
  'Waiting on Customer': 'badge badge--status-waiting',
  Resolved: 'badge badge--status-resolved',
};

export default function StatusBadge({ status }: Props) {
  return <span className={classMap[status] ?? 'badge'}>{status}</span>;
}

