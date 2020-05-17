class Mvvm {
  constructor(options) {
    // 初始化数据 绑定数据
    this.initData(options);
    // 实现Observer对数据劫持 监听
    new ObServer(this);
    // 实现一个compile 编译模板
    new Compile(this);
  }
  initData(options) {
    this.checkOptionsParam(!options && typeof options !== 'object', '传入参数对象')
    this.$options = options;
    const { el , data } = options;
    this.checkOptionsParam(!el, '必须传入挂载根节点')
    this.$el = document.querySelector(el);
    this.checkOptionsParam(!(this.$el && this.$el.nodeType === 1), '找不到挂载根节点')
    this.$data = data;
    this.$methods = options.methods;
  }
  checkOptionsParam(expr, text) {
    if (expr) {
      throw Error(text)
    }
    return expr;
  }
}

const compileUtil = {
  getVal(expr, data) {
    // expr 有比如这种 person.name这种嵌套结构
    return expr.split('.').reduce((data, current) => {
      return data[current.trim()];
    }, data);
  },
  setVal(expr, data, val) {
    return expr.split('.').reduce((data, current, index) => {
      if (expr.split('.').length - 1 === index ) {
        data[current] = val;
      }
      return data[current];
    }, data);
  },
  text(node, expr, data) {
    // expr 应该有一个getVal 方法，来获取person.name person.name.firstName 这样嵌套的取值
    let value = null;
    // /\{\{(.+?)\}\}/g  必须有这个问号，非贪婪模式，匹配到就回去了，再来匹配到剩下的字符串
    if (expr.indexOf('\{\{') !== -1 && util.isTextElement(node)) {
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        // 这里还是有点乱的
        new Watcher(node, args[1], data, () => {
          const val = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            let str = args[1].trim && args[1].trim();
            return this.getVal(str, data);
          })
          this.setText(node, val);
        });
        let str = args[1].trim && args[1].trim();
        return this.getVal(str, data);
      });
    } else {
      new Watcher(node, expr, data, (newVal) => {
        this.setText(node, newVal);    
      });
      value = this.getVal(expr, data);
    }
    this.setText(node, value);
  },
  html(node, expr, data) {
    new Watcher(node, expr, data, (newVal) => {
      this.setHtml(node, newVal);
    })
    this.setHtml(node, this.getVal(expr, data));
  },
  model(node, expr, data) {
    new Watcher(node, expr, data, (newVal) => {
      this.setModel(node, newVal);
    });
    node.addEventListener('input', (e) => {
      this.setVal(expr, data, e.target.value);
    });
    this.setModel(node, this.getVal(expr, data))
  },
  on(node, expr, methods, event) {
    if (!event) {
      console.log('绑定函数');
    }
    this.setOn(node, this.getVal(expr, methods), event);
  },
  setText(node, val) {
    // 这里单独出来 是为了之后的watch更新函数
    node.textContent = val;
  },
  setHtml(node, val) {
    node.innerHTML = val;
  },
  setOn(node, val, event) {
    node.addEventListener(event, val);
  },
  setModel(node, val) {
    node.value = val;
  }
}

class Compile{
  constructor(vm) {
    if (!util.isNodeElement(vm.$el)) {
      throw Error('not find root element');
    }
    this.vm = vm;
    this.$methods = vm.$methods;
    this.$el = vm.$el;
    // 1.为了节省性能 将$el 创建出一份VNode
    const fragment = this.node2Fragment(this.$el);
    // 2.编译模板 区分是标签  还是文本 分别编译
    this.compileFragment(fragment, vm.$data);
    // 重新把fragment 放回到$el上去
    this.$el.appendChild(fragment); 
  }
  compileFragment(fragment, data) {
    if (fragment.childNodes && fragment.childNodes.length) {
      [...fragment.childNodes].forEach( frag => {
        if (util.isNodeElement(frag)) {
          // 编译元素
          this.compileNode(frag, data);
        }else if(util.isTextElement(frag)) {
          // 编译文本节点 主要是编译 {{}}
          this.compileText(frag, data);
        }
        this.compileFragment(frag, data);
      })
    }
  }
  compileNode(node, data) {
    [...node.attributes].forEach( attr => {
      if (attr.name.startsWith('v-')) {
        const { name, value } = attr;
        const [ , directive ] = name.split('-');
        // 这里应该对v-on:click做再次的辨别
        const [action, event] = directive.split(':');
        if (event) {
          compileUtil[action] && compileUtil[action](node, value, this.$methods, event);
        } else {
          compileUtil[action] && compileUtil[action](node, value, data, event);
        }
      }
    })
  }
  compileText(node, data) {
    if (/\{\{(.+)\}\}/.test(node.data)) {
      compileUtil.text(node, node.data, data)
    }
  }
  node2Fragment(root) {
    const fragment = document.createDocumentFragment();
    let first = null;
    // while 
    while(first = root.firstChild) {
      fragment.appendChild(first)
    }
    // forEach    
    // [...root.childNodes].forEach( e => {
    //   fragment.appendChild(e)
    // })

    return fragment;
  }
}
const util = {
  isNodeElement(el) {
    return el.nodeType === 1;
  },
  isTextElement(el) {
    return el.nodeType === 3;
  }
}