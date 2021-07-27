import Data from "../models/data";

export default class Storage {
  public data: Data;

  constructor() {
    const dataItem = window.localStorage.getItem("data");
    if (dataItem) {
      const dataObj = JSON.parse(dataItem);

      this.data = new Data(dataObj.currentName, dataObj.tempos);
    } else {
      const defaultTempo = {
        name: "Default",
        bpm: 120,
        order: 1,
      };

      this.data = new Data(defaultTempo.name, [defaultTempo]);

      this.save();
    }
  }

  public save() {
    const stringified = JSON.stringify(this.data);
    window.localStorage.setItem("data", stringified);
  }
}
