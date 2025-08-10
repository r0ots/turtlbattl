export const UpgradeItems = {
    // Offensive Upgrades
    DAMAGE_UP: {
        id: 'damage_up',
        name: 'Damage Up',
        description: '+10 bullet damage',
        category: 'offensive',
        effect: (stats) => {
            stats.bulletDamage += 10;
        }
    },
    FIRE_RATE: {
        id: 'fire_rate',
        name: 'Rapid Fire',
        description: '20% faster shooting',
        category: 'offensive',
        effect: (stats) => {
            stats.shootRate *= 0.8;
        }
    },
    TRIPLE_SHOT: {
        id: 'triple_shot',
        name: 'Triple Shot',
        description: 'Shoot 3 bullets',
        category: 'offensive',
        effect: (stats) => {
            stats.bulletCount = 3;
        }
    },
    PIERCING: {
        id: 'piercing',
        name: 'Piercing Rounds',
        description: 'Pierce +1 more target',
        category: 'offensive',
        effect: (stats) => {
            stats.piercing = (stats.piercing || 0) + 1;
        }
    },
    EXPLOSIVE: {
        id: 'explosive',
        name: 'Explosive Rounds',
        description: '+20% explosion radius/pushback',
        category: 'offensive',
        effect: (stats) => {
            stats.explosive = (stats.explosive || 0) + 1;
        }
    },
    
    // Defensive Upgrades
    HEALTH_UP: {
        id: 'health_up',
        name: 'Health Up',
        description: '+25 max health',
        category: 'defensive',
        effect: (stats) => {
            stats.maxHealth += 25;
            stats.health += 25;
        }
    },
    ARMOR: {
        id: 'armor',
        name: 'Armor',
        description: '20% damage reduction',
        category: 'defensive',
        effect: (stats) => {
            stats.damageReduction *= 0.8;
        }
    },
    REGENERATION: {
        id: 'regeneration',
        name: 'Regeneration',
        description: 'Heal 1 HP/sec',
        category: 'defensive',
        effect: (stats) => {
            stats.regenRate = 1;
        }
    },
    
    // Movement Upgrades
    SPEED_UP: {
        id: 'speed_up',
        name: 'Speed Boost',
        description: '+25% move speed',
        category: 'movement',
        effect: (stats) => {
            stats.moveSpeed *= 1.25;
        }
    },
    EXTRA_DASH: {
        id: 'extra_dash',
        name: 'Extra Dash',
        description: '+1 dash charge',
        category: 'movement',
        effect: (stats) => {
            stats.dashCharges += 1;
        }
    },
    PHASE_DASH: {
        id: 'phase_dash',
        name: 'Phase Dash',
        description: 'Dash through bullets',
        category: 'movement',
        effect: (stats) => {
            stats.phaseDash = true;
        }
    },
    
    // Utility Upgrades
    FAST_RELOAD: {
        id: 'fast_reload',
        name: 'Fast Reload',
        description: '50% faster reload',
        category: 'utility',
        effect: (stats) => {
            stats.reloadTime *= 0.5;
        }
    },
    EXTENDED_MAG: {
        id: 'extended_mag',
        name: 'Extended Mag',
        description: '+2 magazine size',
        category: 'utility',
        effect: (stats) => {
            stats.magazineSize += 2;
        }
    },
    BULLET_SPEED: {
        id: 'bullet_speed',
        name: 'Bullet Speed',
        description: '30% faster bullets',
        category: 'utility',
        effect: (stats) => {
            stats.bulletSpeed *= 1.3;
        }
    },
    VAMPIRISM: {
        id: 'vampirism',
        name: 'Vampirism',
        description: 'Heal 5 HP on hit',
        category: 'utility',
        effect: (stats) => {
            stats.vampirism = 5;
        }
    },
    SLASH_RANGE: {
        id: 'slash_range',
        name: 'Long Slash',
        description: '+30% melee range',
        category: 'utility',
        effect: (stats) => {
            stats.meleeRange *= 1.3;
        }
    },
    BIGGER_BULLETS: {
        id: 'bigger_bullets',
        name: 'Bigger Bullets',
        description: 'Larger bullet hitbox',
        category: 'offensive',
        effect: (stats) => {
            stats.bulletSize *= 1.5;
        }
    },
    BERSERKER: {
        id: 'berserker',
        name: 'Berserker',
        description: '+25% dmg bonus, +10 HP threshold',
        category: 'offensive',
        effect: (stats) => {
            stats.berserker = (stats.berserker || 0) + 1;
        }
    },
    SHIELD: {
        id: 'shield',
        name: 'Shield',
        description: '-2s shield cooldown',
        category: 'defensive',
        effect: (stats) => {
            stats.shield = (stats.shield || 0) + 1;
        }
    },
    QUICK_FEET: {
        id: 'quick_feet',
        name: 'Quick Feet',
        description: 'No slowdown shooting',
        category: 'movement',
        effect: (stats) => {
            stats.quickFeet = true;
        }
    }
};

// Check if upgrade can be taken by a player
export function canPlayerTakeUpgrade(playerStats, upgradeId) {
    // Non-stackable upgrades (boolean only)
    const nonStackableUpgrades = ['phase_dash', 'quick_feet'];
    
    if (nonStackableUpgrades.includes(upgradeId)) {
        return !playerStats.upgrades.includes(upgradeId);
    }
    
    // All other upgrades are stackable
    return true;
}

// Helper to get random upgrades available to first player
export function getRandomUpgradesForFirstPlayer(count = 5, firstPlayerStats) {
    const available = Object.values(UpgradeItems).filter(
        item => canPlayerTakeUpgrade(firstPlayerStats, item.id)
    );
    
    const selected = [];
    while (selected.length < count && available.length > 0) {
        const index = Math.floor(Math.random() * available.length);
        selected.push(available.splice(index, 1)[0]);
    }
    
    return selected;
}

// Legacy function for backwards compatibility
export function getRandomUpgrades(count = 5, exclude = []) {
    const available = Object.values(UpgradeItems).filter(
        item => !exclude.includes(item.id)
    );
    
    const selected = [];
    while (selected.length < count && available.length > 0) {
        const index = Math.floor(Math.random() * available.length);
        selected.push(available.splice(index, 1)[0]);
    }
    
    return selected;
}