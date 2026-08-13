export type Id = number;
export type IsoDateTime = string;
import type { JSONContent } from '@tiptap/react';

export type UserRole = "admin" | "user" | "ADMIN" | "USER" | string;
export type TaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | string;

export type Area = "TF" | "IF" | "A2P" | "RA" | "DEV"
export type ControlStatus = "ACTIVE" | "SUSPENDED";
export type Frequency = "ежедневно" | "еженедельно" | "ежемесячно" | "ежеквартально" | "по запросу";
export type VacationType = "ANNUAL_LEAVE" | "SICK_LEAVE" | "BUSINESS_TRIP";
export type VacationStatus = "ACTIVE" | "CANCELLED";

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
  email?: string;
  is_og?: boolean;
  created_at?: string;
  must_change_password?: boolean;
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

export interface ControlResponse {
    id: number;
    area: Area;
    name: string;
    description: string | null;
    time_estimate: number | null;
    frequency: Frequency;
    responsible_id: number | null;
    backup_id: number | null;
    original_user_id: number | null;
    risk: string;
    priority: string;
    dashboard_url: string | null;
    status: ControlStatus;
    created_at: IsoDateTime;
    updated_at: IsoDateTime;
}

export interface ControlCreate {
    area: Area;
    name: string;
    description?: string | null;
    time_estimate?: number | null;
    frequency?: Frequency;
    responsible_id?: number | null;
    backup_id?: number | null;
    risk?: string;
    priority?: string;
    dashboard_url?: string | null;
    status?: ControlStatus;
}

export interface ControlWithUsers extends Omit<ControlResponse, "responsible_id" | "backup_id"> {
    responsible_id: number | null;
    backup_id: number | null;
    responsible: UserBrief | null;
    backup: UserBrief | null;
}

export interface ControlList {
    controls: ControlWithUsers[];
    offset: number;
    limit: number;
    total: number;
}

export type ControlUpdate = Partial<ControlCreate> & { original_user_id?: number | null };

export interface VacationScheduleResponse {
    id: number;
    user_id: number;
    start_date: string;
    end_date: string;
    vacation_type: VacationType;
    status: VacationStatus;
    created_at: IsoDateTime;
    updated_at: IsoDateTime;
}

export interface VacationScheduleWithUser extends VacationScheduleResponse {
    user: UserBrief | null;
}

export interface VacationScheduleList {
    vacations: VacationScheduleWithUser[];
    offset: number;
    limit: number;
    total: number;
}

export interface VacationScheduleCreate {
    user_id: number;
    start_date: string;
    end_date: string;
    vacation_type?: VacationType;
    status?: VacationStatus;
}

export type VacationScheduleUpdate = Partial<VacationScheduleCreate>;

export type ApiRecord = Record<string, unknown>;

export type NotificationType = "TASK_CREATED" | "TASK_UPDATED" | "INCIDENT_UPDATED" | string;

export interface NotificationResponse {
    id: Id;
    notification_type: NotificationType;
    responsible_user_id: Id | null;
    sender: string;
    title: string | null;
    html_content: string;
    error_message: string | null;
    created_at: IsoDateTime;
    preview: string;
    responsible_user: UserBrief | null;
    start_time: IsoDateTime | null;
    end_time: IsoDateTime | null;
    is_system_request: boolean;
    request_note_id: number | null;
    request_edit_mode: boolean;
    requester_user_id: number | null;
    access_granted: boolean;
}

export interface NotificationRecipient {
    id: Id;
    notification_id: Id;
    recipient_id: Id;
    is_read: boolean;
    read_at: IsoDateTime | null;
    notification: NotificationResponse;
    user: UserBrief | null;
}

export interface NotificationsList {
    notifications: NotificationRecipient[];
    offset: number;
    limit: number;
    total: number;
}

export interface UnreadCountResponse {
    unread_count: number;
}

// Payload pushed over the WS when a new notification arrives (see backend notification/listener.py)
export interface NotificationPushEvent {
    notification_id: Id;
    title: string | null;
    sender: string;
    unread_count: number;
}

// Payload pushed over the WS when another recipient claims a task (see notification/service.py:become_responsible_user)
export interface TaskClaimedEvent {
    type: "User take task";
    notification_id: Id;
    user_id: Id;
}

export type NotificationSocketMessage = NotificationPushEvent | TaskClaimedEvent;


export interface TagResponse {
    id: number;
    name: string;
}

export interface MeNoteBase {
    name: string | null;
    content: JSONContent | null;
    last_version: JSONContent | null;
    directory_id: number;
}

export interface MeNoteCreate extends MeNoteBase {
    name: string | null;
    tags: string[];
}

export interface MeNoteUpdate {
    name?: string | null;
    content?: JSONContent | null;
    last_version?: JSONContent | null;
    tags?: string[] | null;
}

export interface MeNoteResponse extends MeNoteBase {
    id: number;
    creater_id: number | null;
    last_modifier_id: number | null;
    editor_id: number | null;
    tags: TagResponse[];
    is_editing: boolean;
    editing_started_at: string | null;
    can_edit_ids: number[];
    can_read_ids: number[];
    created_at: string;
    updated_at: string;
}

export interface MeNoteWithAll extends MeNoteBase {
    id: number;
    creater_id: number | null;
    last_modifier_id: number | null;
    editor_id: number | null;
    tags: TagResponse[];
    creater: UserBrief | null;
    is_editing: boolean;
    editing_started_at: string | null;
    last_modifier: UserBrief | null;
    editor: UserBrief | null;
    can_read: UserBrief[];
    can_edit: UserBrief[];
    created_at: string;
    updated_at: string;
}

export interface MeNoteListResponse {
    list: MeNoteResponse[];
    offset: number;
    limit: number;
    total: number;
}

export type Tele2LogStatus = "SUCCESS" | "ERROR" | "PENDING";

export interface Tele2Response {
    id: number;
    numbers: string[];
    name: string | null;
    status: Tele2LogStatus;
}

export interface Tele2LogList {
    log_list: Tele2Response[];
    offset: number;
    limit: number;
    total: number;
}

export interface MeNoteAccessDeniedOwner {
    id: number;
    first_name: string | null;
    last_name: string | null;
    username: string;
}

export interface MeNoteAccessDeniedDetail {
    message: string;
    note_id: number;
    note_name: string | null;
    owner: MeNoteAccessDeniedOwner | null;
}

export interface MeNoteSearchResult {
    id: number;
    name: string | null;
}

export interface MeNoteGraphNode {
    id: number;
    name: string | null;
}

export interface MeNoteGraphEdge {
    source: number;
    target: number;
}

export interface MeNoteGraphResponse {
    nodes: MeNoteGraphNode[];
    edges: MeNoteGraphEdge[];
}

export interface DirectoryBase {
    name: string;
}

export type DirectoryCreate = DirectoryBase;

export interface DirectoryUpdate {
    name?: string;
}

export interface DirectoryResponse extends DirectoryBase {
    id: number;
    created_at: string;
    updated_at: string;
}

export interface DirectoryWithFilesResponse extends DirectoryBase {
    id: number;
    files: MeNoteResponse[];
    created_at: string;
    updated_at: string;
}

export interface DirectoryListResponse {
    list: DirectoryResponse[];
    offset: number;
    limit: number;
    total: number;
}

export interface AttachmentResponse {
    id: number;
    note_id: number;
    path: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
}
