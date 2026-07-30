# 🥊 双人格斗

基于 **PixiJS + WebSocket** 的网页双人对战格斗游戏，支持 PC 和手机端。

---

## 🎮 玩法

两名玩家各自操控角色，通过连击、必杀技击败对手。每局 60 秒，血条归零或时间结束时血量少的一方落败。

---

## 🕹 操作方式

### PC 端（键盘）

| 动作 | P1 | P2 |
|---|---|---|
| 左移 | `A` | `←` |
| 右移 | `D` | `→` |
| 跳跃 | `W` | `↑` |
| 攻击 | `J` | `1` |
| 必杀 | `K` | `2` |
| 准备 | `J` | `1` |

### 手机端（触屏）

画面底部显示虚拟按钮，左侧方向 + 右侧攻击/必杀。

---

## 🚀 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm start

# 3. 浏览器打开
# 本机：http://localhost:8080
# 手机：http://你的局域网IP:8080
```

本地模式下，两个玩家在同一设备上操作（一个用键盘，一个用键盘右侧按键）即可对战。

---

## 🌐 联机对战

1. 启动服务器后，两台设备打开同一个地址
2. 双方点击"准备"，3 秒倒计时后开战
3. P1 为主机，P2 自动同步状态

---

## ☁️ 部署到公网

### Render（免费）

1. Fork 或推送本仓库到 GitHub
2. 在 [render.com](https://render.com) 创建 Web Service
3. Start Command 填 `npm start`，选 Free 实例

### natapp（国内）

1. 注册 [natapp.cn](https://natapp.cn)，购买免费隧道
2. 本地端口填 `8080`
3. 运行客户端获得公网地址

---

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 渲染引擎 | PixiJS 7 (WebGL) |
| 网络通信 | WebSocket (ws) |
| 后端 | Node.js |
| 同步模型 | P1 主机权威 |

---

## 📁 项目结构

```
├── index.html      # 主页面 + UI 布局
├── main.js         # 游戏逻辑、WebSocket、状态同步
├── sptite.js        # PixiJS 精灵、角色、子弹类
├── util.js         # 碰撞检测
├── style.css       # 样式 + 响应式适配
├── server.js       # HTTP + WebSocket 服务器
├── package.json    # 项目配置
└── img/            # 角色精灵图 + 背景
```

---

## 📝 License

MIT
