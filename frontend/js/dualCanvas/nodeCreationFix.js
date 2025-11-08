// 节点创建和渲染修复模块
// 解决GraphService.addNode调用后的节点渲染问题

/**
 * 修复节点创建和渲染机制
 */
class NodeCreationFix {
  constructor() {
    // 存储是否已应用修复
    this.fixesApplied = false;
  }

  /**
   * 应用所有修复
   */
  applyFixes() {
    if (this.fixesApplied) {
      console.log('节点创建修复已应用，跳过再次应用');
      return;
    }

    console.log('开始应用节点创建和渲染修复...');
    
    // 1. 修复GraphDataService.addNode方法（如果存在问题）
    this.fixAddNodeMethod();
    
    // 2. 确保事件总线和数据变更通知正常工作
    this.fixEventBusIntegration();
    
    // 3. 添加渲染辅助函数
    this.addRenderHelpers();
    
    // 4. 修复节点创建流程
    this.fixNodeCreationFlow();
    
    this.fixesApplied = true;
    console.log('节点创建和渲染修复应用完成');
  }

  /**
   * 修复addNode方法，确保它正确返回节点ID和触发必要的事件
   */
  fixAddNodeMethod() {
    if (window.graphService && window.graphService.addNode) {
      const originalAddNode = window.graphService.addNode;
      
      window.graphService.addNode = function(node) {
        try {
          console.log('修复后的addNode调用:', node);
          
          // 确保节点数据结构完整
          if (!node) {
            throw new Error('节点数据不能为空');
          }
          
          // 确保节点有必要的属性
          if (!node.id) {
            if (window.GraphUtils && window.GraphUtils.generateNodeId) {
              node.id = window.GraphUtils.generateNodeId();
            } else {
              node.id = 'node_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            }
            console.log('自动生成节点ID:', node.id);
          }
          
          if (!node.labels) {
            node.labels = ['Entity'];
          }
          
          if (!node.properties) {
            node.properties = {};
          }
          
          // 确保坐标信息（对于可视化）
          if (typeof node.x === 'undefined') {
            node.x = 200 + Math.random() * 400;
          }
          
          if (typeof node.y === 'undefined') {
            node.y = 200 + Math.random() * 400;
          }
          
          // 调用原始方法
          const result = originalAddNode.call(this, node);
          
          // 确保返回节点ID
          const nodeId = result && result.id ? result.id : (typeof result === 'string' ? result : node.id);
          console.log('节点添加成功，ID:', nodeId);
          
          // 显式触发dataChanged事件（作为额外保障）
          if (this._emit && typeof this._emit === 'function') {
            this._emit('dataChanged');
          }
          
          // 如果有事件总线，再次触发（确保所有监听器都能接收到）
          if (window.eventBus && window.eventBus.emit) {
            window.eventBus.emit('nodeCreated', { id: nodeId, node: node });
            window.eventBus.emit('dataChanged');
          }
          
          // 立即触发渲染（作为额外保障）
          setTimeout(() => {
            if (window.editor && window.editor.render) {
              console.log('节点添加后立即触发渲染');
              window.editor.render();
            }
          }, 0);
          
          return nodeId;
        } catch (error) {
          console.error('修复后的addNode方法出错:', error);
          
          // 通知用户
          if (window.updateStatus) {
            window.updateStatus('错误: 节点创建失败 - ' + error.message);
          }
          
          throw error;
        }
      };
      
      console.log('GraphService.addNode方法修复完成');
    } else {
      console.warn('无法修复addNode方法: graphService未定义或没有addNode方法');
    }
  }

  /**
   * 修复事件总线集成，确保数据变更能正确触发渲染
   */
  fixEventBusIntegration() {
    // 检查事件总线是否存在，如果不存在则尝试初始化
    if (!window.eventBus) {
      console.warn('统一事件总线未定义，尝试初始化');
      
      // 尝试导入公共事件总线模块
      try {
        if (typeof require === 'function') {
          const EventBusModule = require('../common/EventBus');
          window.eventBus = EventBusModule.getInstance();
        } else if (window.EventBus && window.EventBus.getInstance) {
          window.eventBus = window.EventBus.getInstance();
        } else {
          console.error('无法初始化事件总线，缺少必要的模块加载机制');
        }
      } catch (e) {
        console.error('初始化事件总线失败:', e);
      }
    }

    // 添加关键事件监听器
    if (window.eventBus && window.editor && window.editor.render) {
      // 确保只添加一次
      if (!window._hasRenderListener) {
        window.eventBus.on('dataChanged', () => {
          console.log('dataChanged事件触发，准备渲染');
          // 使用防抖避免频繁渲染
          if (window._renderTimeout) {
            clearTimeout(window._renderTimeout);
          }
          
          window._renderTimeout = setTimeout(() => {
            try {
              window.editor.render();
              console.log('渲染成功完成');
            } catch (e) {
              console.error('渲染失败:', e);
            }
          }, 50); // 50ms延迟，避免频繁渲染
        });
        
        window.eventBus.on('nodeAdded', (nodeId) => {
          console.log('nodeAdded事件触发，节点ID:', nodeId);
          // 确保节点添加后能立即渲染
          setTimeout(() => {
            if (window.editor && window.editor.render) {
              window.editor.render();
            }
          }, 100);
        });
        
        window._hasRenderListener = true;
        console.log('事件监听器添加完成');
      }
    }
  }

  /**
   * 添加渲染辅助函数
   */
  addRenderHelpers() {
    // 添加强制渲染函数
    window.forceRender = function() {
      console.log('强制渲染被调用');
      if (window.editor && window.editor.render) {
        try {
          window.editor.render();
          return true;
        } catch (e) {
          console.error('强制渲染失败:', e);
          return false;
        }
      }
      return false;
    };
    
    // 添加节点存在性检查函数
    window.checkNodeExists = function(nodeId) {
      if (window.graphService) {
        if (window.graphService.getNode) {
          const node = window.graphService.getNode(nodeId);
          return !!node;
        } else if (window.graphService.getAllNodes) {
          const nodes = window.graphService.getAllNodes();
          return nodes && nodes.some(node => node.id === nodeId);
        }
      }
      return false;
    };
    
    // 添加更新状态函数
    if (!window.updateStatus) {
      window.updateStatus = function(message) {
        console.log('状态更新:', message);
        const statusElement = document.getElementById('status-display');
        if (statusElement) {
          statusElement.textContent = message;
          
          // 添加临时状态显示
          statusElement.style.padding = '8px 12px';
          statusElement.style.backgroundColor = '#f0f0f0';
          statusElement.style.borderRadius = '4px';
          statusElement.style.margin = '8px';
          
          // 3秒后清空临时状态
          setTimeout(() => {
            statusElement.textContent = '';
            statusElement.style.padding = '';
            statusElement.style.backgroundColor = '';
            statusElement.style.borderRadius = '';
            statusElement.style.margin = '';
          }, 3000);
        }
      };
    }
  }

  /**
   * 修复节点创建流程
   */
  fixNodeCreationFlow() {
    // 添加简化的节点创建函数作为备选
    window.createNode = function(nodeData = {}) {
      try {
        console.log('简化的节点创建函数被调用');
        
        // 确保GraphService可用
        if (!window.graphService || !window.graphService.addNode) {
          throw new Error('GraphService不可用');
        }
        
        // 构建完整的节点对象
        const node = {
          id: nodeData.id || (window.GraphUtils ? window.GraphUtils.generateNodeId() : 'node_' + Date.now()),
          x: nodeData.x || 200 + Math.random() * 400,
          y: nodeData.y || 200 + Math.random() * 400,
          labels: nodeData.labels || ['Entity'],
          type: nodeData.type || 'default',
          properties: nodeData.properties || {
            name: nodeData.properties?.name || '新建节点',
            createdAt: new Date().toISOString()
          },
          ...nodeData
        };
        
        // 添加节点
        const nodeId = window.graphService.addNode(node);
        console.log('节点创建成功，ID:', nodeId);
        
        // 立即渲染
        setTimeout(() => {
          window.forceRender();
          window.updateStatus(`节点创建成功，ID: ${nodeId}`);
        }, 150);
        
        return nodeId;
      } catch (error) {
        console.error('节点创建失败:', error);
        window.updateStatus('错误: 节点创建失败 - ' + error.message);
        return null;
      }
    };
    
    // 修复点击创建节点的处理
    if (window.editor && typeof window.editor.handleClick === 'function') {
      const originalHandleClick = window.editor.handleClick;
      
      window.editor.handleClick = function(event) {
        const result = originalHandleClick.call(this, event);
        
        // 如果当前是创建模式，确保点击后能正确创建节点
        if (window.modeManager && window.modeManager.getMode() === 'create') {
          // 可以在这里添加额外的逻辑
        }
        
        return result;
      };
    }
  }
}

// 创建并应用修复实例
const nodeCreationFix = new NodeCreationFix();

// 当页面加载完成后应用修复
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      nodeCreationFix.applyFixes();
    }, 1000); // 延迟1秒确保其他组件已加载
  });
} else {
  // 如果页面已经加载完成，立即应用修复
  setTimeout(() => {
    nodeCreationFix.applyFixes();
  }, 500);
}

// 导出对象供其他模块使用
export { nodeCreationFix, NodeCreationFix };
