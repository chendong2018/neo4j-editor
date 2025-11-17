// 基本节点类型
export interface Node {
  id: string
  label: string
  x?: number
  y?: number
  data?: Record<string, any>
}

// 图节点类型 - 扩展基本节点，用于编辑器
export interface GraphNode {
  id: string
  label: string
  properties?: Record<string, any>
}

// 基本边类型
export interface Edge {
  source: string
  target: string
  id?: string
  label?: string
  data?: Record<string, any>
}

// 图关系类型 - 扩展基本边，用于编辑器
export interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
  properties?: Record<string, any>
}

// 完整图数据类型
export interface GraphData {
  nodes: Node[]
  edges: Edge[]
}

// 节点类型配置
export interface NodeType {
  name: string
  icon: string
  color: string
}

// 关系类型配置
export interface RelationshipType {
  name: string
  icon: string
  color: string
}

// 属性定义
export interface PropertyDefinition {
  name: string
  type: 'string' | 'number' | 'boolean'
}

// 选择状态类型
export interface SelectionState {
  selectedNode: GraphNode | null
  selectedRelationship: GraphEdge | null
}

// 视图模式类型
export type ViewMode = 'dual' | 'tree' | 'network'

// 操作模式类型
export type EditorMode = 'select' | 'node' | 'relationship'

// 画布模式 - 保持向后兼容
export type CanvasMode = "select" | "node" | "relationship"