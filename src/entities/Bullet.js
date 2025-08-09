import { IsometricUtils } from '../utils/IsometricUtils';
import { TextureFactory } from '../utils/TextureFactory';
import { GameConfig } from '../config/GameConfig';

export class Bullet {
    constructor(scene, x, y, dirX, dirY, owner) {
        if (!scene || typeof x !== 'number' || typeof y !== 'number' || !owner) {
            throw new Error('Invalid parameters for Bullet constructor');
        }
        
        this.scene = scene;
        this.owner = owner;
        this.speed = GameConfig.bullet.speed;
        this.damage = GameConfig.bullet.damage;
        this.lifespan = GameConfig.bullet.lifespan;
        this.isDestroyed = false;
        this.lastPosition = { x, y };
        
        const color = GameConfig.bullet.colors[`player${owner}`];
        
        try {
            this.sprite = scene.physics.add.sprite(x, y, null);
            this.sprite.setOrigin(0.5, 0.5);
            
            const textureKey = `bullet${owner}`;
            const texture = TextureFactory.createCircleTexture(
                scene,
                textureKey,
                GameConfig.bullet.size / 2,
                color
            );
            
            if (texture) {
                this.sprite.setTexture(textureKey);
                this.sprite.setScale(0.8);
            }
            
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            if (length > 0.001) {
                this.velocity = {
                    x: (dirX / length) * this.speed,
                    y: (dirY / length) * this.speed
                };
            } else {
                this.velocity = { x: this.speed, y: 0 };
            }
            
            this.sprite.body.setVelocity(this.velocity.x, this.velocity.y);
            this.sprite.body.setSize(GameConfig.bullet.collisionSize, GameConfig.bullet.collisionSize);
            
            this.sprite.rotation = Math.atan2(this.velocity.y, this.velocity.x);
            
            this.sprite.setData('bullet', this);
            
            this.lifespanTimer = scene.time.delayedCall(this.lifespan, () => {
                this.destroy();
            });
            
        } catch (error) {
            console.error('Failed to create bullet:', error);
            this.destroy();
        }
    }
    
    update() {
        if (this.isDestroyed || !this.sprite) return;
        
        if (this.lastPosition.x !== this.sprite.x || this.lastPosition.y !== this.sprite.y) {
            this.updateDepth();
            this.lastPosition = { x: this.sprite.x, y: this.sprite.y };
        }
        
        if (this.isOutOfBounds()) {
            this.destroy();
        }
    }
    
    isOutOfBounds() {
        if (!this.sprite) return true;
        
        const margin = GameConfig.arena.margin;
        return (
            this.sprite.x < margin ||
            this.sprite.x > this.scene.game.config.width - margin ||
            this.sprite.y < margin ||
            this.sprite.y > this.scene.game.config.height - margin
        );
    }
    
    updateDepth() {
        if (!this.sprite) return;
        
        const depth = IsometricUtils.getDepth(this.sprite.x, this.sprite.y);
        this.sprite.setDepth(depth - 1);
    }
    
    destroy() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        if (this.lifespanTimer) {
            this.lifespanTimer.remove();
            this.lifespanTimer = null;
        }
        
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
    }
}