import { getDb } from '../db/connection';

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  waitingOnCustomer: number;
  resolved: number;
  urgent: number;
  overdue: number;
}

export function getDashboardStats(): DashboardStats {
  const db = getDb();

  const row = db
    .prepare(
      `SELECT
        COUNT(*)                                                         AS total,
        SUM(CASE WHEN status = 'Open'                  THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN status = 'In Progress'           THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status = 'Waiting on Customer'   THEN 1 ELSE 0 END) AS waitingOnCustomer,
        SUM(CASE WHEN status = 'Resolved'              THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN priority = 'Urgent' AND status != 'Resolved'
                                                       THEN 1 ELSE 0 END) AS urgent,
        SUM(CASE WHEN status != 'Resolved'
                  AND created_at <= datetime('now', '-24 hours')
                                                       THEN 1 ELSE 0 END) AS overdue
      FROM tickets`,
    )
    .get() as DashboardStats;

  return row;
}

