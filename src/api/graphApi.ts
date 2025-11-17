import axios from "axios"
import type { GraphData } from "../types/graph"
import { neo4jApi, type Neo4jConnectionParams } from "./neo4jApi"

// 创建axios实例
const api = axios.create({
  baseURL: "/api",
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 这里可以添加认证信息等
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error("API请求错误:", error)
    return Promise.reject(error)
  }
)

// API方法
export const graphApi = {
  // 获取图数据（后端API）
  getGraphData: () => api.get<GraphData>("/graph"),
  
  // 保存图数据（后端API）
  saveGraphData: (data: GraphData) => api.post("/graph", data),
  
  // 执行Cypher查询（后端API）
  executeCypher: (query: string) => api.post("/cypher", { query }),
  
  // ===== Neo4j 直接操作 API =====
  
  /**
   * 连接到Neo4j数据库
   * @param params 连接参数
   * @returns 连接是否成功
   */
  connectToNeo4j: (params: Neo4jConnectionParams) => neo4jApi.connect(params),
  
  /**
   * 断开与Neo4j数据库的连接
   */
  disconnectFromNeo4j: () => neo4jApi.disconnect(),
  
  /**
   * 获取所有节点标签
   * @returns 节点标签数组
   */
  getAllNodeLabels: () => neo4jApi.getAllNodeLabels(),
  
  /**
   * 获取所有关系类型
   * @returns 关系类型数组
   */
  getAllRelationshipTypes: () => neo4jApi.getAllRelationshipTypes(),
  
  /**
   * 查询节点
   * @param query Cypher查询语句
   * @returns 节点数组
   */
  queryNodes: (query: string) => neo4jApi.queryNodes(query),
  
  /**
   * 查询关系
   * @param query Cypher查询语句
   * @returns 关系数组
   */
  queryRelationships: (query: string) => neo4jApi.queryRelationships(query),
  
  /**
   * 获取Neo4j图数据
   * @param limit 限制返回的记录数
   * @returns 图数据
   */
  getNeo4jGraphData: (limit?: number) => neo4jApi.getGraphData(limit),
  
  /**
   * 新增节点
   * @param label 节点标签
   * @param properties 节点属性
   * @returns 创建的节点
   */
  createNode: (label: string, properties: Record<string, any>) => neo4jApi.createNode(label, properties),
  
  /**
   * 修改节点
   * @param nodeId 节点ID
   * @param properties 要更新的属性
   * @returns 更新后的节点
   */
  updateNode: (nodeId: string, properties: Record<string, any>) => neo4jApi.updateNode(nodeId, properties),
  
  /**
   * 新增关系
   * @param sourceId 源节点ID
   * @param targetId 目标节点ID
   * @param type 关系类型
   * @param properties 关系属性
   * @returns 创建的关系
   */
  createRelationship: (sourceId: string, targetId: string, type: string, properties: Record<string, any>) => 
    neo4jApi.createRelationship(sourceId, targetId, type, properties),
  
  /**
   * 修改关系
   * @param relationshipId 关系ID
   * @param properties 要更新的属性
   * @param propertiesToRemove 要删除的属性列表
   * @param newType 新的关系类型（可选）
   * @returns 更新后的关系
   */
  updateRelationship: async (relationshipId: string, properties: Record<string, any>, propertiesToRemove?: string[], newType?: string) => {
    // 提取新的关系类型（如果在properties中提供）
    let relationshipType = newType;
    if (properties.type && !relationshipType) {
      relationshipType = properties.type;
      // 从properties中移除type字段，因为它不是属性而是关系类型
      const { type, ...propsWithoutType } = properties;
      properties = propsWithoutType;
    }
    
    // 如果需要更新关系类型
    if (relationshipType) {
      // 在Neo4j中，关系类型不能直接修改，需要创建新关系并删除旧关系
      const getRelationshipInfoQuery = `
        MATCH (s)-[r]->(t) 
        WHERE id(r) = ${parseInt(relationshipId)}
        RETURN s, t, r
      `;
      
      try {
        // 获取原关系的源节点、目标节点和属性
        const result = await neo4jApi.executeCypher(getRelationshipInfoQuery);
        if (!result || result.length === 0) {
          throw new Error(`未找到ID为${relationshipId}的关系`);
        }
        
        const record = result[0];
        const sourceId = record.s.identity.low || record.s.identity;
        const targetId = record.t.identity.low || record.t.identity;
        
        // 合并原关系属性和新属性
        const originalProps = record.r.properties || {};
        const updatedProps = { ...originalProps, ...properties };
        
        // 如果有要删除的属性，从更新的属性中移除
        if (propertiesToRemove && propertiesToRemove.length > 0) {
          propertiesToRemove.forEach(key => {
            delete updatedProps[key];
          });
        }
        
        // 过滤掉不支持的复杂类型值
        const safeProperties = Object.entries(updatedProps).reduce((acc, [key, value]) => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
            try {
              acc[key] = JSON.stringify(value);
            } catch (e) {
              console.warn(`无法序列化属性 ${key}，将被跳过:`, value);
            }
          } else {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>);
        
        // 创建新关系并删除旧关系的Cypher查询
        const createAndDeleteQuery = `
          MATCH (s)-[r]->(t) 
          WHERE id(r) = ${parseInt(relationshipId)}
          CREATE (s)-[r2:${relationshipType}]->(t)
          SET r2 += $properties
          DELETE r
          RETURN r2
        `;
        
        console.log('执行更新关系类型的Cypher:', createAndDeleteQuery);
        console.log('新关系属性:', safeProperties);
        
        // 执行Cypher查询
        return neo4jApi.executeCypher(createAndDeleteQuery, { properties: safeProperties });
      } catch (error) {
        console.error('更新关系类型失败:', error);
        throw error;
      }
    } else {
      // 仅更新属性的情况（原有逻辑）
      // 构建Cypher查询
      let cypherQuery = `MATCH ()-[r]->() WHERE id(r) = ${parseInt(relationshipId)}`
      
      // 如果有要删除的属性
      if (propertiesToRemove && propertiesToRemove.length > 0) {
        const removePropsStr = propertiesToRemove
          .map(key => {
            // 对于以数字开头或包含特殊字符的属性键，用反引号包围
            const safeKey = /^[a-zA-Z_]/.test(key) && !/\s/.test(key) ? key : `\`${key}\``;
            return `r.${safeKey}`;
          })
          .join(', ')
        cypherQuery += `\nREMOVE ${removePropsStr}`
      }
      
      // 更新属性
      if (Object.keys(properties).length > 0) {
        const propsStr = Object.entries(properties)
          .map(([key]) => {
            // 对于以数字开头或包含特殊字符的属性键，用反引号包围
            const safeKey = /^[a-zA-Z_]/.test(key) && !/\s/.test(key) ? key : `\`${key}\``;
            return `${safeKey}: $${key}`;
          })
          .join(', ')
        cypherQuery += `
SET r += {${propsStr}}`
      }
      
      cypherQuery += '\nRETURN r'
      
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
      
      console.log('执行更新关系属性的Cypher:', cypherQuery)
      console.log('过滤后的安全属性:', safeProperties)
      return neo4jApi.executeCypher(cypherQuery, safeProperties)
    }
  },
  
  /**
   * 修改节点属性和标签
   * @param nodeId 节点ID
   * @param properties 要更新的属性
   * @param labels 要设置的新标签（可选）
   * @param removeLabels 要移除的旧标签（可选）
   * @param propertiesToRemove 要删除的属性列表（可选）
   * @returns 更新后的节点
   */
  updateNodeWithLabels: async (nodeId: string, properties: Record<string, any>, labels?: string[], removeLabels?: string[], propertiesToRemove?: string[]) => {
    // 构建Cypher查询
    let cypherQuery = `MATCH (n) WHERE id(n) = ${parseInt(nodeId)}`
    console.log('执行更新节点属性和标签的removeLabels:', removeLabels)
    // 如果有要移除的标签
    if (removeLabels && removeLabels.length > 0) {
      cypherQuery += `\nREMOVE ${removeLabels.map(label => `n:${label}`).join(', ')}`
    }
    console.log('执行更新节点属性和标签的labels:', labels)
    // 如果有要添加的标签
    if (labels && labels.length > 0) {
      cypherQuery += `\nSET ${labels.map(label => `n:${label}`).join(', ')}`
    }
    
    // 如果有要删除的属性
    if (propertiesToRemove && propertiesToRemove.length > 0) {
      const removePropsStr = propertiesToRemove
        .map(key => {
          // 对于以数字开头或包含特殊字符的属性键，用反引号包围
          const safeKey = /^[a-zA-Z_]/.test(key) && !/\s/.test(key) ? key : `\`${key}\``;
          return `n.${safeKey}`;
        })
        .join(', ')
      cypherQuery += `\nREMOVE ${removePropsStr}`
    }
    
    // 更新属性
    if (Object.keys(properties).length > 0) {
      const propsStr = Object.entries(properties)
        .map(([key]) => {
          // 对于以数字开头或包含特殊字符的属性键，用反引号包围
          const safeKey = /^[a-zA-Z_]/.test(key) && !/\s/.test(key) ? key : `\`${key}\``;
          return `${safeKey}: $${key}`;
        })
        .join(', ')
      cypherQuery += `
SET n += {${propsStr}}`
    }
    
    cypherQuery += '\nRETURN n'
    
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
    
    console.log('执行更新节点属性和标签的Cypher:', cypherQuery)
    console.log('过滤后的安全属性:', safeProperties)
    return neo4jApi.executeCypher(cypherQuery, safeProperties)
  },
  
  /**
   * 执行Neo4j Cypher查询
   * @param query Cypher查询语句
   * @param params 查询参数
   * @returns 查询结果
   */
  executeNeo4jCypher: (query: string, params?: Record<string, any>) => neo4jApi.executeCypher(query, params),
  
  /**
   * 查询所有节点和关系
   * @returns 包含节点和关系的对象
   */
  queryAllGraphElements: async () => {
    const nodeQuery = 'MATCH (n) RETURN n'
    console.log('执行查询所有节点的Cypher:', nodeQuery)
    
    // 查询所有节点
    const nodes = await neo4jApi.queryNodes(nodeQuery)
    console.log('查询到的所有节点数量:', nodes.length)
    
    // 查询所有关系
    const relationshipQuery = 'MATCH ()-[r]->() RETURN r'
    console.log('执行查询所有关系的Cypher:', relationshipQuery)
    const relationships = await neo4jApi.queryRelationships(relationshipQuery)
    console.log('查询到的所有关系数量:', relationships.length)
    
    return { nodes, relationships }
  },
  
  /**
   * 查询特定节点类型及其相关的节点和关系
   * @param nodeType 节点类型（标签）
   * @returns 包含节点和关系的对象
   */
  queryNodesByTypeWithRelatedElements: async (nodeType: string) => {
    // MATCH (n:BizInfo) OPTIONAL MATCH (n)-[r]-(m) RETURN n, r, m
    const nodeQuery = `MATCH (n:${nodeType}) OPTIONAL MATCH (n)-[r]-(m) RETURN n, r, m`
    console.log('执行查询特定节点类型的Cypher:', nodeQuery)
    
    // 查询特定节点类型及其相关节点
    const nodes = await neo4jApi.queryNodes(nodeQuery)
    
    // 查询特定节点相关的所有关系
    const relationshipsQuery = `MATCH (n:${nodeType})-[r]-() RETURN r`
    console.log('执行查询特定节点关系的Cypher:', relationshipsQuery)
    const relationships = await neo4jApi.queryRelationships(relationshipsQuery)
    
    return { nodes, relationships }
  }
}