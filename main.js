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
            x: 50,
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
        takeHit: {
            src: 'img/king blue/Take hit.png',
            totalFrames: 3,
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
    offset: {
        x: 215,
        y: 120
    },
    attackBox: {
        width: 100,
        height: 50,
        offset: {
            x: -100,
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
        takeHit: {
            src: 'img/king blue/Take hit.png',
            totalFrames: 3,
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
        default:
            break;
    }
    //enemy Arrow keys
    switch (event.key) {
        case 'ArrowUp':
            if (enemy.isOnGround()) {
                enemy.speed.y = -20;//敌人速度y坐标为-20，意思是敌人跳跃
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
        default:
            break;
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

//动画函数,模拟重力和跳跃
function animate() {
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

    if(player.isAttacking && player.framesCurrent === 4){
        enemy.takeHit();
        player.isAttacking = false;
    }
    if(enemy.isAttacking && enemy.framesCurrent === 4){
        player.takeHit();
        enemy.isAttacking = false;
    }
}
animate();