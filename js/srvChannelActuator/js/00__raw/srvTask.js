class Task {
    #task = null;
    constructor(task) {
        this.#task = task;
        this.Execute = task.Execute;
        this.Cancel = task.Cancel;
    }
    Execute() { }
    Cancel() { }
}

const proxyCh = {
    _tasks: new Map(),
    _currTask: null,
    LoadModule(moduleName) {
        
    },
    AddTask(taskName, task) {
        this._tasks.set(taskName, new Task(task));
    },
    async Run(taskName, ...args) {
        this._currTask = this._tasks[taskName];
        return await this._currTask(...args);
    },
    Cancel() {
        return this._currTask.Cancel();
    }
}


