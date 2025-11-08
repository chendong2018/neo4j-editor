# 双画布图编辑器事件监听与操作对应关系

## 系统架构概述

双画布图编辑器使用事件驱动架构，通过EventBus连接各个组件。主要组件包括：
- **EventBus**：事件总线，负责组件间通信
- **GraphDataService**：数据服务，管理节点和关系数据
- **CanvasManager**：画布管理器基类
- **TreeCanvasManager**：层级树画布管理器
- **NetworkCanvasManager**：关系网画布管理器
- **ModeManager**：操作模式管理器
- **ContextMenuManager**：右键菜单管理器

## 关键事件与操作映射

### 1. 节点创建

#### 事件监听流程
```
CanvasManager (click) → ModeManager.isNodeMode() → TreeCanvasManager/NetworkCanvasManager → GraphDataService.createNodeWithContext() → EventBus.emit('dataChanged')
```

#### 具体对应关系
- **UI交互**：用户在画布上点击（节点模式下）
- **事件监听**：CanvasManager._handleCanvasClick()
- **模式检查**：ModeManager.isNodeMode()
- **数据操作**：
  - TreeCanvasManager: 调用GraphDataService.createNodeWithContext(nodeData, parentId, 'tree')
  - NetworkCanvasManager: 调用GraphDataService.createNodeWithContext(nodeData, contextParentId, 'network')
- **事件通知**：操作完成后触发'dataChanged'事件

### 2. 关系创建

#### 事件监听流程
```
CanvasManager (click node) → ModeManager.isRelationshipMode() → ModeManager.startRelationshipCreation() → ModeManager.finishRelationshipCreation() → GraphDataService.addRelatesTo() → EventBus.emit('dataChanged')
```

#### 具体对应关系
- **UI交互**：用户在关系模式下点击起始节点，然后点击目标节点
- **事件监听**：CanvasManager._handleNodeClick()
- **模式检查**：ModeManager.isRelationshipMode()
- **状态管理**：
  - 第一次点击：ModeManager.startRelationshipCreation(startNodeId)
  - 第二次点击：ModeManager.finishRelationshipCreation(endNodeId)
- **数据操作**：GraphDataService.addRelatesTo(startNodeId, endNodeId, properties)
- **事件通知**：操作完成后触发'dataChanged'事件

### 3. 节点删除

#### 事件监听流程
```
ContextMenuManager (click delete) → GraphDataService.deleteNodeWithRelationships() → EventBus.emit('dataChanged')
```

#### 具体对应关系
- **UI交互**：用户右键点击节点，选择"删除节点"
- **事件监听**：ContextMenuManager._handleDeleteNode()
- **数据操作**：GraphDataService.deleteNodeWithRelationships(nodeId)
- **事件通知**：操作完成后触发'dataChanged'事件

### 4. 关系删除

#### 事件监听流程
```
ContextMenuManager (click delete) → GraphDataService.deleteRelationship() → EventBus.emit('dataChanged')
```

#### 具体对应关系
- **UI交互**：用户右键点击关系，选择"删除关系"
- **事件监听**：ContextMenuManager._handleDeleteRelationship()
- **数据操作**：GraphDataService.deleteRelationship(relationshipId)
- **事件通知**：操作完成后触发'dataChanged'事件

### 5. 节点移动

#### 事件监听流程
```
ContextMenuManager (click move) → GraphDataService.moveNode() → EventBus.emit('dataChanged') → EventBus.emit('networkContextChanged')
```

#### 具体对应关系
- **UI交互**：用户右键点击节点，选择"移动到…"
- **事件监听**：ContextMenuManager._handleMoveNode()
- **数据操作**：GraphDataService.moveNode(nodeId, newParentId)
- **事件通知**：
  - 操作完成后触发'dataChanged'事件
  - 在关系网画布上，额外触发'networkContextChanged'事件

### 6. 关系网上下文切换

#### 事件监听流程
```
ContextMenuManager (click view in network) → EventBus.emit('networkContextChanged') → NetworkCanvasManager.setContextParent()
```

#### 具体对应关系
- **UI交互**：用户右键点击节点，选择"在关系网中查看"
- **事件监听**：ContextMenuManager._handleViewInNetwork()
- **事件触发**：EventBus.emit('networkContextChanged', parentId)
- **视图更新**：NetworkCanvasManager.setContextParent(parentId)更新显示内容

### 7. 模式切换

#### 事件监听流程
```
UI点击 → ModeManager.setMode() → EventBus.emit('modeChanged')
```

#### 具体对应关系
- **UI交互**：用户点击模式切换按钮（选择/节点/关系）
- **操作调用**：ModeManager.setMode('select'|'node'|'relationship')
- **事件通知**：EventBus.emit('modeChanged', newMode)

### 8. 节点选中

#### 事件监听流程
```
CanvasManager (click node) → EventBus.emit('nodeSelected') → DualCanvasEditor._updatePropertyPanel()
```

#### 具体对应关系
- **UI交互**：用户点击节点
- **事件监听**：CanvasManager._handleNodeClick()
- **事件触发**：EventBus.emit('nodeSelected', nodeId)
- **属性面板更新**：DualCanvasEditor._updatePropertyPanel('node', nodeId)

### 9. 关系选中

#### 事件监听流程
```
CanvasManager (click relationship) → EventBus.emit('relationshipSelected') → DualCanvasEditor._updatePropertyPanel()
```

#### 具体对应关系
- **UI交互**：用户点击关系
- **事件监听**：CanvasManager._handleRelationshipClick()
- **事件触发**：EventBus.emit('relationshipSelected', relationshipId)
- **属性面板更新**：DualCanvasEditor._updatePropertyPanel('relationship', relationshipId)

### 10. 数据变更响应

#### 事件监听流程
```
EventBus.on('dataChanged') → TreeCanvasManager.refresh() + NetworkCanvasManager.refresh()
```

#### 具体对应关系
- **事件监听**：DualCanvasEditor._initEventListeners() 监听'dataChanged'
- **视图更新**：
  - TreeCanvasManager.refresh() 更新树视图
  - NetworkCanvasManager.refresh() 更新关系网视图

## 核心数据服务方法

### 节点管理
- **addNode(node)**: 添加单个节点
- **getNode(nodeId)**: 获取节点
- **deleteNode(nodeId)**: 删除节点及其关系
- **createNodeWithContext(nodeData, parentId, context)**: 在指定上下文中创建节点
- **moveNode(nodeId, newParentId)**: 移动节点到新父节点

### 关系管理
- **addRelationship(relationship)**: 添加关系
- **deleteRelationship(relId)**: 删除关系
- **addRelatesTo(nodeId1, nodeId2, properties)**: 添加RELATES_TO关系

### 层级结构
- **getHierarchyTree(rootId)**: 获取层级树
- **getSiblingNetwork(nodeId)**: 获取关系网数据
- **_findParentNode(nodeId)**: 查找父节点
- **_findChildNodes(parentId)**: 查找子节点

### 视图特定方法
- **_connectToSiblings(nodeId, parentId)**: 连接到所有兄弟节点
- **_cleanupRelatesTo(nodeId, parentId)**: 清理与兄弟节点的关系

## 画布管理器交互

### TreeCanvasManager
- 负责层级树视图的渲染和交互
- 节点创建时自动与兄弟节点建立关系
- 使用树形布局算法

### NetworkCanvasManager
- 负责关系网视图的渲染和交互
- 支持上下文切换（展示特定父节点下的子节点关系）
- 使用力导向布局算法

## 事件总线主要事件

### 操作事件
- **modeChanged**: 模式切换
- **nodeSelected**: 节点选中
- **relationshipSelected**: 关系选中
- **relationshipCreationStarted**: 关系创建开始
- **relationshipCreationReset**: 关系创建重置

### 数据事件
- **dataChanged**: 数据变更（触发视图刷新）
- **networkContextChanged**: 关系网上下文切换

## 总结

双画布图编辑器采用完整的事件驱动架构，通过EventBus实现组件间松耦合通信。用户操作触发UI事件，由CanvasManager捕获后根据当前模式进行处理，最终调用GraphDataService进行数据操作，操作完成后发送'dataChanged'事件触发视图更新。

这种设计使得UI和数据操作完全分离，便于维护和扩展。同时，通过严格的关系验证机制，确保数据的一致性和完整性。