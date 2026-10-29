/* ------------------------------------------------------------------ */
/*  Typed API client – wraps fetch, throws ApiError with field errors  */
/* ------------------------------------------------------------------ */

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details?: FieldError[];

  constructor(status: number, message: string, details?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    let body: { error?: string; details?: FieldError[] } = {};
    try {
      body = await res.json();
    } catch {
      /* empty */
    }
    throw new ApiError(
      res.status,
      body.error ?? `Request failed (${res.status})`,
      body.details,
    );
  }

  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Convenience methods                                               */
/* ------------------------------------------------------------------ */

export function get<T>(url: string): Promise<T> {
  return request<T>(url);
}

export function post<T>(url: string, data: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', body: JSON.stringify(data) });
}

export function patch<T>(url: string, data: unknown): Promise<T> {
  return request<T>(url, { method: 'PATCH', body: JSON.stringify(data) });
}

