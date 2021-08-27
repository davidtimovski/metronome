export default class WakeLockService {
  private readonly wakeLockSupported = "wakeLock" in navigator;
  public lock = null;

  public requestWakeLock = async () => {
    if (this.wakeLockSupported) {
      this.lock = await (<any>navigator).wakeLock.request("screen");
    }
  };

  public releaseWakeLock = () => {
    if (this.wakeLockSupported && this.lock) {
      this.lock.release();
      this.lock = null;
    }
  };
}
