# Neo4j 渲染器模块

本模块提供了用于Neo4j图数据可视化的渲染器组件，支持两种不同的视图模式：层级树视图（Tree View）和关系网络视图（Network View）。

## 目录结构

```
/e:/Data/neo4j-editor/frontend/js/render/
├── baseRenderer.js   # 基础渲染器类，提供通用功能
├── treeCanvas.js     # 层级树画布渲染器
├── networkCanvas.js  # 关系网画布渲染器
├── index.js          # 模块主入口，提供工厂方法
└── README.md         # 本说明文件
```

## 核心组件

### 1. BaseRenderer（基础渲染器）

提供所有渲染器共享的基础功能：
- SVG容器初始化和管理
- 画布缩放（Zoom）和平移（Pan）控制
- 节点和连线的基础创建方法
- 事件监听器管理

### 2. TreeCanvas（层级树画布）

专门用于展示图数据的层级结构：
- 基于父子关系的树形布局算法
- 支持多根节点树
- 自动计算节点位置和树布局
- 仅渲染CHILD_OF关系类型

### 3. NetworkCanvas（关系网画布）

用于展示图数据的复杂关系网络：
- 支持多种布局算法：
  - 力导向布局（Force-directed）- 默认
  - 网格布局（Grid）
  - 环形布局（Circular）
- 支持上下文感知布局，以特定节点为中心
- 渲染所有类型的关系

## API 参考

### 1. 创建渲染器实例

#### 创建树视图渲染器
```javascript
const treeCanvas = Neo4jRenderers.createTreeCanvas('container-id');
```

#### 创建关系网视图渲染器
```javascript
const networkCanvas = Neo4jRenderers.createNetworkCanvas('container-id');

// 设置布局类型
networkCanvas.setLayoutType('force');  // 可选: 'force', 'grid', 'circular'
```

#### 创建双视图渲染器
```javascript
const dualRenderer = Neo4jRenderers.createDualViewRenderer({
  tree: 'tree-container-id',     // 树视图容器ID
  network: 'network-container-id' // 关系网视图容器ID
});
```

### 2. 渲染数据

#### 单视图渲染
```javascript
// 渲染树视图
treeCanvas.render(graphData);

// 渲染关系网视图
networkCanvas.render(graphData, contextNodeId);  // contextNodeId为可选，用于上下文布局
```

#### 双视图渲染
```javascript
dualRenderer.render(graphData, contextNodeId);
```

### 3. 重置视图
```javascript
// 重置单视图
treeCanvas.resetView();
networkCanvas.resetView();

// 重置双视图
dualRenderer.resetView();
```

### 4. 数据格式

渲染器接受以下格式的数据：

```javascript
const graphData = {
  nodes: [
    {
      id: 'node_id',
      labels: ['Label1', 'Label2'],  // 可选
      properties: {                  // 可选
        name: '节点名称',
        // 其他属性...
      }
    },
    // 更多节点...
  ],
  edges: [
    {
      id: 'edge_id',
      type: 'RELATIONSHIP_TYPE',     // 如 'CHILD_OF', 'RELATES_TO'
      startNodeId: 'source_node_id',
      endNodeId: 'target_node_id',
      properties: {                  // 可选
        // 关系属性...
      }
    },
    // 更多边...
  ]
};
```

### 5. 生成模拟数据

```javascript
// 生成10个节点、15条边的模拟数据
const mockData = Neo4jRenderers.generateMockData(10, 15);
```

## 使用示例

### 基本用法

```javascript
// 初始化渲染器
const treeCanvas = Neo4jRenderers.createTreeCanvas('tree-canvas');
const networkCanvas = Neo4jRenderers.createNetworkCanvas('network-canvas');

// 生成模拟数据
const data = Neo4jRenderers.generateMockData(15, 20);

// 渲染数据
treeCanvas.render(data);
networkCanvas.render(data);

// 改变网络视图布局
networkCanvas.setLayoutType('circular');
networkCanvas.render(data);
```

### 使用双视图渲染器

```javascript
// 初始化双视图渲染器
const dualRenderer = Neo4jRenderers.createDualViewRenderer({
  tree: 'tree-canvas',
  network: 'network-canvas'
});

// 生成数据并渲染
dualRenderer.render(Neo4jRenderers.generateMockData(12, 18));

// 重置视图
dualRenderer.resetView();
```

## 浏览器兼容性

- 支持所有现代浏览器（Chrome、Firefox、Safari、Edge）
- 支持移动设备触摸操作
- 不依赖任何第三方库，纯原生JavaScript实现

## 注意事项

1. 渲染器使用SVG进行可视化，确保容器元素有足够的高度和宽度
2. 对于大规模图数据（节点数>100），建议使用力导向布局并增加迭代次数以获得更好的布局效果
3. 为确保最佳性能，避免频繁切换视图或重新渲染

## 许可证

MIT