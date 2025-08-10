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
        magazineSize: 3,      // Number of bullets in magazine
        reloadTime: 1500,     // Time to reload in ms
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
        },
        dash: {
            speed: 600,          // Dash speed multiplier
            duration: 200,       // Dash duration in ms
            cooldown: 2000,      // Cooldown in ms (2 seconds)
            distance: 120        // Total dash distance
        },
        melee: {
            damage: 50,          // Melee damage
            range: 120,          // Slash range (doubled from 60)
            arc: 52,             // Slash arc in degrees (30% wider than 40)
            duration: 150,       // Slash animation duration in ms
            cooldown: 2000       // Cooldown in ms (2 seconds)
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
        ammoIndicator: {
            bulletSize: 8,
            bulletSpacing: 12,
            offsetY: -45
        },
        reloadBar: {
            height: 4,
            color: 0xFFFF00
        },
        dashIndicator: {
            offsetY: 12,
            height: 4,
            readyColor: 0x00FF00,
            cooldownColor: 0xFFFFFF
        },
        meleeIndicator: {
            offsetY: 18,
            height: 4,
            readyColor: 0xFF6600,
            cooldownColor: 0xFFFFFF
        },
        directionIndicator: {
            sizeRatio: 0.8,  // 80% of player size
            darknessFactor: 0.3  // 30% brightness
        },
        text: {
            roundText: {
                fontSize: '32px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                yPosition: 30
            },
            controlsText: {
                fontSize: '14px',
                fill: '#888888',
                yOffset: 30
            }
        }
    },
    
    effects: {
        hitFlash: {
            alpha: 0.3,
            duration: 100,
            repeat: 2
        },
        dashTrail: {
            alpha: 0.5,
            duration: 300,
            finalScale: 0.5
        },
        slashFade: {
            alphaFrom: 0.8,
            alphaTo: 0,
            depth: 10
        },
        bulletReflect: {
            size: 15,
            color: 0xFFFFFF,
            alpha: 0.8,
            duration: 200,
            finalScale: 2,
            depth: 1000
        },
        knockback: {
            force: 200
        },
        roundEnd: {
            scale: 1.5,
            duration: 300,
            delay: 2000
        }
    },
    
    physics: {
        deadzone: 0.001,  // Minimum vector length
        degreesToRadians: Math.PI / 180
    },
    
    pools: {
        bullets: {
            initial: 10,
            max: 50,
            optimal: 20
        },
        effects: {
            initial: 5,
            max: 30,
            optimal: 15
        }
    },
    
    explosion: {
        radius: 80,           // Explosion radius
        damage: 30,           // Base explosion damage
        visualRadius: 100,    // Visual effect radius
        duration: 300,        // Effect duration in ms
        color: 0xFF6600       // Orange explosion color
    },
    
    crate: {
        health: 50,           // Takes 2 bullet hits
        size: 45,             // Size to fit nicely on grid (slightly smaller than grid cell)
        minCrates: 3,         // Minimum number of crates
        maxCrates: 8,         // Maximum number of crates
        spawnMargin: 100,     // Margin from arena edges
        minDistanceFromPlayer: 150  // Minimum distance from player spawn points
    }
};