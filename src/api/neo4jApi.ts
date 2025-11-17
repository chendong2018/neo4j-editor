import neo4j from 'neo4j-driver'

// Neo4j连接配置接口
export interface Neo4jConnectionParams {
  uri: string
  username: string
  password: string
}

// 节点数据接口
export interface Neo4jNode {
  id: string
  label: string
  labels: string[]
  properties: Record<string, any>
}

// 关系数据接口
export interface Neo4jRelationship {
  id: string
  type: string
  source: string
  target: string
  properties: Record<string, any>
}

// 图数据接口
export interface Neo4jGraphData {
  nodes: Neo4jNode[]
  edges: Neo4jRelationship[]
}

// Neo4j API类
export class Neo4jApi {
  private driver: any = null

  /**
   * 连接到Neo4j数据库
   * @param params 连接参数
   * @returns 连接是否成功
   */
  async connect(params: Neo4jConnectionParams): Promise<boolean> {
    try {
      // 创建Neo4j驱动实例
      this.driver = neo4j.driver(
        params.uri,
        neo4j.auth.basic(params.username, params.password)
      )
      
      // 验证连接
      await this.driver.verifyConnectivity()
      console.log('Neo4j连接验证成功')
      return true
    } catch (error) {
      console.error('Failed to connect to Neo4j:', error)
      throw error
    }
  }

  /**
   * 断开与Neo4j数据库的连接
   */
  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close()
      this.driver = null
      console.log('Neo4j连接已关闭')
    }
  }

  /**
   * 确保连接已建立
   */
  private ensureConnected(): void {
    if (!this.driver) {
      throw new Error('Not connected to Neo4j database')
    }
  }

  /**
   * 获取所有节点标签
   * @returns 节点标签数组
   */
  async getAllNodeLabels(): Promise<string[]> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      const result = await session.run('CALL db.labels() YIELD label RETURN label')
      return result.records.map((record: any) => record.get('label')).filter((label: any) => label !== null) as string[]
    } finally {
      await session.close()
    }
  }

  /**
   * 获取所有关系类型
   * @returns 关系类型数组
   */
  async getAllRelationshipTypes(): Promise<string[]> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      const result = await session.run('CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType')
      return result.records.map((record: any) => record.get('relationshipType')).filter((type: any) => type !== null) as string[]
    } finally {
      await session.close()
    }
  }

  /**
   * 查询节点
   * @param query Cypher查询语句
   * @returns 节点数组
   */
  async queryNodes(query: string): Promise<Neo4jNode[]> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      const result = await session.run(query)
      const nodes: Neo4jNode[] = []
      
      result.records.forEach((record: any) => {
        // 查找第一个节点类型的值
        for (const key in record._fields) {
          const value = record._fields[key]
          if (value && value.labels) {
            nodes.push({
              id: value.identity.toString(),
              label: value.labels[0] || 'Node',
              labels: value.labels,
              properties: value.properties
            })
          }
        }
      })
      
      return nodes
    } finally {
      await session.close()
    }
  }

  /**
   * 查询关系
   * @param query Cypher查询语句
   * @returns 关系数组
   */
  async queryRelationships(query: string): Promise<Neo4jRelationship[]> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      const result = await session.run(query)
      const relationships: Neo4jRelationship[] = []
      
      result.records.forEach((record: any) => {
        // 查找第一个关系类型的值
        for (const key in record._fields) {
          const value = record._fields[key]
          if (value && value.type && value.start && value.end) {
            relationships.push({
              id: value.identity.toString(),
              type: value.type,
              source: value.start.toString(),
              target: value.end.toString(),
              properties: value.properties
            })
          }
        }
      })
      
      return relationships
    } finally {
      await session.close()
    }
  }

  /**
   * 获取图数据（节点和关系）
   * @param limit 限制返回的记录数
   * @returns 图数据
   */
  async getGraphData(_limit: number = 100): Promise<Neo4jGraphData> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      const result = await session.run(
        // `MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m LIMIT ${limit}`
        `MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m `
      )
      
      const nodesMap = new Map<string, Neo4jNode>()
      const edgesMap = new Map<string, Neo4jRelationship>()
      
      result.records.forEach((record: any) => {
        // 处理节点n
        const nodeN = record.get('n')
        if (nodeN) {
          const nodeId = nodeN.identity.toString()
          if (!nodesMap.has(nodeId)) {
            nodesMap.set(nodeId, {
              id: nodeId,
              label: nodeN.labels[0] || 'Node',
              labels: nodeN.labels,
              properties: nodeN.properties
            })
          }
        }
        
        // 处理节点m
        const nodeM = record.get('m')
        if (nodeM) {
          const nodeId = nodeM.identity.toString()
          if (!nodesMap.has(nodeId)) {
            nodesMap.set(nodeId, {
              id: nodeId,
              label: nodeM.labels[0] || 'Node',
              labels: nodeM.labels,
              properties: nodeM.properties
            })
          }
        }
        
        // 处理关系r
        const relationship = record.get('r')
        if (relationship) {
          const relId = relationship.identity.toString()
          if (!edgesMap.has(relId)) {
            edgesMap.set(relId, {
              id: relId,
              type: relationship.type,
              source: relationship.start.toString(),
              target: relationship.end.toString(),
              properties: relationship.properties
            })
          }
        }
      })
      
      return {
        nodes: Array.from(nodesMap.values()),
        edges: Array.from(edgesMap.values())
      }
    } finally {
      await session.close()
    }
  }

  /**
   * 新增节点
   * @param label 节点标签
   * @param properties 节点属性
   * @returns 创建的节点
   */
  async createNode(label: string, properties: Record<string, any>): Promise<Neo4jNode> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      // 构建属性字符串
      const propsStr = Object.entries(properties)
        .map(([key]) => {
          // 对于以数字开头或包含特殊字符的属性键，用反引号包围
          const safeKey = /^[a-zA-Z_]/.test(key) && !/\s/.test(key) ? key : `\`${key}\``;
          return `${safeKey}: $${key}`;
        })
        .join(', ')
      
      // 过滤掉不支持的复杂类型值，Neo4j只支持原始类型或原始类型数组
      const safeProperties = Object.entries(properties).reduce((acc, [key, value]) => {
        // 检查值是否为对象且不是null、数组或日期
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
          // 对于复杂对象，转换为字符串
          try {
            acc[key] = JSON.stringify(value);
          } catch (e) {
            // 如果无法序列化，跳过这个属性
            console.warn(`无法序列化属性 ${key}，将被跳过:`, value);
          }
        } else {
          // 保留原始值
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      // 构建参数对象
      const params = { ...safeProperties }
      
      // 执行创建节点的查询
      const query = `CREATE (n:${label} {${propsStr}}) RETURN n`
      const result = await session.run(query, params)
      
      if (result.records.length > 0) {
        const node = result.records[0].get('n')
        return {
          id: node.identity.toString(),
          label: node.labels[0],
          labels: node.labels,
          properties: node.properties
        }
      }
      
      throw new Error('Failed to create node')
    } finally {
      await session.close()
    }
  }

  /**
   * 修改节点
   * @param nodeId 节点ID
   * @param properties 要更新的属性
   * @returns 更新后的节点
   */
  async updateNode(nodeId: string, properties: Record<string, any>): Promise<Neo4jNode> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      // 构建属性字符串
      const propsStr = Object.entries(properties)
        .map(([key]) => {
          // 对于以数字开头或包含特殊字符的属性键，用反引号包围
          const safeKey = /^[a-zA-Z_]/.test(key) && !/\s/.test(key) ? key : `\`${key}\``;
          return `${safeKey}: $${key}`;
        })
        .join(', ')
      
      // 过滤掉不支持的复杂类型值，Neo4j只支持原始类型或原始类型数组
      const safeProperties = Object.entries(properties).reduce((acc, [key, value]) => {
        // 检查值是否为对象且不是null、数组或日期
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
          // 对于复杂对象，转换为字符串
          try {
            acc[key] = JSON.stringify(value);
          } catch (e) {
            // 如果无法序列化，跳过这个属性
            console.warn(`无法序列化属性 ${key}，将被跳过:`, value);
          }
        } else {
          // 保留原始值
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      // 构建参数对象
      const params = { id: parseInt(nodeId), ...safeProperties }
      
      // 执行更新节点的查询
      const query = `MATCH (n) WHERE id(n) = $id SET n += {${propsStr}} RETURN n`
      const result = await session.run(query, params)
      
      if (result.records.length > 0) {
        const node = result.records[0].get('n')
        return {
          id: node.identity.toString(),
          label: node.labels[0],
          labels: node.labels,
          properties: node.properties
        }
      }
      
      throw new Error(`Node with id ${nodeId} not found`)
    } finally {
      await session.close()
    }
  }

  /**
   * 新增关系
   * @param sourceId 源节点ID
   * @param targetId 目标节点ID
   * @param type 关系类型
   * @param properties 关系属性
   * @returns 创建的关系
   */
  async createRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    properties: Record<string, any>
  ): Promise<Neo4jRelationship> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      // 构建属性字符串
      const propsStr = Object.entries(properties)
        .map(([key]) => `${key}: $${key}`)
        .join(', ')
      
      // 过滤掉不支持的复杂类型值，Neo4j只支持原始类型或原始类型数组
      const safeProperties = Object.entries(properties).reduce((acc, [key, value]) => {
        // 检查值是否为对象且不是null、数组或日期
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
          // 对于复杂对象，转换为字符串
          try {
            acc[key] = JSON.stringify(value);
          } catch (e) {
            // 如果无法序列化，跳过这个属性
            console.warn(`无法序列化属性 ${key}，将被跳过:`, value);
          }
        } else {
          // 保留原始值
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      // 构建参数对象
      const params = {
        sourceId: parseInt(sourceId),
        targetId: parseInt(targetId),
        ...safeProperties
      }
      
      // 执行创建关系的查询
      const propsPart = propsStr ? `{${propsStr}}` : ''
      const query = `MATCH (a), (b) WHERE id(a) = $sourceId AND id(b) = $targetId CREATE (a)-[r:${type}${propsPart}]->(b) RETURN r`
      const result = await session.run(query, params)
      
      if (result.records.length > 0) {
        const relationship = result.records[0].get('r')
        return {
          id: relationship.identity.toString(),
          type: relationship.type,
          source: relationship.start.toString(),
          target: relationship.end.toString(),
          properties: relationship.properties
        }
      }
      
      throw new Error('Failed to create relationship')
    } finally {
      await session.close()
    }
  }

  /**
   * 修改关系
   * @param relationshipId 关系ID
   * @param properties 要更新的属性
   * @returns 更新后的关系
   */
  async updateRelationship(relationshipId: string, properties: Record<string, any>): Promise<Neo4jRelationship> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      // 构建属性字符串
      const propsStr = Object.entries(properties)
        .map(([key]) => {
          // 对于以数字开头或包含特殊字符的属性键，用反引号包围
          const safeKey = /^[a-zA-Z_]/.test(key) && !/\s/.test(key) ? key : `\`${key}\``;
          return `${safeKey}: $${key}`;
        })
        .join(', ')
      
      // 过滤掉不支持的复杂类型值，Neo4j只支持原始类型或原始类型数组
      const safeProperties = Object.entries(properties).reduce((acc, [key, value]) => {
        // 检查值是否为对象且不是null、数组或日期
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
          // 对于复杂对象，转换为字符串
          try {
            acc[key] = JSON.stringify(value);
          } catch (e) {
            // 如果无法序列化，跳过这个属性
            console.warn(`无法序列化属性 ${key}，将被跳过:`, value);
          }
        } else {
          // 保留原始值
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      // 构建参数对象
      const params = { id: parseInt(relationshipId), ...safeProperties }
      
      // 执行更新关系的查询
      const query = `MATCH ()-[r]->() WHERE id(r) = $id SET r += {${propsStr}} RETURN r`
      const result = await session.run(query, params)
      
      if (result.records.length > 0) {
        const relationship = result.records[0].get('r')
        return {
          id: relationship.identity.toString(),
          type: relationship.type,
          source: relationship.start.toString(),
          target: relationship.end.toString(),
          properties: relationship.properties
        }
      }
      
      throw new Error(`Relationship with id ${relationshipId} not found`)
    } finally {
      await session.close()
    }
  }

  /**
   * 执行自定义Cypher查询
   * @param query Cypher查询语句
   * @param params 查询参数
   * @returns 查询结果
   */
  async executeCypher(query: string, params: Record<string, any> = {}): Promise<any> {
    this.ensureConnected()
    
    const session = this.driver!.session()
    try {
      const result = await session.run(query, params)
      return result.records.map((record: any) => {
        const obj: Record<string, any> = {}
        record.keys.forEach((key: string) => {
          obj[key] = record.get(key)
        })
        return obj
      })
    } finally {
      await session.close()
    }
  }
}

// 导出单例实例
export const neo4jApi = new Neo4jApi()