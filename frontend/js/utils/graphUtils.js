/**
 * 图数据工具类
 * 提供ID生成、验证等辅助功能
 */
class GraphUtils {
  /**
   * 生成唯一ID
   * @param prefix ID前缀
   * @returns 唯一ID字符串
   */
  static generateId(prefix = 'id') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${prefix}_${timestamp}_${random}`;
  }
  
  /**
   * 生成节点ID
   * @returns 节点ID
   */
  static generateNodeId() {
    return this.generateId('node');
  }
  
  /**
   * 生成关系ID
   * @returns 关系ID
   */
  static generateRelationshipId() {
    return this.generateId('rel');
  }
  
  /**
   * 验证节点对象
   * @param node 节点对象
   * @returns 是否有效
   */
  static isValidNode(node) {
    if (!node || typeof node !== 'object') return false;
    if (!node.id || typeof node.id !== 'string') return false;
    if (!Array.isArray(node.labels)) return false;
    if (!node.properties || typeof node.properties !== 'object') return false;
    return true;
  }
  
  /**
   * 验证关系对象
   * @param relationship 关系对象
   * @returns 是否有效
   */
  static isValidRelationship(relationship) {
    if (!relationship || typeof relationship !== 'object') return false;
    if (!relationship.id || typeof relationship.id !== 'string') return false;
    if (!relationship.type || typeof relationship.type !== 'string') return false;
    if (!relationship.startNodeId || typeof relationship.startNodeId !== 'string') return false;
    if (!relationship.endNodeId || typeof relationship.endNodeId !== 'string') return false;
    if (!relationship.properties || typeof relationship.properties !== 'object') return false;
    return true;
  }
  
  /**
   * 深拷贝节点
   * @param node 节点对象
   * @returns 拷贝后的节点对象
   */
  static cloneNode(node) {
    return {
      id: node.id,
      labels: [...node.labels],
      properties: { ...node.properties }
    };
  }
  
  /**
   * 深拷贝关系
   * @param relationship 关系对象
   * @returns 拷贝后的关系对象
   */
  static cloneRelationship(relationship) {
    return {
      id: relationship.id,
      type: relationship.type,
      startNodeId: relationship.startNodeId,
      endNodeId: relationship.endNodeId,
      properties: { ...relationship.properties }
    };
  }
  
  /**
   * 生成默认节点对象
   * @param labels 标签数组
   * @param properties 属性对象
   * @returns 节点对象
   */
  static createDefaultNode(labels = [], properties = {}) {
    return {
      id: this.generateNodeId(),
      labels: [...labels],
      properties: { ...properties }
    };
  }
  
  /**
   * 生成默认关系对象
   * @param type 关系类型
   * @param startNodeId 起始节点ID
   * @param endNodeId 目标节点ID
   * @param properties 属性对象
   * @returns 关系对象
   */
  static createDefaultRelationship(type, startNodeId, endNodeId, properties = {}) {
    return {
      id: this.generateRelationshipId(),
      type,
      startNodeId,
      endNodeId,
      properties: { ...properties }
    };
  }
  
  /**
   * 格式化属性值为字符串
   * @param value 属性值
   * @returns 格式化后的字符串
   */
  static formatPropertyValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
  
  /**
   * 解析字符串为属性值
   * @param str 字符串值
   * @returns 解析后的值
   */
  static parsePropertyValue(str) {
    // 尝试解析为JSON
    if (str && (str.startsWith('{') || str.startsWith('[') || 
        str.toLowerCase() === 'true' || str.toLowerCase() === 'false' || 
        str.toLowerCase() === 'null' || /^\d+$/.test(str) || /^\d+\.\d+$/.test(str))) {
      try {
        return JSON.parse(str);
      } catch (e) {
        // 如果解析失败，返回原始字符串
      }
    }
    return str;
  }
  
  /**
   * 获取节点的主标签（第一个标签）
   * @param node 节点对象
   * @returns 主标签或默认标签
   */
  static getPrimaryLabel(node) {
    return node.labels && node.labels.length > 0 ? node.labels[0] : 'Node';
  }
  
  /**
   * 生成节点的显示名称
   * @param node 节点对象
   * @param nameProperty 名称属性名
   * @returns 显示名称
   */
  static getNodeDisplayName(node, nameProperty = 'name') {
    if (node.properties && node.properties[nameProperty]) {
      return node.properties[nameProperty];
    }
    return this.getPrimaryLabel(node) + ': ' + node.id;
  }
  
  /**
   * 比较两个属性对象是否相等
   * @param props1 属性对象1
   * @param props2 属性对象2
   * @returns 是否相等
   */
  static arePropertiesEqual(props1, props2) {
    if (props1 === props2) return true;
    if (!props1 || !props2) return false;
    
    const keys1 = Object.keys(props1);
    const keys2 = Object.keys(props2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => {
      const val1 = props1[key];
      const val2 = props2[key];
      
      if (typeof val1 === 'object' && typeof val2 === 'object') {
        return JSON.stringify(val1) === JSON.stringify(val2);
      }
      
      return val1 === val2;
    });
  }
}

// 暴露到全局作用域
window.GraphUtils = GraphUtils;