import { GameConfig } from '../config/GameConfig';

export class PlayerStats {
    constructor(playerNumber) {
        this.playerNumber = playerNumber;
        this.resetToBase();
        this.upgrades = [];
    }
    
    resetToBase() {
        // Base stats from config
        this.maxHealth = GameConfig.player.maxHealth;
        this.health = this.maxHealth;
        this.moveSpeed = GameConfig.player.speed;
        this.shootRate = GameConfig.player.shootRate;
        this.bulletDamage = GameConfig.bullet.damage;
        this.bulletSpeed = GameConfig.bullet.speed;
        this.bulletSize = GameConfig.bullet.size;
        this.magazineSize = GameConfig.player.magazineSize;
        this.reloadTime = GameConfig.player.reloadTime;
        this.meleeRange = GameConfig.player.melee.range;
        this.meleeDamage = GameConfig.player.melee.damage;
        this.dashCharges = 1;
        
        // Special abilities (stack counts)
        this.piercing = 0;       // Number of targets to pierce through
        this.explosive = 0;      // Explosion power level
        this.phaseDash = false;  // Still boolean (doesn't stack meaningfully)
        this.vampirism = 0;
        this.berserker = 0;      // Berserker stack count
        this.shield = 0;         // Shield stack count
        this.quickFeet = false;  // Still boolean (doesn't stack meaningfully)
        this.bulletCount = 1;
        this.regenRate = 0;
        this.damageReduction = 1;
        
        // Shield system
        this.shieldActive = false;
        this.shieldCooldown = 0;
    }
    
    applyUpgrade(upgrade) {
        // Store upgrade history
        this.upgrades.push(upgrade.id);
        
        // Apply the upgrade effect
        upgrade.effect(this);
    }
    
    getDamageMultiplier() {
        // Check for berserker with stacking
        if (this.berserker > 0) {
            const threshold = 30 + (this.berserker - 1) * 10; // 30, 40, 50, 60...
            if (this.health < threshold) {
                return 1 + (this.berserker * 0.25); // 1.25x, 1.5x, 1.75x...
            }
        }
        return 1;
    }
    
    takeDamage(amount) {
        // Apply damage reduction
        const actualDamage = Math.floor(amount * this.damageReduction);
        this.health -= actualDamage;
        return actualDamage;
    }
    
    getStats() {
        return {
            health: this.health,
            maxHealth: this.maxHealth,
            moveSpeed: this.moveSpeed,
            shootRate: this.shootRate,
            bulletDamage: this.bulletDamage * this.getDamageMultiplier(),
            bulletSpeed: this.bulletSpeed,
            bulletSize: this.bulletSize,
            magazineSize: this.magazineSize,
            reloadTime: this.reloadTime,
            meleeRange: this.meleeRange,
            meleeDamage: this.meleeDamage * this.getDamageMultiplier(),
            upgrades: [...this.upgrades]
        };
    }
}