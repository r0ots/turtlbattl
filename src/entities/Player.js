import Phaser from 'phaser';
import { IsometricUtils } from '../utils/IsometricUtils';
import { TextureFactory } from '../utils/TextureFactory';
import { GameConfig } from '../config/GameConfig';

export class Player {
    constructor(scene, x, y, playerNumber) {
        if (!scene || typeof x !== 'number' || typeof y !== 'number' || (playerNumber !== 1 && playerNumber !== 2)) {
            throw new Error('Invalid parameters for Player constructor');
        }
        
        this.scene = scene;
        this.playerNumber = playerNumber;
        this.maxHealth = GameConfig.player.maxHealth;
        this.health = this.maxHealth;
        this.speed = GameConfig.player.speed;
        this.rotationSpeed = GameConfig.player.rotationSpeed;
        this.shootCooldown = 0;
        this.shootRate = GameConfig.player.shootRate;
        this.isDead = false;
        this.lastPosition = { x, y };
        
        const color = GameConfig.player.colors[`player${playerNumber}`];
        
        try {
            this.sprite = scene.physics.add.sprite(x, y, null);
            this.sprite.setOrigin(0.5, 0.5);
            
            const textureKey = `player${playerNumber}`;
            const texture = TextureFactory.createRectangleTexture(
                scene,
                textureKey,
                GameConfig.player.size,
                GameConfig.player.size,
                color
            );
            
            if (texture) {
                this.sprite.setTexture(textureKey);
                this.sprite.setScale(1);
            }
            
            this.sprite.setCollideWorldBounds(true);
            this.sprite.body.setSize(GameConfig.player.collisionSize, GameConfig.player.collisionSize);
            
            this.sprite.setData('player', this);
            
            this.createHealthBar();
            
            this.aimDirection = { x: 1, y: 0 };
            this.moveDirection = { x: 0, y: 0 };
            
            this.gamepad = null;
            this.setupKeyboardControls();
            
        } catch (error) {
            console.error('Failed to create player:', error);
            throw error;
        }
    }
    
    setupKeyboardControls() {
        try {
            const controls = GameConfig.controls[`player${this.playerNumber}`].keyboard;
            
            this.keyboard = {};
            
            if (this.playerNumber === 1) {
                this.keyboard.up = this.scene.input.keyboard.addKey(controls.up);
                this.keyboard.down = this.scene.input.keyboard.addKey(controls.down);
                this.keyboard.left = this.scene.input.keyboard.addKey(controls.left);
                this.keyboard.right = this.scene.input.keyboard.addKey(controls.right);
                this.keyboard.aimUp = this.scene.input.keyboard.addKey(controls.aimUp);
                this.keyboard.aimDown = this.scene.input.keyboard.addKey(controls.aimDown);
                this.keyboard.aimLeft = this.scene.input.keyboard.addKey(controls.aimLeft);
                this.keyboard.aimRight = this.scene.input.keyboard.addKey(controls.aimRight);
                this.keyboard.shoot = this.scene.input.keyboard.addKey(controls.shoot);
            } else {
                this.keyboard.up = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[controls.up]);
                this.keyboard.down = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[controls.down]);
                this.keyboard.left = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[controls.left]);
                this.keyboard.right = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[controls.right]);
                this.keyboard.aimUp = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[controls.aimUp]);
                this.keyboard.aimDown = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[controls.aimDown]);
                this.keyboard.aimLeft = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[controls.aimLeft]);
                this.keyboard.aimRight = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[controls.aimRight]);
                this.keyboard.shoot = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[controls.shoot]);
            }
        } catch (error) {
            console.error('Failed to setup keyboard controls:', error);
            this.keyboard = null;
        }
    }
    
    createHealthBar() {
        const config = GameConfig.ui.healthBar;
        
        this.healthBarBg = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - config.offsetY,
            config.width,
            config.height,
            config.backgroundColor
        );
        
        this.healthBar = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - config.offsetY,
            config.width,
            config.height,
            GameConfig.player.colors[`player${this.playerNumber}`]
        );
        
        this.healthBarBg.setOrigin(0.5, 0.5);
        this.healthBar.setOrigin(0, 0.5);
        this.healthBar.x -= config.width / 2;
    }
    
    update(delta) {
        if (this.isDead || !this.sprite) return;
        
        try {
            this.handleInput();
            this.updateMovement();
            this.updateRotation();
            this.updateHealthBar();
            
            if (this.lastPosition.x !== this.sprite.x || this.lastPosition.y !== this.sprite.y) {
                this.updateDepth();
                this.lastPosition = { x: this.sprite.x, y: this.sprite.y };
            }
            
            if (this.shootCooldown > 0) {
                this.shootCooldown -= delta;
            }
        } catch (error) {
            console.error('Error updating player:', error);
        }
    }
    
    handleInput() {
        const pads = this.scene.input.gamepad?.gamepads;
        
        if (pads && pads.length > this.playerNumber - 1 && pads[this.playerNumber - 1]) {
            this.gamepad = pads[this.playerNumber - 1];
        } else {
            this.gamepad = null;
        }
        
        this.moveDirection = { x: 0, y: 0 };
        this.aimDirection = { x: 0, y: 0 };
        let shouldShoot = false;
        
        if (this.gamepad && this.gamepad.connected) {
            try {
                this.moveDirection.x = this.gamepad.leftStick?.x || 0;
                this.moveDirection.y = this.gamepad.leftStick?.y || 0;
                
                this.aimDirection.x = this.gamepad.rightStick?.x || 0;
                this.aimDirection.y = this.gamepad.rightStick?.y || 0;
                
                shouldShoot = (this.gamepad.R2 && this.gamepad.R2 > 0.5) || 
                             (this.gamepad.buttons && this.gamepad.buttons[7]?.pressed);
            } catch (error) {
                console.warn('Gamepad input error:', error);
            }
        }
        
        if (this.keyboard) {
            try {
                if (this.keyboard.left?.isDown) this.moveDirection.x = -1;
                if (this.keyboard.right?.isDown) this.moveDirection.x = 1;
                if (this.keyboard.up?.isDown) this.moveDirection.y = -1;
                if (this.keyboard.down?.isDown) this.moveDirection.y = 1;
                
                if (this.keyboard.aimLeft?.isDown) this.aimDirection.x = -1;
                if (this.keyboard.aimRight?.isDown) this.aimDirection.x = 1;
                if (this.keyboard.aimUp?.isDown) this.aimDirection.y = -1;
                if (this.keyboard.aimDown?.isDown) this.aimDirection.y = 1;
                
                if (this.keyboard.shoot?.isDown) shouldShoot = true;
            } catch (error) {
                console.warn('Keyboard input error:', error);
            }
        }
        
        if (shouldShoot && this.shootCooldown <= 0) {
            this.shoot();
        }
    }
    
    updateMovement() {
        if (!this.sprite?.body) return;
        
        const length = Math.sqrt(this.moveDirection.x ** 2 + this.moveDirection.y ** 2);
        if (length > 0) {
            this.moveDirection.x /= length;
            this.moveDirection.y /= length;
        }
        
        this.sprite.body.setVelocity(
            this.moveDirection.x * this.speed,
            this.moveDirection.y * this.speed
        );
    }
    
    updateRotation() {
        if (!this.sprite) return;
        
        const length = Math.sqrt(this.aimDirection.x ** 2 + this.aimDirection.y ** 2);
        if (length > 0.1) {
            const angle = Math.atan2(this.aimDirection.y, this.aimDirection.x);
            this.sprite.rotation = angle;
        }
    }
    
    updateHealthBar() {
        if (!this.healthBar || !this.healthBarBg || !this.sprite) return;
        
        const config = GameConfig.ui.healthBar;
        
        this.healthBarBg.x = this.sprite.x;
        this.healthBarBg.y = this.sprite.y - config.offsetY;
        
        this.healthBar.x = this.sprite.x - config.width / 2;
        this.healthBar.y = this.sprite.y - config.offsetY;
        
        const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
        this.healthBar.scaleX = healthPercent;
    }
    
    updateDepth() {
        if (!this.sprite) return;
        
        const depth = IsometricUtils.getDepth(this.sprite.x, this.sprite.y);
        this.sprite.setDepth(depth);
        
        if (this.healthBar) this.healthBar.setDepth(depth + 1);
        if (this.healthBarBg) this.healthBarBg.setDepth(depth);
    }
    
    shoot() {
        if (this.shootCooldown > 0 || this.isDead || !this.scene) return;
        
        const length = Math.sqrt(this.aimDirection.x ** 2 + this.aimDirection.y ** 2);
        let shootDirection = this.aimDirection;
        
        if (length < 0.1) {
            shootDirection = { 
                x: Math.cos(this.sprite.rotation || 0), 
                y: Math.sin(this.sprite.rotation || 0) 
            };
        }
        
        try {
            this.scene.createBullet(
                this.sprite.x,
                this.sprite.y,
                shootDirection.x,
                shootDirection.y,
                this.playerNumber
            );
            
            this.shootCooldown = this.shootRate;
        } catch (error) {
            console.error('Failed to shoot:', error);
        }
    }
    
    takeDamage(amount) {
        if (this.isDead || !this.sprite) return;
        
        this.health = Math.max(0, this.health - amount);
        
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 2
        });
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.isDead = true;
        
        if (this.sprite) {
            this.sprite.setVisible(false);
            this.sprite.body.enable = false;
        }
        
        if (this.healthBar) this.healthBar.setVisible(false);
        if (this.healthBarBg) this.healthBarBg.setVisible(false);
    }
    
    respawn(x, y) {
        this.isDead = false;
        this.health = this.maxHealth;
        
        if (this.sprite) {
            this.sprite.setPosition(x, y);
            this.sprite.setVisible(true);
            this.sprite.body.enable = true;
            this.sprite.setAlpha(1);
        }
        
        if (this.healthBar) this.healthBar.setVisible(true);
        if (this.healthBarBg) this.healthBarBg.setVisible(true);
        
        this.lastPosition = { x, y };
    }
    
    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        
        this.sprite = null;
        this.healthBar = null;
        this.healthBarBg = null;
    }
}