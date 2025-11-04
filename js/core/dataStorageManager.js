/**
 * 数据存储管理器模块
 * 负责管理图表数据的本地存储和持久化
 */
neo4jEditor.define('dataStorageManager', ['eventBus'], function(eventBus) {
    'use strict';
    
    // 存储配置
    const storageConfig = {
        enabled: true,
        providers: {
            localStorage: {
                enabled: true,
                prefix: 'neo4jEditor_',
                maxSize: 5 * 1024 * 1024 // 5MB
            },
            sessionStorage: {
                enabled: true,
                prefix: 'neo4jEditor_session_',
                maxSize: 5 * 1024 * 1024 // 5MB
            },
            indexedDB: {
                enabled: true,
                dbName: 'Neo4jEditorDB',
                dbVersion: 1,
                storeName: 'graphData'
            }
        },
        autoSave: {
            enabled: true,
            interval: 30000, // 30秒
            debounceTime: 1000 // 1秒防抖
        },
        maxStoredItems: 10,
        encryption: {
            enabled: false,
            key: ''
        }
    };
    
    // 存储状态
    const storageState = {
        currentProvider: 'localStorage',
        lastSaveTime: null,
        lastLoadTime: null,
        autoSaveTimer: null,
        pendingSave: false,
        saving: false
    };
    
    // 存储项目
    let storedProjects = [];
    
    // IndexedDB数据库引用
    let db = null;
    
    /**
     * 初始化存储管理器
     */
    function initialize(options) {
        try {
            // 合并配置
            if (options) {
                deepMerge(storageConfig, options);
            }
            
            console.log('Data Storage Manager: Initializing with provider:', storageState.currentProvider);
            
            // 初始化IndexedDB（如果启用）
            if (storageConfig.providers.indexedDB.enabled && checkIndexedDBSupport()) {
                initIndexedDB();
            }
            
            // 加载存储的项目列表
            loadProjectsList();
            
            // 设置自动保存（如果启用）
            if (storageConfig.autoSave.enabled) {
                setupAutoSave();
            }
            
            // 注册事件监听器
            registerEventListeners();
            
            return true;
        } catch (error) {
            console.error('Data Storage Manager: Error during initialization:', error);
            return false;
        }
    }
    
    /**
     * 注册事件监听器
     */
    function registerEventListeners() {
        try {
            if (eventManager && typeof eventManager.on === 'function') {
                // 监听数据变更事件
                eventManager.on('graphDataChanged', handleGraphDataChanged);
                eventManager.on('nodeAdded', handleNodeAdded);
                eventManager.on('edgeAdded', handleEdgeAdded);
                eventManager.on('nodeRemoved', handleNodeRemoved);
                eventManager.on('edgeRemoved', handleEdgeRemoved);
                eventManager.on('elementUpdated', handleElementUpdated);
                
                // 监听存储相关事件
                eventManager.on('storageManager:saveProject', handleSaveProject);
                eventManager.on('storageManager:loadProject', handleLoadProject);
                eventManager.on('storageManager:deleteProject', handleDeleteProject);
                eventManager.on('storageManager:listProjects', handleListProjects);
                eventManager.on('storageManager:clearAll', handleClearAll);
                eventManager.on('storageManager:switchProvider', handleSwitchProvider);
                
                console.log('Data Storage Manager: Event listeners registered');
            }
        } catch (error) {
            console.error('Data Storage Manager: Error registering event listeners:', error);
        }
    }
    
    /**
     * 处理图表数据变更
     */
    function handleGraphDataChanged() {
        if (storageConfig.autoSave.enabled) {
            debouncedSave();
        }
    }
    
    /**
     * 处理节点添加
     */
    function handleNodeAdded() {
        if (storageConfig.autoSave.enabled) {
            debouncedSave();
        }
    }
    
    /**
     * 处理边添加
     */
    function handleEdgeAdded() {
        if (storageConfig.autoSave.enabled) {
            debouncedSave();
        }
    }
    
    /**
     * 处理节点删除
     */
    function handleNodeRemoved() {
        if (storageConfig.autoSave.enabled) {
            debouncedSave();
        }
    }
    
    /**
     * 处理边删除
     */
    function handleEdgeRemoved() {
        if (storageConfig.autoSave.enabled) {
            debouncedSave();
        }
    }
    
    /**
     * 处理元素更新
     */
    function handleElementUpdated() {
        if (storageConfig.autoSave.enabled) {
            debouncedSave();
        }
    }
    
    /**
     * 防抖保存
     */
    let debouncedSaveTimeout;
    function debouncedSave() {
        clearTimeout(debouncedSaveTimeout);
        debouncedSaveTimeout = setTimeout(() => {
            saveProject('autosave');
        }, storageConfig.autoSave.debounceTime);
    }
    
    /**
     * 设置自动保存
     */
    function setupAutoSave() {
        // 清除现有的定时器
        if (storageState.autoSaveTimer) {
            clearInterval(storageState.autoSaveTimer);
        }
        
        // 设置新的定时器
        storageState.autoSaveTimer = setInterval(() => {
            saveProject('autosave');
        }, storageConfig.autoSave.interval);
        
        console.log('Data Storage Manager: Auto-save configured with interval:', storageConfig.autoSave.interval, 'ms');
    }
    
    /**
     * 检查IndexedDB支持
     */
    function checkIndexedDBSupport() {
        return 'indexedDB' in window && window.indexedDB !== null;
    }
    
    /**
     * 初始化IndexedDB
     */
    function initIndexedDB() {
        if (!checkIndexedDBSupport()) {
            console.warn('Data Storage Manager: IndexedDB is not supported');
            return;
        }
        
        const request = indexedDB.open(storageConfig.providers.indexedDB.dbName, storageConfig.providers.indexedDB.dbVersion);
        
        request.onerror = (event) => {
            console.error('Data Storage Manager: Error opening IndexedDB:', event.target.error);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Data Storage Manager: IndexedDB initialized successfully');
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            
            // 创建存储对象
            if (!db.objectStoreNames.contains(storageConfig.providers.indexedDB.storeName)) {
                const objectStore = db.createObjectStore(storageConfig.providers.indexedDB.storeName, { keyPath: 'id' });
                objectStore.createIndex('name', 'name', { unique: false });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    }
    
    /**
     * 保存项目
     */
    function saveProject(projectName, data) {
        if (!storageConfig.enabled) {
            console.warn('Data Storage Manager: Storage is disabled');
            return Promise.reject(new Error('Storage is disabled'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                // 如果正在保存，等待
                if (storageState.saving) {
                    storageState.pendingSave = true;
                    return resolve({ status: 'pending' });
                }
                
                storageState.saving = true;
                
                // 如果没有提供数据，从图表渲染器获取
                if (!data && neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.getElements === 'function') {
                    data = neo4jEditor.graphRenderer.getElements();
                }
                
                if (!data) {
                    throw new Error('No data to save');
                }
                
                const project = {
                    id: generateId(),
                    name: projectName || `Project_${new Date().toISOString().slice(0, 10)}`,
                    data: data,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        nodeCount: data.nodes ? data.nodes.length : 0,
                        edgeCount: data.edges ? data.edges.length : 0,
                        version: '1.0'
                    }
                };
                
                // 根据当前提供者保存数据
                saveDataToProvider(project)
                    .then(() => {
                        // 更新项目列表
                        updateProjectsList(project);
                        
                        storageState.lastSaveTime = new Date();
                        storageState.saving = false;
                        
                        // 触发保存完成事件
                        if (eventManager && typeof eventManager.trigger === 'function') {
                            eventManager.trigger('storageManager:projectSaved', { projectName: project.name, projectId: project.id });
                        }
                        
                        resolve({ success: true, projectId: project.id });
                        
                        // 检查是否有待处理的保存
                        if (storageState.pendingSave) {
                            storageState.pendingSave = false;
                            saveProject('autosave');
                        }
                    })
                    .catch(error => {
                        storageState.saving = false;
                        reject(error);
                    });
            } catch (error) {
                storageState.saving = false;
                reject(error);
            }
        });
    }
    
    /**
     * 加载项目
     */
    function loadProject(projectId) {
        if (!storageConfig.enabled) {
            console.warn('Data Storage Manager: Storage is disabled');
            return Promise.reject(new Error('Storage is disabled'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                loadDataFromProvider(projectId)
                    .then(project => {
                        if (!project || !project.data) {
                            throw new Error('Project not found or invalid');
                        }
                        
                        storageState.lastLoadTime = new Date();
                        
                        // 触发加载完成事件
                        if (eventManager && typeof eventManager.trigger === 'function') {
                            eventManager.trigger('storageManager:projectLoaded', { 
                                projectName: project.name, 
                                projectId: project.id,
                                data: project.data 
                            });
                        }
                        
                        resolve(project.data);
                    })
                    .catch(error => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 删除项目
     */
    function deleteProject(projectId) {
        if (!storageConfig.enabled) {
            console.warn('Data Storage Manager: Storage is disabled');
            return Promise.reject(new Error('Storage is disabled'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                deleteDataFromProvider(projectId)
                    .then(() => {
                        // 从项目列表中移除
                        storedProjects = storedProjects.filter(project => project.id !== projectId);
                        saveProjectsList();
                        
                        // 触发删除完成事件
                        if (eventManager && typeof eventManager.trigger === 'function') {
                            eventManager.trigger('storageManager:projectDeleted', { projectId });
                        }
                        
                        resolve({ success: true });
                    })
                    .catch(error => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 列出所有项目
     */
    function listProjects() {
        return new Promise((resolve) => {
            resolve([...storedProjects]);
        });
    }
    
    /**
     * 清除所有数据
     */
    function clearAll() {
        if (!storageConfig.enabled) {
            console.warn('Data Storage Manager: Storage is disabled');
            return Promise.reject(new Error('Storage is disabled'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                // 清除当前提供者的数据
                clearProviderData()
                    .then(() => {
                        storedProjects = [];
                        saveProjectsList();
                        
                        // 触发清除完成事件
                        if (eventManager && typeof eventManager.trigger === 'function') {
                            eventManager.trigger('storageManager:allCleared');
                        }
                        
                        resolve({ success: true });
                    })
                    .catch(error => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 切换存储提供者
     */
    function switchProvider(providerName) {
        if (!storageConfig.providers[providerName] || !storageConfig.providers[providerName].enabled) {
            console.error('Data Storage Manager: Provider not available or disabled:', providerName);
            return false;
        }
        
        storageState.currentProvider = providerName;
        console.log('Data Storage Manager: Switched to provider:', providerName);
        
        // 重新加载项目列表
        loadProjectsList();
        
        return true;
    }
    
    /**
     * 保存数据到当前提供者
     */
    function saveDataToProvider(project) {
        return new Promise((resolve, reject) => {
            try {
                switch (storageState.currentProvider) {
                    case 'localStorage':
                        saveToLocalStorage(project);
                        resolve();
                        break;
                    case 'sessionStorage':
                        saveToSessionStorage(project);
                        resolve();
                        break;
                    case 'indexedDB':
                        saveToIndexedDB(project).then(resolve).catch(reject);
                        break;
                    default:
                        reject(new Error('Unknown storage provider'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 从当前提供者加载数据
     */
    function loadDataFromProvider(projectId) {
        return new Promise((resolve, reject) => {
            try {
                switch (storageState.currentProvider) {
                    case 'localStorage':
                        resolve(loadFromLocalStorage(projectId));
                        break;
                    case 'sessionStorage':
                        resolve(loadFromSessionStorage(projectId));
                        break;
                    case 'indexedDB':
                        loadFromIndexedDB(projectId).then(resolve).catch(reject);
                        break;
                    default:
                        reject(new Error('Unknown storage provider'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 从当前提供者删除数据
     */
    function deleteDataFromProvider(projectId) {
        return new Promise((resolve, reject) => {
            try {
                switch (storageState.currentProvider) {
                    case 'localStorage':
                        deleteFromLocalStorage(projectId);
                        resolve();
                        break;
                    case 'sessionStorage':
                        deleteFromSessionStorage(projectId);
                        resolve();
                        break;
                    case 'indexedDB':
                        deleteFromIndexedDB(projectId).then(resolve).catch(reject);
                        break;
                    default:
                        reject(new Error('Unknown storage provider'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 清除当前提供者的所有数据
     */
    function clearProviderData() {
        return new Promise((resolve, reject) => {
            try {
                switch (storageState.currentProvider) {
                    case 'localStorage':
                        clearLocalStorage();
                        resolve();
                        break;
                    case 'sessionStorage':
                        clearSessionStorage();
                        resolve();
                        break;
                    case 'indexedDB':
                        clearIndexedDB().then(resolve).catch(reject);
                        break;
                    default:
                        reject(new Error('Unknown storage provider'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 保存到localStorage
     */
    function saveToLocalStorage(project) {
        if (!storageConfig.providers.localStorage.enabled || typeof localStorage === 'undefined') {
            throw new Error('localStorage is not available');
        }
        
        const key = `${storageConfig.providers.localStorage.prefix}project_${project.id}`;
        const data = JSON.stringify(project);
        
        // 检查大小限制
        if (data.length > storageConfig.providers.localStorage.maxSize) {
            throw new Error('Project exceeds storage size limit');
        }
        
        localStorage.setItem(key, data);
    }
    
    /**
     * 从localStorage加载
     */
    function loadFromLocalStorage(projectId) {
        if (!storageConfig.providers.localStorage.enabled || typeof localStorage === 'undefined') {
            throw new Error('localStorage is not available');
        }
        
        const key = `${storageConfig.providers.localStorage.prefix}project_${projectId}`;
        const data = localStorage.getItem(key);
        
        return data ? JSON.parse(data) : null;
    }
    
    /**
     * 从localStorage删除
     */
    function deleteFromLocalStorage(projectId) {
        if (!storageConfig.providers.localStorage.enabled || typeof localStorage === 'undefined') {
            throw new Error('localStorage is not available');
        }
        
        const key = `${storageConfig.providers.localStorage.prefix}project_${projectId}`;
        localStorage.removeItem(key);
    }
    
    /**
     * 清除localStorage
     */
    function clearLocalStorage() {
        if (!storageConfig.providers.localStorage.enabled || typeof localStorage === 'undefined') {
            throw new Error('localStorage is not available');
        }
        
        const prefix = storageConfig.providers.localStorage.prefix;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });
    }
    
    /**
     * 保存到sessionStorage
     */
    function saveToSessionStorage(project) {
        if (!storageConfig.providers.sessionStorage.enabled || typeof sessionStorage === 'undefined') {
            throw new Error('sessionStorage is not available');
        }
        
        const key = `${storageConfig.providers.sessionStorage.prefix}project_${project.id}`;
        const data = JSON.stringify(project);
        
        // 检查大小限制
        if (data.length > storageConfig.providers.sessionStorage.maxSize) {
            throw new Error('Project exceeds storage size limit');
        }
        
        sessionStorage.setItem(key, data);
    }
    
    /**
     * 从sessionStorage加载
     */
    function loadFromSessionStorage(projectId) {
        if (!storageConfig.providers.sessionStorage.enabled || typeof sessionStorage === 'undefined') {
            throw new Error('sessionStorage is not available');
        }
        
        const key = `${storageConfig.providers.sessionStorage.prefix}project_${projectId}`;
        const data = sessionStorage.getItem(key);
        
        return data ? JSON.parse(data) : null;
    }
    
    /**
     * 从sessionStorage删除
     */
    function deleteFromSessionStorage(projectId) {
        if (!storageConfig.providers.sessionStorage.enabled || typeof sessionStorage === 'undefined') {
            throw new Error('sessionStorage is not available');
        }
        
        const key = `${storageConfig.providers.sessionStorage.prefix}project_${projectId}`;
        sessionStorage.removeItem(key);
    }
    
    /**
     * 清除sessionStorage
     */
    function clearSessionStorage() {
        if (!storageConfig.providers.sessionStorage.enabled || typeof sessionStorage === 'undefined') {
            throw new Error('sessionStorage is not available');
        }
        
        const prefix = storageConfig.providers.sessionStorage.prefix;
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith(prefix)) {
                sessionStorage.removeItem(key);
            }
        });
    }
    
    /**
     * 保存到IndexedDB
     */
    function saveToIndexedDB(project) {
        return new Promise((resolve, reject) => {
            if (!storageConfig.providers.indexedDB.enabled || !db) {
                reject(new Error('IndexedDB is not available'));
                return;
            }
            
            const transaction = db.transaction([storageConfig.providers.indexedDB.storeName], 'readwrite');
            const objectStore = transaction.objectStore(storageConfig.providers.indexedDB.storeName);
            
            // 尝试更新或添加
            const request = objectStore.put(project);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = () => {
                resolve();
            };
        });
    }
    
    /**
     * 从IndexedDB加载
     */
    function loadFromIndexedDB(projectId) {
        return new Promise((resolve, reject) => {
            if (!storageConfig.providers.indexedDB.enabled || !db) {
                reject(new Error('IndexedDB is not available'));
                return;
            }
            
            const transaction = db.transaction([storageConfig.providers.indexedDB.storeName], 'readonly');
            const objectStore = transaction.objectStore(storageConfig.providers.indexedDB.storeName);
            const request = objectStore.get(projectId);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = () => {
                resolve(request.result);
            };
        });
    }
    
    /**
     * 从IndexedDB删除
     */
    function deleteFromIndexedDB(projectId) {
        return new Promise((resolve, reject) => {
            if (!storageConfig.providers.indexedDB.enabled || !db) {
                reject(new Error('IndexedDB is not available'));
                return;
            }
            
            const transaction = db.transaction([storageConfig.providers.indexedDB.storeName], 'readwrite');
            const objectStore = transaction.objectStore(storageConfig.providers.indexedDB.storeName);
            const request = objectStore.delete(projectId);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = () => {
                resolve();
            };
        });
    }
    
    /**
     * 清除IndexedDB
     */
    function clearIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!storageConfig.providers.indexedDB.enabled || !db) {
                reject(new Error('IndexedDB is not available'));
                return;
            }
            
            const transaction = db.transaction([storageConfig.providers.indexedDB.storeName], 'readwrite');
            const objectStore = transaction.objectStore(storageConfig.providers.indexedDB.storeName);
            const request = objectStore.clear();
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = () => {
                resolve();
            };
        });
    }
    
    /**
     * 加载项目列表
     */
    function loadProjectsList() {
        try {
            let listKey;
            let storage;
            
            switch (storageState.currentProvider) {
                case 'localStorage':
                    if (typeof localStorage === 'undefined') return;
                    listKey = `${storageConfig.providers.localStorage.prefix}projectsList`;
                    storage = localStorage;
                    break;
                case 'sessionStorage':
                    if (typeof sessionStorage === 'undefined') return;
                    listKey = `${storageConfig.providers.sessionStorage.prefix}projectsList`;
                    storage = sessionStorage;
                    break;
                default:
                    return;
            }
            
            const listData = storage.getItem(listKey);
            if (listData) {
                storedProjects = JSON.parse(listData);
                // 确保是数组
                if (!Array.isArray(storedProjects)) {
                    storedProjects = [];
                }
            }
        } catch (error) {
            console.error('Data Storage Manager: Error loading projects list:', error);
            storedProjects = [];
        }
    }
    
    /**
     * 保存项目列表
     */
    function saveProjectsList() {
        try {
            let listKey;
            let storage;
            
            switch (storageState.currentProvider) {
                case 'localStorage':
                    if (typeof localStorage === 'undefined') return;
                    listKey = `${storageConfig.providers.localStorage.prefix}projectsList`;
                    storage = localStorage;
                    break;
                case 'sessionStorage':
                    if (typeof sessionStorage === 'undefined') return;
                    listKey = `${storageConfig.providers.sessionStorage.prefix}projectsList`;
                    storage = sessionStorage;
                    break;
                default:
                    return;
            }
            
            storage.setItem(listKey, JSON.stringify(storedProjects));
        } catch (error) {
            console.error('Data Storage Manager: Error saving projects list:', error);
        }
    }
    
    /**
     * 更新项目列表
     */
    function updateProjectsList(project) {
        try {
            // 检查是否已存在
            const existingIndex = storedProjects.findIndex(p => p.id === project.id);
            
            if (existingIndex >= 0) {
                // 更新现有项目
                storedProjects[existingIndex] = {
                    id: project.id,
                    name: project.name,
                    timestamp: project.timestamp,
                    metadata: project.metadata
                };
            } else {
                // 添加新项目
                storedProjects.push({
                    id: project.id,
                    name: project.name,
                    timestamp: project.timestamp,
                    metadata: project.metadata
                });
                
                // 限制项目数量
                if (storedProjects.length > storageConfig.maxStoredItems) {
                    const oldestProject = storedProjects.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
                    deleteProject(oldestProject.id).catch(() => {});
                }
            }
            
            // 按时间戳排序（最新的在前）
            storedProjects.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // 保存更新后的列表
            saveProjectsList();
        } catch (error) {
            console.error('Data Storage Manager: Error updating projects list:', error);
        }
    }
    
    /**
     * 生成唯一ID
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * 深度合并对象
     */
    function deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }
    
    /**
     * 处理保存项目事件
     */
    function handleSaveProject(event, data) {
        const { projectName, data: projectData } = data;
        saveProject(projectName, projectData)
            .then(result => {
                if (eventManager && typeof eventManager.trigger === 'function') {
                    eventManager.trigger('storageManager:saveCompleted', result);
                }
            })
            .catch(error => {
                if (eventManager && typeof eventManager.trigger === 'function') {
                    eventManager.trigger('storageManager:error', { operation: 'save', error });
                }
            });
    }
    
    /**
     * 处理加载项目事件
     */
    function handleLoadProject(event, data) {
        const { projectId } = data;
        loadProject(projectId)
            .then(projectData => {
                // 将数据应用到图表
                if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.clearGraph === 'function' &&
                    typeof neo4jEditor.graphRenderer.addElements === 'function') {
                    neo4jEditor.graphRenderer.clearGraph();
                    neo4jEditor.graphRenderer.addElements(projectData);
                    
                    // 应用布局
                    if (neo4jEditor.layoutManager && typeof neo4jEditor.layoutManager.runLayout === 'function') {
                        neo4jEditor.layoutManager.runLayout();
                    }
                }
                
                if (eventManager && typeof eventManager.trigger === 'function') {
                    eventManager.trigger('storageManager:loadCompleted', { projectId });
                }
            })
            .catch(error => {
                if (eventManager && typeof eventManager.trigger === 'function') {
                    eventManager.trigger('storageManager:error', { operation: 'load', error });
                }
            });
    }
    
    /**
     * 处理删除项目事件
     */
    function handleDeleteProject(event, data) {
        const { projectId } = data;
        deleteProject(projectId)
            .then(() => {
                if (eventManager && typeof eventManager.trigger === 'function') {
                    eventManager.trigger('storageManager:deleteCompleted', { projectId });
                }
            })
            .catch(error => {
                if (eventManager && typeof eventManager.trigger === 'function') {
                    eventManager.trigger('storageManager:error', { operation: 'delete', error });
                }
            });
    }
    
    /**
     * 处理列出项目事件
     */
    function handleListProjects() {
        listProjects()
            .then(projects => {
                if (eventManager && typeof eventManager.trigger === 'function') {
                    eventManager.trigger('storageManager:projectsList', { projects });
                }
            });
    }
    
    /**
     * 处理清除所有事件
     */
    function handleClearAll() {
        clearAll()
            .then(() => {
                if (eventManager && typeof eventManager.trigger === 'function') {
                    eventManager.trigger('storageManager:clearCompleted');
                }
            })
            .catch(error => {
                if (eventManager && typeof eventManager.trigger === 'function') {
                    eventManager.trigger('storageManager:error', { operation: 'clear', error });
                }
            });
    }
    
    /**
     * 处理切换提供者事件
     */
    function handleSwitchProvider(event, data) {
        const { providerName } = data;
        const success = switchProvider(providerName);
        
        if (eventManager && typeof eventManager.trigger === 'function') {
            eventManager.trigger('storageManager:providerSwitched', { 
                providerName, 
                success 
            });
        }
    }
    
    /**
     * 导出公共API
     */
    return {
        initialize,
        saveProject,
        loadProject,
        deleteProject,
        listProjects,
        clearAll,
        switchProvider,
        getState: () => ({ ...storageState }),
        getConfig: () => ({ ...storageConfig })
    };

    return module;
});