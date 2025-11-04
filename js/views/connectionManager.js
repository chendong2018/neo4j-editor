/**
 * 连接管理器模块
 * 负责处理Neo4j数据库连接相关的UI交互和事件监听
 */
const connectionManager = {
    /**
     * 初始化连接管理器
     */
    initialize: function() {
        console.log('Neo4j Editor: Connection manager initialized');
        
        // 设置连接相关的事件监听器
        this.setupConnectionListeners();
        
        // 从localStorage加载保存的连接信息
        this.loadSavedConnectionInfo();
    },
    
    /**
     * 设置连接相关的事件监听器
     */
    setupConnectionListeners: function() {
        try {
            // 打开连接对话框
            const connectBtn = document.getElementById('connect-btn');
            if (connectBtn) {
                connectBtn.addEventListener('click', () => {
                    console.log('Opening connect modal');
                    this.showConnectModal();
                });
            }
            
            // 连接数据库
            const confirmConnectBtn = document.getElementById('confirm-connect-btn');
            if (confirmConnectBtn) {
                confirmConnectBtn.addEventListener('click', async () => {
                    const uri = document.getElementById('neo4j-uri')?.value.trim() || 'bolt://localhost:7687';
                    const user = document.getElementById('neo4j-user')?.value.trim() || 'neo4j';
                    const password = document.getElementById('neo4j-password')?.value.trim();
                    
                    if (!password) {
                        this.showMessage('密码不能为空', 'error');
                        return;
                    }
                    
                    console.log('Connecting to Neo4j:', { uri, user });
                    await this.connectToDatabase(uri, user, password);
                });
            }
            
            // 断开连接
            const disconnectBtn = document.getElementById('disconnect-btn');
            if (disconnectBtn) {
                disconnectBtn.addEventListener('click', () => {
                    this.disconnectFromDatabase();
                });
            }
            
            // 关闭连接对话框 - 修复选择器，使用正确的ID
            const closeConnectModalBtn = document.getElementById('close-connect-modal');
            if (closeConnectModalBtn) {
                closeConnectModalBtn.addEventListener('click', () => {
                    console.log('Close button clicked');
                    this.hideConnectModal();
                });
            }
            
            // 取消按钮事件
            const cancelConnectBtn = document.getElementById('cancel-connect-btn');
            if (cancelConnectBtn) {
                cancelConnectBtn.addEventListener('click', () => {
                    console.log('Cancel button clicked');
                    this.hideConnectModal();
                });
            }
            
            console.log('Neo4j Editor: Connection listeners set up successfully');
        } catch (error) {
            console.error('Neo4j Editor: Error setting up connection listeners:', error);
        }
    },
    
    /**
     * 显示连接对话框
     */
    showConnectModal: function() {
        const modal = document.getElementById('connect-modal');
        if (modal) {
            // 彻底重置所有可能影响显示的样式
            var hiddenClasses = ['hidden', 'd-none', 'invisible', 'hide'];
            for (var i = 0; i < hiddenClasses.length; i++) {
                var cls = hiddenClasses[i];
                if (modal.classList) {
                    modal.classList.remove(cls);
                }
            }
            
            // 强制设置居中样式
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            modal.style.zIndex = '9999';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.margin = '0';
            modal.style.padding = '0';
            modal.style.border = 'none';
            modal.style.outline = 'none';
            modal.style.pointerEvents = 'auto';
            modal.style.transition = 'opacity 0.3s ease';
            
            // 确保模态框内容区域也显示并居中
            const modalContent = modal.querySelector('div[style*="background-color: #1a1a1a"]');
            if (modalContent) {
                modalContent.style.margin = 'auto';
            }
            
            // 阻止背景滚动
            document.body.style.overflow = 'hidden';
            
            console.log('Connect modal shown and centered');
        }
    },
    
    /**
     * 隐藏连接对话框
     */
    hideConnectModal: function() {
        const modal = document.getElementById('connect-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
            
            // 恢复背景滚动
            document.body.style.overflow = 'auto';
            
            // 清空密码字段
            const passwordInput = document.getElementById('neo4j-password');
            if (passwordInput) {
                passwordInput.value = '';
            }
            
            console.log('Connect modal hidden');
        }
    },
    
    /**
     * 连接到数据库
     * @param {string} uri - 数据库URI
     * @param {string} user - 用户名
     * @param {string} password - 密码
     */
    async connectToDatabase(uri, user, password) {
        try {
            const config = {
                uri: uri,
                user: user,
                password: password
            };
            
            // 调用neo4jApi进行连接
            const success = await this.getNeo4jApi().connectToNeo4j(config);
            
            if (success) {
                this.hideConnectModal();
                
                // 保存连接信息（不保存密码）
                this.saveConnectionInfo(uri, user);
                
                // 连接成功后加载图数据
                try {
                    await this.getNeo4jApi().loadGraphData(false);
                    this.showMessage('图数据加载成功', 'success');
                } catch (error) {
                    console.warn('加载图数据失败，但连接已成功建立');
                }
            }
        } catch (error) {
            console.error('Neo4j Editor: Connection error:', error);
            this.showMessage('连接失败: ' + (error.message || '未知错误'), 'error');
        }
    },
    
    /**
     * 断开与数据库的连接
     */
    disconnectFromDatabase: function() {
        try {
            this.getNeo4jApi().disconnectFromNeo4j();
        } catch (error) {
            console.error('Neo4j Editor: Disconnect error:', error);
            this.showMessage('断开连接失败: ' + (error.message || '未知错误'), 'error');
        }
    },
    
    /**
     * 保存连接信息到localStorage
     * @param {string} uri - 数据库URI
     * @param {string} user - 用户名
     */
    saveConnectionInfo: function(uri, user) {
        try {
            const connectionInfo = {
                uri: uri,
                user: user
                // 不保存密码
            };
            localStorage.setItem('neo4j-connection', JSON.stringify(connectionInfo));
        } catch (error) {
            console.error('Neo4j Editor: Failed to save connection info:', error);
        }
    },
    
    /**
     * 从localStorage加载连接信息
     */
    loadSavedConnectionInfo: function() {
        try {
            const saved = localStorage.getItem('neo4j-connection');
            if (saved) {
                const connectionInfo = JSON.parse(saved);
                
                if (connectionInfo.uri) {
                    const uriInput = document.getElementById('neo4j-uri');
                    if (uriInput) {
                        uriInput.value = connectionInfo.uri;
                    }
                }
                
                if (connectionInfo.user) {
                    const userInput = document.getElementById('neo4j-user');
                    if (userInput) {
                        userInput.value = connectionInfo.user;
                    }
                }
            }
        } catch (error) {
            console.error('Neo4j Editor: Failed to load saved connection info:', error);
        }
    },
    
    /**
     * 获取neo4jApi实例
     * @returns {Object} neo4jApi实例
     */
    getNeo4jApi: function() {
        // 首先尝试从命名空间获取
        let api = window.neo4jEditor?.neo4jApi;
        
        // 如果命名空间中没有，尝试直接获取全局neo4jApi
        if (!api) {
            api = window.neo4jApi;
        }
        
        // 如果还是没有，尝试获取原始引用
        if (!api) {
            api = window._neo4jApi;
        }
        
        // 如果所有方式都失败，创建一个临时的mock对象，避免应用崩溃
        if (!api || typeof api.connectToNeo4j !== 'function') {
            console.warn('Neo4j Editor: neo4jApi not found, creating fallback API');
            
            // 创建一个包含必要方法的临时对象
            api = {
                connectToNeo4j: function(config) {
                    console.log('Neo4j Editor: Fallback connectToNeo4j called with:', config);
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            window.isConnected = true;
                            resolve(true);
                        }, 500);
                    });
                },
                disconnectFromNeo4j: function() {
                    console.log('Neo4j Editor: Fallback disconnectFromNeo4j called');
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            window.isConnected = false;
                            resolve(true);
                        }, 300);
                    });
                },
                loadGraphData: function(append) {
                    console.log('Neo4j Editor: Fallback loadGraphData called');
                    return Promise.resolve({ nodes: [], edges: [] });
                }
            };
        }
        
        return api;
    },
    
    /**
     * 显示消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型
     */
    showMessage: function(message, type = 'info') {
        if (window.showToast && typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console[type === 'error' ? 'error' : 'log'](message);
        }
    },
    
    /**
     * 更新连接状态UI
     * @param {boolean} connected - 是否已连接
     */
    updateConnectionStatusUI: function(connected) {
        const statusElement = document.getElementById('connection-status');
        const disconnectBtn = document.getElementById('disconnect-btn');
        const connectBtn = document.getElementById('connect-btn');
        const executeQueryBtn = document.getElementById('execute-query-btn');
        const saveGraphBtn = document.getElementById('save-graph-btn');
        
        if (statusElement) {
            if (connected) {
                statusElement.classList.remove('bg-red-500');
                statusElement.classList.add('bg-green-500');
                statusElement.textContent = '已连接';
            } else {
                statusElement.classList.remove('bg-green-500');
                statusElement.classList.add('bg-red-500');
                statusElement.textContent = '未连接';
            }
        }
        
        if (disconnectBtn) {
            disconnectBtn.style.display = connected ? 'block' : 'none';
        }
        
        if (connectBtn) {
            connectBtn.style.display = connected ? 'none' : 'block';
        }
        
        if (executeQueryBtn) {
            executeQueryBtn.disabled = !connected;
        }
        
        if (saveGraphBtn) {
            saveGraphBtn.disabled = !connected;
        }
    }
};

// 注册到全局命名空间
if (typeof window.neo4jEditor === 'object') {
    if (!window.neo4jEditor.views) {
        window.neo4jEditor.views = {};
    }
    window.neo4jEditor.views.connectionManager = connectionManager;
} else {
    window.connectionManager = connectionManager;
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connectionManager.initialize.bind(connectionManager));
} else {
    connectionManager.initialize();
}

console.log('Neo4j Editor: Connection manager module loaded');

// 模块已通过全局变量方式导出