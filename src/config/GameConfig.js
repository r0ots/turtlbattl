export const GameConfig = {
    game: {
        width: 1280,
        height: 720,
        backgroundColor: '#2a2a3e'
    },
    
    arena: {
        margin: 50,
        gridSize: 50,
        borderColor: 0x444466,
        gridColor: 0x333355
    },
    
    player: {
        maxHealth: 100,
        speed: 200,
        rotationSpeed: 3,
        shootRate: 250,
        size: 40,
        collisionSize: 30,
        colors: {
            player1: 0x4CAF50,
            player2: 0x2196F3
        },
        spawnPositions: {
            player1: { x: 300, y: 360 },
            player2: { x: 980, y: 360 }
        },
        gamepad: {
            moveDeadzone: 0.15,  // Ignore stick input below this threshold
            aimDeadzone: 0.25    // Ignore aim input below this threshold
        }
    },
    
    bullet: {
        speed: 500,
        damage: 25,
        lifespan: 2000,
        size: 16,
        collisionSize: 10,
        colors: {
            player1: 0x66FF66,
            player2: 0x6666FF
        }
    },
    
    ui: {
        healthBar: {
            width: 50,
            height: 8,
            offsetY: 30,
            backgroundColor: 0x333333
        },
        text: {
            roundText: {
                fontSize: '32px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            },
            controlsText: {
                fontSize: '14px',
                fill: '#888888'
            }
        }
    }
};