import { getRandomUpgradesForFirstPlayer, canPlayerTakeUpgrade } from '../data/UpgradeItems';
import { Player } from '../entities/Player';
import { GameConfig } from '../config/GameConfig';
import { EventBus } from '../events/EventBus';

export class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }
    
    init(data) {
        // Data passed from GameScene
        this.playerStats = data.playerStats; // Array of PlayerStats objects
        this.onComplete = data.onComplete; // Callback when both players are done
        this.deadPlayer = data.deadPlayer; // Player who died (selects first)
        this.winner = data.winner; // Player who won (selects second)
        
        // Selection state
        this.currentSelectingPlayer = this.deadPlayer; // Dead player goes first
        this.selectionStep = 1; // 1 = dead player, 2 = winner
        this.selectedUpgrades = [null, null]; // Store selected upgrades
    }
    
    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Initialize event bus and physics
        this.eventBus = new EventBus();
        
        // Semi-transparent background
        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8);
        
        // Generate shared pool of 5 upgrades based on first player's available upgrades
        const firstPlayerStats = this.playerStats[this.deadPlayer - 1];
        this.sharedUpgrades = getRandomUpgradesForFirstPlayer(5, firstPlayerStats);
        
        // Create upgrade display
        this.createUpgradeDisplay();
        
        // Create X marks for unusable upgrades (created but hidden initially)
        this.createUnusableMarks();
        
        // Create physics groups
        this.playerGroup = this.physics.add.group();
        
        // Create both players
        this.createPlayers();
        
        // Update UI for current selecting player
        this.updateUI();
        
        // State tracking
        this.canSelect = true;
    }
    
    createUpgradeDisplay() {
        const width = this.cameras.main.width;
        const centerY = this.cameras.main.height / 2;
        
        // Position upgrades in a row (centered)
        const spacing = 150;
        const startX = width/2 - (spacing * 2); // 5 items, centered
        
        this.upgradeItems = [];
        this.upgradeCards = [];
        
        this.sharedUpgrades.forEach((upgrade, index) => {
            const x = startX + (index * spacing);
            const itemY = centerY + 50;
            const cardY = centerY - 100;
            
            // Create item (red circle)
            const item = this.add.circle(x, itemY, 40, 0xff0000);
            item.setStrokeStyle(3, 0xffffff, 0.5);
            item.setData('upgrade', upgrade);
            item.setData('index', index);
            this.upgradeItems.push(item);
            
            // Create card background
            const card = this.add.rectangle(x, cardY, 130, 100, 0x1a1a2e);
            card.setStrokeStyle(2, 0x444444);
            this.upgradeCards.push(card);
            
            // Card title
            this.add.text(x, cardY - 30, upgrade.name, {
                fontSize: '14px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            // Card description
            this.add.text(x, cardY, upgrade.description, {
                fontSize: '12px',
                color: '#cccccc',
                wordWrap: { width: 120 }
            }).setOrigin(0.5);
            
            // Category indicator
            const categoryColors = {
                offensive: 0xff4444,
                defensive: 0x4444ff,
                movement: 0x44ff44,
                utility: 0xffff44
            };
            const categoryColor = categoryColors[upgrade.category] || 0xffffff;
            this.add.rectangle(x, cardY + 35, 80, 3, categoryColor);
        });
    }
    
    createUnusableMarks() {
        const width = this.cameras.main.width;
        const spacing = width / 6;
        const startX = spacing;
        const itemY = 200;
        
        this.unusableMarks = [];
        
        // Create X marks for each upgrade position
        for (let i = 0; i < 5; i++) {
            const x = startX + (i * spacing);
            
            // Create red X mark
            const xMark = this.add.graphics();
            xMark.lineStyle(6, 0xff0000, 1);
            // Draw X
            xMark.moveTo(x - 15, itemY - 15);
            xMark.lineTo(x + 15, itemY + 15);
            xMark.moveTo(x + 15, itemY - 15);
            xMark.lineTo(x - 15, itemY + 15);
            xMark.strokePath();
            
            xMark.setDepth(200); // Above upgrade items
            xMark.setVisible(false); // Hidden by default
            
            this.unusableMarks.push(xMark);
        }
    }
    
    createPlayers() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create both players in the upgrade area
        const centerY = height/2 + 130;
        
        this.player1Entity = new Player(
            this,
            width * 0.4,  // Left of center
            centerY,
            1,
            this.playerStats[0]
        );
        
        this.player2Entity = new Player(
            this,
            width * 0.6,  // Right of center
            centerY,
            2,
            this.playerStats[1]
        );
        
        // Add to physics group
        this.playerGroup.add(this.player1Entity.sprite);
        this.playerGroup.add(this.player2Entity.sprite);
        
        this.players = [this.player1Entity, this.player2Entity];
    }
    
    updateUI() {
        const width = this.cameras.main.width;
        
        // Remove old UI elements
        if (this.titleText) this.titleText.destroy();
        if (this.instructionText) this.instructionText.destroy();
        
        // Title showing whose turn it is
        const playerColor = this.currentSelectingPlayer === 1 ? '#4CAF50' : '#2196F3';
        const stepText = this.selectionStep === 1 ? '(Lost - Picks First)' : '(Won - Picks Second)';
        
        this.titleText = this.add.text(width/2, 80, `Player ${this.currentSelectingPlayer} - Choose Your Upgrade`, {
            fontSize: '32px',
            color: playerColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.instructionText = this.add.text(width/2, 120, stepText, {
            fontSize: '16px',
            color: playerColor,
            fontStyle: 'italic'
        }).setOrigin(0.5);
        
        // Enable/disable players based on whose turn it is
        this.players.forEach((player, index) => {
            const playerNum = index + 1;
            if (playerNum === this.currentSelectingPlayer) {
                // Active player - normal appearance and can move
                player.sprite.setAlpha(1.0);
                player.canMove = true;
            } else {
                // Waiting player - dimmed and can't move
                player.sprite.setAlpha(0.4);
                player.canMove = false;
            }
        });
    }
    
    update(delta) {
        if (!this.canSelect) return;
        
        // Update all players (only active one will respond to input)
        this.players.forEach(player => {
            if (player) {
                player.update(delta);
            }
        });
        
        // Check selection for current active player
        this.checkPlayerSelection();
    }
    
    checkPlayerSelection() {
        const currentPlayer = this.currentSelectingPlayer === 1 ? this.player1Entity : this.player2Entity;
        
        if (!currentPlayer || !currentPlayer.sprite) return;
        
        const playerX = currentPlayer.sprite.x;
        const playerY = currentPlayer.sprite.y;
        
        // Find closest available upgrade item
        let closestIndex = 0;
        let closestDistance = Infinity;
        
        this.upgradeItems.forEach((item, index) => {
            // Skip already selected items
            if (item.alpha <= 0.1) return;
            
            // Check if current player can take this upgrade
            const currentPlayerStats = this.playerStats[this.currentSelectingPlayer - 1];
            const canTake = canPlayerTakeUpgrade(currentPlayerStats, this.sharedUpgrades[index].id);
            
            if (!canTake) return; // Skip upgrades this player can't take
            
            const distance = Math.sqrt(
                Math.pow(playerX - item.x, 2) + 
                Math.pow(playerY - item.y, 2)
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });
        
        // Highlight closest available item and mark unusable ones
        this.upgradeItems.forEach((item, index) => {
            // Skip already selected items
            if (item.alpha <= 0.1) return;
            
            // Check if current player can take this upgrade
            const currentPlayerStats = this.playerStats[this.currentSelectingPlayer - 1];
            const canTake = canPlayerTakeUpgrade(currentPlayerStats, this.sharedUpgrades[index].id);
            
            if (!canTake) {
                // Unusable upgrade - red cross and dimmed
                item.setScale(1);
                item.setStrokeStyle(4, 0xff0000, 1);
                item.setAlpha(0.5); // Use alpha instead of tint for dimming
                // Show X mark
                if (this.unusableMarks && this.unusableMarks[index]) {
                    this.unusableMarks[index].setVisible(true);
                }
            } else {
                // Hide X mark for usable upgrades
                if (this.unusableMarks && this.unusableMarks[index]) {
                    this.unusableMarks[index].setVisible(false);
                }
                // Reset alpha
                item.setAlpha(1.0);
                
                if (index === closestIndex) {
                    // Selected upgrade
                    item.setScale(1.2);
                    item.setStrokeStyle(4, 0xffff00, 1);
                } else {
                    // Available upgrade
                    item.setScale(1);
                    item.setStrokeStyle(3, 0xffffff, 0.5);
                }
            }
        });
        
        // Highlight corresponding card
        this.upgradeCards.forEach((card, index) => {
            // Skip already selected items
            if (this.upgradeItems[index].alpha <= 0.1) return;
            
            // Check if current player can take this upgrade
            const currentPlayerStats = this.playerStats[this.currentSelectingPlayer - 1];
            const canTake = canPlayerTakeUpgrade(currentPlayerStats, this.sharedUpgrades[index].id);
            
            if (!canTake) {
                // Unusable upgrade - red border and dimmed
                card.setStrokeStyle(3, 0xff0000, 1);
                card.setAlpha(0.5); // Use alpha instead of tint for dimming
            } else {
                // Reset alpha
                card.setAlpha(1.0);
                
                if (index === closestIndex) {
                    // Selected upgrade
                    card.setStrokeStyle(3, 0xffff00, 1);
                } else {
                    // Available upgrade
                    card.setStrokeStyle(2, 0x444444);
                }
            }
        });
        
        // Check for selection input
        let gamepad = currentPlayer.gamepad;
        
        // Fallback gamepad detection
        if (!gamepad || !gamepad.connected) {
            const pads = this.input.gamepad?.gamepads;
            if (pads && pads.length > this.currentSelectingPlayer - 1) {
                gamepad = pads[this.currentSelectingPlayer - 1];
            }
        }
        
        if (gamepad && gamepad.connected) {
            const shootPressed = (gamepad.R2 && gamepad.R2 > 0.5) || 
                               (gamepad.buttons && gamepad.buttons[7]?.pressed);
            
            // Only allow selection of available items that player can take
            if (shootPressed && closestDistance < 60 && this.upgradeItems[closestIndex].alpha > 0.1) {
                const currentPlayerStats = this.playerStats[this.currentSelectingPlayer - 1];
                const canTake = canPlayerTakeUpgrade(currentPlayerStats, this.sharedUpgrades[closestIndex].id);
                
                if (canTake) {
                    this.confirmSelection(closestIndex);
                } else {
                    // Player cannot take this upgrade (already has it)
                }
            }
        }
    }
    
    confirmSelection(selectedIndex) {
        const selectedUpgrade = this.sharedUpgrades[selectedIndex];
        
        // Apply upgrade to current player
        this.playerStats[this.currentSelectingPlayer - 1].applyUpgrade(selectedUpgrade);
        
        // Store the selected upgrade
        this.selectedUpgrades[this.currentSelectingPlayer - 1] = selectedUpgrade;
        
        // Visual feedback - make selected item disappear
        const selectedItem = this.upgradeItems[selectedIndex];
        const selectedCard = this.upgradeCards[selectedIndex];
        
        this.tweens.add({
            targets: [selectedItem, selectedCard],
            scale: 1.5,
            alpha: 0,
            duration: 400,
            ease: 'Power2'
        });
        
        // Check if this was the second selection (both players done)
        if (this.selectionStep === 2) {
            this.finishUpgradeSelection();
        } else {
            // Move to next player's turn
            this.selectionStep = 2;
            this.currentSelectingPlayer = this.winner;
            this.updateUI();
        }
    }
    
    finishUpgradeSelection() {
        this.canSelect = false;
        
        // Flash effect
        this.cameras.main.flash(300, 255, 255, 255, false);
        
        // Wait a moment then return to game
        this.time.delayedCall(500, () => {
            this.cleanup();
            
            if (this.onComplete) {
                this.onComplete(this.selectedUpgrades);
            }
            this.scene.stop();
        });
    }
    
    cleanup() {
        // Clean up players
        if (this.players) {
            this.players.forEach(player => {
                if (player) {
                    player.destroy();
                }
            });
            this.players = [];
        }
        
        // Clean up event bus
        if (this.eventBus) {
            this.eventBus.removeAllListeners();
            this.eventBus = null;
        }
    }
}