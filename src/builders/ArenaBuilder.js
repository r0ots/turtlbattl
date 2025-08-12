import { GameConfig } from '../config/GameConfig';
import { Crate } from '../entities/Crate';
import { Wall } from '../entities/Wall';
import { CRATE_PATTERNS, WALL_PATTERNS } from '../config/GamePatterns';

/**
 * Handles arena creation and visual setup
 * Does NOT manage state - just builds the visual arena
 */
export class ArenaBuilder {
    static createArenaVisuals(scene) {
        const arenaX = scene.scale.width / 2;
        const arenaY = scene.scale.height / 2;
        
        // Create border
        const border = scene.add.graphics();
        border.lineStyle(4, 0x444444, 1);
        border.strokeRect(
            arenaX - GameConfig.arena.width / 2,
            arenaY - GameConfig.arena.height / 2,
            GameConfig.arena.width,
            GameConfig.arena.height
        );
        border.setDepth(GameConfig.depths.arena);
        
        // Create grid
        const gridGraphics = scene.add.graphics();
        gridGraphics.lineStyle(1, 0x222222, 0.3);
        
        const gridSize = 50;
        const startX = arenaX - GameConfig.arena.width / 2;
        const endX = arenaX + GameConfig.arena.width / 2;
        const startY = arenaY - GameConfig.arena.height / 2;
        const endY = arenaY + GameConfig.arena.height / 2;
        
        for (let x = startX; x <= endX; x += gridSize) {
            gridGraphics.moveTo(x, startY);
            gridGraphics.lineTo(x, endY);
        }
        
        for (let y = startY; y <= endY; y += gridSize) {
            gridGraphics.moveTo(startX, y);
            gridGraphics.lineTo(endX, y);
        }
        
        gridGraphics.strokePath();
        gridGraphics.setDepth(GameConfig.depths.grid);
        
        return { border, gridGraphics };
    }
    
    static createCrates(scene, patternPlacer) {
        const pattern = Phaser.Math.RND.pick(Object.values(CRATE_PATTERNS));
        return patternPlacer.placePattern(
            pattern, 
            {
                createEntity: (x, y) => new Crate(scene, x, y),
                collection: []
            }
        );
    }
    
    static createWalls(scene, patternPlacer) {
        const pattern = Phaser.Math.RND.pick(Object.values(WALL_PATTERNS));
        return patternPlacer.placePattern(
            pattern,
            {
                createEntity: (x, y, orientation) => new Wall(scene, x, y, orientation),
                collection: []
            }
        );
    }
}