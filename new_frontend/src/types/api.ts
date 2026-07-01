export type Id = number;
export type IsoDateTime = string;

export type UserRole = "admin" | "user" | "ADMIN" | "USER" | string;
export type TaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | string;

export type Area = "TF" | "IF" | "A2P" | "RA" | "DEV"

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
  first_name: string;
  last_name: string;
  username: string;
  role: UserRole;
}

export interface User {
  id: Id;
  username: string;
  first_name: string;
  last_name: string;
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

export interface TaskList {
    task_list: Task[];
    total: number;
}

export interface ControlBrief {
    id: number;
    name: string;
    area: Area;
    frequency: string;
    dashboard_url: string | undefined;
    responsible_id: number | null;
    backup_id: number | null;
    time_estimate: number | null;
    responsible: UserBrief | null;
    priority: string | null;
    risk: string | null;
    description: string | null;
}

export interface UserBrief {
    id: number;
    username: string;
    first_name: string | null;
    last_name: string | null;
    is_og: boolean | null;
}

export interface TaskWithControl {
    id: number;
    user_id: number | null;
    control_id: number;
    status: string;
    start_time: string | null;
    end_time: string | null;
    comments: string | null;
    weekend_group_id: number | null;
    deadline_time: Date | null;
    created_at: string;
    updated_at: string;
    control: ControlBrief;
    user: UserBrief | null;
}

export interface TaskListWithControls {
    task_list: TaskWithControl[];
    offset: number;
    limit: number;
    total: number;
}

export interface TaskGenerationResults {
    daily: number;
    weekly: number;
    monthly: number;
    quarterly: number;
    overdue_updated: number;
    total_created: number;
}

export type ApiRecord = Record<string, unknown>;
