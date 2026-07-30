const canvas = document.querySelector('canvas');
const c =canvas.getContext('2d');//2d渲染
canvas.width = 1024;
canvas.height = 576;
const gravity = 0.7;//重力
const ground = canvas.height - 100;//地面高度

const background = new Sprite({
    position: {
        x: 0,
        y: 0
    },
    src: 'img/image_227620290198042.png',
    drawWidth: 1024,
    drawHeight: 576
});
const shuzhuang = new Sprite({
    position: {
        x: 900,
        y: 270
    },
    src: 'img/Idle (64x32).png',
    totalFrames: 18,
    scale: 2,

});

let timer = 60;
let gameOver = false;
let gameStarted = false;
let p1Ready = false;
let p2Ready = false;
let playerProjectiles = [];
let enemyProjectiles = [];
let playerCooldown = 0;
let enemyCooldown = 0;

const player =
new Fighter({
    position: {
        x: canvas.width -900,
        y: 0
    },
    speed: {x: 0, y: 0},
    src:'img/king blue/Idle.png',
    totalFrames: 8,
    scale: 2.5,
    offset: {
        x: 215,
        y: 120
    },
    attackBox: {
        width: 100,
        height: 50,
        offset: {
            x: 80,
            y: 50
        }
    },
    sprites:{
        idle: {
            src: 'img/king blue/Idle.png',
            totalFrames: 8,
            scale: 2.5,
        },
        run: {
            src: 'img/king blue/Run.png',
            totalFrames: 8,
            scale: 2.5,
        },
        jump: {
            src: 'img/king blue/Jump.png',
            totalFrames: 2,
            scale: 2.5,
        },
        fall: {
            src: 'img/king blue/Fall.png',
            totalFrames: 2,
            scale: 2.5,
        },
        attack1: {
            src: 'img/king blue/Attack1.png',
            totalFrames: 4,
            scale: 2.5,
        },
        attack2: {
            src: 'img/king blue/Attack2.png',
            totalFrames: 4,
            scale: 2.5,
        },
        attack3: {
            src: 'img/king blue/Attack3.png',
            totalFrames: 4,
            scale: 2.5,
        },
        takeHit: {
            src: 'img/king blue/Take hit.png',
            totalFrames: 4,
            scale: 2.5,
        },
        death: {
            src: 'img/king blue/Death.png',
            totalFrames: 6,
            scale: 2.5,
        },
    }
});


const enemy =
new Fighter({
    position: {
        x: canvas.width - 200,
        y: 0
    },
    speed: {x: 0, y: 0},
    src:'img/king blue/Idle.png',
    totalFrames: 8,
    scale: 2.5,
    flip: true,
    offset: {
        x: 215,
        y: 120
    },
    attackBox: {
        width: 100,
        height: 50,
        offset: {
            x: -180,
            y: 50
        }
    },
    sprites:{
        idle: {
            src: 'img/king blue/Idle.png',
            totalFrames: 8,
            scale: 2.5,
        },
        run: {
            src: 'img/king blue/Run.png',
            totalFrames: 8,
            scale: 2.5,
        },
        jump: {
            src: 'img/king blue/Jump.png',
            totalFrames: 2,
            scale: 2.5,
        },
        fall: {
            src: 'img/king blue/Fall.png',
            totalFrames: 2,
            scale: 2.5,
        },
        attack1: {
            src: 'img/king blue/Attack1.png',
            totalFrames: 4,
            scale: 2.5,
        },
        attack2: {
            src: 'img/king blue/Attack2.png',
            totalFrames: 4,
            scale: 2.5,
        },
        attack3: {
            src: 'img/king blue/Attack3.png',
            totalFrames: 4,
            scale: 2.5,
        },
        takeHit: {
            src: 'img/king blue/Take hit.png',
            totalFrames: 4,
            scale: 2.5,
        },
        death: {
            src: 'img/king blue/Death.png',
            totalFrames: 6,
            scale: 2.5,
        },
    }
});



const keys = {
    a:false,
    d:false,
    left:false,
    right:false
    
};

//判断玩家的运动方向
window.addEventListener('keydown', (event) => {
    console.log(event.key);

    // 开始界面 - 玩家准备
    if(!gameStarted){
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
        // 双方都准备好了，开始游戏
        if(p1Ready && p2Ready){
            gameStarted = true;
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('vsScreen').style.display = 'flex';
            setTimeout(function(){
                document.getElementById('vsScreen').style.display = 'none';
                animate();
                startCountdown();
            }, 3000);
        }
        return;
    }

    if(gameOver) return;

    if(!player.dead){
    //player 1 wasd
    switch (event.key) {
        case 'w':
            if (player.isOnGround()) {
                player.speed.y = -20;//玩家速度y坐标为-20，意思是玩家跳跃
            }
            break;
        case 'a':
            keys.a = true;
            break;
        case 'd':
            keys.d = true;
            break;
            //空格
        case 'j':
            player.attack();
            break;
        case 'k':
            if(playerCooldown <= 0 && !gameOver){
                playerProjectiles.push(new Projectile({
                    position: {x: player.position.x + player.width, y: player.position.y + player.height/2},
                    speed: {x: 8, y: 0},
                    direction: 1,
                    color: '#ff4500',
                    size: 12,
                    damage: 30
                }));
                playerCooldown = 60; // 冷却60帧
            }
            break;
        default:
            break;
    }
}
    if(!enemy.dead){
    //enemy Arrow keys
    switch (event.key) {
        case 'ArrowUp':
            if (!enemy.dead) {
                if (enemy.isOnGround()) {
                    enemy.speed.y = -20;//敌人速度y坐标为-20，意思是敌人跳跃
                }
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
            if(enemyCooldown <= 0 && !gameOver){
                enemyProjectiles.push(new Projectile({
                    position: {x: enemy.position.x, y: enemy.position.y + enemy.height/2},
                    speed: {x: 8, y: 0},
                    direction: -1,
                    color: '#00bfff',
                    size: 12,
                    damage: 30,
                    isKamehame: true
                }));
                enemyCooldown = 60;
            }
            break;
        default:
            break;
    }
    }
});


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
    switch (event.key) {
        case 'a':
            keys.a = false;
            break;
        case 'd':
            keys.d = false;
            break;
        default:
            break;
    }
    switch (event.key) {
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'ArrowRight':
            keys.right = false;
            break;
        default:
            break;
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



    player.update();//更新玩家位置和动画
    enemy.update();//更新敌人位置和动画

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

// 判断是否为攻击动画帧
function isAttackFrame(fighter){
    const img = fighter.image;
    const isAttack = (img === fighter.sprites.attack1.image ||
        (fighter.sprites.attack2 && img === fighter.sprites.attack2.image) ||
        (fighter.sprites.attack3 && img === fighter.sprites.attack3.image));
    return isAttack && fighter.framesCurrent === 2;
}

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

    // 更新冷却时间
    if(playerCooldown > 0) playerCooldown--;
    if(enemyCooldown > 0) enemyCooldown--;

    // 绘制和更新玩家子弹
    playerProjectiles.forEach((proj, index) => {
        proj.update();
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
    });
    // 绘制和更新敌人子弹
    enemyProjectiles.forEach((proj, index) => {
        proj.update();
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
    });
    // 移除已销毁的子弹
    playerProjectiles = playerProjectiles.filter(proj => proj.life === 1);
    enemyProjectiles = enemyProjectiles.filter(proj => proj.life === 1);

    // 检测是否有角色死亡
    if((player.dead || enemy.dead) && !gameOver){
        determineWinner();
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
// 游戏不会自动开始，等待双方玩家按准备键