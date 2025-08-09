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
    },
    
    controls: {
        player1: {
            keyboard: {
                up: 'W',
                down: 'S',
                left: 'A',
                right: 'D',
                aimUp: 'I',
                aimDown: 'K',
                aimLeft: 'J',
                aimRight: 'L',
                shoot: 'SPACE'
            }
        },
        player2: {
            keyboard: {
                up: 'UP',
                down: 'DOWN',
                left: 'LEFT',
                right: 'RIGHT',
                aimUp: 'NUMPAD_EIGHT',
                aimDown: 'NUMPAD_FIVE',
                aimLeft: 'NUMPAD_FOUR',
                aimRight: 'NUMPAD_SIX',
                shoot: 'NUMPAD_ZERO'
            }
        }
    }
};