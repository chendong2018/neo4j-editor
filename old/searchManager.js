/**
 * 搜索管理器 - 处理图中节点和边的搜索功能
 */

/**
 * 初始化搜索功能
 */
function initializeSearch() {
    console.log('Search Manager: 初始化搜索功能');
    
    // 查找搜索输入元素并添加事件监听
    var searchInput = document.getElementById('node-search-input');
    if (searchInput) {
        searchInput.oninput = debounce(function(event) {
            var query = event.target.value.trim();
            window.searchNodes(query);
        }, 300);
        
        searchInput.onkeypress = function(event) {
            // 兼容旧浏览器的keyCode
            var key = event.key || String.fromCharCode(event.keyCode);
            if (key === 'Enter') {
                var query = event.target.value.trim();
                window.searchNodes(query);
            }
        };
    }
    
    // 查找搜索按钮并添加点击事件
    var searchButton = document.getElementById('search-button');
    if (searchButton) {
        searchButton.onclick = function() {
            // 避免使用可选链操作符
            var query = searchInput && searchInput.value ? searchInput.value.trim() : '';
            window.searchNodes(query);
        };
    }
    
    // 查找清除搜索按钮并添加点击事件
    var clearSearchButton = document.getElementById('clear-search-button');
    if (clearSearchButton) {
        clearSearchButton.onclick = function() {
            if (searchInput) {
                searchInput.value = '';
            }
            window.searchNodes(''); // 清空搜索
        };
    }
}

/**
 * 防抖函数 - 避免频繁触发搜索
 * @param {Function} func - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay) {
    var timeoutId;
    return function() {
        // 保存参数和this上下文
        var args = arguments;
        var context = this;
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(function() {
            func.apply(context, args);
        }, delay);
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
window.searchNodes = function(query, options) {
    // 参数默认值处理
    if (options === undefined) {
        options = {};
    }
    
    console.log('Search Manager: 执行节点搜索', { query: query, options: options });
    
    try {
        // 默认选项
        var defaultOptions = {
            fields: ['label', 'id', 'properties'],
            caseSensitive: false,
            exactMatch: false
        };
        
        // 手动合并选项，避免使用对象展开运算符
        var searchOptions = {};
        for (var key in defaultOptions) {
            if (defaultOptions.hasOwnProperty(key)) {
                searchOptions[key] = defaultOptions[key];
            }
        }
        for (var optKey in options) {
            if (options.hasOwnProperty(optKey)) {
                searchOptions[optKey] = options[optKey];
            }
        }
        
        // 验证Cytoscape实例
        var cy = window.cy;
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
            var nodes = cy.nodes();
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                node.style('visibility', 'visible');
                node.style('opacity', '1');
                node.style('border-width', '0');
            }
            
            // 重置边的可见性
            var edges = cy.edges();
            for (var j = 0; j < edges.length; j++) {
                var edge = edges[j];
                edge.style('visibility', 'visible');
                edge.style('opacity', '1');
            }
            
            return [];
        }
        
        // 准备查询
        var searchQuery = query;
        if (!searchOptions.caseSensitive) {
            searchQuery = searchQuery.toLowerCase();
        }
        
        var matchedNodes = [];
        var matchCount = 0;
        
        // 搜索节点
        var nodes = cy.nodes();
        for (var k = 0; k < nodes.length; k++) {
            var node = nodes[k];
            var isMatch = false;
            var nodeData = node.data();
            
            // 搜索标签
            // 使用indexOf代替includes以兼容旧浏览器
            if (searchOptions.fields.indexOf('label') !== -1 && nodeData.label) {
                var labelValue = nodeData.label;
                if (!searchOptions.caseSensitive) {
                    labelValue = labelValue.toLowerCase();
                }
                
                if (searchOptions.exactMatch) {
                    isMatch = labelValue === searchQuery;
                } else {
                    // 使用indexOf代替includes
                    isMatch = labelValue.indexOf(searchQuery) !== -1;
                }
            }
            
            // 搜索ID
            if (!isMatch && searchOptions.fields.indexOf('id') !== -1 && nodeData.id) {
                var idValue = nodeData.id;
                if (!searchOptions.caseSensitive) {
                    idValue = idValue.toLowerCase();
                }
                
                if (searchOptions.exactMatch) {
                    isMatch = idValue === searchQuery;
                } else {
                    // 使用indexOf代替includes
                    isMatch = idValue.indexOf(searchQuery) !== -1;
                }
            }
            
            // 搜索属性
            if (!isMatch && searchOptions.fields.indexOf('properties') !== -1 && nodeData.properties) {
                var properties = nodeData.properties;
                
                // 搜索属性键值对 - 使用传统for-in循环代替Object.entries
                for (var propKey in properties) {
                    if (properties.hasOwnProperty(propKey)) {
                        var propValue = properties[propKey];
                        if (propValue === null || propValue === undefined) continue;
                        
                        var searchValue = String(propValue);
                        if (!searchOptions.caseSensitive) {
                            searchValue = searchValue.toLowerCase();
                        }
                        
                        // 搜索属性名
                        var keyValue = propKey;
                        if (!searchOptions.caseSensitive) {
                            keyValue = keyValue.toLowerCase();
                        }
                        
                        if (searchOptions.exactMatch) {
                            if (keyValue === searchQuery || searchValue === searchQuery) {
                                isMatch = true;
                                break;
                            }
                        } else {
                            // 使用indexOf代替includes
                            if (keyValue.indexOf(searchQuery) !== -1 || searchValue.indexOf(searchQuery) !== -1) {
                                isMatch = true;
                                break;
                            }
                        }
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
        }
        
        // 更新边的可见性 - 只显示连接匹配节点的边
        var edges = cy.edges();
        for (var l = 0; l < edges.length; l++) {
            var edge = edges[l];
            var source = edge.source();
            var target = edge.target();
            
            if (source && target && 
                source.style('visibility') === 'visible' && 
                target.style('visibility') === 'visible') {
                edge.style('visibility', 'visible');
                edge.style('opacity', '1');
            } else {
                edge.style('visibility', 'hidden');
            }
        }
        
        console.log('Search Manager: 搜索完成，找到 ' + matchCount + ' 个匹配节点');
        
        // 显示搜索结果提示
        if (typeof window.showToast === 'function') {
            if (matchCount > 0) {
                window.showToast('找到 ' + matchCount + ' 个匹配的节点');
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
        var cy = window.cy;
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
        
        var matchedNodes = [];
        
        var nodes = cy.nodes();
        for (var m = 0; m < nodes.length; m++) {
            var node = nodes[m];
            var isMatch = true;
            var nodeData = node.data();
            
            // 标签搜索
            if (criteria.label && nodeData.label) {
                // 使用indexOf代替includes
                var labelMatch = nodeData.label.toLowerCase().indexOf(criteria.label.toLowerCase()) !== -1;
                isMatch = isMatch && labelMatch;
            }
            
            // 类型搜索
            if (criteria.type && nodeData.type) {
                // 使用indexOf代替includes
                var typeMatch = nodeData.type.toLowerCase().indexOf(criteria.type.toLowerCase()) !== -1;
                isMatch = isMatch && typeMatch;
            }
            
            // 属性搜索
            if (criteria.properties && nodeData.properties) {
                // 使用传统for-in循环代替Object.entries
                for (var propKey in criteria.properties) {
                    if (criteria.properties.hasOwnProperty(propKey)) {
                        var propValue = criteria.properties[propKey];
                        if (propValue === null || propValue === undefined) continue;
                        
                        var propertyValue = nodeData.properties[propKey];
                        if (!propertyValue) {
                            isMatch = false;
                            break;
                        }
                        
                        // 使用indexOf代替includes
                        var propertyMatch = String(propertyValue)
                            .toLowerCase()
                            .indexOf(String(propValue).toLowerCase()) !== -1;
                        
                        isMatch = isMatch && propertyMatch;
                        if (!isMatch) break;
                    }
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
        }
        
        // 更新边的可见性
        var edges = cy.edges();
        for (var n = 0; n < edges.length; n++) {
            var edge = edges[n];
            var source = edge.source();
            var target = edge.target();
            
            if (source && target && 
                source.style('visibility') === 'visible' && 
                target.style('visibility') === 'visible') {
                edge.style('visibility', 'visible');
                edge.style('opacity', '1');
            } else {
                edge.style('visibility', 'hidden');
            }
        }
        
        console.log('Search Manager: 高级搜索完成，找到 ' + matchedNodes.length + ' 个匹配节点');
        
        if (typeof window.showToast === 'function') {
            window.showToast('高级搜索找到 ' + matchedNodes.length + ' 个匹配的节点');
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
        var searchInput = document.getElementById('node-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // 重置节点和边的样式
        var cy = window.cy;
        if (!cy && window.cyNetwork) {
            cy = window.cyNetwork;
        }
        
        if (cy) {
            var nodes = cy.nodes();
            for (var p = 0; p < nodes.length; p++) {
                var node = nodes[p];
                node.style('visibility', 'visible');
                node.style('opacity', '1');
                node.style('border-width', '0');
                node.style('z-index', '0');
            }
            
            var edges = cy.edges();
            for (var q = 0; q < edges.length; q++) {
                var edge = edges[q];
                edge.style('visibility', 'visible');
                edge.style('opacity', '1');
            }
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
    // 使用传统的事件监听方式
    document.attachEvent ? 
        document.attachEvent('onreadystatechange', function() {
            if (document.readyState === 'complete') {
                document.detachEvent('onreadystatechange', arguments.callee);
                initializeSearch();
            }
        }) : 
        document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
    // DOM已加载完成，立即初始化
    initializeSearch();
}
