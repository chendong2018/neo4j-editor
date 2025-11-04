/**
 * 模式管理器类
 * 管理编辑器的三种操作模式：选择模式、节点模式、关系模式
 */
class ModeManager {
  constructor(eventBus) {
    if (!eventBus) throw new Error('事件总线不能为空');
    
    this.eventBus = eventBus;
    this.currentMode = 'select'; // 默认模式
    this.relationshipType = null; // 当前选择的关系类型（CHILD_OF 或 RELATES_TO）
    this.relationshipCreationState = null; // 关系创建状态
  }
  
  /**
   * 获取当前模式
   */
  getCurrentMode() {
    return this.currentMode;
  }
  
  /**
   * 设置操作模式
   */
  setMode(mode) {
    // 验证模式值
    const validModes = ['select', 'node', 'relationship'];
    if (!validModes.includes(mode)) {
      throw new Error(`无效的模式: ${mode}，支持的模式: ${validModes.join(', ')}`);
    }
    
    // 如果模式没有变化，不执行任何操作
    if (this.currentMode === mode) return;
    
    // 更新模式
    this.currentMode = mode;
    
    // 重置关系创建状态
    if (mode !== 'relationship') {
      this.relationshipCreationState = null;
    }
    
    // 发布模式变化事件
    this.eventBus.emit('modeChanged', mode);
    
    console.log(`操作模式已切换为: ${mode}`);
  }
  
  /**
   * 切换到选择模式
   */
  enableSelectMode() {
    this.setMode('select');
  }
  
  /**
   * 切换到节点模式
   */
  enableNodeMode() {
    this.setMode('node');
  }
  
  /**
   * 切换到关系模式
   */
  enableRelationshipMode(relationshipType = 'RELATES_TO') {
    this.setMode('relationship');
    this.setRelationshipType(relationshipType);
  }
  
  /**
   * 设置关系类型
   */
  setRelationshipType(type) {
    const validTypes = ['CHILD_OF', 'RELATES_TO'];
    if (!validTypes.includes(type)) {
      throw new Error(`无效的关系类型: ${type}，支持的类型: ${validTypes.join(', ')}`);
    }
    
    this.relationshipType = type;
    this.eventBus.emit('relationshipTypeChanged', type);
  }
  
  /**
   * 获取当前选择的关系类型
   */
  getRelationshipType() {
    return this.relationshipType;
  }
  
  /**
   * 开始创建关系
   */
  startRelationshipCreation(startNodeId) {
    if (this.currentMode !== 'relationship') {
      throw new Error('当前不是关系模式');
    }
    
    this.relationshipCreationState = {
      startNodeId,
      type: this.relationshipType
    };
    
    this.eventBus.emit('relationshipCreationStarted', startNodeId, this.relationshipType);
  }
  
  /**
   * 完成关系创建
   */
  finishRelationshipCreation(endNodeId) {
    if (!this.relationshipCreationState) {
      throw new Error('没有正在创建的关系');
    }
    
    const { startNodeId, type } = this.relationshipCreationState;
    
    // 重置创建状态
    this.resetRelationshipCreation();
    
    return { startNodeId, endNodeId, type };
  }
  
  /**
   * 重置关系创建状态
   */
  resetRelationshipCreation() {
    this.relationshipCreationState = null;
    this.eventBus.emit('relationshipCreationReset');
  }
  
  /**
   * 获取关系创建状态
   */
  getRelationshipCreationState() {
    return this.relationshipCreationState;
  }
  
  /**
   * 检查是否正在创建关系
   */
  isCreatingRelationship() {
    return this.relationshipCreationState !== null;
  }
}

// 暴露到全局作用域（避免重复声明）
if (!window.ModeManager) {
  window.ModeManager = ModeManager;
}
