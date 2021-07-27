import type Tempo from "./tempo";

export default class Data {
  constructor(public currentName: string, public tempos: Tempo[]) {}
}
