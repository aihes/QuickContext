from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import uvicorn
from pydantic import BaseModel
import asyncio
import json
import base64
import os
from datetime import datetime

app = FastAPI()

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 存储所有活跃的WebSocket连接
active_connections: List[WebSocket] = []

# 存储截图结果
screenshot_results: Dict[str, str] = {}

# 创建保存截图的目录
SCREENSHOT_DIR = "screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

class CaptureRequest(BaseModel):
    url: str

class AlertRequest(BaseModel):
    type: str
    message: str
    error: str
    timestamp: str

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # 接收来自扩展的消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "screenshot":
                # 存储截图结果
                screenshot_results[message["url"]] = message["data"]
                
                # 保存截图到本地
                try:
                    # 生成文件名（使用时间戳和URL的最后部分）
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    url_part = message["url"].replace("://", "_").replace("/", "_")[-50:]  # 限制URL部分长度
                    filename = f"{timestamp}_{url_part}.png"
                    filepath = os.path.join(SCREENSHOT_DIR, filename)
                    
                    # 解码Base64数据并保存
                    image_data = base64.b64decode(message["data"].split(',')[1])
                    with open(filepath, 'wb') as f:
                        f.write(image_data)
                    print(f"截图已保存: {filepath}")
                except Exception as e:
                    print(f"保存截图时出错: {e}")
                
                print(f"收到截图: {message['url']}")
    except Exception as e:
        print(f"WebSocket错误: {e}")
    finally:
        active_connections.remove(websocket)

@app.post("/api/capture")
async def capture_screenshot(request: CaptureRequest):
    """
    触发截图请求的HTTP API
    示例请求:
    curl -X POST http://localhost:5001/api/capture -H "Content-Type: application/json" -d '{"url":"https://example.com"}'
    """
    if not active_connections:
        return {"status": "error", "message": "没有活跃的WebSocket连接"}
    
    # 向所有连接的客户端发送截图请求
    message = {
        "type": "capture",
        "url": request.url
    }
    
    # 清除之前的截图结果
    if request.url in screenshot_results:
        del screenshot_results[request.url]
    
    # 发送截图请求到扩展
    for connection in active_connections:
        await connection.send_text(json.dumps(message))
    
    # 等待截图结果（最多等待30秒）
    MAX_WAIT_TIME = 30  # 30秒超时
    CHECK_INTERVAL = 0.5  # 每0.5秒检查一次
    MAX_ATTEMPTS = int(MAX_WAIT_TIME / CHECK_INTERVAL)  # 60次尝试
    
    for _ in range(MAX_ATTEMPTS):
        if request.url in screenshot_results:
            return {
                "status": "success",
                "url": request.url,
                "screenshot": screenshot_results[request.url]
            }
        await asyncio.sleep(CHECK_INTERVAL)
    
    return {
        "status": "error", 
        "message": f"截图超时 (等待时间: {MAX_WAIT_TIME}秒)",
        "url": request.url
    }

@app.get("/api/connections")
async def get_connections():
    """
    获取当前活跃的WebSocket连接数
    """
    return {"active_connections": len(active_connections)}

@app.post("/api/alert")
async def handle_alert(alert: AlertRequest):
    """
    处理报警信息的接口
    """
    print(f"收到报警 - 类型: {alert.type}")
    print(f"消息: {alert.message}")
    print(f"错误: {alert.error}")
    print(f"时间: {alert.timestamp}")
    
    # 这里可以添加你的报警逻辑，比如：
    # 1. 发送邮件
    # 2. 发送钉钉/企业微信消息
    # 3. 写入日志文件
    # 4. 调用其他报警系统的API
    
    return {"status": "success", "message": "报警已记录"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001) 