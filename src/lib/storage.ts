import Data from "../models/data";
import Tempo from "../models/tempo";

export default class Storage {
  constructor() {
    const dataItem = window.localStorage.getItem("data");
    if (!dataItem) {
      const defaultTempo = new Tempo("Default", 120, 1);
      const data = new Data(defaultTempo.name, [defaultTempo]);
      this.save(data);
    }
  }

  get(): Data {
    const dataItem = window.localStorage.getItem("data");
    return JSON.parse(dataItem);
  }

  save(data: Data) {
    const stringified = JSON.stringify(data);
    window.localStorage.setItem("data", stringified);
  }
}
