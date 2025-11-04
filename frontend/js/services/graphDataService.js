/**
 * 图数据服务类
 * 负责管理节点和关系数据，并自动维护索引以提高查询性能
 * 支持双视图功能：层级树视图和同父关系网视图
 */
class GraphDataService {
  constructor(options = {}) {
    this.nodes = new Map();
    this.relationships = new Map();
    this.index = {
      nodeToRelationships: {},
      relationshipsByType: {}
    };
    
    // 双视图配置选项
    this.options = {
      // 层级树创建时是否自动连同父兄弟
      autoConnectInTreeCreation: true,
      // 移动到新父时是否自动连接
      autoConnectOnMove: false,
      ...options
    };
  }
  
  /**
   * 添加节点
   * @param node 节点对象
   */
  addNode(node) {
    if (this.nodes.has(node.id)) {
      console.warn(`节点 ${node.id} 已存在，将被覆盖`);
    }
    this.nodes.set(node.id, node);
    // 初始化节点的关系列表（如果不存在）
    if (!this.index.nodeToRelationships[node.id]) {
      this.index.nodeToRelationships[node.id] = [];
    }
  }
  
  /**
   * 批量添加节点
   * @param nodes 节点数组
   */
  addNodes(nodes) {
    nodes.forEach(node => this.addNode(node));
  }
  
  /**
   * 获取节点
   * @param nodeId 节点ID
   * @returns 节点对象或undefined
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }
  
  getNodeById(nodeId) {
    return this.nodes.get(nodeId);
  }
  
  /**
   * 删除节点及其关联的所有关系
   * @param nodeId 节点ID
   * @returns 是否成功删除
   */
  deleteNode(nodeId) {
    if (!this.nodes.has(nodeId)) {
      return false;
    }
    
    // 先删除与该节点相关的所有关系
    const relationshipIds = this.index.nodeToRelationships[nodeId] || [];
    relationshipIds.forEach(relId => this.deleteRelationship(relId));
    
    // 删除节点
    this.nodes.delete(nodeId);
    
    // 删除节点的索引条目
    delete this.index.nodeToRelationships[nodeId];
    
    return true;
  }
  
  /**
   * 获取所有节点
   * @returns 节点数组
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }
  
  /**
   * 添加关系
   * @param relationship 关系对象
   */
  addRelationship(relationship) {
    // 检查起始和结束节点是否存在
    if (!this.nodes.has(relationship.startNodeId)) {
      throw new Error(`起始节点 ${relationship.startNodeId} 不存在`);
    }
    if (!this.nodes.has(relationship.endNodeId)) {
      throw new Error(`目标节点 ${relationship.endNodeId} 不存在`);
    }
    
    // 如果提供了ID则使用，否则生成一个
    if (!relationship.id) {
      relationship.id = GraphUtils.generateRelationshipId();
    }
    
    if (this.relationships.has(relationship.id)) {
      console.warn(`关系 ${relationship.id} 已存在，将被覆盖`);
    }
    
    // 保存关系
    this.relationships.set(relationship.id, relationship);
    
    // 更新索引
    this.addRelationshipToIndex(relationship);
    
    return relationship;
  }
  
  /**
   * 批量添加关系
   * @param relationships 关系数组
   */
  addRelationships(relationships) {
    relationships.forEach(rel => this.addRelationship(rel));
  }
  
  /**
   * 将关系添加到索引中
   * @param relationship 关系对象
   */
  addRelationshipToIndex(relationship) {
    const { id, type, startNodeId, endNodeId } = relationship;
    
    // 更新节点到关系的映射
    if (!this.index.nodeToRelationships[startNodeId]) {
      this.index.nodeToRelationships[startNodeId] = [];
    }
    if (!this.index.nodeToRelationships[startNodeId].includes(id)) {
      this.index.nodeToRelationships[startNodeId].push(id);
    }
    
    if (!this.index.nodeToRelationships[endNodeId]) {
      this.index.nodeToRelationships[endNodeId] = [];
    }
    if (!this.index.nodeToRelationships[endNodeId].includes(id)) {
      this.index.nodeToRelationships[endNodeId].push(id);
    }
    
    // 更新关系类型到关系的映射
    if (!this.index.relationshipsByType[type]) {
      this.index.relationshipsByType[type] = [];
    }
    if (!this.index.relationshipsByType[type].includes(id)) {
      this.index.relationshipsByType[type].push(id);
    }
  }
  
  /**
   * 获取关系
   * @param relId 关系ID
   * @returns 关系对象或undefined
   */
  getRelationship(relId) {
    return this.relationships.get(relId);
  }
  
  getRelationshipById(relId) {
    return this.relationships.get(relId);
  }
  
  /**
   * 删除关系
   * @param relId 关系ID
   * @returns 是否成功删除
   */
  deleteRelationship(relId) {
    const relationship = this.relationships.get(relId);
    if (!relationship) {
      return false;
    }
    
    const { type, startNodeId, endNodeId } = relationship;
    
    // 从索引中移除
    this.removeRelationshipFromIndex(relId, type, startNodeId, endNodeId);
    
    // 删除关系
    this.relationships.delete(relId);
    
    return true;
  }
  
  /**
   * 从索引中移除关系
   * @param relId 关系ID
   * @param type 关系类型
   * @param startNodeId 起始节点ID
   * @param endNodeId 目标节点ID
   */
  removeRelationshipFromIndex(relId, type, startNodeId, endNodeId) {
    // 从节点到关系的映射中移除
    if (this.index.nodeToRelationships[startNodeId]) {
      this.index.nodeToRelationships[startNodeId] = 
        this.index.nodeToRelationships[startNodeId].filter(id => id !== relId);
    }
    
    if (this.index.nodeToRelationships[endNodeId]) {
      this.index.nodeToRelationships[endNodeId] = 
        this.index.nodeToRelationships[endNodeId].filter(id => id !== relId);
    }
    
    // 从关系类型到关系的映射中移除
    if (this.index.relationshipsByType[type]) {
      this.index.relationshipsByType[type] = 
        this.index.relationshipsByType[type].filter(id => id !== relId);
      
      // 如果该类型的关系为空，则删除该类型
      if (this.index.relationshipsByType[type].length === 0) {
        delete this.index.relationshipsByType[type];
      }
    }
  }
  
  /**
   * 获取所有关系
   * @returns 关系数组
   */
  getAllRelationships() {
    return Array.from(this.relationships.values());
  }
  
  /**
   * 根据节点ID获取其所有关系ID
   * @param nodeId 节点ID
   * @returns 关系ID数组
   */
  getRelationshipsByNodeId(nodeId) {
    return this.index.nodeToRelationships[nodeId] || [];
  }
  
  /**
   * 根据关系类型获取关系ID列表
   * @param type 关系类型
   * @returns 关系ID数组
   */
  getRelationshipsByType(type) {
    return this.index.relationshipsByType[type] || [];
  }
  
  /**
   * 获取所有关系类型
   * @returns 关系类型数组
   */
  getAllRelationshipTypes() {
    return Object.keys(this.index.relationshipsByType);
  }
  
  /**
   * 根据属性值查找节点
   * @param propertyName 属性名
   * @param propertyValue 属性值
   * @returns 节点数组
   */
  findNodesByProperty(propertyName, propertyValue) {
    return this.getAllNodes().filter(node => 
      node.properties[propertyName] === propertyValue
    );
  }
  
  /**
   * 根据标签查找节点
   * @param label 标签名
   * @returns 节点数组
   */
  findNodesByLabel(label) {
    return this.getAllNodes().filter(node => 
      node.labels.includes(label)
    );
  }
  
  /**
   * 根据属性值查找关系
   * @param propertyName 属性名
   * @param propertyValue 属性值
   * @returns 关系数组
   */
  findRelationshipsByProperty(propertyName, propertyValue) {
    return this.getAllRelationships().filter(rel => 
      rel.properties[propertyName] === propertyValue
    );
  }
  
  /**
   * 按属性对关系进行排序
   * @param relationshipIds 关系ID数组
   * @param propertyName 属性名
   * @param ascending 是否升序
   * @returns 排序后的关系数组
   */
  sortRelationshipsByProperty(relationshipIds, propertyName, ascending = true) {
    return relationshipIds
      .map(id => this.getRelationship(id))
      .filter(rel => rel) // 过滤掉不存在的关系
      .sort((a, b) => {
        const valA = a.properties[propertyName];
        const valB = b.properties[propertyName];
        
        if (valA === undefined || valA === null) return ascending ? 1 : -1;
        if (valB === undefined || valB === null) return ascending ? -1 : 1;
        
        if (ascending) {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }
  
  /**
   * 获取节点的统计信息
   * @returns 统计信息对象
   */
  getStats() {
    const nodeCount = this.nodes.size;
    const relationshipCount = this.relationships.size;
    const relationshipTypes = Object.keys(this.index.relationshipsByType);
    
    return {
      nodeCount,
      relationshipCount,
      relationshipTypes,
      avgRelationshipsPerNode: nodeCount > 0 ? 
        (relationshipCount * 2) / nodeCount : 0 // 每条关系连接两个节点
    };
  }
  
  /**
   * 清空所有数据
   */
  clear() {
    this.nodes.clear();
    this.relationships.clear();
    this.index = {
      nodeToRelationships: {},
      relationshipsByType: {}
    };
  }
  
  /**
   * 在指定上下文中创建节点
   * @param {Object} nodeData - 节点数据
   * @param {string|null} parentId - 父节点ID
   * @param {string} context - 创建上下文 'tree' 或 'network'
   * @returns {Object} 创建的节点
   */
  createNodeWithContext(nodeData, parentId, context = 'network') {
    // 生成节点ID（如果没有提供）
    if (!nodeData.id) {
      nodeData.id = GraphUtils.generateNodeId();
    }
    
    // 创建节点
    const node = {
      id: nodeData.id,
      labels: nodeData.labels || [],
      properties: nodeData.properties || {}
    };
    
    this.addNode(node);
    
    // 如果有父节点，创建CHILD_OF关系
    if (parentId && this.nodes.has(parentId)) {
      const childOfRel = GraphUtils.createDefaultRelationship(
        'CHILD_OF',
        node.id,
        parentId,
        {}
      );
      this.addRelationship(childOfRel);
      
      // 在层级树上下文中，自动与所有兄弟节点建立RELATES_TO关系
      if (context === 'tree' && this.options.autoConnectInTreeCreation) {
        this._connectToSiblings(node.id, parentId);
      }
    }
    
    return node;
  }
  
  /**
   * 移动节点到新的父节点
   * @param {string} nodeId - 要移动的节点ID
   * @param {string|null} newParentId - 新的父节点ID
   * @param {boolean} autoConnect - 是否自动连接新兄弟（默认使用配置）
   * @returns {boolean} 是否移动成功
   */
  moveNode(nodeId, newParentId, autoConnect) {
    // 验证节点存在
    if (!this.nodes.has(nodeId)) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }
    
    // 验证新父节点存在（如果不为null）
    if (newParentId && !this.nodes.has(newParentId)) {
      throw new Error(`新父节点 ${newParentId} 不存在`);
    }
    
    // 获取当前的CHILD_OF关系
    const currentChildOfRel = this._findChildOfRelationship(nodeId);
    const oldParentId = currentChildOfRel ? currentChildOfRel.endNodeId : null;
    
    // 如果新旧父节点相同，无需移动
    if (oldParentId === newParentId) {
      return true;
    }
    
    // 删除旧的CHILD_OF关系
    if (currentChildOfRel) {
      this.deleteRelationship(currentChildOfRel.id);
    }
    
    // 清理与旧兄弟节点的所有RELATES_TO关系
    if (oldParentId) {
      this._cleanupRelatesTo(nodeId, oldParentId);
    }
    
    // 创建新的CHILD_OF关系
    if (newParentId) {
      const newChildOfRel = GraphUtils.createDefaultRelationship(
        'CHILD_OF',
        nodeId,
        newParentId,
        {}
      );
      this.addRelationship(newChildOfRel);
      
      // 决定是否自动连接新兄弟
      const shouldAutoConnect = autoConnect !== undefined ? 
        autoConnect : this.options.autoConnectOnMove;
      
      if (shouldAutoConnect) {
        this._connectToSiblings(nodeId, newParentId);
      }
    }
    
    // 验证关系合法性
    this._validateRelationships();
    
    return true;
  }
  
  /**
   * 获取层级树
   * @param {string|null} rootId - 根节点ID，null表示获取完整树
   * @returns {Object} 层级树结构
   */
  getHierarchyTree(rootId = null) {
    const hierarchy = {};
    
    if (rootId) {
      // 获取指定根节点的子树
      hierarchy[rootId] = this._buildTreeNode(rootId);
    } else {
      // 获取完整层级树（所有根节点）
      const rootNodes = this._findRootNodes();
      rootNodes.forEach(nodeId => {
        hierarchy[nodeId] = this._buildTreeNode(nodeId);
      });
    }
    
    return hierarchy;
  }
  
  /**
   * 获取关系网数据
   * @param {string} nodeId - 参考节点ID
   * @returns {Object} 关系网数据
   */
  getSiblingNetwork(nodeId) {
    // 获取节点的父节点ID
    const childOfRel = this._findChildOfRelationship(nodeId);
    const parentId = childOfRel ? childOfRel.endNodeId : null;
    
    // 获取所有兄弟节点（包括自己）
    const siblingNodes = parentId ? 
      this._findChildNodes(parentId) : 
      this._findRootNodes();
    
    // 获取兄弟节点之间的所有RELATES_TO关系
    const networkRelationships = [];
    const siblingSet = new Set(siblingNodes);
    
    for (const rel of this.getAllRelationships()) {
      if (rel.type === 'RELATES_TO' && 
          siblingSet.has(rel.startNodeId) && 
          siblingSet.has(rel.endNodeId)) {
        networkRelationships.push(rel);
      }
    }
    
    // 转换节点ID为节点对象
    const nodes = siblingNodes.map(id => this.getNode(id));
    
    return {
      nodes,
      relationships: networkRelationships,
      parentId
    };
  }
  
  /**
   * 添加RELATES_TO关系
   * @param {string} nodeId1 - 节点1 ID
   * @param {string} nodeId2 - 节点2 ID
   * @param {Object} properties - 关系属性
   * @returns {Object} 创建的关系
   */
  addRelatesTo(nodeId1, nodeId2, properties = {}) {
    // 验证两个节点存在
    if (!this.nodes.has(nodeId1) || !this.nodes.has(nodeId2)) {
      throw new Error('节点不存在');
    }
    
    // 验证两个节点是否有相同的父节点
    const parent1 = this._findParentNode(nodeId1);
    const parent2 = this._findParentNode(nodeId2);
    
    if (parent1 !== parent2) {
      throw new Error('只能在同父节点的兄弟节点之间创建RELATES_TO关系');
    }
    
    // 创建双向RELATES_TO关系
    const rel1 = GraphUtils.createDefaultRelationship(
      'RELATES_TO',
      nodeId1,
      nodeId2,
      { ...properties, direction: 'forward' }
    );
    
    const rel2 = GraphUtils.createDefaultRelationship(
      'RELATES_TO',
      nodeId2,
      nodeId1,
      { ...properties, direction: 'backward' }
    );
    
    this.addRelationship(rel1);
    this.addRelationship(rel2);
    
    return [rel1, rel2];
  }
  
  /**
   * 私有方法：查找节点的CHILD_OF关系
   */
  _findChildOfRelationship(nodeId) {
    const relIds = this.getRelationshipsByNodeId(nodeId) || [];
    for (const relId of relIds) {
      const rel = this.getRelationship(relId);
      if (rel && rel.type === 'CHILD_OF' && rel.startNodeId === nodeId) {
        return rel;
      }
    }
    return null;
  }
  
  /**
   * 私有方法：查找节点的父节点
   */
  _findParentNode(nodeId) {
    const childOfRel = this._findChildOfRelationship(nodeId);
    return childOfRel ? childOfRel.endNodeId : null;
  }
  
  /**
   * 私有方法：查找节点的所有子节点
   */
  _findChildNodes(parentId) {
    const children = [];
    const childOfRels = this.getRelationshipsByType('CHILD_OF') || [];
    
    for (const relId of childOfRels) {
      const rel = this.getRelationship(relId);
      if (rel && rel.endNodeId === parentId) {
        children.push(rel.startNodeId);
      }
    }
    
    return children;
  }
  
  /**
   * 私有方法：查找所有根节点
   */
  _findRootNodes() {
    const rootNodes = [];
    
    for (const node of this.getAllNodes()) {
      const childOfRel = this._findChildOfRelationship(node.id);
      if (!childOfRel) {
        rootNodes.push(node.id);
      }
    }
    
    return rootNodes;
  }
  
  /**
   * 私有方法：构建树节点
   */
  _buildTreeNode(nodeId) {
    const node = this.getNode(nodeId);
    const children = this._findChildNodes(nodeId).map(childId => 
      this._buildTreeNode(childId)
    );
    
    return {
      node,
      children
    };
  }
  
  /**
   * 私有方法：连接到所有兄弟节点
   */
  _connectToSiblings(nodeId, parentId) {
    const siblings = this._findChildNodes(parentId);
    
    for (const siblingId of siblings) {
      if (siblingId !== nodeId) {
        try {
          this.addRelatesTo(nodeId, siblingId, { auto: true });
        } catch (e) {
          // 如果已经存在关系，忽略错误
        }
      }
    }
  }
  
  /**
   * 私有方法：清理与兄弟节点的RELATES_TO关系
   */
  _cleanupRelatesTo(nodeId, parentId) {
    const relIds = this.getRelationshipsByNodeId(nodeId) || [];
    
    for (const relId of relIds) {
      const rel = this.getRelationship(relId);
      if (rel && rel.type === 'RELATES_TO') {
        // 检查另一端节点是否是原兄弟节点
        const otherNodeId = rel.startNodeId === nodeId ? rel.endNodeId : rel.startNodeId;
        const otherParentId = this._findParentNode(otherNodeId);
        
        if (otherParentId === parentId) {
          this.deleteRelationship(relId);
        }
      }
    }
  }
  
  /**
   * 私有方法：验证关系合法性
   */
  _validateRelationships() {
    // 找出所有非法的RELATES_TO关系
    const invalidRels = [];
    
    for (const rel of this.getAllRelationships()) {
      if (rel.type === 'RELATES_TO') {
        const parent1 = this._findParentNode(rel.startNodeId);
        const parent2 = this._findParentNode(rel.endNodeId);
        
        if (parent1 !== parent2) {
          invalidRels.push(rel.id);
        }
      }
    }
    
    // 删除所有非法关系
    invalidRels.forEach(relId => this.deleteRelationship(relId));
    
    // 确保每个节点最多只有一个CHILD_OF关系
    this._ensureSingleChildOf();
  }
  
  /**
   * 私有方法：确保每个节点最多只有一个CHILD_OF关系
   */
  _ensureSingleChildOf() {
    const nodeToChildOfRels = new Map();
    
    // 收集所有CHILD_OF关系
    const childOfRels = this.getRelationshipsByType('CHILD_OF') || [];
    for (const relId of childOfRels) {
      const rel = this.getRelationship(relId);
      if (rel) {
        const startNodeId = rel.startNodeId;
        
        if (!nodeToChildOfRels.has(startNodeId)) {
          nodeToChildOfRels.set(startNodeId, []);
        }
        nodeToChildOfRels.get(startNodeId).push(rel);
      }
    }
    
    // 对于有多个CHILD_OF关系的节点，只保留第一个
    nodeToChildOfRels.forEach((rels, nodeId) => {
      if (rels.length > 1) {
        // 删除多余的关系，只保留第一个
        rels.slice(1).forEach(rel => {
          this.deleteRelationship(rel.id);
        });
      }
    });
  }
}

// 暴露到全局作用域
window.GraphDataService = GraphDataService;