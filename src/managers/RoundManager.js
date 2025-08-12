import { GameEvents } from '../events/GameEvents';
import { VisualUtils } from '../utils/VisualUtils';

/**
 * Manages round flow and transitions
 * Works with GameStateManager but handles the scene-specific round logic
 */
export class RoundManager {
    constructor(scene, gameStateManager, eventBus) {
        this.scene = scene;
        this.gameStateManager = gameStateManager;
        this.eventBus = eventBus;
        this.victoryElements = null;
    }
    
    onPlayerDeath(playerNumber) {
        const winner = playerNumber === 1 ? 2 : 1;
        this.deadPlayer = playerNumber;
        this.winner = winner;
        this.endRound(winner);
    }
    
    endRound(winner) {
        // Update game state
        this.gameStateManager.endRound(winner);
        
        // Show victory animation
        this.showVictoryAnimation(winner, () => {
            // Check if we should show upgrades or just reset
            setTimeout(() => {
                this.startUpgradeSelection();
            }, 2000);
        });
    }
    
    showVictoryAnimation(winner, onComplete) {
        const centerX = this.scene.scale.width / 2;
        const centerY = this.scene.scale.height / 2;
        
        // Clean up any existing victory animation first
        this.cleanupVictoryAnimation();
        
        // Use VisualUtils to create the animation
        this.victoryElements = VisualUtils.createVictoryAnimation(
            this.scene, 
            winner, 
            centerX, 
            centerY
        );
        
        // Schedule callback (cleanup will happen in startUpgradeSelection or resetRound)
        setTimeout(() => {
            if (onComplete) onComplete();
        }, 2000);
    }
    
    cleanupVictoryAnimation() {
        if (this.victoryElements) {
            if (this.victoryElements.victoryText && this.victoryElements.victoryText.active) {
                this.victoryElements.victoryText.destroy();
                this.victoryElements.victoryText = null;
            }
            if (this.victoryElements.stars) {
                this.victoryElements.stars.forEach(star => {
                    if (star && star.active) {
                        star.destroy();
                    }
                });
                this.victoryElements.stars = [];
            }
            this.victoryElements = null;
        }
    }
    
    resetRound() {
        // Clean up any remaining victory animation
        this.cleanupVictoryAnimation();
        
        // Start new round in game state
        this.gameStateManager.startNewRound();
        
        // Reset players to their spawn positions
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        
        if (this.scene.players[0]) {
            this.scene.players[0].respawn(width * 0.25, height * 0.5);
        }
        if (this.scene.players[1]) {
            this.scene.players[1].respawn(width * 0.75, height * 0.5);
        }
        
        // Reset arena entities
        this.resetArenaEntities();
        
        // Clear all bullets
        if (this.scene.bulletPool) {
            this.scene.bulletPool.releaseAllBullets();
        }
        this.scene.bullets = [];
        if (this.scene.bulletGroup) {
            this.scene.bulletGroup.clear(true, false);
        }
        
        // Reset UI elements
        if (this.scene.roundText) {
            this.scene.roundText.setText('');
            this.scene.roundText.setScale(1);
        }
        
        // Reset global occupied grid
        this.scene.globalOccupiedGrid = null;
        
        // Emit round start event
        this.eventBus.emit(GameEvents.ROUND_START);
    }
    
    resetArenaEntities() {
        // Destroy and recreate crates
        this.scene.crates.forEach(crate => {
            if (crate && !crate.isDestroyed) {
                crate.destroy();
            }
        });
        this.scene.crates = [];
        if (this.scene.crateGroup) {
            this.scene.crateGroup.clear(true, true);
        }
        this.scene.createCrates();
        
        // Destroy and recreate walls  
        this.scene.walls.forEach(wall => {
            if (wall && !wall.isDestroyed) {
                wall.destroy();
            }
        });
        this.scene.walls = [];
        if (this.scene.wallGroup) {
            this.scene.wallGroup.clear(true, true);
        }
        this.scene.createWalls();
    }
    
    startUpgradeSelection() {
        // Clean up victory animation before showing upgrades
        this.cleanupVictoryAnimation();
        
        // Always show upgrades after each round
        this.scene.isUpgradeActive = true;
        this.scene.scene.launch('UpgradeScene', {
            players: this.scene.players,
            playerStats: this.scene.playerStats,
            deadPlayer: this.deadPlayer,
            winner: this.winner,
            onComplete: () => this.onUpgradesComplete()
        });
    }
    
    onUpgradesComplete() {
        this.scene.isUpgradeActive = false;
        this.resetRound();
    }
}