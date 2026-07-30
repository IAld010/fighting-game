function Sprite({position,src,totalFrames=1,scale=1,offset={x:0,y:0},
    drawWidth,drawHeight,flip=false}){
    this.offset = offset;
    this.position = position;
    this.flip = flip;
    this.image = new Image();
    this.image.src = src;
    this.totalFrames = totalFrames;
    this.scale = scale;
    this.drawWidth = drawWidth;
    this.drawHeight = drawHeight;
    this.framesCurrent = 0;
    this.framesElapsed = 0;
    this.framesHold = 18;
   
}
 Sprite.prototype.draw = function(){
    const frameWidth = this.image.width / this.totalFrames;
    const frameHeight = this.image.height;
    const dw = this.drawWidth || frameWidth * this.scale;
    const dh = this.drawHeight || frameHeight * this.scale;
    const dx = this.position.x - this.offset.x;
    const dy = this.position.y - this.offset.y;

    if(this.flip){
        c.save();
        c.translate(dx + dw / 2, 0);
        c.scale(-1, 1);
        c.drawImage(
            this.image, 
            this.framesCurrent * frameWidth, 
            0,
            frameWidth,
            frameHeight,
            -dw / 2,
            dy,
            dw,
            dh
        );
        c.restore();
    } else {
        c.drawImage(
            this.image, 
            this.framesCurrent * frameWidth, 
            0,
            frameWidth,
            frameHeight,
            dx,
            dy,
            dw,
            dh
        );
    }
    };
Sprite.prototype.animateFrames = function(){
    this.framesElapsed++;
    if(this.framesElapsed >= this.framesHold){
        this.framesElapsed = 0;
        this.framesCurrent = (this.framesCurrent + 1) % this.totalFrames;
    }
};
Sprite.prototype.update = function(){
    this.draw();
    this.animateFrames();
}


function Fighter({position,src,totalFrames=1,scale=1,speed,
    offset={x:0,y:0},attackBox={width:0,height:0,offset:{}},sprites,flip=false}){
    Sprite.call(this,{position,src,totalFrames,scale,offset,flip});
    this.speed = speed;
    this.width = 50;
    this.height = 150;
    this.isAttacking = false;
    this.attackCombo = 0; // 当前连招阶段: 0=无, 1=攻击1完成, 2=攻击2完成
    this.lastAttackTime = 0; // 上次攻击时间戳
    this.comboWindow = 2000; // 连招窗口期(毫秒)
    this.attackBox = {
        position: {
            x: this.position.x ,
            y: this.position.y
        },
        offset: attackBox.offset,
        width: attackBox.width,
        height: attackBox.height
    };
    this.sprites = sprites;
    this.health = 100;
    for(const sprite in this.sprites){
        this.sprites[sprite].image = new Image();
        this.sprites[sprite].image.src = this.sprites[sprite].src;
    }
}
Fighter.prototype = Object.create(Sprite.prototype);
Fighter.prototype.constructor = Fighter;
Fighter.prototype.update = function(){
    this.draw();
    if(!this.dead){
        this.animateFrames();
    }
 
    this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
    this.attackBox.position.y = this.position.y + this.attackBox.offset.y;
    this.position.y += this.speed.y;//玩家位置y坐标加上速度y坐标
    this.position.x += this.speed.x;//玩家位置x坐标加上速度x坐标

    if (this.position.y + this.height + this.speed.y >= ground) {
        this.speed.y = 0;//玩家速度y坐标为0
        this.position.y = ground - this.height;//玩家位置y坐标为地面高度减去玩家高度，意思是玩家站在地面上
    }else{
        this.speed.y += gravity;//玩家速度y坐标加上重力
    }

    // 攻击动画播放到最后一帧时，自动结束攻击状态
    if(this.isAttacking && this.framesCurrent === this.totalFrames - 1){
        this.isAttacking = false;
    }
};
//判断玩家是否在地面上
Fighter.prototype.isOnGround = function(){
    return this.position.y + this.height >= ground;
};
Fighter.prototype.attack = function(){ 
    if(this.isAttacking) return;//正在攻击中，不能重复触发
    this.isAttacking = true;
    const now = Date.now();
    const timeSinceLastAttack = now - this.lastAttackTime;
    
    // 判断连招阶段
    if(this.attackCombo === 2 && timeSinceLastAttack <= this.comboWindow){
        // 攻击3
        this.switchSprite('attack3');
        this.attackCombo = 0; // 连招结束
    } else if(this.attackCombo === 1 && timeSinceLastAttack <= this.comboWindow){
        // 攻击2
        this.switchSprite('attack2');
        this.attackCombo = 2;
    } else {
        // 攻击1(起手)
        this.switchSprite('attack1');
        this.attackCombo = 1;
    }
    this.lastAttackTime = now;
};
Fighter.prototype.takeHit = function(){
    this.health -= 20;
    if(this.health <= 0){
        this.switchSprite('death');
    } else {
        this.switchSprite('takeHit');
    }
}
Fighter.prototype.switchSprite = function(sprite){
    if(this.image === this.sprites.death.image){
        if(this.framesCurrent === this.sprites.death.totalFrames - 1){
            this.dead = true;
        }
        return;
    }
    // 攻击动画未播放完时，不允许切换到其他状态(除了连招攻击)
    const isAttackSprite = (this.image === this.sprites.attack1.image || 
        (this.sprites.attack2 && this.image === this.sprites.attack2.image) ||
        (this.sprites.attack3 && this.image === this.sprites.attack3.image));
    const isNextCombo = (sprite === 'attack2' || sprite === 'attack3');
    if(isAttackSprite && !isNextCombo && 
        this.framesCurrent < this.totalFrames - 1){
        return;
    }
    if(this.image === this.sprites.takeHit.image && 
        this.framesCurrent < this.sprites.takeHit.totalFrames - 1){
        return;
    }
    switch(sprite){
        case 'idle':
            if(this.image !== this.sprites.idle.image){
                this.image = this.sprites.idle.image;
                this.totalFrames = this.sprites.idle.totalFrames;
                this.framesCurrent = 0;
            }
            break;
        case 'run':
            if(this.image !== this.sprites.run.image){
                this.image = this.sprites.run.image;
                this.totalFrames = this.sprites.run.totalFrames;
                this.framesCurrent = 0;
            }
            break;
        case 'jump':
            if(this.image !== this.sprites.jump.image){
                this.image = this.sprites.jump.image;
                this.totalFrames = this.sprites.jump.totalFrames;
                this.framesCurrent = 0;
            }
            break;
        case 'fall':
            if(this.image !== this.sprites.fall.image){
                this.image = this.sprites.fall.image;
                this.totalFrames = this.sprites.fall.totalFrames;
                this.framesCurrent = 0;
            }
            break;
        case 'attack1':
            if(this.image !== this.sprites.attack1.image){
                this.image = this.sprites.attack1.image;
                this.totalFrames = this.sprites.attack1.totalFrames;
                this.framesCurrent = 0;
            }
            break;
        case 'attack2':
            if(this.image !== this.sprites.attack2.image){
                this.image = this.sprites.attack2.image;
                this.totalFrames = this.sprites.attack2.totalFrames;
                this.framesCurrent = 0;
            }
            break;
        case 'attack3':
            if(this.image !== this.sprites.attack3.image){
                this.image = this.sprites.attack3.image;
                this.totalFrames = this.sprites.attack3.totalFrames;
                this.framesCurrent = 0;
            }
            break;
        case 'takeHit':
            if(this.image !== this.sprites.takeHit.image){
                this.image = this.sprites.takeHit.image;
                this.totalFrames = this.sprites.takeHit.totalFrames;
                this.framesCurrent = 0;
            }
            break;
        case 'death':
            if(this.image !== this.sprites.death.image){
                this.image = this.sprites.death.image;
                this.totalFrames = this.sprites.death.totalFrames;
                this.framesCurrent = 0;
            }
            break;
        default:
            break;
    }  
}

// 子弹类 - 用于火龙波和龟派气功
function Projectile({position, speed, direction, color, size=10, damage=30, isKamehame=false}){
    this.position = position;
    this.speed = speed;
    this.direction = direction; // 1=向右, -1=向左
    this.color = color;
    this.size = size;
    this.damage = damage;
    this.isKamehame = isKamehame;
    this.life = 1; // 1=存活, 0=销毁
}
Projectile.prototype.draw = function(){
    c.save();
    c.beginPath();
    
    if(this.isKamehame){
        // 龟派气功 - 蓝色长条形状
        c.fillStyle = this.color;
        c.shadowColor = '#00bfff';
        c.shadowBlur = 15;
        c.ellipse(
            this.position.x, this.position.y,
            this.size * 2, this.size, 0, 0, Math.PI * 2
        );
        c.fill();
        // 内部高光
        c.fillStyle = 'white';
        c.globalAlpha = 0.6;
        c.ellipse(
            this.position.x, this.position.y,
            this.size, this.size * 0.4, 0, 0, Math.PI * 2
        );
        c.fill();
    } else {
        // 火龙波 - 橙红色圆形
        c.fillStyle = this.color;
        c.shadowColor = '#ff4500';
        c.shadowBlur = 20;
        c.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        c.fill();
        // 内部黄色核心
        c.fillStyle = '#ffd700';
        c.globalAlpha = 0.8;
        c.arc(this.position.x, this.position.y, this.size * 0.5, 0, Math.PI * 2);
        c.fill();
    }
    
    c.restore();
};
Projectile.prototype.update = function(){
    this.draw();
    this.position.x += this.speed.x * this.direction;
    // 超出画布范围则销毁
    if(this.position.x < -50 || this.position.x > canvas.width + 50){
        this.life = 0;
    }
};