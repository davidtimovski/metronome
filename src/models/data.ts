import type Tempo from "./tempo";

export default class Data {
  constructor(public current: Tempo, public tempos: Tempo[]) {}
}
