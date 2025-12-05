/**
 * 数据服务层
 * 处理与Azure Table的数据交互
 */

const AzureTableService = {
    // 获取完整URL
    getFullUrl() {
        return Config.getFullUrl();
    },
    
    // 获取实体URL
    getEntityUrl(partitionKey, rowKey) {
        const encodedPartitionKey = encodeURIComponent(partitionKey);
        const encodedRowKey = encodeURIComponent(rowKey);
        return `${Config.getBaseUrl()}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')${Config.azure.sas}`;
    },
    
    // 获取请求头
    getHeaders(additionalHeaders = {}) {
        const defaultHeaders = {
            'Accept': 'application/json;odata=nometadata',
            'DataServiceVersion': '3.0;NetFx',
            'MaxDataServiceVersion': '3.0;NetFx'
        };
        
        return { ...defaultHeaders, ...additionalHeaders };
    },
    
    // 获取留言列表
    async getMessages() {
        try {
            const queryUrl = `${this.getFullUrl()}&$filter=PartitionKey eq 'messages'&$top=${Config.app.messagesPerPage}`;
            
            const response = await fetch(queryUrl, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            console.log('获取留言响应:', response.status, response.statusText);
            
            if (response.ok) {
                const data = await response.json();
                return data.value || [];
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {
            console.error('获取留言失败:', error);
            throw error;
        }
    },
    
    // 创建留言
    async createMessage(messageData) {
        try {
            // 验证数据
            const validation = messageData.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            const response = await fetch(this.getFullUrl(), {
                method: 'POST',
                headers: this.getHeaders({
                    'Content-Type': 'application/json',
                    'Prefer': 'return-no-content'
                }),
                body: JSON.stringify(messageData)
            });
            
            console.log('创建留言响应:', response.status, response.statusText);
            
            if (response.ok || response.status === 204) {
                return true;
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {
            console.error('创建留言失败:', error);
            throw error;
        }
    },
    
    // 删除留言
    async deleteMessage(partitionKey, rowKey) {
        try {
            const deleteUrl = this.getEntityUrl(partitionKey, rowKey);
            
            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: this.getHeaders({
                    'If-Match': '*'  // 强制删除，不检查版本
                })
            });
            
            console.log('删除留言响应:', response.status, response.statusText);
            
            if (response.ok || response.status === 204) {
                return true;
            } else {
                const errorText = await response.text();
                
                // 检查是否为权限错误
                if (response.status === 403) {
                    throw new Error('SAS令牌没有删除权限，请更新SAS令牌');
                }
                
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {
            console.error('删除留言失败:', error);
            throw error;
        }
    },
    
    // 批量删除留言
    async deleteAllMessages() {
        try {
            // 先获取所有留言
            const messages = await this.getMessages();
            
            if (messages.length === 0) {
                return { deleted: 0, failed: 0 };
            }
            
            let deletedCount = 0;
            let failedCount = 0;
            const errors = [];
            
            // 逐个删除
            for (const message of messages) {
                try {
                    await this.deleteMessage(message.PartitionKey, message.RowKey);
                    deletedCount++;
                } catch (error) {
                    failedCount++;
                    errors.push({
                        rowKey: message.RowKey,
                        error: error.message
                    });
                    console.error(`删除失败 ${message.RowKey}:`, error);
                }
            }
            
            return {
                deleted: deletedCount,
                failed: failedCount,
                errors: errors
            };
        } catch (error) {
            console.error('批量删除失败:', error);
            throw error;
        }
    },
    
    // 测试连接
    async testConnection() {
        try {
            const testUrl = `${this.getFullUrl()}&$top=1`;
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            return {
                success: response.ok,
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// 导出服务
window.AzureTableService = AzureTableService;