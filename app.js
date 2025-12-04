// 配置部分 - 修改这里！
const TABLE_URL = "https://messageboard2025.table.core.windows.net/messages";
const SAS_TOKEN = "sv=2024-11-04&ss=t&srt=co&sp=rwdl&se=2026-02-12T23:59:29Z&st=2025-12-02T15:44:29Z&spr=https&sig=1KAtGlI7tHgxyzXpqMKfn9G7EHBzsszqMxhaMKTfCbw%3D";

// DOM 元素
const form = document.getElementById('messageForm');
const messagesList = document.getElementById('messagesList');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const messagesContainer = document.getElementById('messagesContainer');

// 生成唯一的 RowKey
function generateRowKey() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 格式化时间
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 显示消息
function showMessage(type, text) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${text}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').prepend(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// 获取所有留言
async function loadMessages() {
    loading.style.display = 'block';
    messagesList.innerHTML = '';
    
    try {
        // 查询参数：获取最新的50条，按时间倒序
        const queryParams = new URLSearchParams({
            '$top': '50',
            '$orderby': 'Timestamp desc',
            ...Object.fromEntries(new URLSearchParams(SAS_TOKEN))
        });
        
        const response = await fetch(`${TABLE_URL}?${queryParams}`, {
            headers: {
                'Accept': 'application/json;odata=nometadata'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.value && data.value.length > 0) {
            emptyState.style.display = 'none';
            messagesContainer.style.display = 'block';
            
            data.value.forEach(item => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message-card';
                messageDiv.innerHTML = `
                    <div class="message-header mb-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="bi bi-person-circle"></i> 
                                ${escapeHtml(item.Author || '匿名')}
                            </h5>
                            <small class="message-time">
                                <i class="bi bi-clock"></i> ${formatTime(item.Timestamp)}
                            </small>
                        </div>
                    </div>
                    <div class="message-body">
                        <p class="mb-0">${escapeHtml(item.Message || '')}</p>
                    </div>
                `;
                messagesList.appendChild(messageDiv);
            });
        } else {
            messagesContainer.style.display = 'none';
            emptyState.style.display = 'block';
        }
        
    } catch (error) {
        console.error('加载留言失败:', error);
        showMessage('danger', '加载留言失败，请刷新重试');
        messagesContainer.style.display = 'none';
        emptyState.style.display = 'block';
    } finally {
        loading.style.display = 'none';
    }
}

// HTML转义防止XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 提交新留言
async function submitMessage(event) {
    event.preventDefault();
    
    const author = document.getElementById('author').value.trim();
    const message = document.getElementById('message').value.trim();
    
    if (!author || !message) {
        showMessage('warning', '请填写姓名和留言内容');
        return;
    }
    
    // 禁用按钮防止重复提交
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 发布中...';
    
    try {
        const entity = {
            "PartitionKey": "board",
            "RowKey": generateRowKey(),
            "Author": author,
            "Message": message,
            "Timestamp": new Date().toISOString()
        };
        
        const response = await fetch(TABLE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json;odata=nometadata',
                'Prefer': 'return-no-content'
            },
            body: JSON.stringify(entity)
        });
        
        if (response.status === 204) {
            showMessage('success', '留言发布成功！');
            form.reset();
            // 重新加载留言列表
            await loadMessages();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('发布失败:', error);
        showMessage('danger', '留言发布失败，请重试');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send"></i> 发布留言';
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 加载已有留言
    loadMessages();
    
    // 设置表单提交事件
    form.addEventListener('submit', submitMessage);
    
    // 每30秒自动刷新留言列表
    setInterval(loadMessages, 30000);
    
    // 添加键盘快捷键：Ctrl+Enter 提交
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            submitMessage(new Event('submit'));
        }
    });
});
