/**
 * 模块加载验证脚本
 * 用于验证所有必要的模块化组件是否正确加载
 */

console.log('===== Neo4j Editor 模块验证开始 =====');

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
        console.warn(`警告: ${deprecatedName} 已弃用，请更新代码`);
        return newFunction.apply(context || this, arguments);
    };
}

/**
 * 验证模块是否正确加载
 * @param {string} moduleName - 模块名称
 * @param {string} moduleVarName - 全局变量名称
 * @param {Array} requiredFunctions - 必须的函数列表
 * @returns {Object} 验证结果
 */
function verifyModule(moduleName, moduleVarName, requiredFunctions = []) {
    // 参数安全检查
    if (typeof moduleName !== 'string' || moduleName.trim() === '') {
        console.error('verifyModule: 无效的moduleName参数');
        return { loaded: false, errors: ['无效的moduleName参数'] };
    }
    
    if (typeof moduleVarName !== 'string' || moduleVarName.trim() === '') {
        console.error('verifyModule: 无效的moduleVarName参数');
        return { loaded: false, errors: ['无效的moduleVarName参数'] };
    }
    
    const result = {
        module: moduleName,
        loaded: false,
        available: false,
        functions: {},
        errors: []
    };
    
    try {
        // 检查模块是否存在
        const module = window[moduleVarName];
        result.available = !!module;
        
        if (!module) {
            result.errors.push(`${moduleName} (${moduleVarName}) 模块不存在`);
            return result;
        }
        
        console.log(`✅ ${moduleName} 模块已加载:`, module);
        
        // 检查必需的函数
        if (Array.isArray(requiredFunctions) && requiredFunctions.length > 0) {
            requiredFunctions.forEach(funcName => {
                const hasFunction = typeof module[funcName] === 'function';
                result.functions[funcName] = hasFunction;
                
                if (!hasFunction) {
                    result.errors.push(`${moduleName} 模块缺少必需的函数: ${funcName}`);
                } else {
                    console.log(`  ├─ ${funcName} 函数已就绪`);
                }
            });
        }
        
        // 模块被视为加载成功，即使某些非关键函数缺失
        result.loaded = result.errors.length === 0;
        
    } catch (error) {
        console.error(`❌ ${moduleName} 模块验证失败:`, error);
        result.errors.push(`验证过程出错: ${error.message}`);
    }
    
    return result;
}

/**
 * 显示验证结果摘要
 * @param {Array} results - 验证结果数组
 */
function showValidationSummary(results) {
    // 参数安全检查
    if (!Array.isArray(results)) {
        console.error('showValidationSummary: 无效的results参数');
        return { loadedCount: 0, totalCount: 0, errorCount: 0 };
    }
    
    console.log('\n===== 模块验证结果摘要 =====');
    
    let loadedCount = 0;
    let errorCount = 0;
    
    results.forEach(result => {
        if (result.loaded) {
            loadedCount++;
            console.log(`✅ ${result.module}`);
        } else {
            console.log(`❌ ${result.module}`);
            result.errors.forEach(error => {
                console.log(`  └─ ${error}`);
                errorCount++;
            });
        }
    });
    
    console.log(`\n总结: ${loadedCount}/${results.length} 个模块验证通过, 发现 ${errorCount} 个错误`);
    
    if (errorCount === 0) {
        console.log('🎉 所有模块验证通过! Neo4j Editor 准备就绪.');
    } else {
        console.log('⚠️  部分模块验证失败，可能会影响某些功能的正常使用.');
    }
    
    return {
        loadedCount,
        totalCount: results.length,
        errorCount
    };
}

/**
 * 运行所有模块的验证
 */
function runModuleValidation() {
    // 定义要验证的模块
    const modulesToVerify = [
        {
            name: '工具函数库',
            varName: 'utils',
            requiredFunctions: ['arrayHasElement', 'generateId', 'deepClone', 'debounce', 'showToast']
        },
        {
            name: '属性编辑器',
            varName: 'propertyEditor',
            requiredFunctions: ['initialize', 'showNodeProperties', 'showEdgeProperties', 'saveProperties']
        },
        {
            name: 'Neo4j API',
            varName: 'neo4jApi',
            requiredFunctions: ['setConfig', 'testConnection', 'executeQuery']
        },
        {
            name: '上下文菜单管理器',
            varName: 'contextMenuManager',
            requiredFunctions: ['initialize', 'showContextMenu', 'hideContextMenu']
        },
        {
            name: '视图管理器',
            varName: 'viewManager',
            requiredFunctions: ['init']
        },
        {
            name: '图数据管理器',
            varName: 'graphDataManager',
            requiredFunctions: []
        },
        {
            name: '视图同步',
            varName: 'viewSync',
            requiredFunctions: []
        }
    ];
    
    // 验证每个模块
    const results = [];
    
    modulesToVerify.forEach(moduleInfo => {
        try {
            const result = verifyModule(moduleInfo.name, moduleInfo.varName, moduleInfo.requiredFunctions);
            results.push(result);
        } catch (error) {
            console.error(`验证 ${moduleInfo.name} 时发生异常:`, error);
        }
    });
    
    // 验证全局编辑器状态
    if (window.neo4jEditor) {
        console.log('\n✅ neo4jEditor 全局命名空间存在');
        if (window.neo4jEditor.modules) {
            console.log('  ├─ modules 容器已初始化:', Object.keys(window.neo4jEditor.modules));
        } else {
            console.log('  └─ ⚠️ modules 容器未初始化');
        }
        
        if (window.neo4jEditor.initialized !== undefined) {
            console.log(`  └─ 初始化状态: ${window.neo4jEditor.initialized ? '已初始化' : '未初始化'}`);
        }
    } else {
        console.log('❌ neo4jEditor 全局命名空间不存在');
    }
    
    // 显示摘要
    return showValidationSummary(results);
}

/**
 * 兼容性检查
 */
function checkCompatibility() {
    console.log('\n===== 兼容性检查 =====');
    
    // 检查必要的DOM元素
    const requiredElements = [
        { id: 'cy-tree', name: '树视图容器' },
        { id: 'cy-network', name: '网络图视图容器' },
        { id: 'toolbar', name: '工具栏' },
        { id: 'search-input', name: '搜索框' },
        { id: 'cypher-editor', name: 'Cypher编辑器' }
    ];
    
    let elementCount = 0;
    requiredElements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            elementCount++;
            console.log(`✅ ${element.name} (${element.id}) 存在`);
        } else {
            console.log(`❌ ${element.name} (${element.id}) 不存在`);
        }
    });
    
    console.log(`\nDOM元素检查: ${elementCount}/${requiredElements.length} 个元素存在`);
    
    // 检查浏览器兼容性
    const features = [
        { name: 'Promise', supported: 'Promise' in window },
        { name: 'fetch API', supported: 'fetch' in window },
        { name: 'CustomEvent', supported: 'CustomEvent' in window },
        { name: 'localStorage', supported: 'localStorage' in window && window.localStorage !== null }
    ];
    
    features.forEach(feature => {
        console.log(`${feature.supported ? '✅' : '❌'} ${feature.name}`);
    });
}

/**
 * 显示性能指标
 */
function showPerformanceInfo() {
    try {
        if (performance && performance.now) {
            const loadTime = performance.now();
            console.log(`\n===== 性能指标 =====`);
            console.log(`页面加载时间: ${loadTime.toFixed(2)}ms`);
        }
    } catch (e) {
        // 忽略性能指标错误
    }
}

/**
 * 检查并输出关键全局变量
 */
function checkGlobalVariables() {
    console.log('\n===== 关键全局变量检查 =====');
    
    const globalVars = [
        'cytoscape', 'd3', 'axios', 'cyTree', 'cyNetwork', 
        'selectNode', 'selectEdge', 'clearGraph', 'exportGraphData', 'importGraphData'
    ];
    
    globalVars.forEach(varName => {
        if (window[varName] !== undefined) {
            console.log(`✅ ${varName} 已定义`);
        } else {
            console.log(`❌ ${varName} 未定义`);
        }
    });
}

/**
 * 执行所有验证检查
 */
function runAllChecks() {
    try {
        // 等待DOM完全加载
        if (document.readyState === 'complete') {
            performChecks();
        } else {
            window.addEventListener('load', performChecks);
        }
    } catch (error) {
        console.error('运行验证检查时出错:', error);
    }
}

/**
 * 执行所有检查
 */
function performChecks() {
    setTimeout(() => {
        try {
            // 运行模块验证
            const validationResult = runModuleValidation();
            
            // 检查兼容性
            checkCompatibility();
            
            // 检查全局变量
            checkGlobalVariables();
            
            // 显示性能信息
            showPerformanceInfo();
            
            console.log('\n===== Neo4j Editor 模块验证完成 =====');
            
            // 如果模块加载存在问题，显示警告
            if (validationResult.errorCount > 0) {
                console.warn('⚠️  警告: 检测到模块加载问题，某些功能可能不可用。');
            }
            
            // 触发验证完成事件
            try {
                const event = new CustomEvent('neo4j-editor:modules-verified', {
                    detail: validationResult
                });
                document.dispatchEvent(event);
            } catch (e) {
                console.log('无法触发验证完成事件:', e);
            }
            
        } catch (error) {
            console.error('执行验证检查时发生异常:', error);
        }
    }, 500); // 延迟执行，确保所有异步加载的模块有机会完成
}

// 定义验证模块
const verifyModulesModule = {
    initialized: false,
    verifyModule,
    showValidationSummary,
    runModuleValidation,
    checkCompatibility,
    showPerformanceInfo,
    checkGlobalVariables,
    runAllChecks,
    performChecks
};

// 定义向后兼容函数映射
const verifyModulesBackwardCompatibilityFunctions = [
    { deprecatedName: 'verifyModules', newFunction: runModuleValidation },
    { deprecatedName: 'checkNeo4jEditorCompatibility', newFunction: checkCompatibility }
];

// 注册模块
if (window.neo4jEditor && window.neo4jEditor.registerModule) {
    try {
        window.neo4jEditor.registerModule({
            name: 'verifyModules',
            version: '1.0.1',
            dependencies: ['utils/utils'],
            module: verifyModulesModule
        });
    } catch (error) {
        console.error('注册验证模块失败:', error);
        // 降级方案：直接挂载到全局
        window.verifyModulesModule = verifyModulesModule;
    }
} else {
    // 降级方案：直接挂载到全局
    window.verifyModulesModule = verifyModulesModule;
}

// 注册向后兼容函数
verifyModulesBackwardCompatibilityFunctions.forEach(funcInfo => {
    try {
        window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
            funcInfo.deprecatedName,
            funcInfo.newFunction,
            verifyModulesModule
        );
    } catch (error) {
        console.error(`注册向后兼容函数 ${funcInfo.deprecatedName} 失败:`, error);
    }
});

// 自动运行验证
runAllChecks();

// 支持CommonJS和ES模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = verifyModulesModule;
}

if (typeof define === 'function' && define.amd) {
    define(['utils/utils'], function() {
        return verifyModulesModule;
    });
}