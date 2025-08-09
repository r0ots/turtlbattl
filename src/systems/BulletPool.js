import { Bullet } from '../entities/Bullet';
import { GameConfig } from '../config/GameConfig';

export class BulletPool {
    constructor(scene, initialSize = 20) {
        this.scene = scene;
        this.pool = [];
        this.activeBullets = new Set();
        
        // Pre-create bullets for the pool
        this.initializePool(initialSize);
    }
    
    initializePool(size) {
        for (let i = 0; i < size; i++) {
            const bullet = this.createBullet();
            bullet.setInactive();
            this.pool.push(bullet);
        }
    }
    
    createBullet() {
        // Create a pooled bullet (without firing it immediately)
        const bullet = new Bullet(this.scene, 0, 0, 1, 0, 1);
        bullet.isPooled = true;
        
        // Add release method for returning to pool
        bullet.release = () => this.releaseBullet(bullet);
        
        return bullet;
    }
    
    getBullet(x, y, dirX, dirY, owner) {
        let bullet;
        
        if (this.pool.length > 0) {
            // Reuse existing bullet from pool
            bullet = this.pool.pop();
            bullet.reset(x, y, dirX, dirY, owner);
        } else {
            // Pool is empty, create new bullet
            bullet = new Bullet(this.scene, x, y, dirX, dirY, owner);
            bullet.isPooled = true;
            bullet.release = () => this.releaseBullet(bullet);
        }
        
        // Add to active bullets tracking
        this.activeBullets.add(bullet);
        
        return bullet;
    }
    
    releaseBullet(bullet) {
        if (!bullet.isPooled || !this.activeBullets.has(bullet)) return;
        
        // Remove from active tracking
        this.activeBullets.delete(bullet);
        
        // Reset bullet state
        bullet.setInactive();
        
        // Return to pool if not destroyed
        if (!bullet.isDestroyed) {
            this.pool.push(bullet);
        }
    }
    
    releaseAllBullets() {
        // Release all active bullets back to pool
        this.activeBullets.forEach(bullet => {
            if (bullet && !bullet.isDestroyed) {
                bullet.setInactive();
                this.pool.push(bullet);
            }
        });
        this.activeBullets.clear();
    }
    
    getActiveCount() {
        return this.activeBullets.size;
    }
    
    getPooledCount() {
        return this.pool.length;
    }
    
    getTotalCount() {
        return this.getActiveCount() + this.getPooledCount();
    }
    
    // Optimize pool size based on usage
    optimizePool() {
        const activeCount = this.getActiveCount();
        const pooledCount = this.getPooledCount();
        const totalCount = this.getTotalCount();
        
        // If we have too many pooled bullets, remove some
        if (pooledCount > activeCount * 2 && totalCount > 10) {
            const bulletsToRemove = Math.min(5, pooledCount - activeCount);
            for (let i = 0; i < bulletsToRemove; i++) {
                const bullet = this.pool.pop();
                if (bullet) {
                    bullet.destroy();
                }
            }
        }
        
        // If pool is too small, add some bullets
        if (pooledCount < 5 && activeCount > pooledCount) {
            const bulletsToAdd = Math.min(5, 20 - totalCount);
            this.initializePool(bulletsToAdd);
        }
    }
    
    destroy() {
        // Destroy all bullets in pool
        this.pool.forEach(bullet => {
            if (bullet && !bullet.isDestroyed) {
                bullet.destroy();
            }
        });
        
        // Destroy all active bullets
        this.activeBullets.forEach(bullet => {
            if (bullet && !bullet.isDestroyed) {
                bullet.destroy();
            }
        });
        
        this.pool = [];
        this.activeBullets.clear();
        this.scene = null;
    }
}