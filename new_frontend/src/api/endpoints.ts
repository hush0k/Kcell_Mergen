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
  },
  tasks: {
    root: "/tasks/",
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
  notifications: {
    root: "/notifications",
    unreadCount: "/notifications/unread-count",
    html: (id: number) => `/notifications/${id}/html`,
    read: (id: number) => `/notifications/${id}/read`,
    becomeResponsibleUser: (id: number) =>
      `/notifications/${id}/become_responsible_user`,
    websocket: "/notifications/ws",
  },
} as const;
