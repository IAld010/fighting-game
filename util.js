function collide(p1, p2) {
    return (p1.attackBox.position.x + p1.attackBox.width >= p2.position.x &&
        p1.attackBox.position.x <= p2.position.x + p2.width &&
        p1.attackBox.position.y + p1.attackBox.height >= p2.position.y &&
        p1.attackBox.position.y <= p2.position.y + p2.height);
}