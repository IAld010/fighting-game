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
    src: 'img/image_227620290198042.png'
});
const shuzhuang = new Sprite({
    position: {
        x: 950,
        y: 300
    },
    src: 'img/Idle (64x32).png',
    totalFrames: 18
});


const player = {
    position: {
        x: 100,
        y: 0
    },
    width: 50,
    height: 150,
    speed: {x: 0, y: 0}
};
//判断玩家是否在地面上
function isOnGround(fighter) {
    return fighter.position.y + fighter.height >= ground;
}

const keys = {
    a:false,
    d:false,
    
};

//判断玩家的运动方向
window.addEventListener('keydown', (event) => {
    console.log(event.key);
    switch (event.key) {
        case 'w':
            if (isOnGround(player)) {
                player.speed.y = -20;//玩家速度y坐标为-20，意思是玩家跳跃
            }
            break;
        case 'a':
            keys.a = true;
            break;
        case 'd':
            keys.d = true;
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
});

//动画函数,模拟重力和跳跃
function animate() {
    window.requestAnimationFrame(animate);//递归调用
    background.draw();//绘制背景
    shuzhuang.draw();//绘制人物
    shuzhuang.animateFrames();//人物动画

    c.fillStyle = 'red';//设置填充颜色
    c.fillRect(player.position.x, player.position.y,
         player.width, player.height );//绘制矩形


    player.speed.x = 0;//玩家速度x坐标为0，意思是玩家不移动
    if (keys.a) {
        player.speed.x = -4;//玩家速度x坐标为-4，意思是玩家向左移动
    }else if (keys.d) {
        player.speed.x = 4;//玩家速度x坐标为4，意思是玩家向右移动
    }


    player.speed.y += gravity;//玩家速度y坐标加上重力
    player.position.y += player.speed.y;//玩家位置y坐标加上速度y坐标
    player.position.x += player.speed.x;//玩家位置x坐标加上速度x坐标
    
    if (player.position.y + player.height + player.speed.y >= ground) {
        player.speed.y = 0;//玩家速度y坐标为0
        player.position.y = ground - player.height;//玩家位置y坐标为地面高度减去玩家高度，意思是玩家站在地面上
    }
}
animate();