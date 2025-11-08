# Neo4j 双画布图编辑器

## 简介

双画布图编辑器是一个为Neo4j图数据库提供可视化编辑功能的前端组件，通过两个并行视图（层级树视图和关系网视图）提供完整的图数据编辑体验。该组件允许用户在不同视角下查看和编辑图数据，支持节点创建、关系建立、数据探索等功能。

## 功能特性

### 双视图设计
- **层级树视图**：以树形结构展示节点间的层次关系，适合展示具有明确父子关系的图数据
- **关系网视图**：以力导向图方式展示节点间的所有关系，提供更直观的连接可视化
- **视图同步**：在一个视图中的操作可以反映到另一个视图，保持数据一致性

### 交互功能
- **画布操作**：支持缩放、平移、重置视图等基础操作
- **节点交互**：创建、选择、拖动节点
- **关系操作**：创建、删除关系
- **上下文菜单**：右键点击节点或画布提供快捷操作菜单
- **模式切换**：支持选择模式、节点创建模式、关系创建模式

### 数据管理
- 节点属性编辑
- 关系属性编辑
- 数据导入/导出功能
- 自动生成示例数据进行测试

## 架构设计

### 核心组件

1. **DualCanvasEditor** - 主控制器，协调所有组件的工作
2. **CanvasManager** - 画布管理器基类，提供基础的画布操作功能
3. **TreeCanvasManager** - 层级树视图的渲染和交互管理
4. **NetworkCanvasManager** - 关系网视图的渲染和交互管理
5. **ModeManager** - 模式管理器，负责编辑模式的切换
6. **GraphDataService** - 图数据服务，提供数据访问和操作接口
7. **ContextMenuManager** - 上下文菜单管理

### 组件关系图

```
+-------------------------+
|  DualCanvasEditor       |
+-------------------------+
           |
           v
+-------------------------+
|     协调各组件          |
+----------+--------------+
           |
           v
+-------------------------+
|  EventBus (事件总线)    |
+-------------------------+
      ^         ^        ^
      |         |        |
+-----+----+ +--+-----+ +-----+------+
|CanvasManager| |ModeManager| |GraphDataService|
+-------------+ +-----------+ +---------------+
      |                |              |
+-----+----+      +----+-------+      |
|TreeCanvas|      |ContextMenu|      |
|Manager   |      |Manager    |      |
+----------+      +------------+      |
      |                               |
+-----+----+                      +---+------+
|NetworkCanvas|                   |其他服务...|
|Manager      |                   +----------+
+-------------+
```

## 使用指南

### 基本使用

1. **引入必要的脚本文件**

```html
<!-- 在HTML文件中引入必要的组件脚本 -->
<script src="../../utils/utils.js"></script>
<script src="../../services/graphDataService.js"></script>
<script src="EventBus.js"></script>
<script src="CanvasManager.js"></script>
<script src="ModeManager.js"></script>
<script src="TreeCanvasManager.js"></script>
<script src="NetworkCanvasManager.js"></script>
<script src="ContextMenuManager.js"></script>
<script src="index.js"></script>
```

2. **创建HTML容器**

```html
<div class="canvas-container">
  <div id="tree-canvas" class="canvas-wrapper">
    <div class="canvas-title">层级树视图</div>
    <canvas class="canvas"></canvas>
  </div>
  <div id="network-canvas" class="canvas-wrapper">
    <div class="canvas-title">关系网视图</div>
    <canvas class="canvas"></canvas>
  </div>
</div>
```

3. **初始化编辑器**

```javascript
// 创建并初始化双画布编辑器实例
const editor = new DualCanvasEditor({
  treeContainerSelector: '#tree-canvas',
  networkContainerSelector: '#network-canvas'
});

// 初始化
editor.init();
```

### 快速开始

如果您想快速体验双画布编辑器的功能，可以直接使用我们提供的独立演示文件：

```
standalone-demo.html
```

这个文件包含了所有必要的组件和示例数据，可以直接在浏览器中打开查看效果。

## 组件详解

### DualCanvasEditor

主控制器类，负责协调所有组件的工作，提供统一的API接口。

**主要方法**：
- `init()`: 初始化编辑器
- `getData()`: 获取当前图数据
- `setData(nodes, relationships)`: 设置图数据

### CanvasManager

画布管理器基类，提供基础的画布操作功能，包括缩放、平移、事件处理等。

**主要功能**：
- 画布缩放和平移
- 鼠标事件处理
- 节点选择管理
- 渲染基础方法

### TreeCanvasManager

继承自CanvasManager，负责层级树视图的渲染和交互管理。

**主要功能**：
- 树形布局计算
- 父子关系可视化
- 节点拖放重新排列
- 双击节点下钻到关系网视图

### NetworkCanvasManager

继承自CanvasManager，负责关系网视图的渲染和交互管理。

**主要功能**：
- 力导向图布局
- 上下文节点展示
- 关系创建和删除
- 节点交互操作

### ModeManager

模式管理器，负责编辑模式的切换和管理。

**主要模式**：
- `select`: 选择模式，用于选择和操作节点/关系
- `node`: 节点创建模式，用于创建新节点
- `relationship`: 关系创建模式，用于创建节点间的关系

## 事件系统

双画布编辑器使用事件总线（EventBus）进行组件间通信。主要事件包括：

- `modeChanged`: 当编辑模式改变时触发
- `dataChanged`: 当图数据改变时触发
- `nodeSelected`: 当节点被选择时触发
- `relationshipSelected`: 当关系被选择时触发
- `networkContextChanged`: 当关系网视图上下文改变时触发
- `contextMenu`: 当需要显示上下文菜单时触发

## 自定义配置

在初始化编辑器时，可以通过配置选项自定义编辑器行为：

```javascript
const editor = new DualCanvasEditor({
  treeContainerSelector: '#tree-canvas',
  networkContainerSelector: '#network-canvas',
  propertyPanelSelector: '#property-panel',
  modePanelSelector: '#mode-panel',
  // 自定义配置项
});
```

## 开发说明

### 文件结构

```
dualCanvas/
├── index.js                 # 主入口文件，定义DualCanvasEditor类
├── CanvasManager.js         # 画布管理器基类
├── TreeCanvasManager.js     # 层级树画布管理器
├── NetworkCanvasManager.js  # 关系网画布管理器
├── ModeManager.js           # 模式管理器
├── ContextMenuManager.js    # 上下文菜单管理器
├── standalone-demo.html     # 独立演示文件
└── README.md                # 文档
```

### 开发流程

1. 确保所有必要的组件文件都已引入
2. 创建HTML容器结构
3. 初始化编辑器实例
4. 可以通过事件监听自定义行为

## 浏览器兼容性

支持所有现代浏览器，包括：
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 许可协议

MIT

## 联系方式

如有问题或建议，请联系开发团队。