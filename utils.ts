export function calculateTimeDiff(timestamp1: number, timestamp2: number) {
  const diffMs = Math.abs(timestamp2 - timestamp1);

  // Convert to seconds, minutes, hours
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  // Calculate remainder
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  return { hours, minutes: remainingMinutes, seconds: remainingSeconds, milliseconds: diffMs };
}

export class AverageTimeTracker {
  private totalDifference: number = 0;
  private count: number = 0;

  addNewDifference(newDifferenceMs: number): number {
    this.totalDifference += newDifferenceMs;
    this.count++;

    // Calculate running average
    return this.totalDifference / this.count;
  }

  getFormattedAverage(): string {
    const averageMs = this.totalDifference / this.count;

    // Convert to seconds, minutes, hours
    const seconds = Math.floor(averageMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0 && remainingMinutes === 0 && hours === 0)
      return `${averageMs}ms`;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));