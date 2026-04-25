export interface TaskReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  dueDate: number;
  reminderOffset: number;
  scheduledAt: number;
}

const NOTIFICATION_TRIGGERS_SUPPORTED = 'Notification' in window && 'showTrigger' in Notification.prototype;

class NotificationScheduler {
  private db: IDBDatabase | null = null;
  private dbReady = false;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('RelaySignalDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('reminders')) {
          const store = db.createObjectStore('reminders', { keyPath: 'id' });
          store.createIndex('taskId', 'taskId', { unique: false });
          store.createIndex('dueDate', 'dueDate', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.dbReady = true;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async scheduleReminder(taskId: string, title: string, dueDate: Date, offsetMinutes: number = 300): Promise<string> {
    if (!this.dbReady) await this.init();
    
    const reminderId = `${taskId}-${offsetMinutes}`;
    const triggerTime = dueDate.getTime() - (offsetMinutes * 60 * 1000);

    if (NOTIFICATION_TRIGGERS_SUPPORTED && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification('RelaySignal', {
        body: `${title} is due in ${offsetMinutes} minutes`,
        tag: reminderId,
        ...(NOTIFICATION_TRIGGERS_SUPPORTED && {
          showTrigger: new (window as any).TimestampTrigger(triggerTime)
        }),
        data: {
          taskId,
          title,
          dueDate,
          offsetMinutes
        }
      } as NotificationOptions);
    }

    const reminder: TaskReminder = {
      id: reminderId,
      taskId,
      taskTitle: title,
      dueDate: dueDate.getTime(),
      reminderOffset: offsetMinutes,
      scheduledAt: Date.now()
    };

    const transaction = this.db!.transaction('reminders', 'readwrite');
    transaction.objectStore('reminders').put(reminder);
    
    return reminderId;
  }

  async cancelReminder(reminderId: string) {
    if (!this.dbReady) await this.init();
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications({ tag: reminderId });
      notifications.forEach(n => n.close());
    }

    const transaction = this.db!.transaction('reminders', 'readwrite');
    transaction.objectStore('reminders').delete(reminderId);
  }

  async getRemindersForTask(taskId: string): Promise<TaskReminder[]> {
    if (!this.dbReady) await this.init();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction('reminders', 'readonly');
      const index = transaction.objectStore('reminders').index('taskId');
      const request = index.getAll(taskId);
      
      request.onsuccess = () => resolve(request.result);
    });
  }
}

export const notificationScheduler = new NotificationScheduler();