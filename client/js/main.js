import * as Init from './3D/init'
export default class Main {
  constructor() {
    canvas.width = window.innerWidth

    canvas.height = window.innerHeight
    var gamehandle = Init.init();
    //gamehandle.arrowmanager.push(1, 1, 5, 0.01, 0, 0, 0, 0.1, true)
    //gamehandle.arrowmanager.push(5, 1, 5, 0, 0, -0.01, 0, 0.1, true)
  }
}

