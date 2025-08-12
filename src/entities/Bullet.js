import { TextureFactory } from '../utils/TextureFactory';
import { GameConfig } from '../config/GameConfig';

export class Bullet {
    constructor(scene, x, y, dirX, dirY, owner, stats = null) {
        if (!scene || typeof x !== 'number' || typeof y !== 'number' || !owner) {
            throw new Error('Invalid parameters for Bullet constructor');
        }
        
        this.scene = scene;
        this.owner = owner;
        this.stats = stats; // Store reference to player stats
        this.speed = stats ? stats.bulletSpeed : GameConfig.bullet.speed;
        this.damage = stats ? stats.bulletDamage : GameConfig.bullet.damage;
        this.bulletSize = stats ? stats.bulletSize : GameConfig.bullet.size;
        this.lifespan = GameConfig.bullet.lifespan;
        this.isDestroyed = false;
        this.isPooled = false;
        this.lastPosition = { x, y };
        this.hitTargets = new Set(); // Track hit targets to prevent multiple hits
        this.maxPierceTargets = stats && stats.piercing > 0 ? stats.piercing : 0;
        this.maxRebounds = stats && stats.rebounds > 0 ? stats.rebounds : 0;
        this.currentRebounds = 0;
        this.homingLevel = stats && stats.homing > 0 ? stats.homing : 0;
        this.homingCooldown = 0; // Small delay before homing starts
        
        const color = GameConfig.bullet.colors[`player${owner}`];
        
        try {
            this.sprite = scene.physics.add.sprite(x, y, null);
            this.sprite.setOrigin(0.5, 0.5);
            
            const textureKey = `bullet${owner}`;
            const texture = TextureFactory.createCircleTexture(
                scene,
                textureKey,
                this.bulletSize / 2,
                color
            );
            
            if (texture) {
                this.sprite.setTexture(textureKey);
                this.sprite.setScale(0.8);
            }
            
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            if (length > GameConfig.physics.deadzone) {
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
        
        // Apply homing behavior if enabled
        if (this.homingLevel > 0) {
            this.applyHoming();
        }
        
        // Check for boundary collision and rebound
        if (this.checkBoundaryCollision()) {
            // Boundary hit handled in checkBoundaryCollision
        }
    }
    
    checkBoundaryCollision() {
        if (!this.sprite || !this.sprite.body) return false;
        
        const margin = GameConfig.arena.margin;
        const width = this.scene.cameras.main.width;  // Use camera width like arena does
        const height = this.scene.cameras.main.height; // Use camera height like arena does
        let bounced = false;
        
        // Check if bullet can rebound
        const canRebound = this.maxRebounds > 0 && this.currentRebounds < this.maxRebounds;
        
        // Add buffer for collision detection (half bullet size)
        const buffer = this.bulletSize / 2;
        
        // Calculate boundaries
        const leftBoundary = margin;
        const rightBoundary = width - margin;
        const topBoundary = margin;  
        const bottomBoundary = height - margin;
        
        // Check left boundary
        if (this.sprite.x - buffer <= leftBoundary && this.velocity.x < 0) {
            if (canRebound) {
                // Bounce horizontally
                this.velocity.x = -this.velocity.x;
                this.sprite.body.setVelocity(this.velocity.x, this.velocity.y);
                
                // Adjust position to prevent getting stuck
                this.sprite.x = leftBoundary + buffer + 1;
                
                this.currentRebounds++;
                bounced = true;
                
                // Update rotation based on new velocity
                this.sprite.rotation = Math.atan2(this.velocity.y, this.velocity.x);
            } else {
                // No more rebounds, destroy with explosion if applicable
                this.handleBoundaryDestruction();
                return true;
            }
        }
        
        // Check right boundary
        if (this.sprite.x + buffer >= rightBoundary && this.velocity.x > 0) {
            if (canRebound) {
                // Bounce horizontally
                this.velocity.x = -this.velocity.x;
                this.sprite.body.setVelocity(this.velocity.x, this.velocity.y);
                
                // Adjust position to prevent getting stuck
                this.sprite.x = rightBoundary - buffer - 1;
                
                this.currentRebounds++;
                bounced = true;
                
                // Update rotation based on new velocity
                this.sprite.rotation = Math.atan2(this.velocity.y, this.velocity.x);
            } else {
                // No more rebounds, destroy with explosion if applicable
                this.handleBoundaryDestruction();
                return true;
            }
        }
        
        // Check top boundary
        if (this.sprite.y - buffer <= topBoundary && this.velocity.y < 0) {
            if (canRebound) {
                // Bounce vertically
                this.velocity.y = -this.velocity.y;
                this.sprite.body.setVelocity(this.velocity.x, this.velocity.y);
                
                // Adjust position to prevent getting stuck
                this.sprite.y = topBoundary + buffer + 1;
                
                this.currentRebounds++;
                bounced = true;
                
                // Update rotation based on new velocity
                this.sprite.rotation = Math.atan2(this.velocity.y, this.velocity.x);
            } else {
                // No more rebounds, destroy with explosion if applicable
                this.handleBoundaryDestruction();
                return true;
            }
        }
        
        // Check bottom boundary
        if (this.sprite.y + buffer >= bottomBoundary && this.velocity.y > 0) {
            if (canRebound) {
                // Bounce vertically
                this.velocity.y = -this.velocity.y;
                this.sprite.body.setVelocity(this.velocity.x, this.velocity.y);
                
                // Adjust position to prevent getting stuck
                this.sprite.y = bottomBoundary - buffer - 1;
                
                this.currentRebounds++;
                bounced = true;
                
                // Update rotation based on new velocity
                this.sprite.rotation = Math.atan2(this.velocity.y, this.velocity.x);
            } else {
                // No more rebounds, destroy with explosion if applicable
                this.handleBoundaryDestruction();
                return true;
            }
        }
        
        // Only destroy if actually out of bounds
        if (this.isOutOfBounds()) {
            this.handleBoundaryDestruction();
            return true;
        }
        
        return bounced;
    }
    
    applyHoming() {
        // Small delay before homing starts (makes bullets feel more natural)
        this.homingCooldown += 16; // Assuming ~60fps, so 16ms per frame
        if (this.homingCooldown < 100) return; // Wait 100ms before homing starts
        
        // Find the nearest enemy player
        const target = this.findNearestTarget();
        if (!target) return;
        
        // Calculate direction to target
        const dx = target.sprite.x - this.sprite.x;
        const dy = target.sprite.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 50) return; // Don't home if too close (prevents jittery behavior)
        
        // Normalize target direction
        const targetDir = {
            x: dx / distance,
            y: dy / distance
        };
        
        // Current velocity direction (normalized)
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        const currentDir = {
            x: this.velocity.x / currentSpeed,
            y: this.velocity.y / currentSpeed
        };
        
        // Calculate angle difference between current direction and target direction
        const angleDiff = Math.acos(Math.max(-1, Math.min(1, 
            currentDir.x * targetDir.x + currentDir.y * targetDir.y
        )));
        
        // Adaptive homing strength based on angle difference
        // More correction needed = more homing applied, but capped for smoothness
        const maxHomingPerFrame = 0.03 + (this.homingLevel - 1) * 0.015; // 0.03, 0.045, 0.06, etc.
        const baseHomingStrength = 0.008 + (this.homingLevel - 1) * 0.004; // 0.008, 0.012, 0.016, etc.
        
        // Scale homing strength by angle difference (more difference = more correction, but smoothly)
        const angleFactor = Math.min(1, angleDiff / (Math.PI / 4)); // Normalize to 0-1 over first 45 degrees
        const homingStrength = baseHomingStrength + (maxHomingPerFrame - baseHomingStrength) * angleFactor;
        
        // Lerp between current direction and target direction
        const newDir = {
            x: currentDir.x + (targetDir.x - currentDir.x) * homingStrength,
            y: currentDir.y + (targetDir.y - currentDir.y) * homingStrength
        };
        
        // Normalize the new direction
        const newDirLength = Math.sqrt(newDir.x * newDir.x + newDir.y * newDir.y);
        newDir.x /= newDirLength;
        newDir.y /= newDirLength;
        
        // Apply new velocity (maintain speed)
        this.velocity.x = newDir.x * currentSpeed;
        this.velocity.y = newDir.y * currentSpeed;
        
        // Update physics body
        this.sprite.body.setVelocity(this.velocity.x, this.velocity.y);
        
        // Update rotation to match new direction
        this.sprite.rotation = Math.atan2(this.velocity.y, this.velocity.x);
    }
    
    findNearestTarget() {
        if (!this.scene || !this.scene.players) return null;
        
        let nearestTarget = null;
        let nearestDistance = Infinity;
        
        // Find nearest enemy player (not the bullet's owner)
        for (const player of this.scene.players) {
            if (!player || player.isDead || player.playerNumber === this.owner) continue;
            
            const dx = player.sprite.x - this.sprite.x;
            const dy = player.sprite.y - this.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestTarget = player;
            }
        }
        
        return nearestTarget;
    }
    
    handleBoundaryDestruction() {
        // Check for explosion when destroying at boundary
        if (this.stats && this.stats.explosive > 0 && this.scene.explosionSystem) {
            const explosionLevel = this.stats.explosive;
            const scaledRadius = GameConfig.explosion.radius * (1 + explosionLevel * 0.2);
            const scaledDamage = GameConfig.explosion.damage * (1 + explosionLevel * 0.2);
            
            this.scene.explosionSystem.createExplosion(
                this.sprite.x, 
                this.sprite.y, 
                scaledDamage,
                this.owner,
                scaledRadius
            );
        }
        this.destroy();
    }
    
    isOutOfBounds() {
        if (!this.sprite) return true;
        
        const margin = GameConfig.arena.margin;
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        
        // Only destroy when significantly outside the arena boundaries
        const destroyBuffer = 30; // Extra pixels beyond arena before destroying
        
        return (
            this.sprite.x < margin - destroyBuffer ||
            this.sprite.x > width - margin + destroyBuffer ||
            this.sprite.y < margin - destroyBuffer ||
            this.sprite.y > height - margin + destroyBuffer
        );
    }
    
    updateDepth() {
        if (!this.sprite) return;
        
        const depth = this.sprite.x + this.sprite.y;
        this.sprite.setDepth(depth - 1);
    }
    
    // Reset bullet for reuse in object pool
    reset(x, y, dirX, dirY, owner, stats = null) {
        this.owner = owner;
        this.stats = stats;
        // Update properties from stats
        this.speed = stats ? stats.bulletSpeed : GameConfig.bullet.speed;
        this.damage = stats ? stats.bulletDamage : GameConfig.bullet.damage;
        this.bulletSize = stats ? stats.bulletSize : GameConfig.bullet.size;
        this.isDestroyed = false;
        this.lastPosition = { x, y };
        this.hitTargets.clear(); // Reset hit targets for reuse
        this.maxPierceTargets = stats && stats.piercing > 0 ? stats.piercing : 0;
        this.maxRebounds = stats && stats.rebounds > 0 ? stats.rebounds : 0;
        this.currentRebounds = 0;
        this.homingLevel = stats && stats.homing > 0 ? stats.homing : 0;
        this.homingCooldown = 0;
        
        if (this.sprite) {
            this.sprite.setPosition(x, y);
            this.sprite.setVisible(true);
            this.sprite.body.enable = true;
            
            // Update sprite scale based on bullet size
            const scale = this.bulletSize / GameConfig.bullet.size;
            this.sprite.setScale(scale);
            
            // Calculate new velocity
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            if (length > GameConfig.physics.deadzone) {
                this.velocity = {
                    x: (dirX / length) * this.speed,
                    y: (dirY / length) * this.speed
                };
            } else {
                this.velocity = { x: this.speed, y: 0 };
            }
            
            this.sprite.body.setVelocity(this.velocity.x, this.velocity.y);
            this.sprite.rotation = Math.atan2(this.velocity.y, this.velocity.x);
            
            // Update bullet color
            const color = GameConfig.bullet.colors[`player${owner}`];
            this.sprite.clearTint();
            this.sprite.setTint(color);
            
            // Reset lifespan timer
            if (this.lifespanTimer) {
                this.lifespanTimer.remove();
            }
            this.lifespanTimer = this.scene.time.delayedCall(this.lifespan, () => {
                // Check for explosion on timeout
                if (this.stats && this.stats.explosive > 0 && this.scene.explosionSystem) {
                    const explosionLevel = this.stats.explosive;
                    const scaledRadius = GameConfig.explosion.radius * (1 + explosionLevel * 0.2);
                    const scaledDamage = GameConfig.explosion.damage * (1 + explosionLevel * 0.2);
                    
                    this.scene.explosionSystem.createExplosion(
                        this.sprite.x, 
                        this.sprite.y, 
                        scaledDamage,
                        this.owner,
                        scaledRadius
                    );
                }
                this.destroy();
            });
        }
    }
    
    // Check if target has already been hit (for piercing bullets)
    hasHitTarget(target) {
        const targetId = target.playerNumber || target.id || target.sprite?.name || target.sprite?.id || target;
        return this.hitTargets.has(targetId);
    }
    
    // Mark target as hit (for piercing bullets)
    markTargetAsHit(target) {
        const targetId = target.playerNumber || target.id || target.sprite?.name || target.sprite?.id || target;
        this.hitTargets.add(targetId);
    }
    
    // Check if bullet should be destroyed after hitting target count
    shouldDestroyAfterHit() {
        // If no piercing, destroy after first hit
        // If piercing = 1, can hit 2 targets total (pierce through 1)
        // If piercing = 2, can hit 3 targets total (pierce through 2), etc.
        const maxHits = this.maxPierceTargets + 1;
        return this.hitTargets.size >= maxHits;
    }
    
    // Set bullet as inactive (for pooling)
    setInactive() {
        if (this.sprite) {
            this.sprite.setVisible(false);
            this.sprite.body.enable = false;
            this.sprite.body.setVelocity(0, 0);
        }
        
        if (this.lifespanTimer) {
            this.lifespanTimer.remove();
            this.lifespanTimer = null;
        }
    }
    
    destroy() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Mark sprite as destroyed and clean up shader effects BEFORE destroying sprite
        if (this.sprite) {
            this.sprite.setData('isDestroyed', true);
            this.sprite.setActive(false);
            this.sprite.setVisible(false);
            
            // Clean up any visual effects immediately
            if (this.scene && this.scene.effectManager) {
                this.scene.effectManager.removeEffect(this.sprite);
            }
        }
        
        // If this is a pooled bullet, try to release it back to pool
        if (this.isPooled && this.release) {
            this.release();
            return;
        }
        
        // Otherwise destroy normally
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