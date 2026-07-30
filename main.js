// ============ PixiJS WebGL 渲染引擎 ============
var app = new PIXI.Application({
    width: 1024, height: 576,
    view: document.getElementById('gameCanvas'),
    backgroundColor: 0x000000,
    backgroundAlpha: 0,
    antialias: false, resolution: 1
});
var TARGET_DELTA = 1.0;
var canvas = app.view;
var gravity = 0.7;
var ground = app.screen.height - 100;

// 性能优化: 缓存DOM引用和背景离屏画布
const $playerHealthFill = document.querySelector('#playerHealthFill > div');
const $enemyHealthFill = document.querySelector('#enemyHealthFill > div');
const $timerEl = document.getElementById('timer');
let bgCachedCanvas = null;

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
    ws.onerror = function() {
        document.getElementById('connectionStatus').textContent = '本地双人模式';
        // 无服务器时自动进入本地双人模式
        setTimeout(function() {
            document.getElementById('connectionStatus').style.display = 'none';
            document.getElementById('selectScreen').style.display = 'none';
            document.getElementById('startScreen').style.display = 'flex';
            if (isTouchDevice) {
                document.getElementById('p1ReadyKey').textContent = '点击准备';
                document.getElementById('p2ReadyKey').textContent = '点击准备';
            }
            updateMobileControlsVisibility();
        }, 800);
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
            _fightersInitialized = false;
            // 重置准备状态
            p1Ready = false;
            p2Ready = false;
            document.getElementById('p1Ready').classList.remove('is-ready');
            document.getElementById('p2Ready').classList.remove('is-ready');
            document.getElementById('p1Status').textContent = '未准备';
            document.getElementById('p2Status').textContent = '未准备';
            document.getElementById('connectionStatus').style.display = 'none';
            // 跳过选色页面，直接到准备页面
            document.getElementById('selectScreen').style.display = 'none';
            document.getElementById('startScreen').style.display = 'flex';
            // 根据角色调整UI
            if(myPlayerId === 2){
                document.getElementById('p1ReadyKey').textContent = '等待P1准备...';
                document.getElementById('p2ReadyKey').textContent = '点击准备';
            } else {
                document.getElementById('p1ReadyKey').textContent = '按 J 准备';
                document.getElementById('p2ReadyKey').textContent = '等待P2准备...';
            }
            updateMobileControlsVisibility();
            break;
        case 'opponentLeft':
            opponentConnected = false;
            _fightersInitialized = false;
            // 清理舞台上的角色和子弹，防止残留
            if (player && player.pixiSprite && player.pixiSprite.parent) {
                player.pixiSprite.parent.removeChild(player.pixiSprite);
            }
            if (enemy && enemy.pixiSprite && enemy.pixiSprite.parent) {
                enemy.pixiSprite.parent.removeChild(enemy.pixiSprite);
            }
            function cleanStage(arr) {
                if (!arr) return;
                for (var ci = arr.length - 1; ci >= 0; ci--) {
                    var g = arr[ci].pixiGraphics;
                    if (g && g.parent) g.parent.removeChild(g);
                }
            }
            cleanStage(playerProjectiles);
            cleanStage(enemyProjectiles);
            player = null;
            enemy = null;
            playerProjectiles = [];
            enemyProjectiles = [];
            gameStarted = false;
            gameOver = true;
            document.getElementById('connectionStatus').textContent = '对手已离开';
            document.getElementById('connectionStatus').style.display = 'block';
            // 隐藏游戏界面，回到连接状态
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('vsScreen').style.display = 'none';
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('selectScreen').style.display = 'none';
            _fightersInitialized = false;
            updateMobileControlsVisibility();
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
        // 对方请求重新开始
        case 'restart':
            resetGameState();
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
let countdownTimerId = null; // 倒计时定时器ID，用于取消

// ============ 状态同步变量 (P1主机权威模式) ============
let lastSyncState = null;
let syncFrameCount = 0;

// 获取角色当前精灵名称
function getSpriteName(fighter) {
    return fighter._currentAnim || 'idle';
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
    if (player._animTextures && player._animTextures[pSprite]) {
        player._currentAnim = pSprite;
        player.totalFrames = player._animTextures[pSprite].length;
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
    if (enemy._animTextures && enemy._animTextures[eSprite]) {
        enemy._currentAnim = eSprite;
        enemy.totalFrames = enemy._animTextures[eSprite].length;
        enemy.framesCurrent = state.enemy.framesCurrent;
    }

    // 同步计时器
    if (state.timer !== undefined && state.timer !== timer) {
        timer = state.timer;
        $timerEl.innerHTML = timer;
    }

    // 更新血条
    $playerHealthFill.style.width = Math.max(player.health, 0) + '%';
    $enemyHealthFill.style.width = Math.max(enemy.health, 0) + '%';

    // 同步子弹(复用已有对象，减少GC)
    if (state.playerProjectiles) {
        var sp = state.playerProjectiles;
        var alive = [];
        // 先移除旧子弹中不再需要的
        for (var oi = 0; oi < playerProjectiles.length; oi++) {
            var old = playerProjectiles[oi];
            var found = false;
            for (var si = 0; si < sp.length; si++) {
                if (sp[si].life === 1 && oi === si) { found = true; break; }
            }
            if (!found && old.pixiGraphics && old.pixiGraphics.parent) {
                old.pixiGraphics.parent.removeChild(old.pixiGraphics);
            }
        }
        for(var i = 0; i < sp.length; i++){
            if(sp[i].life !== 1) continue;
            var proj = (i < playerProjectiles.length) ? playerProjectiles[i] : new Projectile({position:{x:0,y:0},speed:{x:8,y:0},direction:1,color:'#ff4500',size:12,damage:30});
            proj.position.x = sp[i].x; proj.position.y = sp[i].y;
            proj.direction = sp[i].direction; proj.color = sp[i].color;
            proj.size = sp[i].size; proj.damage = sp[i].damage;
            proj.isKamehame = sp[i].isKamehame; proj.life = 1;
            // 确保子弹在舞台上
            if(!proj.pixiGraphics.parent) app.stage.addChild(proj.pixiGraphics);
            alive.push(proj);
        }
        playerProjectiles = alive;
    }
    if (state.enemyProjectiles) {
        var se = state.enemyProjectiles;
        var alive2 = [];
        // 先移除旧子弹中不再需要的
        for (var oi2 = 0; oi2 < enemyProjectiles.length; oi2++) {
            var old2 = enemyProjectiles[oi2];
            var found2 = false;
            for (var si2 = 0; si2 < se.length; si2++) {
                if (se[si2].life === 1 && oi2 === si2) { found2 = true; break; }
            }
            if (!found2 && old2.pixiGraphics && old2.pixiGraphics.parent) {
                old2.pixiGraphics.parent.removeChild(old2.pixiGraphics);
            }
        }
        for(var i = 0; i < se.length; i++){
            if(se[i].life !== 1) continue;
            var proj = (i < enemyProjectiles.length) ? enemyProjectiles[i] : new Projectile({position:{x:0,y:0},speed:{x:8,y:0},direction:1,color:'#00bfff',size:12,damage:30,isKamehame:true});
            proj.position.x = se[i].x; proj.position.y = se[i].y;
            proj.direction = se[i].direction; proj.color = se[i].color;
            proj.size = se[i].size; proj.damage = se[i].damage;
            proj.isKamehame = se[i].isKamehame; proj.life = 1;
            if(!proj.pixiGraphics.parent) app.stage.addChild(proj.pixiGraphics);
            alive2.push(proj);
        }
        enemyProjectiles = alive2;
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
// 背景图：PixiJS纹理 + CSS兜底双重保障
var bgImg = new Image();
bgImg.onload = function(){
    try {
        var bgCanvas = document.createElement('canvas');
        bgCanvas.width = 1024;
        bgCanvas.height = 576;
        var ctx = bgCanvas.getContext('2d');
        ctx.drawImage(bgImg, 0, 0, 1024, 576);
        var bgTexture = PIXI.Texture.from(bgCanvas);
        var bgSprite = new PIXI.Sprite(bgTexture);
        bgSprite.width = 1024;
        bgSprite.height = 576;
        bgSprite.x = 0;
        bgSprite.y = 0;
        bgSprite.name = 'background';
        var oldBg = app.stage.getChildByName('background');
        if (oldBg) app.stage.removeChild(oldBg);
        app.stage.addChildAt(bgSprite, 0);
    } catch(e) {
        console.warn('PixiJS背景加载失败，CSS背景兜底:', e);
    }
};
bgImg.onerror = function(){ console.warn('背景图加载失败，CSS背景兜底'); };
bgImg.src = 'img/image_227620290198042.png';
var shuzhuang = new Sprite({
    position: { x: 900, y: 270 },
    src: 'img/Idle (64x32).png',
    totalFrames: 18,
    scale: 2,
    onReady: function(s){ if(s.pixiSprite) app.stage.addChild(s.pixiSprite); }
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
    // 彻底清理舞台上旧的角色和子弹精灵
    var toRemove = [];
    for (var ci = app.stage.children.length - 1; ci >= 0; ci--) {
        var c = app.stage.children[ci];
        if (c.name !== 'background' && c !== shuzhuang.pixiSprite) {
            toRemove.push(c);
        }
    }
    for (var ri = 0; ri < toRemove.length; ri++) {
        app.stage.removeChild(toRemove[ri]);
    }
    if(player && player.pixiSprite && player.pixiSprite.parent) player.pixiSprite.parent.removeChild(player.pixiSprite);
    if(enemy && enemy.pixiSprite && enemy.pixiSprite.parent) enemy.pixiSprite.parent.removeChild(enemy.pixiSprite);

    player = createFighter({
        char: p1Char,
        position: { x: 124, y: 0 },
        attackOffset: { x: 80, y: 50 }
    });
    enemy = createFighter({
        char: p2Char,
        position: { x: app.screen.width - 200, y: 0 },
        flip: true,
        attackOffset: { x: -180, y: 50 }
    });
    if(player.pixiSprite && !player.pixiSprite.parent) app.stage.addChild(player.pixiSprite);
    if(enemy.pixiSprite && !enemy.pixiSprite.parent) app.stage.addChild(enemy.pixiSprite);
}

const keys = {
    a:false,
    d:false,
    left:false,
    right:false
};

//判断玩家的运动方向
window.addEventListener('keydown', (event) => {

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
var _fightersInitialized = false;
function checkBothReady(){
    if(p1Ready && p2Ready && !_fightersInitialized){
        _fightersInitialized = true;
        gameStarted = true;
        gameOver = false;
        initFighters();
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('vsScreen').style.display = 'flex';
        setTimeout(function(){
            document.getElementById('vsScreen').style.display = 'none';
            updateMobileControlsVisibility();
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
    // 添加到PixiJS舞台
    var lastProj = projectiles[projectiles.length - 1];
    if(lastProj.pixiGraphics) app.stage.addChild(lastProj.pixiGraphics);
    if(isP1) playerCooldown = 60;
    else enemyCooldown = 60;
}

// ============ 手机触控事件 ============
function setupMobileControls(){
    if(!isTouchDevice) return;

    // ============ 联机模式: 单人操控 (ctrl-*) ============
    function getMyFighter(){
        if(opponentConnected) return myPlayerId === 1 ? player : enemy;
        return player;
    }

    var ctrlLeft = document.getElementById('ctrl-left');
    var ctrlRight = document.getElementById('ctrl-right');
    var ctrlJump = document.getElementById('ctrl-jump');
    var ctrlAttack = document.getElementById('ctrl-attack');
    var ctrlSpecial = document.getElementById('ctrl-special');

    addTouchEvents(ctrlLeft, function(){
        if(opponentConnected){
            if(myPlayerId === 1) keys.a = true; else keys.left = true;
            sendToServer({type:'input',action:'keydown',key: myPlayerId===1?'a':'ArrowLeft'});
        } else { keys.a = true; }
    }, function(){
        if(opponentConnected){
            if(myPlayerId === 1) keys.a = false; else keys.left = false;
            sendToServer({type:'input',action:'keyup',key: myPlayerId===1?'a':'ArrowLeft'});
        } else { keys.a = false; }
    });

    addTouchEvents(ctrlRight, function(){
        if(opponentConnected){
            if(myPlayerId === 1) keys.d = true; else keys.right = true;
            sendToServer({type:'input',action:'keydown',key: myPlayerId===1?'d':'ArrowRight'});
        } else { keys.d = true; }
    }, function(){
        if(opponentConnected){
            if(myPlayerId === 1) keys.d = false; else keys.right = false;
            sendToServer({type:'input',action:'keyup',key: myPlayerId===1?'d':'ArrowRight'});
        } else { keys.d = false; }
    });

    addTouchEvents(ctrlJump, function(){
        var f = getMyFighter();
        if(f && f.isOnGround()) f.speed.y = -20;
        if(opponentConnected) sendToServer({type:'input',action:'keydown',key: myPlayerId===1?'w':'ArrowUp'});
    }, null);

    addTouchEvents(ctrlAttack, function(){
        var f = getMyFighter();
        if(f && !f.dead && gameStarted && !gameOver) f.attack();
        if(opponentConnected) sendToServer({type:'input',action:'keydown',key: myPlayerId===1?'j':'1'});
    }, null);

    addTouchEvents(ctrlSpecial, function(){
        var f = getMyFighter();
        var dir = opponentConnected ? (myPlayerId === 1 ? 1 : -1) : 1;
        if(f && !f.dead && gameStarted) fireProjectile(f, dir);
        if(opponentConnected) sendToServer({type:'input',action:'keydown',key: myPlayerId===1?'k':'2'});
    }, null);

    // ============ 本地模式: 双人操控 (p1-*, p2-*) ============
    var p1Left = document.getElementById('p1-left');
    var p1Right = document.getElementById('p1-right');
    var p1Jump = document.getElementById('p1-jump');
    var p1Attack = document.getElementById('p1-attack');
    var p1Special = document.getElementById('p1-special');

    addTouchEvents(p1Left,  function(){ keys.a = true; }, function(){ keys.a = false; });
    addTouchEvents(p1Right, function(){ keys.d = true; }, function(){ keys.d = false; });
    addTouchEvents(p1Jump,  function(){ if(player && player.isOnGround()) player.speed.y = -20; }, null);
    addTouchEvents(p1Attack, function(){ if(player && !player.dead && gameStarted && !gameOver) player.attack(); }, null);
    addTouchEvents(p1Special, function(){ if(player && !player.dead && gameStarted) fireProjectile(player, 1); }, null);

    var p2Left = document.getElementById('p2-left');
    var p2Right = document.getElementById('p2-right');
    var p2Jump = document.getElementById('p2-jump');
    var p2Attack = document.getElementById('p2-attack');
    var p2Special = document.getElementById('p2-special');

    addTouchEvents(p2Left,  function(){ keys.left = true; }, function(){ keys.left = false; });
    addTouchEvents(p2Right, function(){ keys.right = true; }, function(){ keys.right = false; });
    addTouchEvents(p2Jump,  function(){ if(enemy && enemy.isOnGround()) enemy.speed.y = -20; }, null);
    addTouchEvents(p2Attack, function(){ if(enemy && !enemy.dead && gameStarted && !gameOver) enemy.attack(); }, null);
    addTouchEvents(p2Special, function(){ if(enemy && !enemy.dead && gameStarted) fireProjectile(enemy, -1); }, null);

    // 准备按钮 - 联机模式下只能准备自己
    document.getElementById('p1Ready').addEventListener('touchstart', function(e){
        e.preventDefault();
        if(!p1Ready && (!opponentConnected || myPlayerId === 1)){
            p1Ready = true;
            this.classList.add('is-ready');
            document.getElementById('p1Status').textContent = '已准备！';
            if(opponentConnected) sendToServer({type: 'ready', playerId: 1});
            checkBothReady();
        }
    });
    document.getElementById('p2Ready').addEventListener('touchstart', function(e){
        e.preventDefault();
        if(!p2Ready && (!opponentConnected || myPlayerId === 2)){
            p2Ready = true;
            this.classList.add('is-ready');
            document.getElementById('p2Status').textContent = '已准备！';
            if(opponentConnected) sendToServer({type: 'ready', playerId: 2});
            checkBothReady();
        }
    });

    // 初始显示状态
    updateMobileControlsVisibility();
}

// 根据联机状态和游戏状态显示对应操控UI
function updateMobileControlsVisibility(){
    if(!isTouchDevice) return;
    var online = document.getElementById('mobileControlsOnline');
    var local = document.getElementById('mobileControlsLocal');
    if(!online || !local) return;
    // 只在游戏进行中显示操控UI，其他状态全部隐藏
    if(!gameStarted || gameOver){
        online.style.display = 'none';
        local.style.display = 'none';
        return;
    }
    if(opponentConnected){
        online.style.display = 'flex';
        local.style.display = 'none';
    } else {
        online.style.display = 'none';
        local.style.display = 'flex';
    }
}

// 全屏切换
function toggleFullscreen(){
    var elem = document.documentElement;
    if(!document.fullscreenElement){
        elem.requestFullscreen().then(function(){
            if(screen.orientation && screen.orientation.lock){
                screen.orientation.lock('landscape').catch(function(){});
            }
        }).catch(function(err){
            console.log('全屏错误:', err);
        });
    } else {
        document.exitFullscreen();
    }
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
    if(gameOver) return; // 游戏已结束，不再继续倒计时
    countdownTimerId = setTimeout(startCountdown, 1000);
    timer--;
    $timerEl.innerHTML = timer;
    if (timer <= 0) {
        clearTimeout(countdownTimerId);
        countdownTimerId = null;
        determineWinner();
    }
}


// 判断是否为攻击动画帧 (模块级，避免每帧重定义)
function isAttackFrame(fighter) {
    var anim = fighter._currentAnim;
    return (anim === 'attack1' || anim === 'attack2' || anim === 'attack3') && fighter.framesCurrent === 2;
}

// FPS 计数器
var fpsFrames = 0, fpsLastTime = performance.now(), $fpsEl = document.getElementById('fpsCounter');

//动画函数 - delta: 60fps≈1.0，消除不同刷新率差异
function animate(delta) {
    if(gameOver || !player || !enemy) return;
    var dt = delta || TARGET_DELTA;

    // PixiJS自动渲染背景和装饰(scene graph)

    // 是否为远程同步模式 (P2接收P1的状态)
    var isRemoteSync = opponentConnected && myPlayerId === 2;

    // P2: 在渲染前应用P1主机同步的状态
    if (isRemoteSync && lastSyncState) {
        applySyncedState(lastSyncState);
    }

    player.update(dt);
    enemy.update(dt);

    // P2: 跳过本地精灵切换和物理控制，使用P1同步的状态
    if (!isRemoteSync) {
        // 玩家动画状态 (delta标准化移动速度)
        var pTargetAnim = 'idle';
        player.speed.x = 0;
        if (keys.a) {
            player.speed.x = -4; pTargetAnim = 'run';
        } else if (keys.d) {
            player.speed.x = 4; pTargetAnim = 'run';
        }
        if (player.speed.y < 0) pTargetAnim = 'jump';
        else if (player.speed.y > 0) pTargetAnim = 'fall';
        if (player._currentAnim !== pTargetAnim) player.switchSprite(pTargetAnim);

        // 敌人动画状态 (delta补偿在Fighter.update中处理)
        var eTargetAnim = 'idle';
        enemy.speed.x = 0;
        if (keys.left) {
            enemy.speed.x = -4; eTargetAnim = 'run';
        } else if (keys.right) {
            enemy.speed.x = 4; eTargetAnim = 'run';
        }
        if (enemy.speed.y < 0) eTargetAnim = 'jump';
        else if (enemy.speed.y > 0) eTargetAnim = 'fall';
        if (enemy._currentAnim !== eTargetAnim) enemy.switchSprite(eTargetAnim);
    }

    // P1(主机): 执行碰撞检测; P2(客户端): 跳过，由P1处理
    if (!isRemoteSync) {
        if(player.isAttacking && isAttackFrame(player) && collide(player, enemy)){
            enemy.takeHit();
            player.isAttacking = false;
            $enemyHealthFill.style.width =
             Math.max(enemy.health, 0) + '%';
        }
        if(enemy.isAttacking && isAttackFrame(enemy) && collide(enemy, player)){
            player.takeHit();
            enemy.isAttacking = false;
            $playerHealthFill.style.width =
             Math.max(player.health, 0) + '%';
        }
    }

    // 更新冷却时间
    if(playerCooldown > 0) playerCooldown--;
    if(enemyCooldown > 0) enemyCooldown--;

    // 绘制和更新玩家子弹
    playerProjectiles.forEach(function(proj, index) {
        proj.update(dt);
        // P1(主机): 执行子弹碰撞检测; P2(客户端): 仅渲染
        if (!isRemoteSync) {
            // 碰撞检测 - 玩家子弹击中敌人
            if(proj.position.x + proj.size >= enemy.position.x &&
               proj.position.x - proj.size <= enemy.position.x + enemy.width &&
               proj.position.y + proj.size >= enemy.position.y &&
               proj.position.y - proj.size <= enemy.position.y + enemy.height){
                enemy.takeHit();
                enemy.health -= proj.damage;
                $enemyHealthFill.style.width =
                 Math.max(enemy.health, 0) + '%';
                proj.life = 0;
            }
        }
    });
    // 绘制和更新敌人子弹
    enemyProjectiles.forEach(function(proj, index) {
        proj.update(dt);
        if (!isRemoteSync) {
            // 碰撞检测 - 敌人子弹击中玩家
            if(proj.position.x + proj.size >= player.position.x &&
               proj.position.x - proj.size <= player.position.x + player.width &&
               proj.position.y + proj.size >= player.position.y &&
               proj.position.y - proj.size <= player.position.y + player.height){
                player.takeHit();
                player.health -= proj.damage;
                $playerHealthFill.style.width =
                 Math.max(player.health, 0) + '%';
                proj.life = 0;
            }
        }
    });
    // 移除已销毁的子弹(从舞台和数组中) - 反向遍历避免GC
    for (var pi = playerProjectiles.length - 1; pi >= 0; pi--) {
        if (playerProjectiles[pi].life !== 1) {
            var pg = playerProjectiles[pi].pixiGraphics;
            if (pg.parent) pg.parent.removeChild(pg);
            playerProjectiles.splice(pi, 1);
        }
    }
    for (var ei = enemyProjectiles.length - 1; ei >= 0; ei--) {
        if (enemyProjectiles[ei].life !== 1) {
            var eg = enemyProjectiles[ei].pixiGraphics;
            if (eg.parent) eg.parent.removeChild(eg);
            enemyProjectiles.splice(ei, 1);
        }
    }

    // 检测是否有角色死亡
    if((player.dead || enemy.dead) && !gameOver){
        determineWinner();
    }

    // P1(主机): 向P2同步完整游戏状态
    if (opponentConnected && myPlayerId === 1) {
        syncFrameCount++;
        if (syncFrameCount % 6 === 0) {
            // 手动构建子弹数组，避免.map()创建临时数组
            var ppArr = new Array(playerProjectiles.length);
            for (var ppi = 0; ppi < playerProjectiles.length; ppi++) {
                var pp = playerProjectiles[ppi];
                ppArr[ppi] = { x: pp.position.x, y: pp.position.y, direction: pp.direction, color: pp.color, size: pp.size, damage: pp.damage, isKamehame: pp.isKamehame, life: pp.life };
            }
            var epArr = new Array(enemyProjectiles.length);
            for (var epi = 0; epi < enemyProjectiles.length; epi++) {
                var ep = enemyProjectiles[epi];
                epArr[epi] = { x: ep.position.x, y: ep.position.y, direction: ep.direction, color: ep.color, size: ep.size, damage: ep.damage, isKamehame: ep.isKamehame, life: ep.life };
            }
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
                playerProjectiles: ppArr,
                enemyProjectiles: epArr
            });
        }
    }

    // 更新FPS计数器
    fpsFrames++;
    var now = performance.now();
    if (now - fpsLastTime >= 1000) {
        $fpsEl.textContent = 'FPS: ' + Math.round(fpsFrames * 1000 / (now - fpsLastTime));
        fpsFrames = 0;
        fpsLastTime = now;
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

function resetGameState(){
    gameOver = true;
    _fightersInitialized = false;
    if(countdownTimerId){
        clearTimeout(countdownTimerId);
        countdownTimerId = null;
    }

    // 从PixiJS舞台移除所有子弹和角色（保留背景和装饰）
    function removeFromStage(arr){
        if(!arr) return;
        arr.forEach(function(item){
            var g = item.pixiGraphics || item.pixiSprite;
            if(g && g.parent) g.parent.removeChild(g);
        });
    }
    removeFromStage(playerProjectiles);
    removeFromStage(enemyProjectiles);
    if(player && player.pixiSprite && player.pixiSprite.parent) player.pixiSprite.parent.removeChild(player.pixiSprite);
    if(enemy && enemy.pixiSprite && enemy.pixiSprite.parent) enemy.pixiSprite.parent.removeChild(enemy.pixiSprite);

    // 额外清理舞台上残留的非背景元素
    var toRemove = [];
    for (var ci = app.stage.children.length - 1; ci >= 0; ci--) {
        var c = app.stage.children[ci];
        if (c.name !== 'background' && c !== shuzhuang.pixiSprite) {
            toRemove.push(c);
        }
    }
    for (var ri = 0; ri < toRemove.length; ri++) {
        app.stage.removeChild(toRemove[ri]);
    }

    // 重置游戏状态
    timer = 60;
    gameStarted = false;
    p1Ready = false;
    p2Ready = false;
    playerProjectiles = [];
    enemyProjectiles = [];
    playerCooldown = 0;
    enemyCooldown = 0;
    player = null;
    enemy = null;
    lastSyncState = null;
    syncFrameCount = 0;
    keys.a = false;
    keys.d = false;
    keys.left = false;
    keys.right = false;

    // 重置UI - 跳过选色页直接到准备页
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('vsScreen').style.display = 'none';
    document.getElementById('selectScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    document.getElementById('connectionStatus').style.display = 'none';
    document.getElementById('timer').innerHTML = '60';

    // 重置准备UI
    document.getElementById('p1Ready').classList.remove('is-ready');
    document.getElementById('p2Ready').classList.remove('is-ready');
    document.getElementById('p1Status').textContent = '未准备';
    document.getElementById('p2Status').textContent = '未准备';

    // 重置血条
    $playerHealthFill.style.width = '100%';
    $enemyHealthFill.style.width = '100%';

    // 更新准备提示
    if(opponentConnected){
        if(myPlayerId === 2){
            document.getElementById('p1ReadyKey').textContent = '等待P1准备...';
            document.getElementById('p2ReadyKey').textContent = '点击准备';
        } else {
            document.getElementById('p1ReadyKey').textContent = '按 J 准备';
            document.getElementById('p2ReadyKey').textContent = '等待P2准备...';
        }
    } else {
        document.getElementById('p1ReadyKey').textContent = '按 J 准备';
        document.getElementById('p2ReadyKey').textContent = '按 1 准备';
    }
    updateMobileControlsVisibility();
}

function restartGame(){
    if(opponentConnected){
        sendToServer({type: 'restart'});
    }
    resetGameState();
}

// 启动: 先预加载图片，再连接服务器
preloadAllImages(function(){
    document.getElementById('connectionStatus').textContent = '加载完成，连接中...';
    connectServer();
});

// PixiJS 主循环 - 使用delta做帧率无关动画
app.ticker.add(function(delta){
    animate(delta);
});

// 移动端窗口适配: 保持内部渲染分辨率不变，仅CSS缩放
window.addEventListener('resize', function(){
    // 保持1024x576内部渲染分辨率，CSS自动缩放
    app.renderer.resize(1024, 576);
});
// 初始调用一次确保渲染器正确
app.renderer.resize(1024, 576);