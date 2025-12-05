/**
 * 主应用逻辑
 * 处理UI交互和业务逻辑
 */

const App = {
    // 初始化状态
    isInitialized: false,
    
    // 当前消息列表
    currentMessages: new Models.MessageList(),
    
    // 初始化应用
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('应用初始化开始...');
        
        try {
            // 1. 初始化访客信息
            await VisitorService.initialize();
            VisitorService.updateStatusDisplay();
            
            // 2. 绑定事件
            this.bindEvents();
            
            // 3. 加载留言
            await this.loadMessages();
            
            // 4. 更新状态
            this.isInitialized = true;
            
            console.log('应用初始化完成');
            
            // 显示欢迎消息
            Utils.showNotification('应用已准备好！', 'success');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            Utils.showNotification(`初始化失败: ${error.message}`, 'error');
        }
    },
    
    // 绑定事件
    bindEvents() {
        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadMessages());
        }
        
        // 提交按钮
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitMessage());
        }
        
        // 内容输入框快捷键（Ctrl+Enter提交）
        const contentInput = document.getElementById('content');
        if (contentInput) {
            contentInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    this.submitMessage();
                }
            });
        }
        
        // 监听页面可见性变化（重新获取焦点时刷新）
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                this.loadMessages();
            }
        });
    },
    
    // 加载留言
    async loadMessages() {
        try {
            Utils.showNotification('正在加载留言...', 'info');
            
            const messagesData = await AzureTableService.getMessages();
            this.currentMessages = new Models.MessageList(messagesData);
            
            this.renderMessages();
            
            Utils.showNotification(`已加载 ${this.currentMessages.count()} 条留言`, 'success');
            
        } catch (error) {
            console.error('加载留言失败:', error);
            Utils.showNotification(`加载失败: ${error.message}`, 'error');
            
            // 显示空状态
            this.showEmptyState();
        }
    },
    
    // 提交留言
    async submitMessage() {
        const nameInput = document.getElementById('name');
        const contentInput = document.getElementById('content');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';
        
        // 验证输入
        if (!content) {
            Utils.showNotification('请输入留言内容', 'warning');
            contentInput?.focus();
            return;
        }
        
        try {
            // 创建留言对象
            const message = new Models.Message({
                name: name || Config.app.defaultName,
                message: content
            });
            
            // 合并访客信息
            const visitor = VisitorService.getCurrentVisitor();
            message.mergeVisitorInfo(visitor);
            
            // 保存到Azure Table
            await AzureTableService.createMessage(message);
            
            // 清空输入框
            if (nameInput) nameInput.value = '';
            if (contentInput) contentInput.value = '';
            
            // 重新加载留言
            await this.loadMessages();
            
            Utils.showNotification('留言已成功发布！', 'success');
            
        } catch (error) {
            console.error('提交留言失败:', error);
            Utils.showNotification(`发布失败: ${error.message}`, 'error');
        }
    },
    
    // 删除留言
    async deleteMessage(partitionKey, rowKey) {
        if (!confirm('确定要删除这条留言吗？此操作不可撤销。')) {
            return;
        }
        
        try {
            await AzureTableService.deleteMessage(partitionKey, rowKey);
            
            // 重新加载留言
            await this.loadMessages();
            
            Utils.showNotification('留言已删除', 'success');
            
        } catch (error) {
            console.error('删除留言失败:', error);
            Utils.showNotification(`删除失败: ${error.message}`, 'error');
        }
    },
    
    // 渲染留言列表
    renderMessages() {
        const container = document.getElementById('messages');
        if (!container) return;
        
        // 排序消息
        this.currentMessages.sortByTime();
        
        if (this.currentMessages.count() === 0) {
            this.showEmptyState();
            return;
        }
        
        const messages = this.currentMessages.toArray();
        
        container.innerHTML = messages.map(message => this.createMessageElement(message)).join('');
        
        // 添加批量删除按钮（如果有多个留言）
        if (messages.length > 1) {
            this.addBatchDeleteButton(messages.length);
        }
    },
    
    // 创建留言元素
    createMessageElement(message) {
        return `
            <div class="message" id="msg-${Utils.escapeHtml(message.RowKey)}">
                <div class="message-header">
                    <div class="message-author">${Utils.escapeHtml(message.name)}</div>
                    <button class="btn btn-danger" 
                            onclick="App.deleteMessage('${Utils.escapeHtml(message.PartitionKey)}', '${Utils.escapeHtml(message.RowKey)}')">Delete</button>
                </div>
                <div class="message-content">${Utils.escapeHtml(message.message)}</div>
                <div class="message-meta">
                    <div>${message.getFormattedTime()}</div>
                    <div class="meta-row">
                        <span class="meta-item">
                            <span class="meta-label">IP:</span>
                            <span>${Utils.escapeHtml(message.userIp)}</span>
                        </span>
                        <span class="meta-item">
                            <span class="meta-label">位置:</span>
                            <span>${Utils.escapeHtml(message.userLocation)}</span>
                        </span>
                        <span class="meta-item">
                            <span class="meta-label">系统:</span>
                            <span>${Utils.escapeHtml(message.userPlatform)}</span>
                        </span>
                    </div>
                </div>
            </div>
        `;
    },
    
    // 显示空状态
    showEmptyState() {
        const container = document.getElementById('messages');
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <h3>还没有留言</h3>
                <p>快来发表第一条留言吧！</p>
            </div>
        `;
    },
    
    // 添加批量删除按钮
    addBatchDeleteButton(count) {
        const container = document.getElementById('messages');
        if (!container) return;
        
        const buttonHtml = `
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #fff8f8; border-radius: 8px;">
                <button class="btn btn-danger" 
                        onclick="App.deleteAllMessages()"
                        style="padding: 12px 24px; font-size: 16px;">
                    ⚠️ 删除所有留言 (${count}条)
                </button>
                <p style="color: #dc3545; font-size: 12px; margin-top: 10px;">
                    警告：此操作将删除所有留言，不可撤销！
                </p>
            </div>
        `;
        
        //container.insertAdjacentHTML('beforeend', buttonHtml);
    },
    
    // 批量删除所有留言
    async deleteAllMessages() {
        if (!confirm('⚠️ 警告：这将删除所有留言！此操作不可撤销。\n\n确定要继续吗？')) {
            return;
        }
        
        try {
            const result = await AzureTableService.deleteAllMessages();
            
            if (result.deleted > 0) {
                Utils.showNotification(`已删除 ${result.deleted} 条留言，失败 ${result.failed} 条`, 'success');
            }
            
            // 重新加载留言
            await this.loadMessages();
            
        } catch (error) {
            console.error('批量删除失败:', error);
            Utils.showNotification(`批量删除失败: ${error.message}`, 'error');
        }
    },
    
    // 清空输入
    clearInput() {
        const nameInput = document.getElementById('name');
        const contentInput = document.getElementById('content');
        
        if (nameInput) nameInput.value = '';
        if (contentInput) contentInput.value = '';
        
        Utils.showNotification('输入已清空', 'info');
    }
};

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保所有脚本已加载
    setTimeout(() => App.initialize(), 100);
});

// 导出应用
window.App = App;