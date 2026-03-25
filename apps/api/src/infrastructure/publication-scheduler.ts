export interface SchedulerPort {
  schedule(dealId: string, date: Date, callback: () => Promise<void>): void;
  cancel(dealId: string): void;
}

export class PublicationScheduler implements SchedulerPort {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  public schedule(
    dealId: string,
    date: Date,
    callback: () => Promise<void>,
  ): void {
    this.cancel(dealId); // Clear any existing timer
    const delay = Math.max(0, date.getTime() - Date.now());
    const timer = setTimeout(() => {
      this.timers.delete(dealId);
      void callback();
    }, delay);
    this.timers.set(dealId, timer);
  }

  public cancel(dealId: string): void {
    const timer = this.timers.get(dealId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(dealId);
    }
  }

  public destroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
