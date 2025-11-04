/**
 * 用户管理器模块
 * 负责处理用户身份验证、权限管理和用户配置
 */
neo4jEditor.define('userManager', ['eventBus', 'configManager', 'dataStorageManager'], function(eventBus, configManager, dataStorageManager) {
    'use strict';
    
    // 用户状态
    let currentUser = null;
    let isAuthenticated = false;
    let permissions = [];
    let userPreferences = {};
    let token = null;
    let lastActivityTime = Date.now();
    
    // 配置
    const AUTH_TOKEN_KEY = 'neo4jEditor_auth_token';
    const USER_DATA_KEY = 'neo4jEditor_user_data';
    const USER_PREFERENCES_KEY = 'neo4jEditor_user_preferences';
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟
    
    /**
     * 初始化用户管理器
     */
    function initialize(options = {}) {
        try {
            console.log('User Manager: Initializing...');
            
            // 尝试从存储中恢复用户会话
            restoreSession();
            
            // 注册事件监听器
            registerEventListeners();
            
            // 启动会话超时检查
            startSessionTimeoutCheck();
            
            // 注册全局活动跟踪
            registerActivityTracker();
            
            console.log('User Manager: Initialized successfully');
            
            return true;
        } catch (error) {
            console.error('User Manager: Error during initialization:', error);
            return false;
        }
    }
    
    /**
     * 注册事件监听器
     */
    function registerEventListeners() {
        try {
            if (eventBus && typeof eventBus.on === 'function') {
                eventBus.on('user:login', handleLogin);
                eventBus.on('user:logout', handleLogout);
                eventBus.on('user:updatePreferences', handleUpdatePreferences);
                eventBus.on('user:changePassword', handleChangePassword);
                eventBus.on('user:refreshToken', handleRefreshToken);
                eventBus.on('user:checkAuth', handleCheckAuth);
                eventBus.on('user:grantPermission', handleGrantPermission);
                eventBus.on('user:revokePermission', handleRevokePermission);
                eventBus.on('user:resetPassword', handleResetPassword);
                
                console.log('User Manager: Event listeners registered');
            }
        } catch (error) {
            console.error('User Manager: Error registering event listeners:', error);
        }
    }
    
    /**
     * 恢复会话
     */
    function restoreSession() {
        try {
            // 尝试从localStorage恢复认证令牌
            token = localStorage.getItem(AUTH_TOKEN_KEY);
            
            if (token) {
                // 验证令牌
                if (validateToken(token)) {
                    // 恢复用户数据
                    const userDataString = localStorage.getItem(USER_DATA_KEY);
                    if (userDataString) {
                        try {
                            currentUser = JSON.parse(userDataString);
                            isAuthenticated = true;
                            
                            // 恢复权限
                            if (currentUser.permissions) {
                                permissions = [...currentUser.permissions];
                            }
                            
                            // 恢复用户首选项
                            const preferencesString = localStorage.getItem(USER_PREFERENCES_KEY);
                            if (preferencesString) {
                                try {
                                    userPreferences = JSON.parse(preferencesString);
                                    applyUserPreferences();
                                } catch (parseError) {
                                    console.error('User Manager: Error parsing user preferences:', parseError);
                                }
                            }
                            
                            console.log('User Manager: Session restored for user:', currentUser.username || currentUser.email);
                            
                            // 触发登录成功事件
                            if (eventBus && typeof eventBus.emit === 'function') {
                                eventBus.emit('user:loginSuccess', {
                                    user: { ...currentUser },
                                    permissions: [...permissions]
                                });
                            }
                        } catch (parseError) {
                            console.error('User Manager: Error parsing user data:', parseError);
                            // 清除损坏的数据
                            logout(true);
                        }
                    }
                } else {
                    console.warn('User Manager: Invalid token, clearing session');
                    logout(true);
                }
            }
        } catch (error) {
            console.error('User Manager: Error restoring session:', error);
        }
    }
    
    /**
     * 验证令牌
     */
    function validateToken(token) {
        try {
            // 在真实实现中，这里应该解码JWT并验证签名
            // 对于模拟实现，我们假设令牌格式为'user:password'
            return token && token.length > 0;
        } catch (error) {
            console.error('User Manager: Error validating token:', error);
            return false;
        }
    }
    
    /**
     * 处理登录
     */
    function handleLogin(event, data) {
        const { username, password, remember = false } = data;
        const success = login(username, password, remember);
        
        if (success) {
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:loginSuccess', {
                    user: { ...currentUser },
                    permissions: [...permissions]
                });
            }
        }
    }
    
    /**
     * 登录
     */
    function login(username, password, remember = false) {
        try {
            // 在真实实现中，这里应该发送请求到后端进行身份验证
            // 对于模拟实现，我们接受任何非空的用户名和密码
            if (!username || !password) {
                throw new Error('Username and password are required');
            }
            
            // 创建模拟用户
            currentUser = {
                id: Date.now().toString(),
                username,
                email: `${username}@example.com`,
                displayName: username,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                avatarUrl: null,
                role: 'user'
            };
            
            // 设置默认权限
            permissions = ['read', 'write', 'export', 'import'];
            
            // 如果用户名包含'admin'，授予管理员权限
            if (username.toLowerCase().includes('admin')) {
                permissions.push('admin', 'manageUsers', 'manageSettings');
                currentUser.role = 'admin';
            }
            
            // 创建模拟令牌
            token = `${username}:${password}`;
            
            // 更新用户数据
            currentUser.permissions = [...permissions];
            isAuthenticated = true;
            
            // 保存会话
            saveSession(remember);
            
            // 加载用户首选项
            loadUserPreferences();
            
            console.log('User Manager: Login successful for user:', username);
            
            return true;
        } catch (error) {
            console.error('User Manager: Login failed:', error.message);
            
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:loginError', {
                    error: error.message
                });
            }
            
            return false;
        }
    }
    
    /**
     * 处理注销
     */
    function handleLogout() {
        logout();
    }
    
    /**
     * 注销
     */
    function logout(clearOnly = false) {
        try {
            // 清除会话数据
            currentUser = null;
            isAuthenticated = false;
            permissions = [];
            token = null;
            
            // 清除存储的会话信息
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(USER_DATA_KEY);
            
            console.log('User Manager: Logout successful');
            
            // 如果不是仅清除（由系统触发），则触发注销事件
            if (!clearOnly && eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:logoutSuccess');
            }
            
            return true;
        } catch (error) {
            console.error('User Manager: Error during logout:', error);
            return false;
        }
    }
    
    /**
     * 保存会话
     */
    function saveSession(remember = false) {
        try {
            if (remember) {
                localStorage.setItem(AUTH_TOKEN_KEY, token);
                localStorage.setItem(USER_DATA_KEY, JSON.stringify(currentUser));
            } else {
                // 对于非记住我的情况，使用sessionStorage
                sessionStorage.setItem(AUTH_TOKEN_KEY, token);
                sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(currentUser));
            }
            
            console.log('User Manager: Session saved');
        } catch (error) {
            console.error('User Manager: Error saving session:', error);
        }
    }
    
    /**
     * 加载用户首选项
     */
    function loadUserPreferences() {
        try {
            if (currentUser) {
                const key = `${USER_PREFERENCES_KEY}_${currentUser.id}`;
                const preferencesString = localStorage.getItem(key);
                
                if (preferencesString) {
                    try {
                        userPreferences = JSON.parse(preferencesString);
                        applyUserPreferences();
                        console.log('User Manager: User preferences loaded');
                    } catch (parseError) {
                        console.error('User Manager: Error parsing user preferences:', parseError);
                    }
                }
            }
        } catch (error) {
            console.error('User Manager: Error loading user preferences:', error);
        }
    }
    
    /**
     * 保存用户首选项
     */
    function saveUserPreferences() {
        try {
            if (currentUser) {
                const key = `${USER_PREFERENCES_KEY}_${currentUser.id}`;
                localStorage.setItem(key, JSON.stringify(userPreferences));
                console.log('User Manager: User preferences saved');
                return true;
            }
        } catch (error) {
            console.error('User Manager: Error saving user preferences:', error);
        }
        return false;
    }
    
    /**
     * 应用用户首选项
     */
    function applyUserPreferences() {
        try {
            // 应用主题首选项
            if (userPreferences.theme && configManager) {
                configManager.setConfig('app.theme', userPreferences.theme);
            }
            
            // 应用语言首选项
            if (userPreferences.language && configManager) {
                configManager.setConfig('app.language', userPreferences.language);
            }
            
            // 应用UI首选项
            if (userPreferences.ui && configManager) {
                configManager.mergeConfig({ ui: userPreferences.ui });
            }
            
            // 应用图表首选项
            if (userPreferences.graph && configManager) {
                configManager.mergeConfig({ graph: userPreferences.graph });
            }
            
            console.log('User Manager: User preferences applied');
        } catch (error) {
            console.error('User Manager: Error applying user preferences:', error);
        }
    }
    
    /**
     * 处理更新用户首选项
     */
    function handleUpdatePreferences(event, data) {
        const { preferences } = data;
        updateUserPreferences(preferences);
    }
    
    /**
     * 更新用户首选项
     */
    function updateUserPreferences(newPreferences) {
        try {
            // 合并新的首选项
            userPreferences = { ...userPreferences, ...newPreferences };
            
            // 保存并应用首选项
            const saved = saveUserPreferences();
            
            if (saved) {
                applyUserPreferences();
                
                if (eventBus && typeof eventBus.emit === 'function') {
                    eventBus.emit('user:preferencesUpdated', {
                        preferences: { ...userPreferences }
                    });
                }
                
                return true;
            }
        } catch (error) {
            console.error('User Manager: Error updating user preferences:', error);
        }
        return false;
    }
    
    /**
     * 获取用户信息
     */
    function getUserInfo() {
        return currentUser ? { ...currentUser } : null;
    }
    
    /**
     * 检查用户是否已认证
     */
    function isLoggedIn() {
        return isAuthenticated;
    }
    
    /**
     * 检查用户是否有权限
     */
    function hasPermission(permission) {
        return isAuthenticated && permissions.includes(permission);
    }
    
    /**
     * 检查用户是否为管理员
     */
    function isAdmin() {
        return isAuthenticated && permissions.includes('admin');
    }
    
    /**
     * 获取用户权限列表
     */
    function getUserPermissions() {
        return [...permissions];
    }
    
    /**
     * 获取用户首选项
     */
    function getUserPreferences() {
        return { ...userPreferences };
    }
    
    /**
     * 处理更改密码
     */
    function handleChangePassword(event, data) {
        const { oldPassword, newPassword } = data;
        const success = changePassword(oldPassword, newPassword);
        
        if (success) {
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:passwordChanged');
            }
        }
    }
    
    /**
     * 更改密码
     */
    function changePassword(oldPassword, newPassword) {
        try {
            if (!isAuthenticated) {
                throw new Error('User not authenticated');
            }
            
            // 在真实实现中，这里应该发送请求到后端
            // 对于模拟实现，我们简单地验证旧密码格式并更新令牌
            if (!oldPassword || !newPassword) {
                throw new Error('Passwords cannot be empty');
            }
            
            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters long');
            }
            
            // 假设旧密码正确（模拟实现）
            // 更新令牌
            token = `${currentUser.username}:${newPassword}`;
            
            // 保存新的会话信息
            saveSession();
            
            console.log('User Manager: Password changed successfully');
            
            return true;
        } catch (error) {
            console.error('User Manager: Password change failed:', error.message);
            
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:passwordChangeError', {
                    error: error.message
                });
            }
            
            return false;
        }
    }
    
    /**
     * 处理刷新令牌
     */
    function handleRefreshToken() {
        refreshToken();
    }
    
    /**
     * 刷新令牌
     */
    function refreshToken() {
        try {
            if (!isAuthenticated || !token) {
                throw new Error('No active session');
            }
            
            // 在真实实现中，这里应该发送请求到后端刷新令牌
            // 对于模拟实现，我们简单地更新用户的最后登录时间
            if (currentUser) {
                currentUser.lastLoginAt = new Date().toISOString();
                saveSession();
            }
            
            console.log('User Manager: Token refreshed');
            
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:tokenRefreshed');
            }
            
            return true;
        } catch (error) {
            console.error('User Manager: Token refresh failed:', error.message);
            
            // 如果令牌刷新失败，可能需要重新登录
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:tokenRefreshError', {
                    error: error.message
                });
            }
            
            return false;
        }
    }
    
    /**
     * 处理检查认证状态
     */
    function handleCheckAuth() {
        const isAuth = isLoggedIn();
        
        if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:authChecked', {
                    isAuthenticated: isAuth,
                    user: isAuth ? { ...currentUser } : null,
                    permissions: isAuth ? [...permissions] : []
                });
            }
    }
    
    /**
     * 处理授予权限
     */
    function handleGrantPermission(event, data) {
        const { permission } = data;
        
        // 只有管理员可以授予权限
        if (isAdmin()) {
            grantPermission(permission);
        }
    }
    
    /**
     * 授予权限
     */
    function grantPermission(permission) {
        try {
            if (!permission) {
                throw new Error('Permission name is required');
            }
            
            if (!permissions.includes(permission)) {
                permissions.push(permission);
                
                // 更新用户数据
                if (currentUser) {
                    currentUser.permissions = [...permissions];
                    saveSession();
                }
                
                console.log('User Manager: Permission granted:', permission);
                
                if (eventBus && typeof eventBus.emit === 'function') {
                    eventBus.emit('user:permissionGranted', { permission });
                }
                
                return true;
            }
        } catch (error) {
            console.error('User Manager: Error granting permission:', error.message);
        }
        return false;
    }
    
    /**
     * 处理撤销权限
     */
    function handleRevokePermission(event, data) {
        const { permission } = data;
        
        // 只有管理员可以撤销权限
        if (isAdmin() && permission !== 'admin') { // 不能撤销自己的管理员权限
            revokePermission(permission);
        }
    }
    
    /**
     * 撤销权限
     */
    function revokePermission(permission) {
        try {
            if (!permission) {
                throw new Error('Permission name is required');
            }
            
            // 不能撤销管理员权限
            if (permission === 'admin') {
                throw new Error('Cannot revoke admin permission');
            }
            
            const index = permissions.indexOf(permission);
            if (index !== -1) {
                permissions.splice(index, 1);
                
                // 更新用户数据
                if (currentUser) {
                    currentUser.permissions = [...permissions];
                    saveSession();
                }
                
                console.log('User Manager: Permission revoked:', permission);
                
                if (eventBus && typeof eventBus.emit === 'function') {
                    eventBus.emit('user:permissionRevoked', { permission });
                }
                
                return true;
            }
        } catch (error) {
            console.error('User Manager: Error revoking permission:', error.message);
        }
        return false;
    }
    
    /**
     * 处理重置密码
     */
    function handleResetPassword(event, data) {
        const { email } = data;
        const success = resetPassword(email);
        
        if (success) {
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:passwordResetEmailSent', { email });
            }
        }
    }
    
    /**
     * 重置密码（发送重置邮件）
     */
    function resetPassword(email) {
        try {
            if (!email) {
                throw new Error('Email is required');
            }
            
            // 验证邮箱格式
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format');
            }
            
            // 在真实实现中，这里应该发送请求到后端
            // 对于模拟实现，我们只是记录日志
            console.log('User Manager: Password reset email sent to:', email);
            
            return true;
        } catch (error) {
            console.error('User Manager: Password reset failed:', error.message);
            
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('user:passwordResetError', {
                    error: error.message
                });
            }
            
            return false;
        }
    }
    
    /**
     * 启动会话超时检查
     */
    function startSessionTimeoutCheck() {
        // 每一分钟检查一次
        setInterval(() => {
            if (isAuthenticated) {
                const now = Date.now();
                const inactiveTime = now - lastActivityTime;
                
                if (inactiveTime > SESSION_TIMEOUT) {
                    console.log('User Manager: Session timeout due to inactivity');
                    logout();
                }
            }
        }, 60000);
    }
    
    /**
     * 注册活动跟踪器
     */
    function registerActivityTracker() {
        // 更新最后活动时间
        function updateLastActivity() {
            lastActivityTime = Date.now();
        }
        
        // 监听用户交互事件
        document.addEventListener('mousemove', updateLastActivity);
        document.addEventListener('keypress', updateLastActivity);
        document.addEventListener('click', updateLastActivity);
        document.addEventListener('scroll', updateLastActivity);
    }
    
    /**
     * 导出公共API
     */
    return {
        initialize,
        login,
        logout,
        getUserInfo,
        isLoggedIn,
        hasPermission,
        isAdmin,
        getUserPermissions,
        getUserPreferences,
        updateUserPreferences,
        changePassword,
        refreshToken,
        resetPassword,
        grantPermission,
        revokePermission
    };
});