import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { GameConfig } from './config/GameConfig';

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: GameConfig.game.backgroundColor,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    input: {
        gamepad: true
    },
    scene: [GameScene, UpgradeScene],
    fullscreenTarget: 'game-container'
};

const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});

// Add fullscreen toggle on F key or button press
document.addEventListener('keydown', (event) => {
    if (event.key === 'f' || event.key === 'F') {
        if (game.scale.isFullscreen) {
            game.scale.stopFullscreen();
        } else {
            game.scale.startFullscreen();
        }
    }
});