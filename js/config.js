/**
 * 应用配置文件
 * 集中管理所有配置项
 */

const Config = {
    // Azure Table 配置
    azure: {
        account: 'messageboard2025',
        table: 'messages',
        sas: '?sv=2024-11-04&ss=t&srt=co&sp=rwdlacu&se=2026-02-12T01:08:00Z&st=2025-12-04T16:53:00Z&spr=https&sig=O6rDzpyGQV1o9nh4OfFpZZVczqeihnFwYxGYnDd4Hp4%3D'
    },
    
    // API 配置
    api: {
        // IP 查询 APIs
        ipApis: [
            'https://ipinfo.io/json',
            'https://api64.ipify.org?format=json',
            'https://api.ipify.org?format=json',
            'https://ipapi.co/json/'
        ],
        
        // 地理位置 APIs
        geoApis: {
            ipapi: (ip) => `https://ipapi.co/${ip}/json/`,
            ipApiCom: (ip) => `http://ip-api.com/json/${ip}?lang=zh-CN`
        },
        
        // 请求超时时间（毫秒）
        timeout: 3000
    },
    
    // 应用配置
    app: {
        defaultName: '匿名用户',
        messagesPerPage: 50,
        enableWebRTCDetection: true
    },
    
    // 获取 Azure Table 基础URL
    getBaseUrl: function() {
        return `https://${this.azure.account}.table.core.windows.net/${this.azure.table}`;
    },
    
    // 获取完整 URL（包含 SAS）
    getFullUrl: function() {
        return `${this.getBaseUrl()}${this.azure.sas}`;
    }
};

// 导出为全局变量
window.Config = Config;