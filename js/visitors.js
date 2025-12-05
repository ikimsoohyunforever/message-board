/**
 * 访客信息服务
 * 处理访客信息的获取和管理
 */

const VisitorService = {
    // 当前访客信息
    currentVisitor: null,
    
    // 初始化访客信息
    async initialize() {
        this.currentVisitor = new Models.VisitorInfo();
        await this.fetchIpAddress();
        await this.fetchLocation();
        return this.currentVisitor;
    },
    
    // 获取IP地址
    async fetchIpAddress() {
        const apis = Config.api.ipApis;
        
        // 顺序尝试所有API
        for (let i = 0; i < apis.length; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), Config.api.timeout);
                
                const response = await fetch(apis[i], {
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    this.currentVisitor.updateFromApiData(data);
                    
                    // 如果成功获取IP，跳出循环
                    if (this.currentVisitor.ip !== '未知') {
                        console.log(`使用API ${i + 1} 成功获取IP: ${this.currentVisitor.ip}`);
                        return;
                    }
                }
            } catch (error) {
                console.log(`API ${i + 1} 失败:`, error.message);
                // 继续尝试下一个API
            }
        }
        
        // 如果所有API都失败，尝试WebRTC检测
        if (Config.app.enableWebRTCDetection && this.currentVisitor.ip === '未知') {
            await this.tryWebRTCDetection();
        }
    },
    
    // WebRTC检测（备用方法）
    async tryWebRTCDetection() {
        return new Promise((resolve) => {
            try {
                const rtc = new RTCPeerConnection({
                    iceServers: []
                });
                
                rtc.createDataChannel('');
                rtc.createOffer()
                    .then(offer => rtc.setLocalDescription(offer))
                    .catch(() => rtc.close());
                
                rtc.onicecandidate = (event) => {
                    if (event.candidate) {
                        const candidate = event.candidate.candidate;
                        const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                        
                        if (ipMatch) {
                            this.currentVisitor.ip = ipMatch[0];
                            console.log('WebRTC检测到IP:', this.currentVisitor.ip);
                        }
                        
                        rtc.close();
                        resolve();
                    }
                };
                
                // 1秒后超时
                setTimeout(() => {
                    rtc.close();
                    resolve();
                }, 1000);
            } catch (error) {
                console.log('WebRTC检测失败:', error);
                resolve();
            }
        });
    },
    
    // 获取地理位置
    async fetchLocation() {
        if (this.currentVisitor.ip === '未知') {
            return;
        }
        
        try {
            // 优先使用 ipapi.co
            const response = await fetch(Config.api.geoApis.ipapi(this.currentVisitor.ip));
            
            if (response.ok) {
                const data = await response.json();
                this.currentVisitor.updateFromApiData(data);
                
                // 如果成功获取位置信息，直接返回
                if (this.currentVisitor.location !== '未知') {
                    console.log('使用ipapi.co获取位置成功');
                    return;
                }
            }
        } catch (error) {
            console.log('ipapi.co失败，尝试备用API');
        }
        
        // 备用API：ip-api.com
        try {
            const response = await fetch(Config.api.geoApis.ipApiCom(this.currentVisitor.ip));
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.status === 'success') {
                    const location = [];
                    if (data.city) location.push(data.city);
                    if (data.regionName) location.push(data.regionName);
                    if (data.country) location.push(data.country);
                    this.currentVisitor.location = location.join(', ') || '未知';
                    
                    console.log('使用ip-api.com获取位置成功');
                }
            }
        } catch (error) {
            console.log('备用API也失败:', error);
            this.currentVisitor.location = '位置服务异常';
        }
    },
    
    // 获取当前访客信息
    getCurrentVisitor() {
        return this.currentVisitor;
    },
    
    // 更新状态显示
    updateStatusDisplay(elementId = 'status') {
        const statusElement = document.getElementById(elementId);
        if (statusElement && this.currentVisitor) {
            const ipDisplay = this.currentVisitor.ip === '未知' 
                ? 'IP获取中...' 
                : this.currentVisitor.ip;
            
            statusElement.textContent = `状态: 就绪 (IP: ${ipDisplay})`;
            statusElement.title = `位置: ${this.currentVisitor.location} | 系统: ${this.currentVisitor.platform}`;
        }
    },
    
    // 获取地理位置简写
    getShortLocation() {
        if (!this.currentVisitor) return '未知';
        
        const location = this.currentVisitor.location;
        if (location.includes(',')) {
            return location.split(',')[0];
        }
        return location;
    }
};

// 导出服务
window.VisitorService = VisitorService;