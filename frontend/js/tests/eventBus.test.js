#!/usr/bin/env node
/**
 * EventBus 测试用例
 * 用于验证事件总线的核心功能是否正常工作
 */

// 模拟浏览器环境
if (typeof window === 'undefined') {
  global.window = {};
  global.document = {};
}

// 加载事件总线模块
try {
  // 尝试直接加载事件总线模块
  const EventBusModule = require('../common/eventBus');
  const eventBus = EventBusModule.getInstance();
  console.log('✓ 事件总线模块加载成功');
} catch (error) {
  console.error('✗ 事件总线模块加载失败:', error.message);
}

// 定义测试用例函数
function runTests() {
  console.log('\n=== EventBus 测试套件 ===\n');
  
  // 1. 测试单例模式
  testSingleton();
  
  // 2. 测试基本的事件注册和触发
  testBasicEventEmit();
  
  // 3. 测试事件移除
  testEventRemove();
  
  // 4. 测试一次性事件
  testOnceEvent();
  
  // 5. 测试事件优先级
  testEventPriority();
  
  // 6. 测试错误处理
  testErrorHandling();
  
  console.log('\n=== 测试完成 ===\n');
}

// 1. 测试单例模式
function testSingleton() {
  console.log('测试 1: 单例模式验证');
  const eventBus1 = window.EventBus.getInstance();
  const eventBus2 = window.EventBus.getInstance();
  
  if (eventBus1 === eventBus2) {
    console.log('✓ 单例模式验证成功: 多次获取返回同一个实例');
  } else {
    console.error('✗ 单例模式验证失败: 返回了不同的实例');
  }
}

// 2. 测试基本的事件注册和触发
function testBasicEventEmit() {
  console.log('\n测试 2: 基本事件注册和触发');
  const eventBus = window.EventBus.getInstance();
  const testEventName = 'test:basicEvent';
  let eventReceived = false;
  let receivedData = null;
  
  // 注册事件处理器
  const handler = function(data) {
    eventReceived = true;
    receivedData = data;
  };
  
  eventBus.on(testEventName, handler);
  
  // 触发事件
  const testData = { message: 'Test data' };
  eventBus.emit(testEventName, testData);
  
  if (eventReceived && receivedData === testData) {
    console.log('✓ 事件注册和触发成功: 处理器被正确调用并接收了数据');
  } else {
    console.error('✗ 事件注册和触发失败: 处理器未被调用或数据不正确');
  }
  
  // 清理
  eventBus.off(testEventName, handler);
}

// 3. 测试事件移除
function testEventRemove() {
  console.log('\n测试 3: 事件移除功能');
  const eventBus = window.EventBus.getInstance();
  const testEventName = 'test:removeEvent';
  let callCount = 0;
  
  // 注册事件处理器
  const handler = function() {
    callCount++;
  };
  
  eventBus.on(testEventName, handler);
  
  // 触发事件一次
  eventBus.emit(testEventName);
  
  // 移除事件处理器
  eventBus.off(testEventName, handler);
  
  // 再次触发事件
  eventBus.emit(testEventName);
  
  if (callCount === 1) {
    console.log('✓ 事件移除成功: 处理器只被调用了一次');
  } else {
    console.error('✗ 事件移除失败: 处理器被调用了', callCount, '次');
  }
}

// 4. 测试一次性事件
function testOnceEvent() {
  console.log('\n测试 4: 一次性事件功能');
  const eventBus = window.EventBus.getInstance();
  const testEventName = 'test:onceEvent';
  let callCount = 0;
  
  // 注册一次性事件处理器
  eventBus.once(testEventName, function() {
    callCount++;
  });
  
  // 多次触发事件
  eventBus.emit(testEventName);
  eventBus.emit(testEventName);
  eventBus.emit(testEventName);
  
  if (callCount === 1) {
    console.log('✓ 一次性事件功能正常: 处理器只被调用了一次');
  } else {
    console.error('✗ 一次性事件功能异常: 处理器被调用了', callCount, '次');
  }
}

// 5. 测试事件优先级
function testEventPriority() {
  console.log('\n测试 5: 事件优先级功能');
  const eventBus = window.EventBus.getInstance();
  const testEventName = 'test:priorityEvent';
  const executionOrder = [];
  
  // 注册不同优先级的处理器
  eventBus.on(testEventName, function() {
    executionOrder.push('low');
  }, { priority: 100 }); // 低优先级
  
  eventBus.on(testEventName, function() {
    executionOrder.push('medium');
  }); // 默认优先级
  
  eventBus.on(testEventName, function() {
    executionOrder.push('high');
  }, { priority: 10 }); // 高优先级
  
  // 触发事件
  eventBus.emit(testEventName);
  
  const expectedOrder = ['high', 'medium', 'low'];
  if (JSON.stringify(executionOrder) === JSON.stringify(expectedOrder)) {
    console.log('✓ 事件优先级功能正常: 处理器按照优先级顺序执行');
    console.log('  执行顺序:', executionOrder.join(' -> '));
  } else {
    console.error('✗ 事件优先级功能异常: 执行顺序不符合预期');
    console.error('  预期顺序:', expectedOrder.join(' -> '));
    console.error('  实际顺序:', executionOrder.join(' -> '));
  }
  
  // 清理
  eventBus.off(testEventName);
}

// 6. 测试错误处理
function testErrorHandling() {
  console.log('\n测试 6: 错误处理功能');
  const eventBus = window.EventBus.getInstance();
  const testEventName = 'test:errorEvent';
  let errorHandled = false;
  
  // 注册会抛出错误的处理器
  eventBus.on(testEventName, function() {
    throw new Error('Test error in event handler');
  });
  
  // 注册错误处理器
  const originalConsoleError = console.error;
  console.error = function(message) {
    if (message && message.includes('Test error in event handler')) {
      errorHandled = true;
    }
    // 恢复原始的console.error以避免影响后续测试
    console.error = originalConsoleError;
  };
  
  try {
    // 触发事件
    eventBus.emit(testEventName);
    
    if (errorHandled) {
      console.log('✓ 错误处理功能正常: 事件处理器中的错误被正确捕获');
    } else {
      console.error('✗ 错误处理功能异常: 事件处理器中的错误未被正确捕获');
    }
  } catch (error) {
    console.error('✗ 错误处理功能异常: 事件处理器中的错误导致程序崩溃');
  }
  
  // 恢复console.error
  console.error = originalConsoleError;
  
  // 清理
  eventBus.off(testEventName);
}

// 提供HTML中直接运行的方法
window.runEventBusTests = runTests;

// 如果直接运行此脚本（Node.js环境），自动执行测试
if (require.main === module) {
  console.log('在Node.js环境中运行测试...');
  // 注意：由于浏览器依赖，某些测试可能无法在Node.js环境中完全运行
  // 建议在浏览器环境中运行完整测试
  try {
    runTests();
  } catch (error) {
    console.error('测试运行失败:', error);
  }
}

// 导出测试函数，供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runTests: runTests
  };
}

// AMD模块支持
if (typeof define === 'function' && define.amd) {
  define(function() {
    return {
      runTests: runTests
    };
  });
}

// 为浏览器环境提供一个简单的测试HTML输出示例
function generateTestHtml() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EventBus 测试</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      line-height: 1.6;
    }
    .test-result {
      margin-top: 20px;
      padding: 10px;
      border-radius: 5px;
    }
    .success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    button {
      padding: 8px 16px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0069d9;
    }
  </style>
</head>
<body>
  <h1>EventBus 测试页面</h1>
  <button onclick="window.runEventBusTests()">运行测试</button>
  <div id="test-output" class="test-result"></div>
  
  <script>
    // 重定向console.log到页面
    (function() {
      const output = document.getElementById('test-output');
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = function(message) {
        const div = document.createElement('div');
        div.textContent = message;
        if (message.includes('✓')) {
          div.className = 'success';
        }
        output.appendChild(div);
        originalLog.apply(console, arguments);
      };
      
      console.error = function(message) {
        const div = document.createElement('div');
        div.textContent = message;
        if (message.includes('✗')) {
          div.className = 'error';
        }
        output.appendChild(div);
        originalError.apply(console, arguments);
      };
    })();
  </script>
</body>
</html>
  `;
}

// 导出测试HTML生成函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports.generateTestHtml = generateTestHtml;
}
