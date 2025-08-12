import { DebugConfig } from '../config/DebugConfig';
import { UpgradeItems } from '../data/UpgradeItems';

/**
 * Handles all debug functionality
 * Keeps debug code separate from main game logic
 */
export class DebugManager {
    constructor(scene) {
        this.scene = scene;
        this.debugKeys = {};
    }
    
    setupDebugControls() {
        if (!DebugConfig.DEBUG_MODE) return;
        
        // Kill Player 1 (K key)
        this.debugKeys.killP1 = this.scene.input.keyboard.addKey('K');
        this.debugKeys.killP1.on('down', () => {
            const player1 = this.scene.players[0];
            if (player1 && !player1.isDead) {
                player1.takeDamage(player1.health);
            }
        });
        
        // Kill Player 2 (L key)  
        this.debugKeys.killP2 = this.scene.input.keyboard.addKey('L');
        this.debugKeys.killP2.on('down', () => {
            const player2 = this.scene.players[1];
            if (player2 && !player2.isDead) {
                player2.takeDamage(player2.health);
            }
        });
        
        // Restart Round (R key)
        this.debugKeys.restart = this.scene.input.keyboard.addKey('R');
        this.debugKeys.restart.on('down', () => {
            if (this.scene.roundManager) {
                this.scene.roundManager.resetRound();
            }
        });
        
        // Show current upgrades (U key)
        this.debugKeys.showUpgrades = this.scene.input.keyboard.addKey('U');
        this.debugKeys.showUpgrades.on('down', () => {
            this.logCurrentUpgrades();
        });
        
        // Add upgrade to Player 1 (1 key)
        this.debugKeys.addUpgradeP1 = this.scene.input.keyboard.addKey('ONE');
        this.debugKeys.addUpgradeP1.on('down', () => {
            this.addRandomUpgrade(0);
        });
        
        // Add upgrade to Player 2 (2 key)
        this.debugKeys.addUpgradeP2 = this.scene.input.keyboard.addKey('TWO');
        this.debugKeys.addUpgradeP2.on('down', () => {
            this.addRandomUpgrade(1);
        });
    }
    
    applyDebugUpgrades() {
        if (!DebugConfig.DEBUG_MODE) return;
        
        // Apply starting upgrades for Player 1
        const player1Upgrades = DebugConfig.getStartingUpgrades(1);
        if (player1Upgrades.length > 0) {
            player1Upgrades.forEach(upgradeId => {
                const upgrade = Object.values(UpgradeItems).find(u => u.id === upgradeId);
                if (upgrade) {
                    this.scene.playerStats[0].applyUpgrade(upgrade);
                    if (DebugConfig.LOG_UPGRADES) {
                        console.log(`🔧 DEBUG: Applied ${upgrade.name} to Player 1`);
                    }
                }
            });
        }
        
        // Apply starting upgrades for Player 2
        const player2Upgrades = DebugConfig.getStartingUpgrades(2);
        if (player2Upgrades.length > 0) {
            player2Upgrades.forEach(upgradeId => {
                const upgrade = Object.values(UpgradeItems).find(u => u.id === upgradeId);
                if (upgrade) {
                    this.scene.playerStats[1].applyUpgrade(upgrade);
                    if (DebugConfig.LOG_UPGRADES) {
                        console.log(`🔧 DEBUG: Applied ${upgrade.name} to Player 2`);
                    }
                }
            });
        }
        
        // Log starting stats if upgrades were applied
        if (DebugConfig.LOG_UPGRADES && (player1Upgrades.length > 0 || player2Upgrades.length > 0)) {
            console.log('🔧 DEBUG: Player 1 stats:', this.scene.playerStats[0].getStats());
            console.log('🔧 DEBUG: Player 2 stats:', this.scene.playerStats[1].getStats());
        }
    }
    
    logCurrentUpgrades() {
        console.log('=== Current Upgrades ===');
        console.log('Player 1:', this.scene.playerStats[0].getUpgrades());
        console.log('Player 2:', this.scene.playerStats[1].getUpgrades());
    }
    
    addRandomUpgrade(playerIndex) {
        const availableUpgrades = Object.values(UpgradeItems).filter(u => 
            this.scene.playerStats[playerIndex].canTakeUpgrade(u)
        );
        
        if (availableUpgrades.length > 0) {
            const upgrade = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)];
            this.scene.playerStats[playerIndex].applyUpgrade(upgrade);
            console.log(`Added ${upgrade.name} to Player ${playerIndex + 1}`);
        }
    }
    
    destroy() {
        // Clean up debug key listeners
        Object.values(this.debugKeys).forEach(key => {
            if (key) key.destroy();
        });
        this.debugKeys = {};
    }
}