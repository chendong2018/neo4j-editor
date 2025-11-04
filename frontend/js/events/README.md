# 双画布交互事件管理模块

本模块负责处理 Neo4j 编辑器中 Tree Canvas 和 Network Canvas 的所有用户交互事件，并根据当前操作模式触发相应的行为。

## 文件结构

- **eventManager.js** - 核心事件管理器，负责绑定和处理所有交互事件
- **eventSimulator.js** - 事件模拟器，用于测试和验证事件绑定
- **index.js** - 模块索引文件，导出所有组件
- **usageExample.js** - 使用示例，展示如何初始化和使用事件系统

## 核心功能

### 1. 操作模式管理

- 支持三种操作模式：`select`（选择）、`node`（节点创建）、`relationship`（关系创建）
- 关系模式下支持子类型：`CHILD_OF`（父子关系）和 `RELATES_TO`（关联关系）
- 模式切换时自动清理临时交互状态

### 2. 画布交互事件

#### 通用操作
- **平移**：空格+左键拖拽或中键拖拽
- **缩放**：鼠标滚轮，限制范围 20%-200%

#### 选择模式（select）
- 左键单击节点/关系：选中元素
- Ctrl+左键单击：多选节点
- Tree Canvas 点击非叶子节点：切换 Network Canvas 上下文
- Network Canvas 双击节点：下钻到子组

#### 节点模式（node）
- Tree Canvas 点击空白区域：在选中父节点下创建子节点
- Network Canvas 点击空白区域：在当前上下文中创建节点

#### 关系模式（relationship）
- 左键点击节点 A → 再点击节点 B：创建关系
- `CHILD_OF`：建立/移动父子关系
- `RELATES_TO`：在同父节点下建立关联关系

#### 拖拽操作
- **视觉拖拽**：修改节点渲染位置（不改变数据）
- **结构拖拽**：Tree Canvas 中拖拽节点到另一节点上，改变父子关系

#### 右键菜单
- 节点右键菜单：编辑属性、删除节点、移动到…、在关系网中查看
- 画布右键菜单：创建节点

### 3. 调试与测试

- 完整的日志记录，便于追踪事件流
- 事件模拟器支持单元测试和集成测试
- 可通过手动调用模拟各种用户交互

## 使用方法

### 初始化事件管理器

```javascript
import { EventManager } from './events/index.js';

// 获取画布元素
const treeCanvas = document.getElementById('tree-canvas');
const networkCanvas = document.getElementById('network-canvas');

// 创建图数据服务实例
const graphService = {
  // 实现各种图数据操作方法
  addNode, deleteNode, moveNode, addRelationship, 
  setNetworkContext, selectNode, clearSelection, etc.
};

// 初始化事件管理器
const eventManager = new EventManager(treeCanvas, networkCanvas, graphService);
```

### 切换操作模式

```javascript
// 切换到选择模式
eventManager.switchMode('select');

// 切换到节点模式
eventManager.switchMode('node');

// 切换到关系模式（CHILD_OF）
eventManager.switchMode('relationship', 'CHILD_OF');

// 切换到关系模式（RELATES_TO）
eventManager.switchMode('relationship', 'RELATES_TO');
```

### 测试事件系统

```javascript
import { EventSimulator } from './events/index.js';

// 创建事件模拟器
const eventSimulator = new EventSimulator(eventManager);

// 设置模拟数据
eventSimulator.setMockData(
  [
    { id: 'node1', isLeaf: false },
    { id: 'node2', isLeaf: true }
  ],
  [
    { id: 'rel1', source: 'node1', target: 'node2', type: 'CHILD_OF' }
  ]
);

// 模拟用户交互
eventSimulator.simulateNodeClick('node1', 'Tree Canvas');
eventSimulator.simulateRelationshipCreation('node2', 'node3', 'RELATES_TO');

// 运行测试套件
eventSimulator.runTestSuite();
```

## 集成说明

### 与数据服务集成

事件管理器依赖于 `graphService` 对象提供的数据操作接口。该服务需要实现以下方法：

- **节点操作**：`addNode`, `deleteNode`, `moveNode`
- **关系操作**：`addRelationship`
- **上下文操作**：`setNetworkContext`, `getCurrentNetworkContext`
- **选择操作**：`selectNode`, `selectRelationship`, `clearSelection`, `focusPropertiesPanel`
- **辅助方法**：`getNodeParent`, `hasChildNodes`

### 与渲染层集成

事件管理器需要与渲染层协作来获取事件位置对应的节点/关系，以及更新视觉状态。关键集成点：

- 实现 `getNodeFromEvent` 和 `getRelationshipFromEvent` 方法的实际逻辑
- 提供视觉反馈机制（高亮、临时连线等）
- 实现画布平移和缩放的具体操作

## 注意事项

1. 确保在 DOM 加载完成后初始化事件管理器
2. 所有交互操作都应提供适当的用户反馈（高亮、提示信息等）
3. 错误操作需要有明确的错误提示
4. 性能考虑：避免在频繁触发的事件（如 mousemove）中执行昂贵的操作
5. 移动节点时需要注意处理关系的清理和重建

## 调试技巧

1. 打开浏览器控制台，观察事件流日志
2. 使用事件模拟器进行自动化测试
3. 模拟特定用户操作来重现问题
4. 使用 `console.log` 记录关键状态变更

## 扩展建议

1. 添加键盘快捷键支持
2. 实现更复杂的拖拽行为（如限制拖拽范围）
3. 添加触摸设备支持
4. 实现自定义事件处理机制
