interface Props {
  priority: string;
}

const classMap: Record<string, string> = {
  Low: 'badge badge--priority-low',
  Medium: 'badge badge--priority-medium',
  High: 'badge badge--priority-high',
  Urgent: 'badge badge--priority-urgent',
};

export default function PriorityBadge({ priority }: Props) {
  return <span className={classMap[priority] ?? 'badge'}>{priority}</span>;
}

