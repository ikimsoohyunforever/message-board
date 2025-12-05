/**
 * 数据模型定义
 * 用于封装和操作数据对象
 */

// 访客信息模型
class VisitorInfo {
    constructor() {
        this.ip = '未知';
        this.location = '未知';
        this.userAgent = navigator.userAgent.substring(0, 100);
        this.platform = this._detectPlatform();
        this.timestamp = new Date().toISOString();
    }
    
    _detectPlatform() {
        const ua = navigator.userAgent;
        let platform = navigator.platform;
        
        if (ua.includes('Windows')) platform = 'Windows';
        else if (ua.includes('Mac')) platform = 'Mac';
        else if (ua.includes('Linux')) platform = 'Linux';
        else if (ua.includes('Android')) platform = 'Android';
        else if (ua.includes('iOS') || ua.includes('iPhone')) platform = 'iOS';
        
        return platform || '未知系统';
    }
    
    updateFromApiData(data) {
        if (data.ip) this.ip = data.ip;
        if (data.query) this.ip = data.query;
        
        if (data.city || data.region || data.country_name) {
            const location = [];
            if (data.city) location.push(data.city);
            if (data.region) location.push(data.region);
            if (data.country_name) location.push(data.country_name);
            this.location = location.join(', ') || '未知';
        }
        
        return this;
    }
    
    toJSON() {
        return {
            ip: this.ip,
            location: this.location,
            userAgent: this.userAgent,
            platform: this.platform,
            timestamp: this.timestamp
        };
    }
}

// 留言模型
class Message {
    constructor(data = {}) {
        this.PartitionKey = data.PartitionKey || 'messages';
        this.RowKey = data.RowKey || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = data.name || '';
        this.message = data.message || '';
        this.timestamp = data.timestamp || new Date().toISOString();
        this.userIp = data.userIp || '未知';
        this.userLocation = data.userLocation || '未知';
        this.userAgent = data.userAgent || '';
        this.userPlatform = data.userPlatform || '';
    }
    
    // 验证留言数据
    validate() {
        const errors = [];
        
        if (!this.message.trim()) {
            errors.push('留言内容不能为空');
        }
        
        if (this.message.length > 1000) {
            errors.push('留言内容不能超过1000个字符');
        }
        
        if (this.name && this.name.length > 50) {
            errors.push('名字不能超过50个字符');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // 合并访客信息
    mergeVisitorInfo(visitorInfo) {
        if (visitorInfo instanceof VisitorInfo) {
            this.userIp = visitorInfo.ip;
            this.userLocation = visitorInfo.location;
            this.userAgent = visitorInfo.userAgent;
            this.userPlatform = visitorInfo.platform;
        }
        return this;
    }
    
    // 获取用于显示的格式化时间
    getFormattedTime() {
        try {
            return new Date(this.timestamp).toLocaleString('zh-CN');
        } catch (e) {
            return this.timestamp;
        }
    }
    
    // 简短的RowKey显示
    getShortRowKey() {
        return this.RowKey.length > 15 
            ? this.RowKey.substring(0, 15) + '...'
            : this.RowKey;
    }
}

// 消息列表模型
class MessageList {
    constructor(messages = []) {
        this.messages = messages.map(msg => new Message(msg));
    }
    
    // 添加消息
    add(message) {
        if (message instanceof Message) {
            this.messages.push(message);
        } else {
            this.messages.push(new Message(message));
        }
    }
    
    // 按时间排序（新的在前）
    sortByTime(descending = true) {
        this.messages.sort((a, b) => {
            const timeA = new Date(a.timestamp);
            const timeB = new Date(b.timestamp);
            return descending ? timeB - timeA : timeA - timeB;
        });
        return this;
    }
    
    // 过滤消息
    filter(predicate) {
        return new MessageList(this.messages.filter(predicate));
    }
    
    // 获取数量
    count() {
        return this.messages.length;
    }
    
    // 转换为数组
    toArray() {
        return [...this.messages];
    }
}

// 导出模型
window.Models = {
    VisitorInfo,
    Message,
    MessageList
};