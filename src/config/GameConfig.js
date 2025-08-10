export const GameConfig = {
  game: {
    width: 1280,
    height: 720,
    backgroundColor: "#2a2a3e",
  },

  arena: {
    margin: 50,
    gridSize: 50,
    borderColor: 0x444466,
    gridColor: 0x333355,
  },

  player: {
    maxHealth: 100,
    speed: 300,
    rotationSpeed: 3,
    shootRate: 250,
    magazineSize: 3,
    reloadTime: 1500,
    size: 40,
    collisionSize: 30,
    colors: {
      player1: 0x4caf50,
      player2: 0x2196f3,
    },
    spawnPositions: {
      player1: { x: 300, y: 360 },
      player2: { x: 980, y: 360 },
    },
    gamepad: {
      moveDeadzone: 0.15,
      aimDeadzone: 0.25,
    },
    dash: {
      speed: 1000,
      duration: 80,
      cooldown: 2000,
      distance: 100,
    },
    melee: {
      damage: 50,
      range: 120,
      arc: 52,
      duration: 150,
      cooldown: 2000,
    },
  },

  bullet: {
    speed: 500,
    damage: 25,
    lifespan: 2000,
    size: 16,
    collisionSize: 10,
    colors: {
      player1: 0x66ff66,
      player2: 0x6666ff,
    },
  },

  ui: {
    healthBar: {
      width: 50,
      height: 8,
      offsetY: 30,
      backgroundColor: 0x333333,
    },
    ammoIndicator: {
      bulletSize: 8,
      bulletSpacing: 12,
      offsetY: -45,
    },
    reloadBar: {
      height: 4,
      color: 0xffff00,
    },
    dashIndicator: {
      offsetY: 12,
      height: 4,
      readyColor: 0x00ff00,
      cooldownColor: 0xffffff,
    },
    meleeIndicator: {
      offsetY: 18,
      height: 4,
      readyColor: 0xff6600,
      cooldownColor: 0xffffff,
    },
    directionIndicator: {
      sizeRatio: 0.8, // 80% of player size
      darknessFactor: 0.3, // 30% brightness
    },
    text: {
      roundText: {
        fontSize: "32px",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        yPosition: 30,
      },
      controlsText: {
        fontSize: "14px",
        fill: "#888888",
        yOffset: 30,
      },
    },
  },

  effects: {
    hitFlash: {
      alpha: 0.3,
      duration: 100,
      repeat: 2,
    },
    dashTrail: {
      alpha: 0.5,
      duration: 300,
      finalScale: 0.5,
    },
    slashFade: {
      alphaFrom: 0.8,
      alphaTo: 0,
      depth: 10,
    },
    bulletReflect: {
      size: 15,
      color: 0xffffff,
      alpha: 0.8,
      duration: 200,
      finalScale: 2,
      depth: 1000,
    },
    knockback: {
      force: 200,
    },
    roundEnd: {
      scale: 1.5,
      duration: 300,
      delay: 2000,
    },
  },

  physics: {
    deadzone: 0.001, // Minimum vector length
    degreesToRadians: Math.PI / 180,
  },

  pools: {
    bullets: {
      initial: 10,
      max: 50,
      optimal: 20,
    },
    effects: {
      initial: 5,
      max: 30,
      optimal: 15,
    },
  },

  explosion: {
    radius: 80, // Explosion radius
    damage: 30, // Base explosion damage
    visualRadius: 100, // Visual effect radius
    duration: 300, // Effect duration in ms
    color: 0xff6600, // Orange explosion color
  },

  crate: {
    health: 50, // Takes 2 bullet hits
    size: 45, // Size to fit nicely on grid (slightly smaller than grid cell)
    minTiles: 30, // Minimum number of crate tiles total
    maxTiles: 100, // Maximum number of crate tiles total
    spawnMargin: 100, // Margin from arena edges
    minDistanceFromPlayer: 150, // Minimum distance from player spawn points
  },

  wall: {
    health: 5000, // 100x more HP than crates (takes ~200 bullet hits)
    width: 50, // Width of wall segments
    height: 50, // Height of wall segments
    minTiles: 30, // Minimum number of wall tiles total
    maxTiles: 100, // Maximum number of wall tiles total
    spawnMargin: 100, // Margin from arena edges
    minDistanceFromPlayer: 200, // Minimum distance from player spawn points
  },
};
