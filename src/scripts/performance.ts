export class Debouncer {
  private timeoutId: number | null = null;

  debounce(func: () => void, delay: number): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      func();
      this.timeoutId = null;
    }, delay);
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}


