const canvas = document.querySelector('canvas');
const c =canvas.getContext('2d');//2d渲染
canvas.width = 1024;
canvas.height = 576;
const gravity = 0.7;//重力
const ground = canvas.height - 100;//地面高度

// ============ WebSocket 联机 ============
let ws = null;
let myPlayerId = null; // 1=P1, 2=P2
let opponentConnected = false;

function connectServer(){
    const host = location.hostname;
    ws = new WebSocket(`ws://${host}:8080`);
    ws.onopen = () => {
        console.log('已连接到服务器');
        document.getElementById('connectionStatus').textContent = '已连接服务器，等待对手...';
    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };
    ws.onclose = () => {
        console.log('与服务器断开');
        document.getElementById('connectionStatus').textContent = '连接断开';
        opponentConnected = false;
    };
    ws.onerror = () => {
        document.getElementById('connectionStatus').textContent = '连接失败，请检查服务器';
    };
}

function handleServerMessage(data){
    switch(data.type){
        case 'assign':
            myPlayerId = data.playerId;
            document.getElementById('connectionStatus').textContent = 
                `你是 P${myPlayerId}，等待对手加入...`;
            break;
        case 'bothReady':
            opponentConnected = true;
            document.getElementById('connectionStatus').textContent = 
                `你是 P${myPlayerId}！双方已连接`;
            document.getElementById('selectScreen').style.display = 'flex';
            // 根据角色调整UI
            if(myPlayerId === 2){
                document.getElementById('p1ReadyKey').textContent = '等待P1准备...';
                document.getElementById('p2ReadyKey').textContent = '点击准备';
            } else {
                document.getElementById('p1ReadyKey').textContent = '按 J 准备';
                document.getElementById('p2ReadyKey').textContent = '等待P2准备...';
            }
            break;
        case 'opponentLeft':
            opponentConnected = false;
            document.getElementById('connectionStatus').textContent = '对手已离开';
            break;
        case 'ready':
            // 对手已准备
            if(data.playerId === 1){
                p1Ready = true;
                document.getElementById('p1Ready').classList.add('is-ready');
                document.getElementById('p1Status').textContent = '已准备！';
            } else {
                p2Ready = true;
                document.getElementById('p2Ready').classList.add('is-ready');
                document.getElementById('p2Status').textContent = '已准备！';
            }
            checkBothReady();
            break;
        // 远程输入
        case 'input':
            applyRemoteInput(data);
            break;
        // P1主机同步的游戏状态 (仅P2接收)
        case 'gameState':
            if (myPlayerId === 2) {
                lastSyncState = data;
                applySyncedState(data);
            }
            break;
    }
}

function sendToServer(data){
    if(ws && ws.readyState === 1){
        ws.send(JSON.stringify(data));
    }
}

// 应用远程玩家的输入
function applyRemoteInput(data){
    if(data.action === 'keydown'){
        switch(data.key){
            case 'w':
                if(player && player.isOnGround()) player.speed.y = -20;
                break;
            case 'a':
                keys.a = true;
                break;
            case 'd':
                keys.d = true;
                break;
            case 'j':
                if(player && !player.dead) player.attack();
                break;
            case 'k':
                if(player && !player.dead) fireProjectile(player, 1);
                break;
            case 'ArrowUp':
                if(enemy && enemy.isOnGround()) enemy.speed.y = -20;
                break;
            case 'ArrowLeft':
                keys.left = true;
                break;
            case 'ArrowRight':
                keys.right = true;
                break;
            case '1':
                if(enemy && !enemy.dead) enemy.attack();
                break;
            case '2':
                if(enemy && !enemy.dead) fireProjectile(enemy, -1);
                break;
        }
    } else if(data.action === 'keyup'){
        switch(data.key){
            case 'a':
                keys.a = false;
                break;
            case 'd':
                keys.d = false;
                break;
            case 'ArrowLeft':
                keys.left = false;
                break;
            case 'ArrowRight':
                keys.right = false;
                break;
        }
    }
}
// 图片预加载会在 characterData 定义后启动

// ============ 角色配置数据 ============
const imageCache = {}; // 预加载的图片缓存

const characterData = {
    'king blue': {
        idle:     { src: 'img/king blue/Idle.png',      totalFrames: 8, scale: 2.5 },
        run:      { src: 'img/king blue/Run.png',        totalFrames: 8, scale: 2.5 },
        jump:     { src: 'img/king blue/Jump.png',       totalFrames: 2, scale: 2.5 },
        fall:     { src: 'img/king blue/Fall.png',       totalFrames: 2, scale: 2.5 },
        attack1:  { src: 'img/king blue/Attack1.png',    totalFrames: 4, scale: 2.5 },
        attack2:  { src: 'img/king blue/Attack2.png',    totalFrames: 4, scale: 2.5 },
        attack3:  { src: 'img/king blue/Attack3.png',    totalFrames: 4, scale: 2.5 },
        takeHit:  { src: 'img/king blue/Take hit.png',   totalFrames: 4, scale: 2.5 },
        death:    { src: 'img/king blue/Death.png',      totalFrames: 6, scale: 2.5 },
        offset: { x: 215, y: 120 },
        src: 'img/king blue/Idle.png',
        totalFrames: 8
    }
};

// 预加载所有角色图片
function preloadAllImages(callback){
    const urls = [
        'img/image_227620290198042.png',
        'img/Idle (64x32).png'
    ];
    // 收集所有角色图片URL
    for(const charName in characterData){
        const charData = characterData[charName];
        for(const key in charData){
            if(charData[key] && charData[key].src) urls.push(charData[key].src);
        }
        if(charData.src) urls.push(charData.src);
    }
    // 去重
    const uniqueUrls = [...new Set(urls)];
    let loaded = 0;
    const total = uniqueUrls.length;

    function onOneLoaded(){
        loaded++;
        const pct = Math.round(loaded / total * 100);
        document.getElementById('connectionStatus').textContent = `加载中... ${pct}%`;
        if(loaded >= total){
            callback();
        }
    }

    uniqueUrls.forEach(url => {
        if(imageCache[url]){
            onOneLoaded();
            return;
        }
        const img = new Image();
        img.onload = () => {
            imageCache[url] = img;
            onOneLoaded();
        };
        img.onerror = () => {
            console.warn('图片加载失败:', url);
            imageCache[url] = img; // 也缓存，避免重复加载
            onOneLoaded();
        };
        img.src = url;
    });
}

// ============ 游戏状态变量 ============
let timer = 60;
let gameOver = false;
let gameStarted = false;
let p1Ready = false;
let p2Ready = false;
let playerProjectiles = [];
let enemyProjectiles = [];
let playerCooldown = 0;
let enemyCooldown = 0;
let player, enemy; // 在角色选择后创建

// ============ 状态同步变量 (P1主机权威模式) ============
let lastSyncState = null;
let syncFrameCount = 0;

// 获取角色当前精灵名称
function getSpriteName(fighter) {
    for (const key in fighter.sprites) {
        if (fighter.sprites[key] && fighter.sprites[key].image &&
            fighter.image === fighter.sprites[key].image) {
            return key;
        }
    }
    return 'idle';
}

// 应用同步的游戏状态 (P2客户端使用)
function applySyncedState(state) {
    if (!player || !enemy) return;

    // 同步 player 状态
    player.position.x = state.player.x;
    player.position.y = state.player.y;
    player.speed.x = state.player.speedX;
    player.speed.y = state.player.speedY;
    player.health = state.player.health;
    player.dead = state.player.dead;
    player.isAttacking = state.player.isAttacking;
    player.attackCombo = state.player.attackCombo || 0;
    var pSprite = state.player.sprite;
    if (player.sprites[pSprite] && player.sprites[pSprite].image) {
        player.image = player.sprites[pSprite].image;
        player.totalFrames = player.sprites[pSprite].totalFrames;
        player.framesCurrent = state.player.framesCurrent;
    }

    // 同步 enemy 状态
    enemy.position.x = state.enemy.x;
    enemy.position.y = state.enemy.y;
    enemy.speed.x = state.enemy.speedX;
    enemy.speed.y = state.enemy.speedY;
    enemy.health = state.enemy.health;
    enemy.dead = state.enemy.dead;
    enemy.isAttacking = state.enemy.isAttacking;
    enemy.attackCombo = state.enemy.attackCombo || 0;
    var eSprite = state.enemy.sprite;
    if (enemy.sprites[eSprite] && enemy.sprites[eSprite].image) {
        enemy.image = enemy.sprites[eSprite].image;
        enemy.totalFrames = enemy.sprites[eSprite].totalFrames;
        enemy.framesCurrent = state.enemy.framesCurrent;
    }

    // 同步计时器
    if (state.timer !== undefined && state.timer !== timer) {
        timer = state.timer;
        document.getElementById('timer').innerHTML = timer;
    }

    // 更新血条
    document.querySelector('#playerHealthFill > div').style.width = Math.max(player.health, 0) + '%';
    document.querySelector('#enemyHealthFill > div').style.width = Math.max(enemy.health, 0) + '%';

    // 同步子弹
    if (state.playerProjectiles) {
        playerProjectiles = state.playerProjectiles.filter(function(p){ return p.life === 1; }).map(function(p){
            var proj = new Projectile({position: {x: p.x, y: p.y}, speed: {x: 8, y: 0}, direction: p.direction, color: p.color, size: p.size, damage: p.damage, isKamehame: p.isKamehame});
            proj.life = p.life;
            return proj;
        });
    }
    if (state.enemyProjectiles) {
        enemyProjectiles = state.enemyProjectiles.filter(function(p){ return p.life === 1; }).map(function(p){
            var proj = new Projectile({position: {x: p.x, y: p.y}, speed: {x: 8, y: 0}, direction: p.direction, color: p.color, size: p.size, damage: p.damage, isKamehame: p.isKamehame});
            proj.life = p.life;
            return proj;
        });
    }

    // 游戏结束
    if (state.gameOver && !gameOver) {
        gameOver = true;
        determineWinner();
    }
}

// 检测是否为触屏设备
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ============ 背景和装饰 ============
const background = new Sprite({
    position: { x: 0, y: 0 },
    src: 'img/image_227620290198042.png',
    drawWidth: 1024,
    drawHeight: 576
});
const shuzhuang = new Sprite({
    position: { x: 900, y: 270 },
    src: 'img/Idle (64x32).png',
    totalFrames: 18,
    scale: 2,
});

// ============ 角色选择逻辑 ============
let p1Char = 'king blue';  // P1默认选蓝骑士
let p2Char = 'king blue';  // P2默认选蓝骑士

// 角色卡片点击事件
document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', function(){
        const playerNum = this.dataset.player;
        const charName = this.dataset.char;
        // 移除同侧其他选中
        this.closest('.char-options').querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        if(playerNum === '1') p1Char = charName;
        else p2Char = charName;
    });
});

// 确认选择按钮
document.getElementById('confirmSelectBtn').addEventListener('click', function(){
    document.getElementById('selectScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    document.getElementById('connectionStatus').style.display = 'none';
});

// 创建Fighter的通用函数
function createFighter(config){
    const charSprites = characterData[config.char];
    const sprites = {};
    for(const key in charSprites){
        if(key === 'offset' || key === 'src' || key === 'totalFrames') continue;
        sprites[key] = { ...charSprites[key] };
    }
    return new Fighter({
        position: config.position,
        speed: {x: 0, y: 0},
        src: charSprites.src,
        totalFrames: charSprites.totalFrames,
        scale: charSprites.idle.scale,
        flip: config.flip || false,
        offset: { ...charSprites.offset },
        attackBox: {
            width: 100,
            height: 50,
            offset: config.attackOffset
        },
        sprites: sprites
    });
}

// 初始化战斗角色(在确认选择后、游戏开始前调用)
function initFighters(){
    player = createFighter({
        char: p1Char,
        position: { x: 124, y: 0 },
        attackOffset: { x: 80, y: 50 }
    });
    enemy = createFighter({
        char: p2Char,
        position: { x: canvas.width - 200, y: 0 },
        flip: true,
        attackOffset: { x: -180, y: 50 }
    });
}

const keys = {
    a:false,
    d:false,
    left:false,
    right:false
};

//判断玩家的运动方向
window.addEventListener('keydown', (event) => {
    console.log(event.key);

    // 开始界面 - 玩家准备(网络联机模式)
    if(!gameStarted && opponentConnected){
        if(myPlayerId === 1 && (event.key === 'j' || event.key === 'J')){
            p1Ready = true;
            document.getElementById('p1Ready').classList.add('is-ready');
            document.getElementById('p1Status').textContent = '已准备！';
            sendToServer({type: 'ready', playerId: 1});
            checkBothReady();
        }
        if(myPlayerId === 2 && event.key === '1'){
            p2Ready = true;
            document.getElementById('p2Ready').classList.add('is-ready');
            document.getElementById('p2Status').textContent = '已准备！';
            sendToServer({type: 'ready', playerId: 2});
            checkBothReady();
        }
        return;
    }

    // 开始界面 - 本地双人模式(无联机)
    if(!gameStarted && !opponentConnected){
        if(event.key === 'j' || event.key === 'J'){
            p1Ready = true;
            document.getElementById('p1Ready').classList.add('is-ready');
            document.getElementById('p1Status').textContent = '已准备！';
        }
        if(event.key === '1'){
            p2Ready = true;
            document.getElementById('p2Ready').classList.add('is-ready');
            document.getElementById('p2Status').textContent = '已准备！';
        }
        checkBothReady();
        return;
    }

    if(gameOver) return;

    // 联机模式: P1只控制player, P2只控制enemy
    // 本地模式: 两个都控制
    const isOnline = opponentConnected;
    const canControlP1 = !isOnline || myPlayerId === 1;
    const canControlP2 = !isOnline || myPlayerId === 2;

    if(canControlP1 && player && !player.dead){
        switch (event.key) {
            case 'w':
                if (player.isOnGround()) {
                    player.speed.y = -20;
                }
                break;
            case 'a':
                keys.a = true;
                break;
            case 'd':
                keys.d = true;
                break;
            case 'j':
                player.attack();
                break;
            case 'k':
                fireProjectile(player, 1);
                break;
        }
        // 联机模式发送输入
        if(isOnline){
            sendToServer({type: 'input', action: 'keydown', key: event.key});
        }
    }
    if(canControlP2 && enemy && !enemy.dead){
        switch (event.key) {
            case 'ArrowUp':
                if (enemy.isOnGround()) {
                    enemy.speed.y = -20;
                }
                break;
            case 'ArrowLeft':
                keys.left = true;
                break;
            case 'ArrowRight':
                keys.right = true;
                break;
            case '1':
                enemy.attack();
                break;
            case '2':
                fireProjectile(enemy, -1);
                break;
        }
        if(isOnline){
            sendToServer({type: 'input', action: 'keydown', key: event.key});
        }
    }
});

// 检查双方是否都准备好了
function checkBothReady(){
    if(p1Ready && p2Ready){
        gameStarted = true;
        initFighters();
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('vsScreen').style.display = 'flex';
        setTimeout(function(){
            document.getElementById('vsScreen').style.display = 'none';
            animate();
            startCountdown();
        }, 3000);
    }
}

// 发射子弹的通用函数
function fireProjectile(fighter, direction){
    const isP1 = (fighter === player);
    if(isP1 && playerCooldown > 0) return;
    if(!isP1 && enemyCooldown > 0) return;
    if(gameOver) return;
    const projectiles = isP1 ? playerProjectiles : enemyProjectiles;
    projectiles.push(new Projectile({
        position: {x: fighter.position.x + (direction > 0 ? fighter.width : 0), y: fighter.position.y + fighter.height/2},
        speed: {x: 8, y: 0},
        direction: direction,
        color: isP1 ? '#ff4500' : '#00bfff',
        size: 12,
        damage: 30,
        isKamehame: !isP1
    }));
    if(isP1) playerCooldown = 60;
    else enemyCooldown = 60;
}

// ============ 手机触控事件 ============
function setupMobileControls(){
    if(!isTouchDevice) return;

    // 准备按钮 - 根据联机模式调整
    document.getElementById('p1ReadyKey').textContent = '点击准备';
    document.getElementById('p2ReadyKey').textContent = '点击准备';

    // P1准备 - 点击准备框
    document.getElementById('p1Ready').addEventListener('touchstart', function(e){
        e.preventDefault();
        if(!p1Ready){
            p1Ready = true;
            this.classList.add('is-ready');
            document.getElementById('p1Status').textContent = '已准备！';
            if(opponentConnected) sendToServer({type: 'ready', playerId: 1});
            checkBothReady();
        }
    });
    // P2准备
    document.getElementById('p2Ready').addEventListener('touchstart', function(e){
        e.preventDefault();
        if(!p2Ready){
            p2Ready = true;
            this.classList.add('is-ready');
            document.getElementById('p2Status').textContent = '已准备！';
            if(opponentConnected) sendToServer({type: 'ready', playerId: 2});
            checkBothReady();
        }
    });

    // P1 移动控制
    const p1Left = document.getElementById('p1-left');
    const p1Right = document.getElementById('p1-right');
    const p1Jump = document.getElementById('p1-jump');
    const p1Attack = document.getElementById('p1-attack');
    const p1Special = document.getElementById('p1-special');

    addTouchEvents(p1Left,  ()=>{ keys.a = true; if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'a'}); }, ()=>{ keys.a = false; if(opponentConnected) sendToServer({type:'input',action:'keyup',key:'a'}); });
    addTouchEvents(p1Right, ()=>{ keys.d = true; if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'d'}); }, ()=>{ keys.d = false; if(opponentConnected) sendToServer({type:'input',action:'keyup',key:'d'}); });
    addTouchEvents(p1Jump,  ()=>{ if(player && player.isOnGround()) player.speed.y = -20; if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'w'}); }, null);
    addTouchEvents(p1Attack, ()=>{ if(player && !player.dead && gameStarted && !gameOver) player.attack(); if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'j'}); }, null);
    addTouchEvents(p1Special, ()=>{ if(player && !player.dead && gameStarted) fireProjectile(player, 1); if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'k'}); }, null);

    // P2 移动控制
    const p2Left = document.getElementById('p2-left');
    const p2Right = document.getElementById('p2-right');
    const p2Jump = document.getElementById('p2-jump');
    const p2Attack = document.getElementById('p2-attack');
    const p2Special = document.getElementById('p2-special');

    addTouchEvents(p2Left,  ()=>{ keys.left = true; if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'ArrowLeft'}); }, ()=>{ keys.left = false; if(opponentConnected) sendToServer({type:'input',action:'keyup',key:'ArrowLeft'}); });
    addTouchEvents(p2Right, ()=>{ keys.right = true; if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'ArrowRight'}); }, ()=>{ keys.right = false; if(opponentConnected) sendToServer({type:'input',action:'keyup',key:'ArrowRight'}); });
    addTouchEvents(p2Jump,  ()=>{ if(enemy && enemy.isOnGround()) enemy.speed.y = -20; if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'ArrowUp'}); }, null);
    addTouchEvents(p2Attack, ()=>{ if(enemy && !enemy.dead && gameStarted && !gameOver) enemy.attack(); if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'1'}); }, null);
    addTouchEvents(p2Special, ()=>{ if(enemy && !enemy.dead && gameStarted) fireProjectile(enemy, -1); if(opponentConnected) sendToServer({type:'input',action:'keydown',key:'2'}); }, null);
}

function addTouchEvents(btn, onPress, onRelease){
    if(!btn) return;
    btn.addEventListener('touchstart', function(e){
        e.preventDefault();
        onPress();
    }, {passive: false});
    if(onRelease){
        btn.addEventListener('touchend', function(e){
            e.preventDefault();
            onRelease();
        }, {passive: false});
        btn.addEventListener('touchcancel', function(e){
            e.preventDefault();
            onRelease();
        }, {passive: false});
    }
}

// 初始化触控
setupMobileControls();


/*
原点 (0, 0) 的位置：
现实/数学中：原点通常在画布的正中心。
JS 画布中：原点默认在画布的左上角。
Y 轴的正负方向：
现实/数学中：Y 轴向上为正，向下为负。
JS 画布中：Y 轴向下为正，向上为负。
X 轴的方向：
两者一致，都是向右为正。
*/


//解除按键时，设置对应的键值为false
window.addEventListener('keyup', (event) => {
    const isOnline = opponentConnected;
    const canControlP1 = !isOnline || myPlayerId === 1;
    const canControlP2 = !isOnline || myPlayerId === 2;

    if(canControlP1){
        switch (event.key) {
            case 'a':
                keys.a = false;
                break;
            case 'd':
                keys.d = false;
                break;
        }
    }
    if(canControlP2){
        switch (event.key) {
            case 'ArrowLeft':
                keys.left = false;
                break;
            case 'ArrowRight':
                keys.right = false;
                break;
        }
    }
    if(isOnline){
        sendToServer({type: 'input', action: 'keyup', key: event.key});
    }
});


function startCountdown() {
    let countDownTimer = setTimeout(startCountdown, 1000);
    timer--;
    document.getElementById('timer').innerHTML = timer;
    if (timer <= 0) {
        clearTimeout(countDownTimer);
        gameOver = true;
        const winner = player.health >= enemy.health ? 'P1 获胜！' : 'P2 获胜！';
        document.getElementById('gameOver').textContent = winner;
        document.getElementById('gameOver').style.display = 'flex';
    }
    
}


//动画函数,模拟重力和跳跃
function animate() {
    if(gameOver) return;
    window.requestAnimationFrame(animate);//递归调用
    background.update();//绘制背景
    shuzhuang.update();//更新树桩位置和动画

    // 是否为远程同步模式 (P2接收P1的状态)
    var isRemoteSync = opponentConnected && myPlayerId === 2;

    // P2: 在渲染前应用P1主机同步的状态
    if (isRemoteSync && lastSyncState) {
        applySyncedState(lastSyncState);
    }

    player.update();//更新玩家位置和动画
    enemy.update();//更新敌人位置和动画

    // P2: 跳过本地精灵切换和物理控制，使用P1同步的状态
    if (!isRemoteSync) {
        player.speed.x = 0;//玩家速度x坐标为0，意思是玩家不移动
        if (keys.a) {
            player.speed.x = -4;//玩家速度x坐标为-4，意思是玩家向左移动
            player.switchSprite('run');
        }else if (keys.d) {
            player.speed.x = 4;//玩家速度x坐标为4，意思是玩家向右移动
            player.switchSprite('run');
        }else{
            player.switchSprite('idle');
        }
        if (player.speed.y < 0) {
            player.switchSprite('jump');
        }else if (player.speed.y > 0) {
            player.switchSprite('fall');
        }

        enemy.speed.x = 0;//敌人速度x坐标为0，意思是敌人不移动
        if (keys.left) {
            enemy.speed.x = -4;//敌人速度x坐标为-4，意思是敌人向左移动
            enemy.switchSprite('run');
        }else if (keys.right) {
            enemy.speed.x = 4;//敌人速度x坐标为4，意思是敌人向右移动
            enemy.switchSprite('run');
        }else{
            enemy.switchSprite('idle');
        }
        if (enemy.speed.y < 0) {
            enemy.switchSprite('jump');
        }
        else if (enemy.speed.y > 0) {
            enemy.switchSprite('fall');
        }
    }

// 判断是否为攻击动画帧
function isAttackFrame(fighter){
    const img = fighter.image;
    const isAttack = (img === fighter.sprites.attack1.image ||
        (fighter.sprites.attack2 && img === fighter.sprites.attack2.image) ||
        (fighter.sprites.attack3 && img === fighter.sprites.attack3.image));
    return isAttack && fighter.framesCurrent === 2;
}

    // P1(主机): 执行碰撞检测; P2(客户端): 跳过，由P1处理
    if (!isRemoteSync) {
        if(player.isAttacking && isAttackFrame(player) && collide(player, enemy)){
            enemy.takeHit();
            player.isAttacking = false;
            document.querySelector('#enemyHealthFill > div').style.width =
             Math.max(enemy.health, 0) + '%';
        }
        if(enemy.isAttacking && isAttackFrame(enemy) && collide(enemy, player)){
            player.takeHit();
            enemy.isAttacking = false;
            document.querySelector('#playerHealthFill > div').style.width =
             Math.max(player.health, 0) + '%';
        }
    }

    // 更新冷却时间
    if(playerCooldown > 0) playerCooldown--;
    if(enemyCooldown > 0) enemyCooldown--;

    // 绘制和更新玩家子弹
    playerProjectiles.forEach((proj, index) => {
        proj.update();
        // P1(主机): 执行子弹碰撞检测; P2(客户端): 仅渲染
        if (!isRemoteSync) {
            // 碰撞检测 - 玩家子弹击中敌人
            if(proj.position.x + proj.size >= enemy.position.x &&
               proj.position.x - proj.size <= enemy.position.x + enemy.width &&
               proj.position.y + proj.size >= enemy.position.y &&
               proj.position.y - proj.size <= enemy.position.y + enemy.height){
                enemy.takeHit();
                enemy.health -= proj.damage;
                document.querySelector('#enemyHealthFill > div').style.width =
                 Math.max(enemy.health, 0) + '%';
                proj.life = 0;
            }
        }
    });
    // 绘制和更新敌人子弹
    enemyProjectiles.forEach((proj, index) => {
        proj.update();
        if (!isRemoteSync) {
            // 碰撞检测 - 敌人子弹击中玩家
            if(proj.position.x + proj.size >= player.position.x &&
               proj.position.x - proj.size <= player.position.x + player.width &&
               proj.position.y + proj.size >= player.position.y &&
               proj.position.y - proj.size <= player.position.y + player.height){
                player.takeHit();
                player.health -= proj.damage;
                document.querySelector('#playerHealthFill > div').style.width =
                 Math.max(player.health, 0) + '%';
                proj.life = 0;
            }
        }
    });
    // 移除已销毁的子弹
    playerProjectiles = playerProjectiles.filter(proj => proj.life === 1);
    enemyProjectiles = enemyProjectiles.filter(proj => proj.life === 1);

    // 检测是否有角色死亡
    if((player.dead || enemy.dead) && !gameOver){
        determineWinner();
    }

    // P1(主机): 每隔2帧向P2同步完整游戏状态
    if (opponentConnected && myPlayerId === 1) {
        syncFrameCount++;
        if (syncFrameCount % 2 === 0) {
            sendToServer({
                type: 'gameState',
                player: {
                    x: player.position.x, y: player.position.y,
                    speedX: player.speed.x, speedY: player.speed.y,
                    health: player.health, dead: player.dead,
                    isAttacking: player.isAttacking,
                    framesCurrent: player.framesCurrent,
                    sprite: getSpriteName(player),
                    attackCombo: player.attackCombo
                },
                enemy: {
                    x: enemy.position.x, y: enemy.position.y,
                    speedX: enemy.speed.x, speedY: enemy.speed.y,
                    health: enemy.health, dead: enemy.dead,
                    isAttacking: enemy.isAttacking,
                    framesCurrent: enemy.framesCurrent,
                    sprite: getSpriteName(enemy),
                    attackCombo: enemy.attackCombo
                },
                timer: timer,
                gameOver: gameOver,
                playerProjectiles: playerProjectiles.map(function(p) {
                    return { x: p.position.x, y: p.position.y, direction: p.direction, color: p.color, size: p.size, damage: p.damage, isKamehame: p.isKamehame, life: p.life };
                }),
                enemyProjectiles: enemyProjectiles.map(function(p) {
                    return { x: p.position.x, y: p.position.y, direction: p.direction, color: p.color, size: p.size, damage: p.damage, isKamehame: p.isKamehame, life: p.life };
                })
            });
        }
    }
}

function determineWinner(){
    gameOver = true;
    let text = '';
    if(player.dead && enemy.dead){
        text = '平局！';
    } else if(player.dead){
        text = 'P2 获胜！';
    } else {
        text = 'P1 获胜！';
    }
    document.getElementById('winnerText').textContent = text;
    document.getElementById('gameOver').style.display = 'flex';
}

function restartGame(){
    location.reload();
}

// 启动: 先预加载图片，再连接服务器
preloadAllImages(function(){
    document.getElementById('connectionStatus').textContent = '加载完成，连接中...';
    connectServer();
});