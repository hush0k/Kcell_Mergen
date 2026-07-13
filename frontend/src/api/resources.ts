import { apiRequest } from "@/api/client";
import { apiEndpoints } from "@/api/endpoints";
import { tokenStorage } from "@/api/token-storage";
import type {
    ApiRecord,
    CurrentUser,
    Id,
    LoginRequest,
    Task,
    TokenResponse,
    User,
    ControlResponse,
    ControlCreate,
    Frequency,
    ControlStatus,
    ControlUpdate,
    ControlList,
    TaskListWithControls,
    TaskWithControl,
    TaskGenerationResults,
    NotificationRecipient,
    NotificationsList,
    UnreadCountResponse,
    MeNoteResponse,
    MeNoteWithAll,
    MeNoteCreate,
    MeNoteUpdate,
    MeNoteListResponse,
    DirectoryResponse,
    DirectoryCreate,
    DirectoryUpdate,
    DirectoryListResponse,
    DirectoryWithFilesResponse
} from "@/types/api";
import type {
  VacationScheduleCreate,
  VacationScheduleList,
  VacationScheduleResponse,
  VacationScheduleUpdate,
  VacationStatus,
  VacationType,
} from "@/types/vacation";

const crud = <TEntity, TCreate = ApiRecord, TUpdate = Partial<TCreate>>(
  root: string,
  byId: (id: Id) => string,
) => ({
  list: () => apiRequest<TEntity[]>(root),
  get: (id: Id) => apiRequest<TEntity>(byId(id)),
  create: (payload: TCreate) =>
    apiRequest<TEntity>(root, { method: "POST", body: payload }),
  update: (id: Id, payload: TUpdate) =>
    apiRequest<TEntity>(byId(id), { method: "PATCH", body: payload }),
  remove: (id: Id) => apiRequest<null>(byId(id), { method: "DELETE" }),
});

export const api = {
  auth: {
    async login(payload: LoginRequest, remember = true) {
      const tokens = await apiRequest<TokenResponse>(apiEndpoints.auth.login, {
        method: "POST",
        body: payload,
        auth: false,
      });

      tokenStorage.setTokens(tokens.access_token, tokens.refresh_token, remember);
      return tokens;
    },
    me: () => apiRequest<CurrentUser>(apiEndpoints.auth.me),
    logout: () => tokenStorage.clear(),
  },
  users: {
    ...crud<User>(apiEndpoints.users.root, apiEndpoints.users.byId),
    getByUsername: (username: string) =>
      apiRequest<User>(apiEndpoints.users.byUsername(username)),
    updatePassword: (id: Id, payload: ApiRecord) =>
      apiRequest<null>(apiEndpoints.users.password(id), {
        method: "PATCH",
        body: payload,
      }),
  },
    controls: {
        ...crud<ControlResponse, ControlCreate, ControlUpdate>(apiEndpoints.controls.root, apiEndpoints.controls.byId),
        list: (
            params?: {
                area?: string;
                control_status?: ControlStatus;
                frequency?: Frequency;
                responsible_id?: number;
                search?: string;
                order_by?: "name" | "deadline_at" | "time_estimate" | "responsible_id" | "backup_id" | "status" | "created_at";
                order_type?: "desc" | "asc";
                page?: number;
                per_page?: number;
            },
            opts?: { signal?: AbortSignal },
        ) => {
            const searchParams = new URLSearchParams();
            if (params?.area) searchParams.set("area", params.area);
            if (params?.control_status) searchParams.set("control_status", params.control_status);
            if (params?.frequency) searchParams.set("frequency", params.frequency);
            if (params?.responsible_id) searchParams.set("responsible_id", String(params.responsible_id));
            if (params?.search) searchParams.set("search", params.search);
            searchParams.set("order_by", params?.order_by ?? "created_at");
            searchParams.set("order_type", params?.order_type ?? "desc");
            searchParams.set("page", String(params?.page ?? 1));
            searchParams.set("per_page", String(params?.per_page ?? 20));

            return apiRequest<ControlList>(
                `${apiEndpoints.controls.root}?${searchParams.toString()}`,
                { signal: opts?.signal },
            );
        },
        changeStatus: (id: Id) =>
            apiRequest<null>(apiEndpoints.controls.changeStatus(id), { method: "PATCH" }),
    },
  tasks: {
    ...crud<Task>(apiEndpoints.tasks.root, apiEndpoints.tasks.byId),
      listWithControls: (params?: { page?: number; limit?: number; status?: string[]; frequency?: string; area?: string[]; user_id?: number; responsible_id?: number; search?: string }) => {
          const searchParams = new URLSearchParams();
          searchParams.set("page", String(params?.page ?? 1));
          searchParams.set("limit", String(params?.limit ?? 20));
          params?.status?.forEach(s => searchParams.append("status", s));
          if (params?.frequency) searchParams.set("frequency", params.frequency);
          params?.area?.forEach(a => searchParams.append("area", a));
          if (params?.user_id) searchParams.set("user_id", String(params.user_id));
          if (params?.responsible_id) searchParams.set("responsible_id", String(params.responsible_id));
          if (params?.search) searchParams.set("search", params.search);

          return apiRequest<TaskListWithControls>(
              `${apiEndpoints.tasks.withControls}?${searchParams.toString()}`
          );
      },
      getWithControls: (id: Id) =>
          apiRequest<TaskWithControl>(apiEndpoints.tasks.withControlsById(id)),
    notStarted: () => apiRequest<Task[]>(apiEndpoints.tasks.notStarted),
    inProgress: () => apiRequest<Task[]>(apiEndpoints.tasks.inProgress),
    completed: () => apiRequest<Task[]>(apiEndpoints.tasks.completed),
    overdue: () => apiRequest<Task[]>(apiEndpoints.tasks.overdue),
    start: (id: Id) =>
      apiRequest<Task>(apiEndpoints.tasks.start(id), { method: "POST" }),
    complete: (id: Id) =>
      apiRequest<Task>(apiEndpoints.tasks.complete(id), { method: "POST" }),
    triggerGenerator: () =>
      apiRequest<TaskGenerationResults>(apiEndpoints.tasks.triggerGenerator, {
        method: "POST",
      }),
  },
  vacationSchedule: {
    list: (
      params?: {
        page?: number;
        limit?: number;
        status?: VacationStatus;
        vacation_type?: VacationType;
        search?: string;
      },
      opts?: { signal?: AbortSignal },
    ) => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", String(params?.page ?? 1));
      searchParams.set("limit", String(params?.limit ?? 20));
      if (params?.status) searchParams.set("status", params.status);
      if (params?.vacation_type) searchParams.set("vacation_type", params.vacation_type);
      if (params?.search) searchParams.set("search", params.search);

      return apiRequest<VacationScheduleList>(
        `${apiEndpoints.vacationSchedule.root}?${searchParams.toString()}`,
        { signal: opts?.signal },
      );
    },
    get: (id: Id) =>
      apiRequest<VacationScheduleResponse>(apiEndpoints.vacationSchedule.byId(id)),
    create: (payload: VacationScheduleCreate) =>
      apiRequest<VacationScheduleResponse>(apiEndpoints.vacationSchedule.root, {
        method: "POST",
        body: payload,
      }),
    update: (id: Id, payload: VacationScheduleUpdate) =>
      apiRequest<VacationScheduleResponse>(apiEndpoints.vacationSchedule.byId(id), {
        method: "PATCH",
        body: payload,
      }),
    remove: (id: Id) =>
      apiRequest<null>(apiEndpoints.vacationSchedule.byId(id), { method: "DELETE" }),
  },
  incidents: {
    ...crud<ApiRecord>(apiEndpoints.incidents.root, apiEndpoints.incidents.byId),
    updateStatus: (id: Id, payload: ApiRecord) =>
      apiRequest<ApiRecord>(apiEndpoints.incidents.status(id), {
        method: "PATCH",
        body: payload,
      }),
  },
  mfs: {
    list: () => apiRequest<ApiRecord[]>(apiEndpoints.mfs.root),
    get: (id: Id) => apiRequest<ApiRecord>(apiEndpoints.mfs.byId(id)),
    action: (payload: ApiRecord) =>
      apiRequest<ApiRecord>(apiEndpoints.mfs.action, {
        method: "POST",
        body: payload,
      }),
  },
  atlas: {
    status: () => apiRequest<ApiRecord>(apiEndpoints.atlas.status),
    note: (payload: ApiRecord) =>
      apiRequest<ApiRecord>(apiEndpoints.atlas.note, {
        method: "POST",
        body: payload,
      }),
  },
  notifications: {
    list: (
      params?: { page?: number; limit?: number; is_read?: boolean },
      opts?: { signal?: AbortSignal },
    ) => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", String(params?.page ?? 1));
      searchParams.set("limit", String(params?.limit ?? 20));
      if (params?.is_read !== undefined) searchParams.set("is_read", String(params.is_read));

      return apiRequest<NotificationsList>(
        `${apiEndpoints.notifications.root}?${searchParams.toString()}`,
        { signal: opts?.signal },
      );
    },

      get: (id: Id, opts?: { signal?: AbortSignal }) =>
          apiRequest<NotificationRecipient>(apiEndpoints.notifications.byId(id), { signal: opts?.signal }),
    unreadCount: () => apiRequest<UnreadCountResponse>(apiEndpoints.notifications.unreadCount),
    read: (id: Id) =>
      apiRequest<ApiRecord>(apiEndpoints.notifications.read(id), {
        method: "POST",
      }),
    becomeResponsibleUser: (id: Id) =>
      apiRequest<ApiRecord>(apiEndpoints.notifications.becomeResponsibleUser(id), {
        method: "PATCH",
      }),
    create: (payload: ApiRecord) =>
      apiRequest<ApiRecord>(`${apiEndpoints.notifications.root}/`, {
        method: "POST",
        body: payload,
      }),
  },
    meNote: {
        list: (
            params?: { page?: number; per_page?: number },
            opts?: { signal?: AbortSignal },
        ) => {
            const searchParams = new URLSearchParams();
            searchParams.set("page", String(params?.page ?? 1));
            searchParams.set("per_page", String(params?.per_page ?? 20));

            return apiRequest<MeNoteListResponse>(
                `${apiEndpoints.meNote.root}?${searchParams.toString()}`,
                { signal: opts?.signal },
            );
        },
        get: (id: Id, opts?: { signal?: AbortSignal }) =>
            apiRequest<MeNoteWithAll>(apiEndpoints.meNote.byId(id), { signal: opts?.signal }),
        create: (payload: MeNoteCreate) =>
            apiRequest<MeNoteResponse>(apiEndpoints.meNote.root, {
                method: "POST",
                body: payload,
            }),
        update: (id: Id, payload: MeNoteUpdate) =>
            apiRequest<MeNoteResponse>(apiEndpoints.meNote.byId(id), {
                method: "PATCH",
                body: payload,
            }),
        deleteMany: (ids: number[]) =>
            apiRequest<null>(
                `${apiEndpoints.meNote.root}?${ids.map(id => `note_ids=${id}`).join('&')}`,
                { method: "DELETE" }
            ),
        startEdit: (id: Id) =>
            apiRequest<null>(apiEndpoints.meNote.startEdit(id), { method: "PATCH" }),
        stopEdit: (id: Id) =>
            apiRequest<null>( apiEndpoints.meNote.stopEdit(id), { method: "PATCH" }),
    },
    directory: {
        list: (
            params?: { page?: number; per_page?: number },
            opts?: { signal?: AbortSignal },
        ) => {
            const searchParams = new URLSearchParams();
            searchParams.set("page", String(params?.page ?? 1));
            searchParams.set("per_page", String(params?.per_page ?? 20));

            return apiRequest<DirectoryListResponse>(
                `${apiEndpoints.directory.root}?${searchParams.toString()}`,
                { signal: opts?.signal },
            );
        },
        get: (id: Id, opts?: { signal?: AbortSignal }) =>
            apiRequest<DirectoryResponse>(apiEndpoints.directory.byId(id), { signal: opts?.signal }),
        create: (payload: DirectoryCreate) =>
            apiRequest<DirectoryResponse>(apiEndpoints.directory.root, {
                method: "POST",
                body: payload,
            }),
        update: (id: Id, payload: DirectoryUpdate) =>
            apiRequest<DirectoryResponse>(apiEndpoints.directory.byId(id), {
                method: "PATCH",
                body: payload,
            }),
        remove: (id: Id) =>
            apiRequest<null>(apiEndpoints.directory.byId(id), { method: "DELETE" }),
        getWithFiles: (id: Id, opts?: { signal?: AbortSignal }) =>
            apiRequest<DirectoryWithFilesResponse>(apiEndpoints.directory.withFiles(id), { signal: opts?.signal }),
    },
};
