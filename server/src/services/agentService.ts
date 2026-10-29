import { getDb } from '../db/connection';

export interface Agent {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function getAllAgents(): Agent[] {
  return getDb().prepare('SELECT * FROM agents ORDER BY id').all() as Agent[];
}

export function getAgentById(id: number): Agent | undefined {
  return getDb().prepare('SELECT * FROM agents WHERE id = ?').get(id) as
    | Agent
    | undefined;
}

