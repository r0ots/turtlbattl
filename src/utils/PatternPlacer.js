import { GameConfig } from '../config/GameConfig';

export class PatternPlacer {
    constructor(scene) {
        this.scene = scene;
        this.gridSize = GameConfig.arena.gridSize;
        this.margin = GameConfig.arena.margin;
        // Initialize dimensions lazily when needed
        this.width = null;
        this.height = null;
        this.gridCols = null;
        this.gridRows = null;
    }

    _initializeDimensions() {
        if (this.width === null) {
            this.width = this.scene.cameras.main.width;
            this.height = this.scene.cameras.main.height;
            this.gridCols = Math.floor((this.width - this.margin * 2) / this.gridSize);
            this.gridRows = Math.floor((this.height - this.margin * 2) / this.gridSize);
        }
    }

    /**
     * Places patterns on a grid with smart tile count management
     * @param {Object} config - Configuration object
     * @param {Array} config.patterns - Array of pattern objects
     * @param {number} config.minTiles - Minimum tiles to place
     * @param {number} config.maxTiles - Maximum tiles to place
     * @param {Set} config.occupiedGrid - Grid positions already occupied
     * @param {Function} config.createEntity - Function to create entity (crate, wall, etc.)
     * @param {Function} config.addToGroup - Function to add entity to physics group
     * @param {Array} config.entities - Array to store created entities
     * @param {string} config.entityType - Type name for logging
     * @returns {number} Total tiles placed
     */
    placePatterns({
        patterns,
        minTiles,
        maxTiles,
        occupiedGrid,
        createEntity,
        addToGroup,
        entities,
        entityType = 'entity'
    }) {
        // Initialize dimensions if not already done
        this._initializeDimensions();
        
        // Mark player spawn areas as occupied
        this.markPlayerSpawnAreas(occupiedGrid, entityType === 'wall' ? 4 : 3);

        let totalTiles = 0;
        let arrangementCount = 0;
        const maxArrangements = 50; // Safety limit

        while (totalTiles < minTiles && arrangementCount < maxArrangements) {
            // Select pattern with size bias when needed
            const pattern = this.selectPattern(patterns, totalTiles, minTiles, maxTiles);
            if (!pattern) break;

            // Try to place pattern
            const placement = this.tryPlacePattern(pattern, occupiedGrid);
            if (placement.success) {
                // Create entities for this pattern
                this.createPatternEntities(
                    pattern,
                    placement.gridX,
                    placement.gridY,
                    createEntity,
                    addToGroup,
                    entities,
                    occupiedGrid
                );

                totalTiles += pattern.blocks.length;
                arrangementCount++;
            }
        }

        console.log(`Created ${totalTiles} ${entityType} tiles in ${arrangementCount} arrangements (target: ${minTiles}-${maxTiles})`);
        return totalTiles;
    }

    markPlayerSpawnAreas(occupiedGrid, radius) {
        // Ensure dimensions are initialized
        this._initializeDimensions();
        
        const playerGridPositions = [
            { x: Math.floor(this.gridCols * 0.25), y: Math.floor(this.gridRows * 0.5) },
            { x: Math.floor(this.gridCols * 0.75), y: Math.floor(this.gridRows * 0.5) }
        ];

        for (const playerPos of playerGridPositions) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    occupiedGrid.add(`${playerPos.x + dx},${playerPos.y + dy}`);
                }
            }
        }
    }

    selectPattern(patterns, currentTiles, minTiles, maxTiles) {
        let pattern;

        if (currentTiles < minTiles) {
            // Bias towards larger patterns when we need more tiles
            const largePatterns = patterns.filter(p => p.blocks.length >= 4);
            const allPatterns = patterns;
            const patternPool = currentTiles < minTiles / 2 
                ? largePatterns.concat(allPatterns) 
                : allPatterns;
            pattern = patternPool[Math.floor(Math.random() * patternPool.length)];
        } else {
            pattern = patterns[Math.floor(Math.random() * patterns.length)];
        }

        // Skip if this would exceed max tiles
        if (currentTiles + pattern.blocks.length > maxTiles) {
            const fittingPatterns = patterns.filter(p => currentTiles + p.blocks.length <= maxTiles);
            if (fittingPatterns.length === 0) return null;
            pattern = fittingPatterns[Math.floor(Math.random() * fittingPatterns.length)];
        }

        return pattern;
    }

    tryPlacePattern(pattern, occupiedGrid) {
        // Ensure dimensions are initialized
        this._initializeDimensions();
        
        const maxAttempts = 50;
        
        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            const gridX = Math.floor(Math.random() * (this.gridCols - 4)) + 2;
            const gridY = Math.floor(Math.random() * (this.gridRows - 4)) + 2;

            // Check if all blocks in pattern can be placed
            let canPlace = true;
            for (const block of pattern.blocks) {
                const checkX = gridX + block.x;
                const checkY = gridY + block.y;

                if (checkX >= this.gridCols || checkY >= this.gridRows) {
                    canPlace = false;
                    break;
                }

                // Check different key formats for walls vs crates
                const generalKey = `${checkX},${checkY}`;
                const orientedKey = block.orientation ? `${checkX},${checkY},${block.orientation}` : null;

                if (occupiedGrid.has(generalKey) || (orientedKey && occupiedGrid.has(orientedKey))) {
                    canPlace = false;
                    break;
                }
            }

            if (canPlace) {
                return { success: true, gridX, gridY };
            }
        }

        return { success: false };
    }

    createPatternEntities(pattern, gridX, gridY, createEntity, addToGroup, entities, occupiedGrid) {
        for (const block of pattern.blocks) {
            const entityGridX = gridX + block.x;
            const entityGridY = gridY + block.y;

            // Convert grid position to world position
            const worldX = this.margin + entityGridX * this.gridSize + this.gridSize/2;
            const worldY = this.margin + entityGridY * this.gridSize + this.gridSize/2;

            // Create entity (crate, wall, etc.)
            const entity = createEntity(worldX, worldY, block.orientation);
            entities.push(entity);

            // Add to physics group
            addToGroup(entity);

            // Mark grid positions as occupied
            if (block.orientation) {
                // Walls: mark both oriented and general positions
                occupiedGrid.add(`${entityGridX},${entityGridY},${block.orientation}`);
                occupiedGrid.add(`${entityGridX},${entityGridY}`);
            } else {
                // Crates: mark general position only
                occupiedGrid.add(`${entityGridX},${entityGridY}`);
            }
        }
    }

    gridToWorld(gridX, gridY) {
        // Ensure dimensions are initialized
        this._initializeDimensions();
        
        return {
            x: this.margin + gridX * this.gridSize + this.gridSize/2,
            y: this.margin + gridY * this.gridSize + this.gridSize/2
        };
    }
}