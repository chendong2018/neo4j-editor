/**
 * 搜索管理器 - 处理图中节点和边的搜索功能
 */

/**
 * 初始化搜索功能
 */
function initializeSearch() {
    console.log('Search Manager: 初始化搜索功能');
    
    // 查找搜索输入元素并添加事件监听
    const searchInput = document.getElementById('node-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(event) {
            const query = event.target.value.trim();
            window.searchNodes(query);
        }, 300));
        
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const query = event.target.value.trim();
                window.searchNodes(query);
            }
        });
    }
    
    // 查找搜索按钮并添加点击事件
    const searchButton = document.getElementById('search-button');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const query = searchInput?.value?.trim() || '';
            window.searchNodes(query);
        });
    }
    
    // 查找清除搜索按钮并添加点击事件
    const clearSearchButton = document.getElementById('clear-search-button');
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
            }
            window.searchNodes(''); // 清空搜索
        });
    }
}

/**
 * 防抖函数 - 避免频繁触发搜索
 * @param {Function} func - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 搜索节点
 * @param {string} query - 搜索查询字符串
 * @param {Object} options - 搜索选项
 * @param {string[]} options.fields - 要搜索的字段 ['label', 'id', 'properties']
 * @param {boolean} options.caseSensitive - 是否区分大小写
 * @param {boolean} options.exactMatch - 是否精确匹配
 * @returns {Array} 匹配的节点列表
 */
window.searchNodes = function(query, options = {}) {
    console.log('Search Manager: 执行节点搜索', { query, options });
    
    try {
        // 默认选项
        const defaultOptions = {
            fields: ['label', 'id', 'properties'],
            caseSensitive: false,
            exactMatch: false
        };
        
        const searchOptions = { ...defaultOptions, ...options };
        
        // 验证Cytoscape实例
        let cy = window.cy;
        if (!cy && window.cyNetwork) {
            cy = window.cyNetwork;
        }
        
        if (!cy) {
            console.error('Search Manager: 没有可用的Cytoscape实例');
            return [];
        }
        
        // 如果查询为空，显示所有节点
        if (!query) {
            console.log('Search Manager: 空查询，显示所有节点');
            
            // 重置所有节点的可见性
            cy.nodes().forEach(node => {
                node.style('visibility', 'visible');
                node.style('opacity', '1');
                node.style('border-width', '0');
            });
            
            // 重置边的可见性
            cy.edges().forEach(edge => {
                edge.style('visibility', 'visible');
                edge.style('opacity', '1');
            });
            
            return [];
        }
        
        // 准备查询
        let searchQuery = query;
        if (!searchOptions.caseSensitive) {
            searchQuery = searchQuery.toLowerCase();
        }
        
        const matchedNodes = [];
        let matchCount = 0;
        
        // 搜索节点
        cy.nodes().forEach(node => {
            let isMatch = false;
            const nodeData = node.data();
            
            // 搜索标签
            if (searchOptions.fields.includes('label') && nodeData.label) {
                let labelValue = nodeData.label;
                if (!searchOptions.caseSensitive) {
                    labelValue = labelValue.toLowerCase();
                }
                
                if (searchOptions.exactMatch) {
                    isMatch = labelValue === searchQuery;
                } else {
                    isMatch = labelValue.includes(searchQuery);
                }
            }
            
            // 搜索ID
            if (!isMatch && searchOptions.fields.includes('id') && nodeData.id) {
                let idValue = nodeData.id;
                if (!searchOptions.caseSensitive) {
                    idValue = idValue.toLowerCase();
                }
                
                if (searchOptions.exactMatch) {
                    isMatch = idValue === searchQuery;
                } else {
                    isMatch = idValue.includes(searchQuery);
                }
            }
            
            // 搜索属性
            if (!isMatch && searchOptions.fields.includes('properties') && nodeData.properties) {
                const properties = nodeData.properties;
                
                // 搜索属性键值对
                for (const [key, value] of Object.entries(properties)) {
                    if (value === null || value === undefined) continue;
                    
                    let searchValue = String(value);
                    if (!searchOptions.caseSensitive) {
                        searchValue = searchValue.toLowerCase();
                    }
                    
                    // 搜索属性名
                    let keyValue = key;
                    if (!searchOptions.caseSensitive) {
                        keyValue = keyValue.toLowerCase();
                    }
                    
                    if ((searchOptions.exactMatch && 
                        (keyValue === searchQuery || searchValue === searchQuery)) ||
                        (!searchOptions.exactMatch && 
                        (keyValue.includes(searchQuery) || searchValue.includes(searchQuery)))) {
                        isMatch = true;
                        break;
                    }
                }
            }
            
            // 更新节点样式
            if (isMatch) {
                node.style('visibility', 'visible');
                node.style('opacity', '1');
                node.style('border-width', '3px');
                node.style('border-color', '#FF5722');
                node.style('border-style', 'solid');
                node.style('z-index', '9999');
                
                matchedNodes.push(node);
                matchCount++;
            } else {
                node.style('visibility', 'hidden');
            }
        });
        
        // 更新边的可见性 - 只显示连接匹配节点的边
        cy.edges().forEach(edge => {
            const source = edge.source();
            const target = edge.target();
            
            if (source && target && 
                source.style('visibility') === 'visible' && 
                target.style('visibility') === 'visible') {
                edge.style('visibility', 'visible');
                edge.style('opacity', '1');
            } else {
                edge.style('visibility', 'hidden');
            }
        });
        
        console.log(`Search Manager: 搜索完成，找到 ${matchCount} 个匹配节点`);
        
        // 显示搜索结果提示
        if (typeof window.showToast === 'function') {
            if (matchCount > 0) {
                window.showToast(`找到 ${matchCount} 个匹配的节点`);
            } else {
                window.showToast('没有找到匹配的节点');
            }
        }
        
        // 自动居中显示匹配的节点
        if (matchCount > 0) {
            try {
                cy.fit(matchedNodes, 50);
            } catch (error) {
                console.warn('Search Manager: 无法自动居中显示匹配节点:', error);
            }
        }
        
        return matchedNodes;
    } catch (error) {
        console.error('Search Manager: 搜索节点时发生错误:', error);
        
        if (typeof window.showToast === 'function') {
            window.showToast('搜索失败: ' + error.message, 'error');
        }
        
        return [];
    }
};

/**
 * 高级搜索 - 支持复杂条件搜索
 * @param {Object} criteria - 搜索条件
 * @param {string} criteria.label - 标签搜索
 * @param {string} criteria.type - 类型搜索
 * @param {Object} criteria.properties - 属性键值搜索
 * @returns {Array} 匹配的节点列表
 */
window.advancedSearch = function(criteria) {
    console.log('Search Manager: 执行高级搜索', criteria);
    
    try {
        // 验证Cytoscape实例
        let cy = window.cy;
        if (!cy && window.cyNetwork) {
            cy = window.cyNetwork;
        }
        
        if (!cy) {
            console.error('Search Manager: 没有可用的Cytoscape实例');
            return [];
        }
        
        if (!criteria || typeof criteria !== 'object') {
            console.error('Search Manager: 无效的搜索条件');
            return [];
        }
        
        const matchedNodes = [];
        
        cy.nodes().forEach(node => {
            let isMatch = true;
            const nodeData = node.data();
            
            // 标签搜索
            if (criteria.label && nodeData.label) {
                const labelMatch = nodeData.label.toLowerCase().includes(criteria.label.toLowerCase());
                isMatch = isMatch && labelMatch;
            }
            
            // 类型搜索
            if (criteria.type && nodeData.type) {
                const typeMatch = nodeData.type.toLowerCase().includes(criteria.type.toLowerCase());
                isMatch = isMatch && typeMatch;
            }
            
            // 属性搜索
            if (criteria.properties && nodeData.properties) {
                for (const [key, value] of Object.entries(criteria.properties)) {
                    if (value === null || value === undefined) continue;
                    
                    const propertyValue = nodeData.properties[key];
                    if (!propertyValue) {
                        isMatch = false;
                        break;
                    }
                    
                    const propertyMatch = String(propertyValue)
                        .toLowerCase()
                        .includes(String(value).toLowerCase());
                    
                    isMatch = isMatch && propertyMatch;
                    if (!isMatch) break;
                }
            }
            
            if (isMatch) {
                matchedNodes.push(node);
                node.style('visibility', 'visible');
                node.style('opacity', '1');
                node.style('border-width', '3px');
                node.style('border-color', '#4CAF50');
            } else {
                node.style('visibility', 'hidden');
            }
        });
        
        // 更新边的可见性
        cy.edges().forEach(edge => {
            const source = edge.source();
            const target = edge.target();
            
            if (source && target && 
                source.style('visibility') === 'visible' && 
                target.style('visibility') === 'visible') {
                edge.style('visibility', 'visible');
                edge.style('opacity', '1');
            } else {
                edge.style('visibility', 'hidden');
            }
        });
        
        console.log(`Search Manager: 高级搜索完成，找到 ${matchedNodes.length} 个匹配节点`);
        
        if (typeof window.showToast === 'function') {
            window.showToast(`高级搜索找到 ${matchedNodes.length} 个匹配的节点`);
        }
        
        // 居中显示匹配的节点
        if (matchedNodes.length > 0) {
            try {
                cy.fit(matchedNodes, 50);
            } catch (error) {
                console.warn('Search Manager: 无法自动居中显示匹配节点:', error);
            }
        }
        
        return matchedNodes;
    } catch (error) {
        console.error('Search Manager: 高级搜索时发生错误:', error);
        
        if (typeof window.showToast === 'function') {
            window.showToast('高级搜索失败: ' + error.message, 'error');
        }
        
        return [];
    }
};

/**
 * 重置搜索，显示所有节点
 */
window.resetSearch = function() {
    console.log('Search Manager: 重置搜索');
    
    try {
        // 重置搜索输入
        const searchInput = document.getElementById('node-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // 重置节点和边的样式
        let cy = window.cy;
        if (!cy && window.cyNetwork) {
            cy = window.cyNetwork;
        }
        
        if (cy) {
            cy.nodes().forEach(node => {
                node.style('visibility', 'visible');
                node.style('opacity', '1');
                node.style('border-width', '0');
                node.style('z-index', '0');
            });
            
            cy.edges().forEach(edge => {
                edge.style('visibility', 'visible');
                edge.style('opacity', '1');
            });
        }
        
        console.log('Search Manager: 搜索已重置，所有节点可见');
        
        if (typeof window.showToast === 'function') {
            window.showToast('搜索已重置，所有节点可见');
        }
    } catch (error) {
        console.error('Search Manager: 重置搜索时发生错误:', error);
    }
};

/**
 * 在DOM加载完成后初始化搜索功能
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
    // DOM已加载完成，立即初始化
    initializeSearch();
}
