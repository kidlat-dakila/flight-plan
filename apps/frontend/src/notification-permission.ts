export const canNotify = (): boolean => "Notification" in window

export const requestNotificationPermission = (): void => {
  if (canNotify() && Notification.permission === "default") void Notification.requestPermission()
}
