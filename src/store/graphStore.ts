import { defineStore } from "pinia"
import type { Node, Edge, CanvasMode, GraphNode, GraphEdge } from "../types/graph"
import { graphApi } from "../api/graphApi"

export const useGraphStore = defineStore("graph", {
  state: () => ({
    nodes: [] as Node[],
    edges: [] as Edge[],
    selectedNode: null as Node | null,
    canvasMode: "select" as CanvasMode,
    isConnected: false
  }),
  
  actions: {
    setGraphData(data: { nodes?: Node[], edges?: Edge[] }) {
      this.nodes = data.nodes || []
      this.edges = data.edges || []
    },
    
    addNode(node: Node) {
      this.nodes.push(node)
    },
    
    addEdge(edge: Edge) {
      this.edges.push(edge)
    },
    
    updateNode(id: string, updates: Partial<Node>) {
      const index = this.nodes.findIndex(node => node.id === id)
      if (index !== -1) {
        this.nodes[index] = { ...this.nodes[index], ...updates }
      }
    },
    
    setSelectedNode(node: Node | null) {
      this.selectedNode = node
    },
    
    setCanvasMode(mode: CanvasMode) {
      this.canvasMode = mode
    },
    
    // 使用统一API的方法
    async fetchGraphDataFromNeo4j(connectionParams: any) {
      try {
        // 连接到Neo4j
        await graphApi.connectToNeo4j(connectionParams)
        this.isConnected = true
        
        // 获取图数据
        // const graphData = await graphApi.getNeo4jGraphData()
        
        // 设置到状态中
        // this.setGraphData(graphData)
        return null
      } catch (error) {
        console.error('Failed to fetch graph data:', error)
        this.isConnected = false
        throw error
      }
    },
    
    async createNodeInNeo4j(nodeData: GraphNode) {
      try {
        // 使用nodeData的label属性
        const label = nodeData.label || 'Node'
        const newNode = await graphApi.createNode(label, nodeData.properties || {})
        this.addNode({ ...newNode, label } as Node)
        return newNode
      } catch (error) {
        console.error('Failed to create node:', error)
        throw error
      }
    },
    
    async createRelationshipInNeo4j(relData: GraphEdge) {
      try {
        const newRel = await graphApi.createRelationship(
          relData.source, 
          relData.target, 
          relData.label || 'RELATES_TO',
          relData.properties || {}
        )
        this.addEdge({
          id: newRel.id,
          source: relData.source,
          target: relData.target,
          label: relData.label || 'RELATES_TO',
          data: relData.properties || {}
        } as Edge)
        return newRel
      } catch (error) {
        console.error('Failed to create relationship:', error)
        throw error
      }
    },
    
    async updateNodeInNeo4j(nodeId: string, updates: Record<string, any>) {
      try {
        await graphApi.updateNode(nodeId, updates)
        this.updateNode(nodeId, { data: updates })
      } catch (error) {
        console.error('Failed to update node:', error)
        throw error
      }
    },
    
    async updateRelationshipInNeo4j(relId: string, updates: Record<string, any>) {
      try {
        await graphApi.updateRelationship(relId, updates)
        // 更新本地状态中的关系
        const edgeIndex = this.edges.findIndex(e => e.id === relId)
        if (edgeIndex !== -1) {
          this.edges[edgeIndex] = {
            ...this.edges[edgeIndex],
            data: { ...(this.edges[edgeIndex].data || {}), ...updates }
          }
        }
      } catch (error) {
        console.error('Failed to update relationship:', error)
        throw error
      }
    },
    
    async disconnectFromNeo4j() {
      try {
        await graphApi.disconnectFromNeo4j()
        this.isConnected = false
      } catch (error) {
        console.error('Failed to disconnect:', error)
      }
    }
  }
})
