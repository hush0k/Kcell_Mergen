export type Id = number;
export type IsoDateTime = string;

export type UserRole = "admin" | "user" | "ADMIN" | "USER" | string;
export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "overdue"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | string;

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CurrentUser {
  id: Id;
  username: string;
  role: UserRole;
}

export interface User {
  id: Id;
  username: string;
  role: UserRole;
  email: string;
  is_og: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface Task {
  id: Id;
  user_id: Id | null;
  control_id: Id;
  start_time: IsoDateTime | null;
  end_time: IsoDateTime | null;
  deadline_time: IsoDateTime;
  comments: string | null;
  status: TaskStatus;
  weekend_group_id: number | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export type ApiRecord = Record<string, unknown>;
