function Sprite({position,src,totalFrames=1}){
    this.position = position;
    this.image = new Image();
    this.image.src = src;
    this.totalFrames = totalFrames;
    this.framesCurrent = 0;
    this.framesElapsed = 0;
    this.framesHold = 10;
   
}
 Sprite.prototype.draw = function(){
           c.drawImage(
            this.image, 
            this.framesCurrent * (this.image.width / this.totalFrames), 
            0,
            this.image.width / this.totalFrames,
            this.image.height,
            this.position.x,
            this.position.y,
            this.image.width / this.totalFrames,
            this.image.height
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