/**
 * Neo4j Editor - 搜索面板模块
 * 负责处理图表中节点和关系的搜索和过滤功能
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // DOM 引用
    let searchPanelContainer = null;
    let searchInput = null;
    let searchButton = null;
    let clearButton = null;
    let searchResultsContainer = null;
    let searchTypeSelect = null;
    let filterOptionsContainer = null;
    let highlightResultsCheckbox = null;
    let caseSensitiveCheckbox = null;
    let regexCheckbox = null;
    let searchHistoryContainer = null;
    
    // 搜索状态
    let currentSearch = '';
    let currentSearchType = 'all'; // 'all', 'nodes', 'relationships'
    let currentResults = [];
    let searchHistory = [];
    const MAX_HISTORY_SIZE = 50;
    
    // 搜索配置
    let searchConfig = {
        highlightResults: true,
        caseSensitive: false,
        useRegex: false,
        maxResults: 100
    };

    /**
     * 初始化搜索面板
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('Search Panel Module: Initializing...');
            
            // 合并配置
            searchConfig = { ...searchConfig, ...config };
            
            // 初始化搜索面板容器
            initializeSearchPanelContainer();
            
            // 设置事件监听
            setupEventListeners();
            
            // 加载搜索历史
            loadSearchHistory();
            
            // 标记为已初始化
            initialized = true;
            
            console.log('Search Panel Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('searchPanel:initialized', {
                    config: searchConfig
                });
            }
            
            return true;
        } catch (error) {
            console.error('Search Panel Module: Initialization error:', error);
            return false;
        }
    }

    /**
     * 初始化搜索面板容器
     */
    function initializeSearchPanelContainer() {
        try {
            // 查找或创建搜索面板容器
            searchPanelContainer = document.getElementById('neo4j-editor-search-panel');
            
            if (!searchPanelContainer) {
                searchPanelContainer = document.createElement('div');
                searchPanelContainer.id = 'neo4j-editor-search-panel';
                searchPanelContainer.className = 'neo4j-editor-search-panel';
                
                // 设置基本样式
                Object.assign(searchPanelContainer.style, {
                    position: 'absolute',
                    top: '60px',
                    right: '20px',
                    width: '380px',
                    maxHeight: 'calc(100vh - 100px)',
                    backgroundColor: '#ffffff',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: '800',
                    fontFamily: 'Arial, sans-serif',
                    display: 'none',
                    flexDirection: 'column'
                });
                
                // 添加到body
                document.body.appendChild(searchPanelContainer);
            }
            
            // 添加标题
            const title = document.createElement('h3');
            title.textContent = '搜索';
            title.style.marginTop = '0';
            title.style.marginBottom = '16px';
            title.style.color = '#333';
            searchPanelContainer.appendChild(title);
            
            // 创建搜索表单
            const searchForm = document.createElement('div');
            searchForm.className = 'search-form';
            searchForm.style.marginBottom = '16px';
            
            // 搜索输入框和按钮
            const searchInputContainer = document.createElement('div');
            searchInputContainer.style.display = 'flex';
            searchInputContainer.style.marginBottom = '8px';
            
            // 搜索输入框
            searchInput = document.createElement('input');
            searchInput.id = 'neo4j-search-input';
            searchInput.type = 'text';
            searchInput.placeholder = '输入搜索内容...';
            searchInput.className = 'search-input';
            Object.assign(searchInput.style, {
                flex: '1',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px 0 0 4px',
                fontSize: '14px',
                outline: 'none'
            });
            
            // 搜索按钮
            searchButton = document.createElement('button');
            searchButton.id = 'neo4j-search-button';
            searchButton.textContent = '搜索';
            searchButton.className = 'search-button';
            Object.assign(searchButton.style, {
                padding: '8px 16px',
                backgroundColor: '#6554C0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0 4px 4px 0',
                cursor: 'pointer',
                fontSize: '14px'
            });
            
            // 清除按钮
            clearButton = document.createElement('button');
            clearButton.id = 'neo4j-clear-button';
            clearButton.innerHTML = '&times;';
            clearButton.className = 'clear-button';
            Object.assign(clearButton.style, {
                marginLeft: '8px',
                padding: '8px',
                backgroundColor: '#f0f0f0',
                color: '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                minWidth: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });
            clearButton.style.display = 'none';
            
            searchInputContainer.appendChild(searchInput);
            searchInputContainer.appendChild(searchButton);
            searchInputContainer.appendChild(clearButton);
            
            // 搜索类型选择
            const searchTypeContainer = document.createElement('div');
            searchTypeContainer.className = 'search-type-container';
            searchTypeContainer.style.marginBottom = '12px';
            
            const searchTypeLabel = document.createElement('label');
            searchTypeLabel.textContent = '搜索类型：';
            searchTypeLabel.style.marginRight = '8px';
            searchTypeLabel.style.fontSize = '13px';
            searchTypeLabel.style.color = '#555';
            
            searchTypeSelect = document.createElement('select');
            searchTypeSelect.id = 'neo4j-search-type';
            searchTypeSelect.className = 'search-type-select';
            Object.assign(searchTypeSelect.style, {
                padding: '4px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: '#ffffff'
            });
            
            // 添加选项
            const typeOptions = [
                { value: 'all', label: '所有元素' },
                { value: 'nodes', label: '仅节点' },
                { value: 'relationships', label: '仅关系' }
            ];
            
            typeOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                optionElement.selected = option.value === currentSearchType;
                searchTypeSelect.appendChild(optionElement);
            });
            
            searchTypeContainer.appendChild(searchTypeLabel);
            searchTypeContainer.appendChild(searchTypeSelect);
            
            // 搜索选项
            filterOptionsContainer = document.createElement('div');
            filterOptionsContainer.className = 'search-options-container';
            filterOptionsContainer.style.display = 'flex';
            filterOptionsContainer.style.flexWrap = 'wrap';
            filterOptionsContainer.style.gap = '12px';
            filterOptionsContainer.style.marginBottom = '12px';
            
            // 高亮结果选项
            highlightResultsCheckbox = document.createElement('input');
            highlightResultsCheckbox.id = 'neo4j-highlight-results';
            highlightResultsCheckbox.type = 'checkbox';
            highlightResultsCheckbox.checked = searchConfig.highlightResults;
            
            const highlightResultsLabel = document.createElement('label');
            highlightResultsLabel.htmlFor = 'neo4j-highlight-results';
            highlightResultsLabel.textContent = '高亮结果';
            highlightResultsLabel.style.fontSize = '13px';
            highlightResultsLabel.style.color = '#555';
            highlightResultsLabel.style.display = 'flex';
            highlightResultsLabel.style.alignItems = 'center';
            highlightResultsLabel.style.gap = '4px';
            
            // 区分大小写选项
            caseSensitiveCheckbox = document.createElement('input');
            caseSensitiveCheckbox.id = 'neo4j-case-sensitive';
            caseSensitiveCheckbox.type = 'checkbox';
            caseSensitiveCheckbox.checked = searchConfig.caseSensitive;
            
            const caseSensitiveLabel = document.createElement('label');
            caseSensitiveLabel.htmlFor = 'neo4j-case-sensitive';
            caseSensitiveLabel.textContent = '区分大小写';
            caseSensitiveLabel.style.fontSize = '13px';
            caseSensitiveLabel.style.color = '#555';
            caseSensitiveLabel.style.display = 'flex';
            caseSensitiveLabel.style.alignItems = 'center';
            caseSensitiveLabel.style.gap = '4px';
            
            // 正则表达式选项
            regexCheckbox = document.createElement('input');
            regexCheckbox.id = 'neo4j-use-regex';
            regexCheckbox.type = 'checkbox';
            regexCheckbox.checked = searchConfig.useRegex;
            
            const regexLabel = document.createElement('label');
            regexLabel.htmlFor = 'neo4j-use-regex';
            regexLabel.textContent = '正则表达式';
            regexLabel.style.fontSize = '13px';
            regexLabel.style.color = '#555';
            regexLabel.style.display = 'flex';
            regexLabel.style.alignItems = 'center';
            regexLabel.style.gap = '4px';
            
            filterOptionsContainer.appendChild(highlightResultsCheckbox);
            filterOptionsContainer.appendChild(highlightResultsLabel);
            filterOptionsContainer.appendChild(caseSensitiveCheckbox);
            filterOptionsContainer.appendChild(caseSensitiveLabel);
            filterOptionsContainer.appendChild(regexCheckbox);
            filterOptionsContainer.appendChild(regexLabel);
            
            // 添加到搜索表单
            searchForm.appendChild(searchInputContainer);
            searchForm.appendChild(searchTypeContainer);
            searchForm.appendChild(filterOptionsContainer);
            
            // 搜索历史容器
            searchHistoryContainer = document.createElement('div');
            searchHistoryContainer.id = 'neo4j-search-history';
            searchHistoryContainer.className = 'search-history-container';
            searchHistoryContainer.style.display = 'none'; // 默认隐藏
            
            const historyTitle = document.createElement('div');
            historyTitle.className = 'history-title';
            historyTitle.textContent = '搜索历史';
            historyTitle.style.fontSize = '13px';
            historyTitle.style.fontWeight = 'bold';
            historyTitle.style.color = '#555';
            historyTitle.style.marginBottom = '8px';
            
            const historyList = document.createElement('div');
            historyList.id = 'neo4j-history-list';
            historyList.className = 'history-list';
            historyList.style.maxHeight = '150px';
            historyList.style.overflowY = 'auto';
            
            searchHistoryContainer.appendChild(historyTitle);
            searchHistoryContainer.appendChild(historyList);
            
            // 搜索结果容器
            searchResultsContainer = document.createElement('div');
            searchResultsContainer.id = 'neo4j-search-results';
            searchResultsContainer.className = 'search-results-container';
            searchResultsContainer.style.maxHeight = '300px';
            searchResultsContainer.style.overflowY = 'auto';
            searchResultsContainer.style.borderTop = '1px solid #eee';
            searchResultsContainer.style.paddingTop = '12px';
            searchResultsContainer.style.display = 'none'; // 默认隐藏
            
            // 结果标题
            const resultsTitle = document.createElement('div');
            resultsTitle.id = 'neo4j-results-title';
            resultsTitle.className = 'results-title';
            resultsTitle.style.fontSize = '13px';
            resultsTitle.style.fontWeight = 'bold';
            resultsTitle.style.color = '#555';
            resultsTitle.style.marginBottom = '8px';
            
            // 结果列表
            const resultsList = document.createElement('div');
            resultsList.id = 'neo4j-results-list';
            resultsList.className = 'results-list';
            
            searchResultsContainer.appendChild(resultsTitle);
            searchResultsContainer.appendChild(resultsList);
            
            // 空结果提示
            const emptyResults = document.createElement('div');
            emptyResults.id = 'neo4j-empty-results';
            emptyResults.className = 'empty-results';
            emptyResults.textContent = '没有找到匹配的结果';
            emptyResults.style.fontSize = '13px';
            emptyResults.style.color = '#999';
            emptyResults.style.textAlign = 'center';
            emptyResults.style.padding = '16px';
            emptyResults.style.display = 'none';
            
            searchResultsContainer.appendChild(emptyResults);
            
            // 添加到搜索面板
            searchPanelContainer.appendChild(searchForm);
            searchPanelContainer.appendChild(searchHistoryContainer);
            searchPanelContainer.appendChild(searchResultsContainer);
            
            // 添加关闭按钮
            const closeButton = document.createElement('button');
            closeButton.className = 'search-panel-close';
            closeButton.innerHTML = '&times;';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '8px';
            closeButton.style.right = '8px';
            closeButton.style.width = '24px';
            closeButton.style.height = '24px';
            closeButton.style.border = 'none';
            closeButton.style.borderRadius = '4px';
            closeButton.style.backgroundColor = 'transparent';
            closeButton.style.color = '#666';
            closeButton.style.fontSize = '18px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.display = 'flex';
            closeButton.style.alignItems = 'center';
            closeButton.style.justifyContent = 'center';
            
            closeButton.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#f0f0f0';
                this.style.color = '#333';
            });
            
            closeButton.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'transparent';
                this.style.color = '#666';
            });
            
            searchPanelContainer.appendChild(closeButton);
        } catch (error) {
            console.error('Error initializing search panel container:', error);
        }
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners() {
        try {
            // 搜索输入框事件
            searchInput.addEventListener('input', function() {
                const value = this.value.trim();
                
                // 显示或隐藏清除按钮
                if (value) {
                    clearButton.style.display = 'flex';
                    // 显示搜索历史
                    showSearchHistory();
                } else {
                    clearButton.style.display = 'none';
                    hideSearchResults();
                    // 如果输入框为空，显示搜索历史
                    showSearchHistory();
                }
            });
            
            // 搜索输入框按下回车
            searchInput.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    executeSearch();
                } else if (event.key === 'Escape') {
                    clearSearch();
                }
            });
            
            // 搜索按钮点击
            searchButton.addEventListener('click', function() {
                executeSearch();
            });
            
            // 清除按钮点击
            clearButton.addEventListener('click', function() {
                clearSearch();
            });
            
            // 搜索类型改变
            searchTypeSelect.addEventListener('change', function() {
                currentSearchType = this.value;
                if (currentSearch) {
                    executeSearch();
                }
            });
            
            // 选项改变
            highlightResultsCheckbox.addEventListener('change', function() {
                searchConfig.highlightResults = this.checked;
                if (currentResults.length > 0) {
                    updateHighlighting();
                }
            });
            
            caseSensitiveCheckbox.addEventListener('change', function() {
                searchConfig.caseSensitive = this.checked;
                if (currentSearch) {
                    executeSearch();
                }
            });
            
            regexCheckbox.addEventListener('change', function() {
                searchConfig.useRegex = this.checked;
                if (currentSearch) {
                    executeSearch();
                }
            });
            
            // 监听全局事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.on === 'function') {
                // 监听搜索面板显示/隐藏事件
                neo4jEditor.eventManager.on('searchPanel:toggle', function() {
                    toggleSearchPanel();
                });
                
                // 监听图表数据变化事件
                neo4jEditor.eventManager.on('graph:dataUpdated', function() {
                    if (currentSearch) {
                        executeSearch();
                    }
                });
                
                // 监听节点添加/删除事件
                neo4jEditor.eventManager.on('node:added', function() {
                    if (currentSearch) {
                        executeSearch();
                    }
                });
                
                neo4jEditor.eventManager.on('node:deleted', function() {
                    if (currentSearch) {
                        executeSearch();
                    }
                });
                
                // 监听关系添加/删除事件
                neo4jEditor.eventManager.on('edge:added', function() {
                    if (currentSearch) {
                        executeSearch();
                    }
                });
                
                neo4jEditor.eventManager.on('edge:deleted', function() {
                    if (currentSearch) {
                        executeSearch();
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up search panel event listeners:', error);
        }
    }

    /**
     * 执行搜索
     */
    function executeSearch() {
        try {
            const searchTerm = searchInput.value.trim();
            
            if (!searchTerm) {
                return;
            }
            
            // 更新当前搜索
            currentSearch = searchTerm;
            
            // 添加到搜索历史
            addToSearchHistory(searchTerm);
            
            // 隐藏搜索历史
            hideSearchHistory();
            
            // 触发搜索事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('search:execute', {
                    term: searchTerm,
                    type: currentSearchType,
                    config: searchConfig,
                    callback: handleSearchResults
                });
            } else {
                // 备用搜索方法
                performLocalSearch(searchTerm);
            }
        } catch (error) {
            console.error('Error executing search:', error);
        }
    }

    /**
     * 处理搜索结果
     * @param {Array} results - 搜索结果数组
     */
    function handleSearchResults(results) {
        try {
            currentResults = results || [];
            displaySearchResults(currentResults);
            updateHighlighting();
        } catch (error) {
            console.error('Error handling search results:', error);
        }
    }

    /**
     * 执行本地搜索
     * @param {string} searchTerm - 搜索词
     */
    function performLocalSearch(searchTerm) {
        try {
            const results = [];
            
            // 尝试从图表获取数据
            let graphData = [];
            if (neo4jEditor.dataModel && typeof neo4jEditor.dataModel.getAllElements === 'function') {
                graphData = neo4jEditor.dataModel.getAllElements();
            }
            
            // 过滤数据
            graphData.forEach(element => {
                // 检查元素类型是否匹配当前搜索类型
                const isNode = element.type === 'node' || element.data && element.data.id && !element.data.source && !element.data.target;
                const isRelationship = element.type === 'relationship' || element.data && element.data.id && element.data.source && element.data.target;
                
                if (currentSearchType === 'nodes' && !isNode) return;
                if (currentSearchType === 'relationships' && !isRelationship) return;
                
                // 检查是否匹配搜索条件
                if (matchesSearch(element, searchTerm)) {
                    results.push({
                        id: element.data.id,
                        type: isNode ? 'node' : 'relationship',
                        label: getElementLabel(element),
                        data: element.data
                    });
                }
            });
            
            // 限制结果数量
            currentResults = results.slice(0, searchConfig.maxResults);
            
            // 显示结果
            displaySearchResults(currentResults);
            updateHighlighting();
        } catch (error) {
            console.error('Error performing local search:', error);
        }
    }

    /**
     * 检查元素是否匹配搜索条件
     * @param {Object} element - 元素对象
     * @param {string} searchTerm - 搜索词
     * @returns {boolean} 是否匹配
     */
    function matchesSearch(element, searchTerm) {
        try {
            // 如果搜索词为空，返回false
            if (!searchTerm) {
                return false;
            }
            
            // 获取元素的所有文本内容
            const textToSearch = getElementSearchText(element).join(' ');
            
            // 检查是否匹配
            if (searchConfig.useRegex) {
                // 使用正则表达式
                try {
                    const flags = searchConfig.caseSensitive ? '' : 'i';
                    const regex = new RegExp(searchTerm, flags);
                    return regex.test(textToSearch);
                } catch (e) {
                    console.error('Invalid regex pattern:', searchTerm);
                    return false;
                }
            } else {
                // 使用普通文本搜索
                if (searchConfig.caseSensitive) {
                    return textToSearch.includes(searchTerm);
                } else {
                    return textToSearch.toLowerCase().includes(searchTerm.toLowerCase());
                }
            }
        } catch (error) {
            console.error('Error matching search:', error);
            return false;
        }
    }

    /**
     * 获取元素的搜索文本
     * @param {Object} element - 元素对象
     * @returns {Array} 文本数组
     */
    function getElementSearchText(element) {
        const texts = [];
        
        if (!element || !element.data) {
            return texts;
        }
        
        const data = element.data;
        
        // 添加ID
        if (data.id) {
            texts.push(data.id.toString());
        }
        
        // 添加标签
        if (data.labels && Array.isArray(data.labels)) {
            texts.push(...data.labels);
        } else if (data.label) {
            texts.push(data.label);
        }
        
        // 添加类型（针对关系）
        if (data.type) {
            texts.push(data.type);
        }
        
        // 添加属性
        if (data.properties) {
            Object.keys(data.properties).forEach(key => {
                const value = data.properties[key];
                texts.push(key);
                if (value !== null && value !== undefined) {
                    texts.push(value.toString());
                }
            });
        }
        
        // 添加其他可能的文本字段
        if (data.name) {
            texts.push(data.name);
        }
        
        if (data.title) {
            texts.push(data.title);
        }
        
        return texts;
    }

    /**
     * 获取元素的标签（用于显示）
     * @param {Object} element - 元素对象
     * @returns {string} 元素标签
     */
    function getElementLabel(element) {
        if (!element || !element.data) {
            return 'Unknown';
        }
        
        const data = element.data;
        
        // 优先使用name或title
        if (data.name) {
            return data.name;
        }
        
        if (data.title) {
            return data.title;
        }
        
        // 对于节点，使用第一个标签
        if (data.labels && Array.isArray(data.labels) && data.labels.length > 0) {
            return data.labels[0];
        }
        
        if (data.label) {
            return data.label;
        }
        
        // 对于关系，使用关系类型
        if (data.type) {
            return data.type;
        }
        
        // 最后使用ID
        return data.id ? `ID: ${data.id}` : 'Unknown';
    }

    /**
     * 显示搜索结果
     * @param {Array} results - 搜索结果数组
     */
    function displaySearchResults(results) {
        try {
            const resultsList = document.getElementById('neo4j-results-list');
            const resultsTitle = document.getElementById('neo4j-results-title');
            const emptyResults = document.getElementById('neo4j-empty-results');
            
            if (!resultsList || !resultsTitle || !emptyResults) {
                return;
            }
            
            // 清空结果列表
            resultsList.innerHTML = '';
            
            // 更新结果标题
            resultsTitle.textContent = `搜索结果 (${results.length})`;
            
            // 显示或隐藏空结果提示
            if (results.length === 0) {
                emptyResults.style.display = 'block';
            } else {
                emptyResults.style.display = 'none';
                
                // 添加结果项
                results.forEach(result => {
                    const resultItem = createResultItem(result);
                    resultsList.appendChild(resultItem);
                });
            }
            
            // 显示结果容器
            showSearchResults();
        } catch (error) {
            console.error('Error displaying search results:', error);
        }
    }

    /**
     * 创建结果项
     * @param {Object} result - 搜索结果对象
     * @returns {HTMLElement} 结果项元素
     */
    function createResultItem(result) {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.dataset.id = result.id;
        item.dataset.type = result.type;
        
        Object.assign(item.style, {
            padding: '8px 12px',
            borderBottom: '1px solid #eee',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        });
        
        // 添加类型图标
        const typeIcon = document.createElement('span');
        typeIcon.className = 'result-type-icon';
        typeIcon.textContent = result.type === 'node' ? '●' : '→';
        typeIcon.style.color = result.type === 'node' ? '#6554C0' : '#808080';
        typeIcon.style.fontSize = '16px';
        
        // 添加标签
        const label = document.createElement('span');
        label.className = 'result-label';
        label.textContent = result.label;
        label.style.fontWeight = '500';
        label.style.color = '#333';
        
        // 添加ID
        const id = document.createElement('span');
        id.className = 'result-id';
        id.textContent = `ID: ${result.id}`;
        id.style.fontSize = '12px';
        id.style.color = '#666';
        id.style.marginLeft = 'auto';
        
        item.appendChild(typeIcon);
        item.appendChild(label);
        item.appendChild(id);
        
        // 添加点击事件
        item.addEventListener('click', function() {
            // 选中并聚焦到元素
            focusElement(result.id, result.type);
        });
        
        // 添加悬停效果
        item.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#f5f5f5';
        });
        
        item.addEventListener('mouseout', function() {
            this.style.backgroundColor = 'transparent';
        });
        
        return item;
    }

    /**
     * 聚焦到指定元素
     * @param {string} id - 元素ID
     * @param {string} type - 元素类型 ('node' 或 'relationship')
     */
    function focusElement(id, type) {
        try {
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('element:focus', {
                    id: id,
                    type: type
                });
            }
        } catch (error) {
            console.error('Error focusing element:', error);
        }
    }

    /**
     * 更新高亮
     */
    function updateHighlighting() {
        try {
            if (!searchConfig.highlightResults) {
                clearHighlighting();
                return;
            }
            
            // 触发高亮事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('element:highlight', {
                    elements: currentResults,
                    highlight: true
                });
            }
        } catch (error) {
            console.error('Error updating highlighting:', error);
        }
    }

    /**
     * 清除高亮
     */
    function clearHighlighting() {
        try {
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('element:highlight', {
                    highlight: false
                });
            }
        } catch (error) {
            console.error('Error clearing highlighting:', error);
        }
    }

    /**
     * 添加到搜索历史
     * @param {string} searchTerm - 搜索词
     */
    function addToSearchHistory(searchTerm) {
        try {
            // 如果历史记录中已存在，先移除
            searchHistory = searchHistory.filter(item => item !== searchTerm);
            
            // 添加到历史记录开头
            searchHistory.unshift(searchTerm);
            
            // 限制历史记录大小
            if (searchHistory.length > MAX_HISTORY_SIZE) {
                searchHistory = searchHistory.slice(0, MAX_HISTORY_SIZE);
            }
            
            // 保存历史记录
            saveSearchHistory();
            
            // 更新历史记录显示
            updateSearchHistoryDisplay();
        } catch (error) {
            console.error('Error adding to search history:', error);
        }
    }

    /**
     * 加载搜索历史
     */
    function loadSearchHistory() {
        try {
            if (typeof localStorage !== 'undefined') {
                const savedHistory = localStorage.getItem('neo4j-editor-search-history');
                if (savedHistory) {
                    searchHistory = JSON.parse(savedHistory);
                    updateSearchHistoryDisplay();
                }
            }
        } catch (error) {
            console.error('Error loading search history:', error);
            searchHistory = [];
        }
    }

    /**
     * 保存搜索历史
     */
    function saveSearchHistory() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('neo4j-editor-search-history', JSON.stringify(searchHistory));
            }
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    /**
     * 更新搜索历史显示
     */
    function updateSearchHistoryDisplay() {
        try {
            const historyList = document.getElementById('neo4j-history-list');
            
            if (!historyList) {
                return;
            }
            
            // 清空历史列表
            historyList.innerHTML = '';
            
            // 添加历史项
            searchHistory.forEach(term => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.textContent = term;
                
                Object.assign(historyItem.style, {
                    padding: '6px 12px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#555',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                });
                
                // 添加点击事件
                historyItem.addEventListener('click', function() {
                    searchInput.value = this.textContent;
                    clearButton.style.display = 'flex';
                    executeSearch();
                });
                
                // 添加悬停效果
                historyItem.addEventListener('mouseover', function() {
                    this.style.backgroundColor = '#f5f5f5';
                    this.style.color = '#333';
                });
                
                historyItem.addEventListener('mouseout', function() {
                    this.style.backgroundColor = 'transparent';
                    this.style.color = '#555';
                });
                
                historyList.appendChild(historyItem);
            });
            
            // 如果有历史记录，显示清除历史按钮
            if (searchHistory.length > 0 && !document.querySelector('.clear-history-button')) {
                const clearHistoryButton = document.createElement('button');
                clearHistoryButton.className = 'clear-history-button';
                clearHistoryButton.textContent = '清除历史';
                
                Object.assign(clearHistoryButton.style, {
                    marginTop: '8px',
                    padding: '4px 8px',
                    border: 'none',
                    backgroundColor: '#f0f0f0',
                    color: '#666',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '4px'
                });
                
                clearHistoryButton.addEventListener('click', function() {
                    clearSearchHistory();
                });
                
                searchHistoryContainer.appendChild(clearHistoryButton);
            }
        } catch (error) {
            console.error('Error updating search history display:', error);
        }
    }

    /**
     * 清除搜索历史
     */
    function clearSearchHistory() {
        try {
            searchHistory = [];
            saveSearchHistory();
            updateSearchHistoryDisplay();
            
            // 如果有清除历史按钮，移除它
            const clearHistoryButton = document.querySelector('.clear-history-button');
            if (clearHistoryButton && clearHistoryButton.parentNode) {
                clearHistoryButton.parentNode.removeChild(clearHistoryButton);
            }
        } catch (error) {
            console.error('Error clearing search history:', error);
        }
    }

    /**
     * 清除搜索
     */
    function clearSearch() {
        try {
            // 清空输入框
            searchInput.value = '';
            clearButton.style.display = 'none';
            
            // 重置当前搜索
            currentSearch = '';
            currentResults = [];
            
            // 隐藏搜索结果，显示搜索历史
            hideSearchResults();
            showSearchHistory();
            
            // 清除高亮
            clearHighlighting();
        } catch (error) {
            console.error('Error clearing search:', error);
        }
    }

    /**
     * 显示搜索面板
     */
    function showSearchPanel() {
        try {
            if (searchPanelContainer) {
                searchPanelContainer.style.display = 'flex';
                
                // 聚焦到搜索输入框
                if (searchInput) {
                    searchInput.focus();
                }
                
                // 显示搜索历史（如果搜索框为空）
                if (!searchInput.value.trim()) {
                    showSearchHistory();
                }
                
                // 触发事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('searchPanel:shown', {});
                }
            }
        } catch (error) {
            console.error('Error showing search panel:', error);
        }
    }

    /**
     * 隐藏搜索面板
     */
    function hideSearchPanel() {
        try {
            if (searchPanelContainer) {
                searchPanelContainer.style.display = 'none';
                
                // 触发事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('searchPanel:hidden', {});
                }
            }
        } catch (error) {
            console.error('Error hiding search panel:', error);
        }
    }

    /**
     * 切换搜索面板可见性
     */
    function toggleSearchPanel() {
        try {
            if (searchPanelContainer.style.display === 'none' || !searchPanelContainer.style.display) {
                showSearchPanel();
            } else {
                hideSearchPanel();
            }
        } catch (error) {
            console.error('Error toggling search panel visibility:', error);
        }
    }

    /**
     * 显示搜索结果
     */
    function showSearchResults() {
        if (searchResultsContainer) {
            searchResultsContainer.style.display = 'block';
        }
        
        if (searchHistoryContainer) {
            searchHistoryContainer.style.display = 'none';
        }
    }

    /**
     * 隐藏搜索结果
     */
    function hideSearchResults() {
        if (searchResultsContainer) {
            searchResultsContainer.style.display = 'none';
        }
    }

    /**
     * 显示搜索历史
     */
    function showSearchHistory() {
        if (searchHistoryContainer && searchHistory.length > 0) {
            searchHistoryContainer.style.display = 'block';
        }
        
        if (searchResultsContainer) {
            searchResultsContainer.style.display = 'none';
        }
    }

    /**
     * 隐藏搜索历史
     */
    function hideSearchHistory() {
        if (searchHistoryContainer) {
            searchHistoryContainer.style.display = 'none';
        }
    }

    /**
     * 清理资源
     */
    function cleanup() {
        try {
            // 清除高亮
            clearHighlighting();
            
            // 清除搜索
            clearSearch();
            
            // 移除事件监听
            if (searchInput) {
                searchInput.removeEventListener('input', function() {});
                searchInput.removeEventListener('keydown', function() {});
            }
            
            if (searchButton) {
                searchButton.removeEventListener('click', function() {});
            }
            
            if (clearButton) {
                clearButton.removeEventListener('click', function() {});
            }
            
            if (searchTypeSelect) {
                searchTypeSelect.removeEventListener('change', function() {});
            }
            
            // 重置状态
            initialized = false;
            currentSearch = '';
            currentSearchType = 'all';
            currentResults = [];
            
            console.log('Search Panel Module: Resources cleaned up');
        } catch (error) {
            console.error('Error cleaning up search panel resources:', error);
        }
    }

    /**
     * 搜索面板模块
     */
    const searchPanelModule = {
        // 模块版本
        version: '1.0.0',
        
        // 初始化状态
        initialized: initialized,
        
        /**
         * 初始化模块
         * @param {Object} config - 配置对象
         * @returns {boolean} 初始化是否成功
         */
        initialize: function(config = {}) {
            return initialize(config);
        },
        
        /**
         * 显示搜索面板
         */
        show: function() {
            showSearchPanel();
        },
        
        /**
         * 隐藏搜索面板
         */
        hide: function() {
            hideSearchPanel();
        },
        
        /**
         * 切换搜索面板可见性
         */
        toggle: function() {
            toggleSearchPanel();
        },
        
        /**
         * 执行搜索
         * @param {string} searchTerm - 搜索词
         * @param {string} type - 搜索类型
         */
        search: function(searchTerm, type = null) {
            if (type) {
                currentSearchType = type;
                if (searchTypeSelect) {
                    searchTypeSelect.value = type;
                }
            }
            
            if (searchInput) {
                searchInput.value = searchTerm;
                clearButton.style.display = 'flex';
            }
            
            executeSearch();
        },
        
        /**
         * 清除搜索
         */
        clear: function() {
            clearSearch();
        },
        
        /**
         * 获取当前搜索结果
         * @returns {Array} 搜索结果数组
         */
        getResults: function() {
            return currentResults.slice();
        },
        
        /**
         * 获取搜索历史
         * @returns {Array} 搜索历史数组
         */
        getHistory: function() {
            return searchHistory.slice();
        },
        
        /**
         * 清除搜索历史
         */
        clearHistory: function() {
            clearSearchHistory();
        },
        
        /**
         * 设置搜索配置
         * @param {Object} config - 配置对象
         */
        setConfig: function(config) {
            searchConfig = { ...searchConfig, ...config };
        },
        
        /**
         * 获取搜索配置
         * @returns {Object} 配置对象
         */
        getConfig: function() {
            return { ...searchConfig };
        },
        
        /**
         * 清理资源
         */
        cleanup: function() {
            cleanup();
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.searchPanel = searchPanelModule;
    
    // 创建向后兼容函数
    /**
     * 创建向后兼容函数
     * @param {string} deprecatedName - 旧函数名称
     * @param {Function} newFunction - 新函数实现
     * @param {Object} context - 函数执行上下文
     */
    function createBackwardCompatibilityFunction(deprecatedName, newFunction, context) {
        if (typeof deprecatedName !== 'string' || deprecatedName.trim() === '') {
            console.error('createBackwardCompatibilityFunction: 无效的deprecatedName参数');
            return null;
        }
        
        if (typeof newFunction !== 'function') {
            console.error('createBackwardCompatibilityFunction: 无效的newFunction参数');
            return null;
        }
        
        return function() {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.searchPanel.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'initializeSearchPanel', newFunction: searchPanelModule.initialize, context: searchPanelModule },
        { deprecatedName: 'showSearchPanel', newFunction: searchPanelModule.show, context: searchPanelModule },
        { deprecatedName: 'hideSearchPanel', newFunction: searchPanelModule.hide, context: searchPanelModule },
        { deprecatedName: 'toggleSearchPanel', newFunction: searchPanelModule.toggle, context: searchPanelModule },
        { deprecatedName: 'executeSearch', newFunction: searchPanelModule.search, context: searchPanelModule },
        { deprecatedName: 'clearSearch', newFunction: searchPanelModule.clear, context: searchPanelModule },
        { deprecatedName: 'getSearchResults', newFunction: searchPanelModule.getResults, context: searchPanelModule },
        { deprecatedName: 'getSearchHistory', newFunction: searchPanelModule.getHistory, context: searchPanelModule },
        { deprecatedName: 'clearSearchHistory', newFunction: searchPanelModule.clearHistory, context: searchPanelModule },
        { deprecatedName: 'setSearchConfig', newFunction: searchPanelModule.setConfig, context: searchPanelModule },
        { deprecatedName: 'getSearchConfig', newFunction: searchPanelModule.getConfig, context: searchPanelModule },
        { deprecatedName: 'cleanupSearchPanel', newFunction: searchPanelModule.cleanup, context: searchPanelModule }
    ];
    
    // 注册全局向后兼容函数
    backwardCompatibilityMapping.forEach(funcInfo => {
        try {
            if (typeof window[funcInfo.deprecatedName] === 'undefined') {
                window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
                    funcInfo.deprecatedName,
                    funcInfo.newFunction,
                    funcInfo.context
                );
            }
        } catch (error) {
            console.error(`注册向后兼容函数 ${funcInfo.deprecatedName} 失败:`, error);
        }
    });
    
    // 定义模块名称和注册信息
    const moduleName = 'ui/searchPanel';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager'],
        module: searchPanelModule
    };
    
    // 使用统一的模块注册方法
    if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
        try {
            window.neo4jEditor.registerModule(moduleRegistrationInfo);
            console.log(`Neo4j Editor: ${moduleName} module registered successfully`);
        } catch (registrationError) {
            console.error(`Neo4j Editor: Failed to register ${moduleName} module:`, registrationError);
            
            // 降级方案：直接注册到modules对象
            try {
                if (typeof window.neo4jEditor.modules[moduleName] === 'undefined') {
                    window.neo4jEditor.modules[moduleName] = {
                        name: moduleRegistrationInfo.name,
                        version: moduleRegistrationInfo.version,
                        initialized: searchPanelModule.initialized,
                        dependencies: moduleRegistrationInfo.dependencies,
                        module: moduleRegistrationInfo.module
                    };
                    console.log(`Neo4j Editor: ${moduleName} module registered via fallback to modules object`);
                }
            } catch (fallbackError) {
                // 终极降级方案：直接挂载到全局
                if (typeof window.appModule === 'undefined') {
                    window.appModule = {};
                }
                window.appModule.searchPanel = searchPanelModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.searchPanel = searchPanelModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = searchPanelModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = searchPanelModule;
        exports.default = searchPanelModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager'], function() {
            return searchPanelModule;
        });
    }
    
    return searchPanelModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));