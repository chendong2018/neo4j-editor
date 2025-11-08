# 事件总线 API 文档

## 概述

事件总线（EventBus）是一个基于发布-订阅模式的消息通信系统，用于应用程序内部不同模块之间的解耦通信。本事件总线实现采用单例模式，确保整个应用中只有一个事件总线实例，避免事件传递的不一致性。

## 核心特性

- **单例模式**：全局唯一实例，确保事件通信的一致性
- **链式调用**：所有方法返回实例本身，支持链式调用
- **优先级支持**：事件监听器可以设置优先级，决定执行顺序
- **一次性事件**：支持注册仅执行一次的事件监听器
- **调试模式**：内置调试功能，便于开发和排错
- **事件追踪**：支持追踪事件触发的调用链
- **多模块系统支持**：兼容AMD、CommonJS和全局变量三种模块系统

## 获取事件总线实例

### 方法一：使用静态工厂方法（推荐）

```javascript
const eventBus = EventBus.getInstance();
```

### 方法二：使用全局变量

```javascript
const eventBus = window.eventBus;
```

### 方法三：通过模块系统导入

```javascript
// AMD
define(['common/eventBus'], function(EventBus) {
    const eventBus = EventBus.getInstance();
    // 使用eventBus
});

// CommonJS
const EventBus = require('./eventBus');
const eventBus = EventBus.getInstance();
```

## API 参考

### 1. 注册事件监听器

```javascript
/**
 * 注册事件监听器
 * @param {string} eventName - 事件名称
 * @param {Function} callback - 回调函数
 * @param {Object} options - 选项配置
 * @returns {EventBus} - 返回this以支持链式调用
 */
eventBus.on(eventName, callback, options = {});
```

**参数说明：**
- `eventName`：事件名称，字符串类型
- `callback`：事件触发时执行的回调函数
- `options`：配置选项（可选）
  - `once`：布尔值，是否为一次性监听器，默认为false
  - `priority`：数字，优先级，数字越大优先级越高，默认为0
  - `context`：对象，回调函数的执行上下文，默认为null

**示例：**
```javascript
// 基本用法
eventBus.on('graph:nodeSelected', function(nodeData) {
    console.log('节点被选中:', nodeData);
});

// 设置优先级
eventBus.on('app:initialized', initializeUI, { priority: 10 });
eventBus.on('app:initialized', loadUserData, { priority: 5 });

// 设置上下文
eventBus.on('data:changed', this.handleDataChange, { context: this });
```

### 2. 注册一次性事件监听器

```javascript
/**
 * 注册一次性事件监听器
 * @param {string} eventName - 事件名称
 * @param {Function} callback - 回调函数
 * @param {Object} options - 选项配置
 * @returns {EventBus} - 返回this以支持链式调用
 */
eventBus.once(eventName, callback, options = {});
```

**参数说明：**与 `on` 方法相同，但 `once` 参数会被强制设置为 `true`

**示例：**
```javascript
// 只处理首次登录事件
eventBus.once('user:firstLogin', function(userData) {
    showWelcomeMessage(userData);
});
```

### 3. 移除事件监听器

```javascript
/**
 * 移除事件监听器
 * @param {string} eventName - 事件名称
 * @param {Function} callback - 回调函数，如果为null则移除该事件的所有监听器
 * @returns {EventBus} - 返回this以支持链式调用
 */
eventBus.off(eventName, callback = null);
```

**参数说明：**
- `eventName`：事件名称，字符串类型
- `callback`：要移除的回调函数，如果不提供则移除该事件的所有监听器

**示例：**
```javascript
// 移除特定监听器
function handleSelection() { ... }
eventBus.off('graph:selectionChanged', handleSelection);

// 移除所有监听器
eventBus.off('graph:selectionChanged');
```

### 4. 触发事件

```javascript
/**
 * 触发事件
 * @param {string} eventName - 事件名称
 * @param {...any} args - 传递给回调函数的参数
 * @returns {EventBus} - 返回this以支持链式调用
 */
eventBus.emit(eventName, ...args);
```

**参数说明：**
- `eventName`：事件名称，字符串类型
- `...args`：要传递给监听器的参数

**示例：**
```javascript
// 基本触发
eventBus.emit('user:login', { username: 'admin', timestamp: Date.now() });

// 传递多个参数
eventBus.emit('graph:nodeUpdated', nodeId, newData, oldData);

// 链式调用
eventBus.emit('app:started').emit('data:loading', true);
```

### 5. 检查监听器

```javascript
/**
 * 检查是否有特定事件的监听器
 * @param {string} eventName - 事件名称
 * @returns {boolean} - 是否有监听器
 */
eventBus.hasListeners(eventName);
```

**示例：**
```javascript
if (eventBus.hasListeners('custom:event')) {
    console.log('自定义事件有监听器');
}
```

### 6. 获取监听器数量

```javascript
/**
 * 获取特定事件的监听器数量
 * @param {string} eventName - 事件名称
 * @returns {number} - 监听器数量
 */
eventBus.getListenerCount(eventName);
```

**示例：**
```javascript
const count = eventBus.getListenerCount('graph:nodeSelected');
console.log(`节点选中事件有${count}个监听器`);
```

### 7. 清除所有监听器

```javascript
/**
 * 清除所有事件监听器
 * @returns {EventBus} - 返回this以支持链式调用
 */
eventBus.clearAllListeners();
```

**示例：**
```javascript
// 应用重置时清除所有事件监听器
eventBus.clearAllListeners();
```

### 8. 设置调试模式

```javascript
/**
 * 设置调试模式
 * @param {boolean} enabled - 是否启用调试模式
 * @returns {EventBus} - 返回this以支持链式调用
 */
eventBus.setDebug(enabled);
```

**示例：**
```javascript
// 开发环境启用调试
eventBus.setDebug(process.env.NODE_ENV === 'development');
```

## 事件命名规范

为了保持一致性和避免命名冲突，建议遵循以下事件命名规范：

### 格式

`domain:eventName`

### 推荐的域名空间

- `app`: 应用程序级事件
- `user`: 用户相关事件
- `config`: 配置相关事件
- `data`: 数据相关事件
- `graph`: 图表/图形相关事件
- `ui`: 用户界面相关事件
- `error`: 错误相关事件

### 示例

- `app:initialized` - 应用初始化完成
- `user:loginSuccess` - 用户登录成功
- `data:nodeCreated` - 节点创建
- `graph:layoutApplied` - 布局应用完成
- `ui:themeChanged` - 主题变更

## 最佳实践

### 1. 总是使用单例获取方法

```javascript
// 推荐
const eventBus = EventBus.getInstance();

// 不推荐
const eventBus = new EventBus(); // 虽然会返回单例，但不是正确的获取方式
```

### 2. 及时移除不需要的监听器

在组件卸载或不再需要监听事件时，应该移除相应的监听器，避免内存泄漏：

```javascript
// 在组件初始化时添加监听
function init() {
    this.handleSelection = this.handleSelection.bind(this);
    eventBus.on('graph:selectionChanged', this.handleSelection);
}

// 在组件销毁时移除监听
function destroy() {
    eventBus.off('graph:selectionChanged', this.handleSelection);
}
```

### 3. 使用一次性监听器处理初始化逻辑

对于只需要执行一次的初始化逻辑，使用 `once` 方法可以避免手动移除监听器：

```javascript
// 应用初始化时执行一次数据加载
eventBus.once('app:initialized', loadInitialData);
```

### 4. 合理设置事件优先级

对于有依赖关系的监听器，可以通过设置优先级确保执行顺序：

```javascript
// 高优先级的初始化（如配置加载）
eventBus.on('app:startup', loadConfiguration, { priority: 100 });

// 中等优先级的初始化（如UI准备）
eventBus.on('app:startup', prepareUI, { priority: 50 });

// 低优先级的初始化（如用户通知）
eventBus.on('app:startup', showNotifications, { priority: 10 });
```

### 5. 使用调试模式进行开发

在开发过程中启用调试模式，可以帮助追踪事件的触发和处理：

```javascript
// 在开发环境启用调试
eventBus.setDebug(true);
```

### 6. 避免循环事件

确保事件处理不会导致循环触发，这可能会导致应用卡死：

```javascript
// 危险：可能导致循环
eventBus.on('data:changed', function() {
    // 这个处理又会触发 data:changed 事件
    updateData(); // 假设这个函数会再次触发 data:changed
});

// 更好的做法：在处理函数内部有条件地触发事件
function updateData() {
    if (dataActuallyChanged) {
        eventBus.emit('data:changed', newData);
    }
}
```

## 常见问题解答

### Q: 如何确保所有模块使用同一个事件总线实例？

A: 始终使用 `EventBus.getInstance()` 方法获取事件总线实例，而不是直接 `new EventBus()`。即使误操作直接使用了 `new`，构造函数也会返回单例实例，确保全局唯一性。

### Q: 事件监听器抛出异常会影响其他监听器吗？

A: 不会。事件总线内部使用 try-catch 包装每个监听器的执行，一个监听器的异常不会影响其他监听器的执行。

### Q: 如何处理异步事件？

A: 事件总线本身是同步执行监听器的。如果需要异步处理，可以在监听器内部使用 `setTimeout`、`Promise` 等异步机制。

### Q: 事件总线有事件历史记录功能吗？

A: 当前版本的事件总线没有内置事件历史记录功能，但可以通过在关键事件上添加特定的监听器来实现自定义的历史记录功能。

### Q: 如何在AMD模块系统中正确使用事件总线？

A: 在AMD模块中，应该通过依赖注入获取事件总线：

```javascript
define(['common/eventBus'], function(EventBus) {
    // 获取单例实例
    const eventBus = EventBus.getInstance();
    
    // 使用事件总线
    eventBus.on('app:initialized', function() {
        console.log('应用已初始化');
    });
});
```

## 浏览器兼容性

事件总线实现使用了现代JavaScript特性，但已经确保了在所有主流浏览器中的兼容性，包括：

- Chrome (最新2个版本)
- Firefox (最新2个版本)
- Safari (最新2个版本)
- Edge (最新2个版本)
- IE11 (通过Babel转译后支持)

## 更新日志

### v2.0.0
- 重构为单例模式，确保全局唯一实例
- 新增优先级支持
- 优化事件链追踪
- 完善调试功能
- 支持多种模块系统

### v1.0.0
- 初始版本
- 基础的发布-订阅功能
- 一次性事件支持
- 基本的调试功能

## 许可证

MIT License
