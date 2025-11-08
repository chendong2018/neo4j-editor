// 节点拖动和层级关系更新功能实现
function enhanceCanvasInteractions() {
  console.log('[Enhanced Interactions] 加载增强交互功能');
  
  // 等待编辑器初始化完成
  setTimeout(() => {
    if (!window.editor) {
      console.log('[Enhanced Interactions] 编辑器未初始化，稍后重试');
      setTimeout(enhanceCanvasInteractions, 500);
      return;
    }
    
    // 跟踪当前活动模式
    let selectedNodeIds = new Set(); // 支持多选节点
    let draggingNodeId = null;
    let startDragPos = { x: 0, y: 0 };
    let startNodePos = { x: 0, y: 0 };
    let temporaryRelationshipLine = null;
    
    // 获取节点位置
    function getNodePosition(nodeId) {
      const node = document.querySelector(`circle[data-id="${nodeId}"]`);
      if (node) {
        return {
          x: parseFloat(node.getAttribute('cx')),
          y: parseFloat(node.getAttribute('cy'))
        };
      }
      return null;
    }
    
    // 更新节点位置
    function updateNodePosition(nodeId, x, y) {
      const node = document.querySelector(`circle[data-id="${nodeId}"]`);
      if (node) {
        node.setAttribute('cx', x);
        node.setAttribute('cy', y);
        
        // 更新相关的标签位置
        const labels = document.querySelectorAll(`text[data-node-id="${nodeId}"]`);
        labels.forEach(label => {
          label.setAttribute('x', x);
          // 标签Y坐标可以略作调整
          const originalY = parseFloat(label.getAttribute('y'));
          const deltaY = originalY - parseFloat(node.getAttribute('cy'));
          label.setAttribute('y', y + deltaY);
        });
      }
      
      // 更新连接到该节点的所有关系线
      updateNodeEdges(nodeId);
    }
    
    // 更新与节点相关的所有边
    function updateNodeEdges(nodeId) {
      const nodePos = getNodePosition(nodeId);
      if (!nodePos) return;
      
      document.querySelectorAll('line[data-id]').forEach(line => {
        const source = line.getAttribute('data-source');
        const target = line.getAttribute('data-target');
        
        if (source === nodeId) {
          line.setAttribute('x1', nodePos.x);
          line.setAttribute('y1', nodePos.y);
        } else if (target === nodeId) {
          line.setAttribute('x2', nodePos.x);
          line.setAttribute('y2', nodePos.y);
        }
      });
    }
    
    // 清除选择
    function clearSelection() {
      selectedNodeIds.clear();
      resetHighlights();
    }
    
    // 重置高亮状态
    function resetHighlights() {
      document.querySelectorAll('circle[data-id]').forEach(circle => {
        // 恢复基于节点类型的颜色
        const nodeType = circle.getAttribute('data-type') || 'default';
        const color = selectedNodeIds.has(circle.getAttribute('data-id')) ? '#e74c3c' : 
                     nodeType === 'root' ? '#e74c3c' : 
                     nodeType === 'child' ? '#3498db' : 
                     nodeType === 'grandchild' ? '#2ecc71' : '#3498db';
        circle.setAttribute('fill', color);
      });
      
      // 重置关系线颜色
      document.querySelectorAll('line[data-id]').forEach(line => {
        line.setAttribute('stroke', '#95a5a6');
      });
    }
    
    // 开始拖动节点
    function startDragNode(nodeId, event) {
      // 检查当前模式是否为选择模式
      const currentMode = document.querySelector('#select-mode-btn.active, #mode-select.active') ? 'select' : 
                          document.querySelector('#node-mode-btn.active, #mode-node.active') ? 'node' : 
                          document.querySelector('#edge-mode-btn.active, #mode-edge.active, #relationship-mode-btn.active') ? 'edge' : 'select';
      
      if (currentMode !== 'select') return;
      
      event.preventDefault();
      draggingNodeId = nodeId;
      startDragPos = { x: event.clientX, y: event.clientY };
      
      // 记录节点的初始位置
      const nodePos = getNodePosition(nodeId);
      if (nodePos) {
        startNodePos = { ...nodePos };
      }
      
      console.log(`[Interaction] 开始拖动节点: ${nodeId}`);
      
      // 添加鼠标移动和抬起事件监听
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    // 处理鼠标移动
    function handleMouseMove(event) {
      if (!draggingNodeId) return;
      
      // 计算偏移量
      const dx = event.clientX - startDragPos.x;
      const dy = event.clientY - startDragPos.y;
      
      // 计算新位置
      const newX = startNodePos.x + dx;
      const newY = startNodePos.y + dy;
      
      // 更新节点位置
      updateNodePosition(draggingNodeId, newX, newY);
    }
    
    // 处理鼠标抬起
    function handleMouseUp(event) {
      if (!draggingNodeId) return;
      
      console.log(`[Interaction] 结束拖动节点: ${draggingNodeId}`);
      
      // 检查是否拖到了另一个节点上（用于改变层级关系）
      checkDropTarget(draggingNodeId, event);
      
      // 清理
      draggingNodeId = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    // 检查拖放目标，改变层级关系
    function checkDropTarget(draggedNodeId, event) {
      // 获取当前鼠标位置
      const canvas = document.querySelector('#network-canvas svg');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // 查找鼠标位置附近的节点
      const nearbyNodes = [];
      document.querySelectorAll('#network-canvas circle[data-id]').forEach(circle => {
        const cx = parseFloat(circle.getAttribute('cx'));
        const cy = parseFloat(circle.getAttribute('cy'));
        const r = parseFloat(circle.getAttribute('r'));
        
        // 计算距离
        const distance = Math.sqrt((mouseX - cx) ** 2 + (mouseY - cy) ** 2);
        
        // 如果距离小于节点半径的2倍，认为足够近
        if (distance < r * 2 && circle.getAttribute('data-id') !== draggedNodeId) {
          nearbyNodes.push({
            id: circle.getAttribute('data-id'),
            distance: distance
          });
        }
      });
      
      // 找到最近的节点
      nearbyNodes.sort((a, b) => a.distance - b.distance);
      if (nearbyNodes.length > 0) {
        const targetNodeId = nearbyNodes[0].id;
        console.log(`[Interaction] 节点 ${draggedNodeId} 拖到了节点 ${targetNodeId} 附近`);
        
        // 检查是否是后代节点（防止循环引用）
        if (!isDescendantNode(targetNodeId, draggedNodeId)) {
          // 更新层级关系
          if (editor && editor.graphService) {
            // 检查是否有moveNode方法
            if (typeof editor.graphService.moveNode === 'function') {
              console.log(`[Action] 改变节点层级关系: ${draggedNodeId} -> ${targetNodeId}`);
              editor.graphService.moveNode(draggedNodeId, targetNodeId);
            } else {
              // 如果没有moveNode方法，尝试手动实现层级关系更新
              console.log(`[Action] 尝试手动更新节点层级关系: ${draggedNodeId} -> ${targetNodeId}`);
              
              try {
                // 移除与旧父节点的关系（如果存在）
                const data = editor.graphService.getData();
                const newEdges = data.edges.filter(edge => 
                  !(edge.target === draggedNodeId && edge.type === 'CHILD_OF')
                );
                
                // 添加新的父子关系
                newEdges.push({
                  id: `edge_${Date.now()}`,
                  source: targetNodeId,
                  target: draggedNodeId,
                  type: 'CHILD_OF',
                  label: 'CHILD_OF',
                  properties: {
                    updatedAt: new Date().toISOString()
                  }
                });
                
                // 更新数据
                editor.graphService.setData({
                  nodes: data.nodes,
                  edges: newEdges
                });
              } catch (error) {
                console.error('[Error] 更新层级关系失败:', error);
              }
            }
          }
        } else {
          console.log(`[Warning] 不能将节点移动到其子节点下，这会导致循环引用`);
        }
      }
    }
    
    // 检查节点是否是另一个节点的后代（防止循环引用）
    function isDescendantNode(potentialAncestorId, nodeId) {
      // 简单实现：遍历所有关系，检查是否存在从nodeId到potentialAncestorId的路径
      const visited = new Set();
      
      function checkDescendant(currentId) {
        if (currentId === potentialAncestorId) return true;
        if (visited.has(currentId)) return false;
        
        visited.add(currentId);
        
        // 查找从currentId出发的所有CHILD_OF关系
        let isDescendant = false;
        document.querySelectorAll('line[data-source="' + currentId + '"][data-type="CHILD_OF"]').forEach(line => {
          if (checkDescendant(line.getAttribute('data-target'))) {
            isDescendant = true;
          }
        });
        
        return isDescendant;
      }
      
      return checkDescendant(nodeId);
    }
    
    // 为节点添加拖动事件
    function addNodeDragEvents() {
      // 为所有节点添加mousedown事件
      document.querySelectorAll('circle[data-id]').forEach(circle => {
        // 移除可能存在的旧事件监听器
        circle.removeEventListener('mousedown', onNodeMouseDown);
        // 添加新的事件监听器
        circle.addEventListener('mousedown', onNodeMouseDown);
      });
    }
    
    function onNodeMouseDown(event) {
      const nodeId = this.getAttribute('data-id');
      startDragNode(nodeId, event);
    }
    
    // 扩展选择功能，支持多选
    function enhanceSelection() {
      const canvas = document.querySelector('#network-canvas svg');
      if (!canvas) return;
      
      // 添加点击事件捕获器
      canvas.addEventListener('click', function(event) {
        // 检查是否点击了节点
        const clickedNode = event.target.closest('circle[data-id]');
        
        if (clickedNode) {
          const nodeId = clickedNode.getAttribute('data-id');
          
          // 检查当前模式是否为选择模式
          const currentMode = document.querySelector('#select-mode-btn.active, #mode-select.active') ? 'select' : 
                              document.querySelector('#node-mode-btn.active, #mode-node.active') ? 'node' : 
                              document.querySelector('#edge-mode-btn.active, #mode-edge.active, #relationship-mode-btn.active') ? 'edge' : 'select';
          
          if (currentMode === 'select') {
            if (event.ctrlKey || event.metaKey) {
              // 多选
              if (selectedNodeIds.has(nodeId)) {
                selectedNodeIds.delete(nodeId);
              } else {
                selectedNodeIds.add(nodeId);
              }
            } else {
              // 单选
              clearSelection();
              selectedNodeIds.add(nodeId);
            }
            
            // 更新高亮
            resetHighlights();
          }
        }
      }, true); // 使用捕获阶段
    }
    
    // 监听渲染完成事件，重新添加拖动事件
    if (editor && editor.eventBus && typeof editor.eventBus.on === 'function') {
      editor.eventBus.on('renderComplete', function() {
        setTimeout(() => {
          addNodeDragEvents();
        }, 100);
      });
    } else if (editor && editor.graphService && typeof editor.graphService.on === 'function') {
      editor.graphService.on('dataChanged', function() {
        setTimeout(() => {
          addNodeDragEvents();
        }, 100);
      });
    }
    
    // 添加关系选择功能
    function enhanceEdgeSelection() {
      const canvas = document.querySelector('#network-canvas svg');
      if (!canvas) return;
      
      // 添加点击事件捕获器
      canvas.addEventListener('click', function(event) {
        // 检查是否点击了关系
        const clickedEdge = event.target.closest('line[data-id]');
        
        if (clickedEdge) {
          const edgeId = clickedEdge.getAttribute('data-id');
          console.log(`[Event] 选中关系:`, edgeId);
          
          // 高亮选中的关系
          document.querySelectorAll('line[data-id]').forEach(line => {
            line.setAttribute('stroke', line.getAttribute('data-id') === edgeId ? '#e74c3c' : '#95a5a6');
          });
        }
      }, true); // 使用捕获阶段
    }
    
    // 添加提示信息
    function addInteractionHint() {
      const container = document.querySelector('#network-canvas');
      if (!container) return;
      
      // 检查是否已存在提示
      if (document.querySelector('#interaction-hint')) return;
      
      const hint = document.createElement('div');
      hint.id = 'interaction-hint';
      hint.style.position = 'absolute';
      hint.style.top = '10px';
      hint.style.right = '10px';
      hint.style.background = 'rgba(0, 0, 0, 0.7)';
      hint.style.color = 'white';
      hint.style.padding = '8px 12px';
      hint.style.borderRadius = '4px';
      hint.style.fontSize = '12px';
      hint.style.zIndex = '1000';
      hint.style.pointerEvents = 'none';
      hint.textContent = '提示: 在选择模式下拖动节点靠近其他节点可改变层级关系';
      
      container.appendChild(hint);
    }
    
    // 初始化增强功能
    setTimeout(() => {
      addNodeDragEvents();
      enhanceSelection();
      enhanceEdgeSelection();
      addInteractionHint();
      console.log('[Enhanced Interactions] 增强交互功能初始化完成');
    }, 500);
  }, 1000);
}

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  enhanceCanvasInteractions();
});