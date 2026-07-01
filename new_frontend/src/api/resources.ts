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
  TaskList,
  TaskListWithControls,
  TaskWithControl,
  TaskGenerationResults,
} from "@/types/api";

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
  controls: crud<ApiRecord>(apiEndpoints.controls.root, apiEndpoints.controls.byId),
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
  vacationSchedule: crud<ApiRecord>(
    apiEndpoints.vacationSchedule.root,
    apiEndpoints.vacationSchedule.byId,
  ),
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
  notifications: {
    list: () => apiRequest<ApiRecord[]>(apiEndpoints.notifications.root),
    unreadCount: () => apiRequest<ApiRecord>(apiEndpoints.notifications.unreadCount),
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
};
