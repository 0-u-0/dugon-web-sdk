
interface Task {
  execObj: object;
  taskFunc: Function
  parameters: Array<any>
}

//TODO: add timeout
export default class AsyncQueue {
  running = false;
  queue = new Array<Task>();
  constructor() {
  }

  push(task: Task) {
    if (this.running) {
      this.queue.push(task);
    } else {
      this.running = true;
      this.executeTask(task);
    }
  }

  executeTask(task: Task) {
    const { execObj, taskFunc, parameters } = task
    //TODO: error
    taskFunc.call(execObj, ...parameters).then(() => {
      const nextTask = this.queue.shift();
      if (nextTask) {
        this.executeTask(nextTask);
      }else{
        this.running = false;
      }
    });
  }

}









