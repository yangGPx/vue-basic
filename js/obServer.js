class ObServer{
  constructor(vm) {
    this.$data = vm.$data;
    // 1.对对象实现监听
    this.definedRetive(this.$data);
  }
  definedRetive(data) {
    if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        this.definedRetive(value);
        const dep = new Dep();
        Object.defineProperty(data, key, {
          enumerable: true,
          configurable: false,
          get() {
            Dep.target && dep.addWatcher(Dep.target);
            return value;
          },
          set: (newVal) => {
            if (newVal !== value) {
              value = newVal;
              dep.notify();
            }
          }
        })
      })
    }
  }
}

class Dep{
  constructor() {
    // 当新旧值不同时，改变
    this.subDep = [];
  }
  addWatcher(watcher) {
    this.subDep.push(watcher);
  }
  notify() {
    this.subDep.forEach(watcher => {
      watcher.update();
    });
  }
}

class Watcher {
  constructor(node, expr, data, callback) {
    this.node = node;
    this.expr = expr; // 这里需要expr,只是需要能够直接拿值的表达式，person.name 
    this.data = data;
    this.callback = callback;
    this.oldVal = this.getOldVal(); // 为了将watcher 和 dep关联在一起，以及拿到旧值存起来。
  }
  getOldVal() {
    Dep.target = this;
    let oldVal = compileUtil.getVal(this.expr, this.data);
    Dep.target = null;
    return oldVal;
  }
  update() {
    const newVal = compileUtil.getVal(this.expr, this.data);
    if (newVal !== this.oldVal) {
      this.callback(newVal);
    }
  }
}