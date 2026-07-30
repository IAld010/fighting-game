function Sprite({position,src,totalFrames=1,scale=1,offset={x:0,y:0},
    drawWidth,drawHeight}){
    this.offset = offset;
    this.position = position;
    this.offset = offset;
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
           c.drawImage(
            this.image, 
            this.framesCurrent * frameWidth, 
            0,
            frameWidth,
            frameHeight,
            this.position.x-this.offset.x,
            this.position.y-this.offset.y,
            dw,
            dh
        );
    };
Sprite.prototype.animateFrames = function(){
    this.framesElapsed++;
    if(this.framesElapsed % this.framesHold === 0){
        if(this.framesCurrent < this.totalFrames - 1){
            this.framesCurrent++;
        }else{
            this.framesCurrent = 0;
        }

    }
};
Sprite.prototype.update = function(){
    this.draw();
    this.animateFrames();
}


function Fighter({position,src,totalFrames=1,scale=1,speed,
    offset={x:0,y:0},attackBox={width:0,height:0,offset:{}},sprites}){
    Sprite.call(this,{position,src,totalFrames,scale,offset});
    this.speed = speed;
    this.width = 50;
    this.height = 150;
    this.isAttacking = false;
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
    for(const sprite in this.sprites){
        this.sprites[sprite].image = new Image();
        this.sprites[sprite].image.src = this.sprites[sprite].src;
    }
}
Fighter.prototype = Object.create(Sprite.prototype);
Fighter.prototype.constructor = Fighter;
Fighter.prototype.update = function(){
    this.draw();
    this.animateFrames();

    this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
    this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

    if(this.isAttacking){
        
        c.fillStyle = 'green';
        c.fillRect(this.attackBox.position.x,
                   this.attackBox.position.y,
                   this.attackBox.width,
                   this.attackBox.height);
    }
    this.position.y += this.speed.y;//玩家位置y坐标加上速度y坐标
    this.position.x += this.speed.x;//玩家位置x坐标加上速度x坐标

    if (this.position.y + this.height + this.speed.y >= ground) {
        this.speed.y = 0;//玩家速度y坐标为0
        this.position.y = ground - this.height;//玩家位置y坐标为地面高度减去玩家高度，意思是玩家站在地面上
    }else{
        this.speed.y += gravity;//玩家速度y坐标加上重力
    }
};
//判断玩家是否在地面上
Fighter.prototype.isOnGround = function(){
    return this.position.y + this.height >= ground;
};
Fighter.prototype.attack = function(){
    this.isAttacking = true;
    this.switchSprite('attack1');
};
Fighter.prototype.takeHit = function(){
    this.switchSprite('takeHit');
}
Fighter.prototype.switchSprite = function(sprite){
    if(this.image === this.sprites.attack1.image && 
        this.framesCurrent < this.sprites.attack1.totalFrames - 1){
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
    }  
}