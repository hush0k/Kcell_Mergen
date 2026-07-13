export const apiEndpoints = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    me: "/auth/me",
  },
  users: {
    root: "/user/",
    byId: (id: number) => `/user/${id}`,
    byUsername: (username: string) => `/user/by_username/${username}`,
    password: (id: number) => `/user/${id}/password`,
  },
  controls: {
    root: "/controls/",
    byId: (id: number) => `/controls/${id}`,
      changeStatus: (id: number) => `/controls/${id}/change-status`,
  },
  tasks: {
    root: "/tasks/",
    withControls: "/tasks/tasks-with-controls",
    withControlsById: (id: number) => `/tasks/${id}/with-controls`,
    notStarted: "/tasks/not-started",
    inProgress: "/tasks/in-progress",
    completed: "/tasks/completed",
    overdue: "/tasks/overdue",
    byId: (id: number) => `/tasks/${id}`,
    start: (id: number) => `/tasks/${id}/start`,
    complete: (id: number) => `/tasks/${id}/complete`,
    triggerGenerator: "/tasks/trigger-tasks-generator",
  },
  vacationSchedule: {
    root: "/vacation-schedule/",
    byId: (id: number) => `/vacation-schedule/${id}`,
  },
  incidents: {
    root: "/incidents/",
    byId: (id: number) => `/incidents/${id}`,
    status: (id: number) => `/incidents/${id}/status`,
  },
  mfs: {
    root: "/mfs/",
    byId: (id: number) => `/mfs/${id}`,
    action: "/mfs/action",
  },
  atlas: {
    status: "/atlas/status",
    note: "/atlas/note",
  },
  notifications: {
    root: "/notifications",
    unreadCount: "/notifications/unread-count",
    html: (id: number) => `/notifications/${id}/html`,
      byId: (id: number) => `/notifications/${id}`,
    read: (id: number) => `/notifications/${id}/read`,
    becomeResponsibleUser: (id: number) =>
      `/notifications/${id}/become_responsible_user`,
    websocket: "/notifications/ws",
  },
    meNote: {
        root: "/me-note/",
        byId: (id: number) => `/me-note/${id}`,
        startEdit: (id: number) => `/me-note/${id}/start-edit`,
        stopEdit: (id: number) => `/me-note/${id}/stop-edit`,
        websocket: "/me-note/ws",
    },
    directory: {
        root: "/directory/",
        byId: (id: number) => `/directory/${id}`,
        withFiles: (id: number) => `/directory/${id}/with-files`,
    },
} as const;
