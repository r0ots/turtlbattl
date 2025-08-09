import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import { GameConfig } from './config/GameConfig';

const config = {
    type: Phaser.AUTO,
    width: GameConfig.game.width,
    height: GameConfig.game.height,
    parent: 'game-container',
    backgroundColor: GameConfig.game.backgroundColor,
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
    scene: [GameScene]
};

const game = new Phaser.Game(config);