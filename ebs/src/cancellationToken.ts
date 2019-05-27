export default class CancellationToken {
  private canceled = false;

  public cancel() {
    this.canceled = true;
  }

  public get isCanceled(): boolean {
    return this.canceled;
  }
}
