import { GameConfig } from '../config/GameConfig';

export class CollisionSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Pre-calculate commonly used values
        this.meleeRange = GameConfig.player.melee.range;
        this.meleeRangeSq = this.meleeRange * this.meleeRange; // For faster distance checks
        this.meleeArcRadians = GameConfig.player.melee.arc * GameConfig.physics.degreesToRadians;
        this.meleeHalfArc = this.meleeArcRadians / 2;
        
        this.playerCollisionRadius = GameConfig.player.collisionSize / 2;
        this.knockbackForce = GameConfig.effects.knockback.force;
        
        // Pre-calculate check points for melee collision (relative to center)
        const halfSize = this.playerCollisionRadius;
        this.meleeCheckPoints = [
            { x: 0, y: 0 },                    // Center
            { x: -halfSize, y: -halfSize },    // Top-left
            { x: halfSize, y: -halfSize },     // Top-right
            { x: -halfSize, y: halfSize },     // Bottom-left
            { x: halfSize, y: halfSize },      // Bottom-right
            { x: 0, y: -halfSize },            // Top-center
            { x: 0, y: halfSize },             // Bottom-center
            { x: -halfSize, y: 0 },            // Left-center
            { x: halfSize, y: 0 }              // Right-center
        ];
    }
    
    /**
     * Optimized melee hit detection
     * Only called when a player is actively attacking
     */
    checkMeleeHit(attacker, targets) {
        if (!attacker || !attacker.sprite || attacker.isDead) return null;
        
        const attackerX = attacker.sprite.x;
        const attackerY = attacker.sprite.y;
        const attackerAngle = attacker.sprite.rotation;
        
        // Check each target
        for (const target of targets) {
            if (!target || target.isDead || target === attacker) continue;
            
            const targetX = target.sprite.x;
            const targetY = target.sprite.y;
            
            // Quick distance check using squared distance (faster than sqrt)
            // Use the same range calculation as getPlayersNearPlayer for consistency
            const dx = targetX - attackerX;
            const dy = targetY - attackerY;
            const distanceSq = dx * dx + dy * dy;
            const diagonalBuffer = this.playerCollisionRadius * 0.5;
            const maxDistance = this.meleeRange + this.playerCollisionRadius + diagonalBuffer;
            const maxDistanceSq = maxDistance ** 2;
            
            // Early exit if target center is way too far (optimization)
            if (distanceSq > maxDistanceSq) continue;
            
            // Check if the attack arc intersects with the target rectangle
            const hitPoint = this.checkArcRectangleIntersection(
                attackerX, attackerY, attackerAngle,
                targetX, targetY
            );
            
            if (hitPoint) {
                // Calculate knockback direction once
                const knockbackAngle = Math.atan2(dy, dx);
                
                return {
                    target: target,
                    hitPoint: hitPoint,
                    knockback: {
                        x: Math.cos(knockbackAngle) * this.knockbackForce,
                        y: Math.sin(knockbackAngle) * this.knockbackForce
                    }
                };
            }
        }
        
        return null;
    }
    
    /**
     * Optimized bullet reflection detection
     * Only called when a player is actively attacking
     */
    checkBulletReflection(attacker, bullets) {
        if (!attacker || !attacker.sprite || attacker.isDead) return [];
        
        const attackerX = attacker.sprite.x;
        const attackerY = attacker.sprite.y;
        const attackerAngle = attacker.sprite.rotation;
        const reflectedBullets = [];
        
        // Pre-calculate reflection direction
        const reflectCos = Math.cos(attackerAngle);
        const reflectSin = Math.sin(attackerAngle);
        const bulletSpeed = GameConfig.bullet.speed;
        
        bullets.forEach(bullet => {
            if (!bullet || bullet.isDestroyed || !bullet.sprite) return;
            
            // Don't reflect own bullets
            if (bullet.owner === attacker.playerNumber) return;
            
            const bulletX = bullet.sprite.x;
            const bulletY = bullet.sprite.y;
            
            // Quick distance check using squared distance
            const dx = bulletX - attackerX;
            const dy = bulletY - attackerY;
            const distanceSq = dx * dx + dy * dy;
            
            // Early exit if bullet is too far
            if (distanceSq > this.meleeRangeSq) return;
            
            // Check if bullet is within attack arc
            if (this.isPointInArc(attackerX, attackerY, attackerAngle, bulletX, bulletY)) {
                reflectedBullets.push({
                    bullet: bullet,
                    newVelocity: {
                        x: reflectCos * bulletSpeed,
                        y: reflectSin * bulletSpeed
                    },
                    newAngle: attackerAngle,
                    newOwner: attacker.playerNumber,
                    reflectPosition: { x: bulletX, y: bulletY }
                });
            }
        });
        
        return reflectedBullets;
    }
    
    /**
     * Check if an arc (cone) intersects with a rectangle (player hitbox)
     * Uses dense sampling to ensure visual accuracy - if it looks like it hits, it hits!
     */
    checkArcRectangleIntersection(attackerX, attackerY, attackerAngle, targetX, targetY) {
        const halfSize = this.playerCollisionRadius;
        
        // Create a comprehensive grid of sample points across the rectangle
        const sampleResolution = 6; // 6x6 = 36 sample points for better coverage
        const step = (halfSize * 2) / sampleResolution;
        
        for (let i = 0; i <= sampleResolution; i++) {
            for (let j = 0; j <= sampleResolution; j++) {
                const sampleX = targetX - halfSize + (i * step);
                const sampleY = targetY - halfSize + (j * step);
                
                // Check if this sample point is within the attack arc (only angle check, distance already verified)
                if (this.isPointInArcAngleOnly(attackerX, attackerY, attackerAngle, sampleX, sampleY)) {
                    // Double-check the distance to make sure it's actually within range
                    const dx = sampleX - attackerX;
                    const dy = sampleY - attackerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= this.meleeRange) {
                        return { x: sampleX, y: sampleY };
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Optimized point-in-arc check
     */
    isPointInArc(centerX, centerY, centerAngle, pointX, pointY) {
        const dx = pointX - centerX;
        const dy = pointY - centerY;
        
        // Quick distance check using squared distance
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq > this.meleeRangeSq) return false;
        
        // Check angle
        const angleToPoint = Math.atan2(dy, dx);
        let angleDiff = angleToPoint - centerAngle;
        
        // Normalize angle difference (optimized)
        if (angleDiff > Math.PI) {
            angleDiff -= 2 * Math.PI;
        } else if (angleDiff < -Math.PI) {
            angleDiff += 2 * Math.PI;
        }
        
        return Math.abs(angleDiff) <= this.meleeHalfArc;
    }
    
    /**
     * Check if point is within attack arc (angle only, no distance check)
     * Used when distance is already verified at a higher level
     */
    isPointInArcAngleOnly(centerX, centerY, centerAngle, pointX, pointY) {
        const dx = pointX - centerX;
        const dy = pointY - centerY;
        
        // Check angle only
        const angleToPoint = Math.atan2(dy, dx);
        let angleDiff = angleToPoint - centerAngle;
        
        // Normalize angle difference (optimized)
        if (angleDiff > Math.PI) {
            angleDiff -= 2 * Math.PI;
        } else if (angleDiff < -Math.PI) {
            angleDiff += 2 * Math.PI;
        }
        
        return Math.abs(angleDiff) <= this.meleeHalfArc;
    }
    
    /**
     * Check if an angle is within an arc
     */
    isAngleInArc(centerAngle, testAngle) {
        let angleDiff = testAngle - centerAngle;
        
        // Normalize angle difference
        if (angleDiff > Math.PI) {
            angleDiff -= 2 * Math.PI;
        } else if (angleDiff < -Math.PI) {
            angleDiff += 2 * Math.PI;
        }
        
        return Math.abs(angleDiff) <= this.meleeHalfArc;
    }
    
    /**
     * Find intersection point between two line segments
     * Returns intersection point or null if no intersection
     */
    lineIntersection(line1, line2) {
        const x1 = line1.x1, y1 = line1.y1, x2 = line1.x2, y2 = line1.y2;
        const x3 = line2.x1, y3 = line2.y1, x4 = line2.x2, y4 = line2.y2;
        
        const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        
        // Lines are parallel
        if (Math.abs(denominator) < 1e-10) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;
        
        // Check if intersection is within both line segments
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }
        
        return null;
    }
    
    /**
     * Broad-phase collision detection for bullets vs players
     * Only checks bullets near players to avoid unnecessary calculations
     */
    getBulletsNearPlayer(player, bullets, range = null) {
        if (!player || !player.sprite) return [];
        
        const checkRange = range || this.meleeRange;
        const checkRangeSq = checkRange * checkRange;
        const playerX = player.sprite.x;
        const playerY = player.sprite.y;
        
        return bullets.filter(bullet => {
            if (!bullet || bullet.isDestroyed || !bullet.sprite) return false;
            
            const dx = bullet.sprite.x - playerX;
            const dy = bullet.sprite.y - playerY;
            const distanceSq = dx * dx + dy * dy;
            
            return distanceSq <= checkRangeSq;
        });
    }
    
    /**
     * Get players within range of another player
     */
    getPlayersNearPlayer(player, allPlayers, range = null) {
        if (!player || !player.sprite) return [];
        
        // Use melee range + collision radius + small buffer for diagonal hits
        const diagonalBuffer = this.playerCollisionRadius * 0.5; // Extra buffer for diagonal hits
        const checkRange = range || (this.meleeRange + this.playerCollisionRadius + diagonalBuffer);
        const checkRangeSq = checkRange * checkRange;
        const playerX = player.sprite.x;
        const playerY = player.sprite.y;
        
        return allPlayers.filter(otherPlayer => {
            if (!otherPlayer || otherPlayer === player || otherPlayer.isDead || !otherPlayer.sprite) {
                return false;
            }
            
            const dx = otherPlayer.sprite.x - playerX;
            const dy = otherPlayer.sprite.y - playerY;
            const distanceSq = dx * dx + dy * dy;
            
            return distanceSq <= checkRangeSq;
        });
    }
    
    destroy() {
        this.scene = null;
        this.meleeCheckPoints = null;
    }
}