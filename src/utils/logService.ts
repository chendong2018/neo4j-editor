// 日志服务 - 用于管理和记录系统操作日志

export interface LogEntry {
  timestamp: number
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  details?: any
}

class LogService {
  private logs: LogEntry[] = []
  private maxLogs = 100 // 最大保存日志数量
  private listeners: ((logs: LogEntry[]) => void)[] = []

  // 添加日志
  addLog(level: LogEntry['level'], message: string, details?: any): void {
    const log: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      details
    }

    this.logs.push(log)
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift() // 删除最旧的日志
    }

    // 通知监听器
    this.notifyListeners()

    // 同时输出到控制台
    this.logToConsole(log)
  }

  // 便捷方法
  info(message: string, details?: any): void {
    this.addLog('info', message, details)
  }

  success(message: string, details?: any): void {
    this.addLog('success', message, details)
  }

  warning(message: string, details?: any): void {
    this.addLog('warning', message, details)
  }

  error(message: string, details?: any): void {
    this.addLog('error', message, details)
  }

  // 获取所有日志
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  // 清空日志
  clearLogs(): void {
    this.logs = []
    this.notifyListeners()
  }

  // 添加监听器
  addListener(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(listener)
    
    // 返回移除监听器的函数
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // 通知所有监听器
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.getLogs())
    })
  }

  // 输出到控制台
  private logToConsole(log: LogEntry): void {
    const timestamp = new Date(log.timestamp).toLocaleTimeString()
    const prefix = `[${timestamp}] [${log.level.toUpperCase()}]`

    switch (log.level) {
      case 'info':
        console.log(`${prefix} ${log.message}`, log.details)
        break
      case 'success':
        console.log(`${prefix} ${log.message}`, log.details)
        break
      case 'warning':
        console.warn(`${prefix} ${log.message}`, log.details)
        break
      case 'error':
        console.error(`${prefix} ${log.message}`, log.details)
        break
    }
  }
}

// 导出单例实例
export const logService = new LogService()
