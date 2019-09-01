function Mvvm(options = {}) {
  this.$options = options;
  const data = this._data = this.$options.data;
  proxyData(data, this)
  observe(data)
  initComputed(this)
  compile(options.el, this)
}

function Observe(data) {
  let dep = new Dep()
  for (let key in data) {
    let val = data[key]
    observe(val)
    Object.defineProperty(data, key, {
      enumerable: true,
      get() {
        Dep.target && dep.addSub(Dep.target)
        return val
      },
      set(newVal) {
        if (newVal === val) {
          return
        }
        val = newVal
        // 观察新赋值对象
        observe(newVal)
        dep.notify()
      }
    })
  }
}

function observe(data) {
  if (typeof data !== 'object') {
    return
  }
  return new Observe(data)
}

function proxyData(data, vm) {
  for (let key in data) {
    Object.defineProperty(vm, key, {
      enumerable: true,
      get() {
        return data[key]
      },
      set(newVal) {
        data[key] = newVal
      }
    })
  }
}

function compile(el, vm) {
  vm.$el = document.querySelector(el)
  const fragment = document.createDocumentFragment()
  while (child = vm.$el.firstChild) {
    fragment.appendChild(child)
  }

  replace(fragment)
  function replace(fragment) {
    Array.from(fragment.childNodes)
      .forEach(node => {
        const text = node.textContent
        const reg = /\{\{(.*)\}\}/

        // 处理文本
        if (node.nodeType === 3 && reg.test(text)) {
          const exp = RegExp.$1
          const val = getValue(vm, exp)

          new Watcher(vm, exp, (newValue) => { // 函数里需要接受一个新值
            node.textContent = text.replace(reg, newValue)
          })
          // 替换的逻辑
          node.textContent = text.replace(reg, val)
        }

        if (node.nodeType === 1) {
          const nodeAttrs = node.attributes
          Array.from(nodeAttrs).forEach(attr => {
            const {
              // 指令
              name: attrName,
              // 指令值
              value: exp
            } = attr
            if (attrName.indexOf('v-') === 0) {
              node.value = getValue(vm, exp)

              new Watcher(vm, exp, (newVal) => {
                node.value = newVal // 当watcher触发时，会将内容放到输入框内
              })

              node.addEventListener('input', (e) => {
                const { value } = e.target
                setValue(vm, exp, value)
              })
            }

          })
        }

        if (node.childNodes) {
          replace(node)
        }
      })
  }

  vm.$el.appendChild(fragment)
}

class Dep {
  constructor() {
    this.subs = []
  }

  addSub(sub) {
    this.subs.push(sub)
  }

  notify() {
    this.subs.forEach(sub => sub.update())
  }
}

class Watcher {
  constructor(vm, exp, fn) {
    this.fn = fn
    this.vm = vm
    this.exp = exp
    // 将自身作为全局观察者
    Dep.target = this
    // 收集依赖
    this.get()
    Dep.target = null
  }

  get() {
    return getValue(this.vm, this.exp)
  }

  update() {
    this.fn(this.get())
  }
}

function initComputed(vm) {
  const { computed } = vm.$options
  if (computed) {
    const computedKeys = Object.keys(computed)
    computedKeys.forEach(key => {
      Object.defineProperty(vm, key, {
        get() {
          const computedValue = computed[key]
          return computedValue.call(vm)
        }
      })
    })
  }
}

function getValue(vm, exp) {
  let val = vm
  const arr = exp.split('.')
  arr.forEach((key) => {
    val = val[key]
  })
  return val
}

function setValue(vm, exp, value) {
  let val = vm
  const arr = exp.split('.')
  arr.forEach((key, index) => {
    // 读到倒数第二项以后赋值 否则无法触发setter
    if (index !== arr.length - 1) {
      val = val[key]
    }
  })

  val[arr[arr.length - 1]] = value
}