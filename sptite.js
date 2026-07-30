// ============ PixiJS Sprite (静态图 / 帧动画) ============
function Sprite({position, src, totalFrames=1, scale=1, offset={x:0,y:0},
    drawWidth, drawHeight, flip=false, onReady}){
    this.offset = offset;
    this.position = position;
    this.flip = flip;
    this.totalFrames = totalFrames;
    this.scale = scale;
    this.drawWidth = drawWidth;
    this.drawHeight = drawHeight;
    this.framesCurrent = 0;
    this.framesElapsed = 0;
    this.framesHold = 18;
    this.pixiSprite = null;
    this._textures = null;
    this._fw = 0; this._fh = 0;
    this._dw = 0; this._dh = 0;
    this._onReady = onReady || null;
    this._initPixi(src);
}

Sprite.prototype._initPixi = function(src){
    var self = this;
    function buildFromImage(img){
        var bt = PIXI.BaseTexture.from(img, {scaleMode: PIXI.SCALE_MODES.NEAREST});
        if(self.totalFrames > 1){
            self._fw = bt.width / self.totalFrames;
            self._fh = bt.height;
            self._textures = [];
            for(var i = 0; i < self.totalFrames; i++){
                self._textures.push(new PIXI.Texture(bt, new PIXI.Rectangle(i * self._fw, 0, self._fw, self._fh)));
            }
            self.pixiSprite = new PIXI.AnimatedSprite(self._textures);
            self.pixiSprite.loop = true;
            self.pixiSprite.animationSpeed = 0.5;
            self.pixiSprite.play();
        } else {
            self._fw = bt.width;
            self._fh = bt.height;
            self._textures = [new PIXI.Texture(bt)];
            self.pixiSprite = new PIXI.Sprite(self._textures[0]);
        }
        self._dw = self.drawWidth || self._fw * self.scale;
        self._dh = self.drawHeight || self._fh * self.scale;
        self.pixiSprite.width = self._dw;
        self.pixiSprite.height = self._dh;
        if(self.flip){
            self.pixiSprite.anchor.set(0.5, 0);
            self.pixiSprite.scale.x = -Math.abs(self.pixiSprite.scale.x);
        }
        self._updatePos();
        if(self._onReady) self._onReady(self);
    }
    // 优先使用已缓存的图片
    if(typeof imageCache !== 'undefined' && imageCache[src] && imageCache[src].complete && imageCache[src].naturalWidth){
        buildFromImage(imageCache[src]);
    } else {
        var img = new Image();
        img.onload = function(){ buildFromImage(img); };
        img.onerror = function(){ console.warn('PixiJS纹理加载失败:', src); };
        img.src = src;
    }
};

Sprite.prototype._updatePos = function(){
    if(!this.pixiSprite) return;
    var dx = this.position.x - this.offset.x;
    var dy = this.position.y - this.offset.y;
    if(this.flip) this.pixiSprite.x = dx + this._dw / 2;
    else this.pixiSprite.x = dx;
    this.pixiSprite.y = dy;
};

Sprite.prototype.draw = function(){};
Sprite.prototype.animateFrames = function(){};
Sprite.prototype.update = function(){
    this._updatePos();
};

// ============ PixiJS Fighter (多动画角色) ============
function Fighter({position,src,totalFrames=1,scale=1,speed,
    offset={x:0,y:0},attackBox={width:0,height:0,offset:{}},sprites,flip=false,stage}){
    Sprite.call(this,{position,src,totalFrames,scale,offset,flip});
    this.speed = speed;
    this.width = 50;
    this.height = 150;
    this.isAttacking = false;
    this.attackCombo = 0;
    this.lastAttackTime = 0;
    this.comboWindow = 2000;
    this.attackBox = {
        position: { x: this.position.x, y: this.position.y },
        offset: attackBox.offset,
        width: attackBox.width,
        height: attackBox.height
    };
    this.sprites = sprites;
    this.health = 100;
    this._animTextures = {};
    this._currentAnim = 'idle';
    this._stage = stage;
    this._preloadAll();
}
Fighter.prototype = Object.create(Sprite.prototype);
Fighter.prototype.constructor = Fighter;

Fighter.prototype._preloadAll = function(){
    var self = this;
    for(var key in this.sprites){
        var sd = this.sprites[key];
        if(!sd || !sd.src) continue;
        (function(k, data){
            function buildFromImage(img){
                var bt = PIXI.BaseTexture.from(img, {scaleMode: PIXI.SCALE_MODES.NEAREST});
                var fw = bt.width / data.totalFrames;
                var fh = bt.height;
                var arr = [];
                for(var i = 0; i < data.totalFrames; i++){
                    arr.push(new PIXI.Texture(bt, new PIXI.Rectangle(i * fw, 0, fw, fh)));
                }
                self._animTextures[k] = arr;
            }
            if(typeof imageCache !== 'undefined' && imageCache[data.src] && imageCache[data.src].complete && imageCache[data.src].naturalWidth){
                buildFromImage(imageCache[data.src]);
            } else {
                var img = new Image();
                img.onload = function(){ buildFromImage(img); };
                img.onerror = function(){ console.warn('Fighter纹理加载失败:', data.src); };
                img.src = data.src;
            }
        })(key, sd);
    }
};

Fighter.prototype.update = function(dt){
    var d = dt || 1;
    if(!this.dead){
        this.framesElapsed++;
        if(this.framesElapsed >= this.framesHold){
            this.framesElapsed = 0;
            this.framesCurrent = (this.framesCurrent + 1) % this.totalFrames;
        }
    }
    this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
    this.attackBox.position.y = this.position.y + this.attackBox.offset.y;
    this.position.y += this.speed.y * d;
    this.position.x += this.speed.x * d;
    if(this.position.y + this.height + this.speed.y * d >= ground){
        this.speed.y = 0;
        this.position.y = ground - this.height;
    } else {
        this.speed.y += gravity * d;
    }
    if(this.isAttacking && this.framesCurrent === this.totalFrames - 1){
        this.isAttacking = false;
    }
    var texArr = this._animTextures[this._currentAnim];
    if(this.pixiSprite && texArr && texArr[this.framesCurrent]){
        this.pixiSprite.texture = texArr[this.framesCurrent];
    }
    this._updatePos();
};

Fighter.prototype.isOnGround = function(){
    return this.position.y + this.height >= ground;
};

Fighter.prototype.attack = function(){
    if(this.isAttacking) return;
    this.isAttacking = true;
    var now = Date.now();
    var dt = now - this.lastAttackTime;
    if(this.attackCombo === 2 && dt <= this.comboWindow){
        this.switchSprite('attack3'); this.attackCombo = 0;
    } else if(this.attackCombo === 1 && dt <= this.comboWindow){
        this.switchSprite('attack2'); this.attackCombo = 2;
    } else {
        this.switchSprite('attack1'); this.attackCombo = 1;
    }
    this.lastAttackTime = now;
};

Fighter.prototype.takeHit = function(){
    this.health -= 20;
    if(this.health <= 0) this.switchSprite('death');
    else this.switchSprite('takeHit');
};

Fighter.prototype.switchSprite = function(sprite){
    if(this._currentAnim === 'death'){
        if(this.framesCurrent === this.totalFrames - 1) this.dead = true;
        return;
    }
    var isAttack = (this._currentAnim==='attack1'||this._currentAnim==='attack2'||this._currentAnim==='attack3');
    var isNextCombo = (sprite==='attack2'||sprite==='attack3');
    if(isAttack && !isNextCombo && this.framesCurrent < this.totalFrames - 1) return;
    if(this._currentAnim === 'takeHit' && this.framesCurrent < this.totalFrames - 1) return;
    if(this._currentAnim === sprite) return;
    var textures = this._animTextures[sprite];
    if(!textures || textures.length === 0) return;
    this._currentAnim = sprite;
    this.totalFrames = textures.length;
    this.framesCurrent = 0;
    this.framesElapsed = 0;
};

// ============ PixiJS Projectile (子弹/必杀) ============
function Projectile({position, speed, direction, color, size=10, damage=30, isKamehame=false}){
    this.position = position;
    this.speed = speed;
    this.direction = direction;
    this.color = color;
    this.size = size;
    this.damage = damage;
    this.isKamehame = isKamehame;
    this.life = 1;
    this.pixiGraphics = new PIXI.Graphics();
    this._drawShape();
}

Projectile.prototype._drawShape = function(){
    var g = this.pixiGraphics;
    g.clear();
    var hex = parseInt(this.color.replace('#',''), 16);
    if(this.isKamehame){
        g.beginFill(hex); g.drawEllipse(0,0,this.size*2,this.size); g.endFill();
        g.beginFill(0xffffff,0.6); g.drawEllipse(0,0,this.size,this.size*0.4); g.endFill();
    } else {
        g.beginFill(hex); g.drawCircle(0,0,this.size); g.endFill();
        g.beginFill(0xffd700,0.8); g.drawCircle(0,0,this.size*0.5); g.endFill();
    }
    g.x = this.position.x;
    g.y = this.position.y;
};

Projectile.prototype.draw = function(){};
Projectile.prototype.update = function(dt){
    var d = dt || 1;
    this.position.x += this.speed.x * this.direction * d;
    if(this.position.x < -50 || this.position.x > 1074) this.life = 0;
    this.pixiGraphics.x = this.position.x;
    this.pixiGraphics.y = this.position.y;
};