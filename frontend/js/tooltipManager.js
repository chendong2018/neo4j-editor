/**
 * 工具提示管理器 - 处理节点和边的工具提示显示
 */

// 工具提示配置
const tooltipConfig = {
    offset: { x: 20, y: -20 },
    fadeInDuration: 100,
    fadeOutDuration: 100,
    maxWidth: 300,
    showDelay: 300,
    hideDelay: 100
};

// 工具提示元素引用
let tooltipElement = null;
let tooltipTimeoutId = null;
let currentTarget = null;

/**
 * 初始化工具提示功能
 */
function initializeTooltip() {
    console.log('Tooltip Manager: 初始化工具提示功能');
    
    // 创建工具提示元素（如果不存在）
    tooltipElement = document.getElementById('tooltip');
    if (!tooltipElement) {
        createTooltipElement();
    }
    
    // 配置工具提示样式
    setupTooltipStyles();
}

/**
 * 创建工具提示DOM元素
 */
function createTooltipElement() {
    tooltipElement = document.createElement('div');
    tooltipElement.id = 'tooltip';
    tooltipElement.className = 'neo4j-tooltip';
    tooltipElement.style.display = 'none';
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.zIndex = '9999';
    tooltipElement.style.pointerEvents = 'none'; // 允许点击穿透
    
    document.body.appendChild(tooltipElement);
    console.log('Tooltip Manager: 创建了工具提示DOM元素');
}

/**
 * 设置工具提示样式
 */
function setupTooltipStyles() {
    if (!tooltipElement) return;
    
    const style = tooltipElement.style;
    
    // 基础样式
    style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    style.color = '#ffffff';
    style.padding = '8px 12px';
    style.borderRadius = '4px';
    style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    style.fontSize = '14px';
    style.lineHeight = '1.4';
    style.maxWidth = `${tooltipConfig.maxWidth}px`;
    style.wordWrap = 'break-word';
    
    // 阴影效果
    style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    
    // 过渡效果
    style.transition = `opacity ${tooltipConfig.fadeInDuration}ms ease-in-out`;
    
    console.log('Tooltip Manager: 已设置工具提示样式');
}

/**
 * 显示节点工具提示
 * @param {Object} node - Cytoscape节点对象
 * @param {Object} options - 显示选项
 * @param {Object} options.position - 自定义位置
 * @param {boolean} options.delayed - 是否延迟显示
 */
window.showNodeTooltip = function(node, options = {}) {
    if (!node || !tooltipElement) return;
    
    // 清除之前的定时器
    if (tooltipTimeoutId) {
        clearTimeout(tooltipTimeoutId);
        tooltipTimeoutId = null;
    }
    
    const showFn = () => {
        try {
            // 获取节点位置
            const position = options.position || node.renderedPosition();
            if (!position) {
                console.warn('Tooltip Manager: 无法获取节点位置');
                return;
            }
            
            // 获取节点数据
            const nodeData = node.data ? node.data() : {};
            const label = nodeData.label || '节点';
            const nodeId = nodeData.id || 'unknown-id';
            const nodeType = nodeData.type || 'default';
            const properties = nodeData.properties || {};
            
            // 构建工具提示内容
            let content = `
                <div class="tooltip-header">
                    <div class="tooltip-label">${escapeHtml(label)}</div>
                    <div class="tooltip-id">ID: ${escapeHtml(nodeId)}</div>
                </div>
                <div class="tooltip-type">类型: ${escapeHtml(nodeType)}</div>
            `;
            
            // 添加属性列表
            if (Object.keys(properties).length > 0) {
                content += '<div class="tooltip-properties">';
                content += '<div class="tooltip-section-title">属性:</div>';
                
                for (const [key, value] of Object.entries(properties)) {
                    // 格式化值
                    const formattedValue = formatTooltipValue(value);
                    content += `
                        <div class="tooltip-property">
                            <span class="tooltip-property-key">${escapeHtml(key)}:</span>
                            <span class="tooltip-property-value">${formattedValue}</span>
                        </div>
                    `;
                }
                content += '</div>';
            }
            
            // 设置内容
            tooltipElement.innerHTML = content;
            
            // 计算工具提示位置（确保在视口内）
            const { x, y } = calculateTooltipPosition(position.x, position.y);
            
            // 设置位置
            tooltipElement.style.left = `${x}px`;
            tooltipElement.style.top = `${y}px`;
            
            // 显示工具提示
            tooltipElement.style.opacity = '0';
            tooltipElement.style.display = 'block';
            
            // 淡入效果
            setTimeout(() => {
                tooltipElement.style.opacity = '1';
            }, 10);
            
            // 记录当前目标
            currentTarget = node;
            
            console.log(`Tooltip Manager: 显示节点工具提示 - ${label}`);
        } catch (error) {
            console.error('Tooltip Manager: 显示节点工具提示时发生错误:', error);
        }
    };
    
    // 根据选项决定是否延迟显示
    if (options.delayed) {
        tooltipTimeoutId = setTimeout(showFn, tooltipConfig.showDelay);
    } else {
        showFn();
    }
};

/**
 * 显示边工具提示
 * @param {Object} edge - Cytoscape边对象
 * @param {Object} options - 显示选项
 * @param {Object} options.position - 自定义位置
 * @param {boolean} options.delayed - 是否延迟显示
 */
window.showEdgeTooltip = function(edge, options = {}) {
    if (!edge || !tooltipElement) return;
    
    // 清除之前的定时器
    if (tooltipTimeoutId) {
        clearTimeout(tooltipTimeoutId);
        tooltipTimeoutId = null;
    }
    
    const showFn = () => {
        try {
            // 获取边位置（中点）
            const position = options.position || (edge.midpoint ? edge.midpoint() : null);
            if (!position) {
                console.warn('Tooltip Manager: 无法获取边位置');
                return;
            }
            
            // 获取边数据
            const edgeData = edge.data ? edge.data() : {};
            const label = edgeData.label || '关系';
            const edgeId = edgeData.id || 'unknown-id';
            const sourceId = edgeData.source || 'unknown-source';
            const targetId = edgeData.target || 'unknown-target';
            const properties = edgeData.properties || {};
            
            // 构建工具提示内容
            let content = `
                <div class="tooltip-header">
                    <div class="tooltip-label">${escapeHtml(label)}</div>
                    <div class="tooltip-id">ID: ${escapeHtml(edgeId)}</div>
                </div>
                <div class="tooltip-connection">
                    <div>源: ${escapeHtml(sourceId)}</div>
                    <div>目标: ${escapeHtml(targetId)}</div>
                </div>
            `;
            
            // 添加属性列表
            if (Object.keys(properties).length > 0) {
                content += '<div class="tooltip-properties">';
                content += '<div class="tooltip-section-title">属性:</div>';
                
                for (const [key, value] of Object.entries(properties)) {
                    // 格式化值
                    const formattedValue = formatTooltipValue(value);
                    content += `
                        <div class="tooltip-property">
                            <span class="tooltip-property-key">${escapeHtml(key)}:</span>
                            <span class="tooltip-property-value">${formattedValue}</span>
                        </div>
                    `;
                }
                content += '</div>';
            }
            
            // 设置内容
            tooltipElement.innerHTML = content;
            
            // 计算工具提示位置（确保在视口内）
            const { x, y } = calculateTooltipPosition(position.x, position.y);
            
            // 设置位置
            tooltipElement.style.left = `${x}px`;
            tooltipElement.style.top = `${y}px`;
            
            // 显示工具提示
            tooltipElement.style.opacity = '0';
            tooltipElement.style.display = 'block';
            
            // 淡入效果
            setTimeout(() => {
                tooltipElement.style.opacity = '1';
            }, 10);
            
            // 记录当前目标
            currentTarget = edge;
            
            console.log(`Tooltip Manager: 显示边工具提示 - ${label}`);
        } catch (error) {
            console.error('Tooltip Manager: 显示边工具提示时发生错误:', error);
        }
    };
    
    // 根据选项决定是否延迟显示
    if (options.delayed) {
        tooltipTimeoutId = setTimeout(showFn, tooltipConfig.showDelay);
    } else {
        showFn();
    }
};

/**
 * 隐藏工具提示
 * @param {boolean} immediate - 是否立即隐藏（无动画）
 */
window.hideTooltip = function(immediate = false) {
    if (!tooltipElement || tooltipElement.style.display === 'none') return;
    
    // 清除定时器
    if (tooltipTimeoutId) {
        clearTimeout(tooltipTimeoutId);
        tooltipTimeoutId = null;
    }
    
    // 立即隐藏
    if (immediate) {
        tooltipElement.style.display = 'none';
        currentTarget = null;
        console.log('Tooltip Manager: 立即隐藏工具提示');
        return;
    }
    
    // 淡出效果
    tooltipElement.style.opacity = '0';
    
    setTimeout(() => {
        tooltipElement.style.display = 'none';
        currentTarget = null;
        console.log('Tooltip Manager: 隐藏工具提示');
    }, tooltipConfig.fadeOutDuration);
};

/**
 * 计算工具提示的位置，确保在视口内
 * @param {number} targetX - 目标元素X坐标
 * @param {number} targetY - 目标元素Y坐标
 * @returns {Object} 调整后的位置 {x, y}
 */
function calculateTooltipPosition(targetX, targetY) {
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    // 计算基础位置
    let x = targetX + tooltipConfig.offset.x;
    let y = targetY + tooltipConfig.offset.y;
    
    // 调整X位置，避免超出右边界
    if (x + tooltipRect.width - scrollX > viewportWidth) {
        x = targetX - tooltipRect.width - 10; // 显示在左侧
    }
    
    // 调整Y位置，避免超出上边界
    if (y - scrollY < 0) {
        y = targetY + 30; // 显示在下方
    } else if (y + tooltipRect.height - scrollY > viewportHeight) {
        y = targetY - tooltipRect.height - 10; // 显示在上方
    }
    
    return { x, y };
}

/**
 * 格式化工具提示中的值
 * @param {*} value - 要格式化的值
 * @returns {string} 格式化后的HTML字符串
 */
function formatTooltipValue(value) {
    if (value === null) return '<span class="tooltip-null">null</span>';
    if (value === undefined) return '<span class="tooltip-undefined">undefined</span>';
    
    // 处理布尔值
    if (typeof value === 'boolean') {
        return `<span class="tooltip-boolean">${value.toString()}</span>`;
    }
    
    // 处理数字
    if (typeof value === 'number') {
        return `<span class="tooltip-number">${value}</span>`;
    }
    
    // 处理数组
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return '<span class="tooltip-array">[]</span>';
        }
        
        // 对于短数组，直接显示
        if (value.length <= 3) {
            const items = value.map(item => escapeHtml(String(item))).join(', ');
            return `<span class="tooltip-array">[ ${items} ]</span>`;
        }
        
        // 对于长数组，显示前两个和长度
        const firstItems = value.slice(0, 2).map(item => escapeHtml(String(item))).join(', ');
        return `<span class="tooltip-array">[ ${firstItems}, ... ] (${value.length} 项)</span>`;
    }
    
    // 处理对象
    if (typeof value === 'object') {
        try {
            const objStr = JSON.stringify(value);
            // 对于小对象，直接显示
            if (objStr.length < 50) {
                return `<span class="tooltip-object">${escapeHtml(objStr)}</span>`;
            }
            // 对于大对象，只显示类型
            return `<span class="tooltip-object">Object { ${Object.keys(value).length} 个属性 }</span>`;
        } catch {
            return `<span class="tooltip-object">Object</span>`;
        }
    }
    
    // 处理字符串
    const strValue = String(value);
    // 对于长字符串，截断显示
    if (strValue.length > 50) {
        return `<span class="tooltip-string">"${escapeHtml(strValue.slice(0, 50))}..."</span>`;
    }
    
    return `<span class="tooltip-string">"${escapeHtml(strValue)}"</span>`;
}

/**
 * HTML转义函数
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * 在Cytoscape实例上启用工具提示
 * @param {Object} cy - Cytoscape实例
 */
window.enableTooltips = function(cy) {
    if (!cy || !tooltipElement) return;
    
    console.log('Tooltip Manager: 为Cytoscape实例启用工具提示');
    
    // 节点悬停事件
    cy.on('mouseover', 'node', function(evt) {
        window.showNodeTooltip(evt.target, { delayed: true });
    });
    
    cy.on('mouseout', 'node', function(evt) {
        // 只有当鼠标真正离开节点时才隐藏
        if (evt.originalEvent.toElement !== tooltipElement) {
            window.hideTooltip();
        }
    });
    
    // 边悬停事件
    cy.on('mouseover', 'edge', function(evt) {
        window.showEdgeTooltip(evt.target, { delayed: true });
    });
    
    cy.on('mouseout', 'edge', function(evt) {
        // 只有当鼠标真正离开边时才隐藏
        if (evt.originalEvent.toElement !== tooltipElement) {
            window.hideTooltip();
        }
    });
    
    // 工具提示悬停事件（避免鼠标移到工具提示上时隐藏）
    tooltipElement.addEventListener('mouseover', function() {
        if (tooltipTimeoutId) {
            clearTimeout(tooltipTimeoutId);
            tooltipTimeoutId = null;
        }
    });
    
    tooltipElement.addEventListener('mouseout', function() {
        window.hideTooltip();
    });
};

/**
 * 自定义工具提示内容
 * @param {string} content - HTML内容
 * @param {Object} position - 位置对象 {x, y}
 */
window.showCustomTooltip = function(content, position) {
    if (!tooltipElement || !position) return;
    
    // 清除定时器
    if (tooltipTimeoutId) {
        clearTimeout(tooltipTimeoutId);
        tooltipTimeoutId = null;
    }
    
    try {
        // 设置内容
        tooltipElement.innerHTML = content;
        
        // 计算位置
        const { x, y } = calculateTooltipPosition(position.x, position.y);
        
        // 设置位置
        tooltipElement.style.left = `${x}px`;
        tooltipElement.style.top = `${y}px`;
        
        // 显示
        tooltipElement.style.opacity = '0';
        tooltipElement.style.display = 'block';
        
        setTimeout(() => {
            tooltipElement.style.opacity = '1';
        }, 10);
        
        console.log('Tooltip Manager: 显示自定义工具提示');
    } catch (error) {
        console.error('Tooltip Manager: 显示自定义工具提示时发生错误:', error);
    }
};

/**
 * 更新工具提示配置
 * @param {Object} newConfig - 新的配置选项
 */
window.updateTooltipConfig = function(newConfig) {
    Object.assign(tooltipConfig, newConfig);
    setupTooltipStyles();
    console.log('Tooltip Manager: 更新了工具提示配置');
};

/**
 * 在DOM加载完成后初始化工具提示
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTooltip);
} else {
    // DOM已加载完成，立即初始化
    initializeTooltip();
}
