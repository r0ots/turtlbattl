// Debug Configuration for TurtlBattl
// Set DEBUG_MODE to true and configure starting upgrades for testing

export const DebugConfig = {
  // Enable/disable debug mode
  DEBUG_MODE: true,

  // Starting upgrades for each player (array of upgrade IDs)
  // Leave empty array [] for no starting upgrades
  PLAYER_1_STARTING_UPGRADES: [
    // Example upgrades - uncomment to use:
    "homing",
    "homing",
    "homing",
    "homing",
    //"rebound",
    //"triple_shot",
    // 'damage_up',
    // 'speed_up'
  ],

  PLAYER_2_STARTING_UPGRADES: [
    // Example upgrades - uncomment to use:
    //'explosive',
    //'piercing',
    // 'bigger_bullets',
    // 'fire_rate'
  ],

  // Quick presets for common test scenarios
  PRESETS: {
    // Bouncing bullets test
    RICOCHET_TEST: {
      player1: ["rebound", "rebound", "rebound"], // 6 bounces
      player2: ["rebound"], // 2 bounces
    },

    // Multi-shot spread test
    SPREAD_TEST: {
      player1: ["triple_shot", "triple_shot"], // 5 bullets
      player2: ["triple_shot"], // 3 bullets
    },

    // Big explosive bullets
    EXPLOSIVE_TEST: {
      player1: ["explosive", "explosive", "bigger_bullets"],
      player2: ["explosive", "piercing"],
    },

    // Speed and damage
    COMBAT_TEST: {
      player1: ["damage_up", "damage_up", "speed_up", "fire_rate"],
      player2: ["health_up", "armor", "speed_up"],
    },

    // Piercing test
    PIERCING_TEST: {
      player1: ["piercing", "piercing", "piercing"], // Pierce 3 targets
      player2: ["bigger_bullets", "damage_up"],
    },

    // All movement upgrades
    MOVEMENT_TEST: {
      player1: ["speed_up", "speed_up", "extra_dash", "phase_dash"],
      player2: ["quick_feet", "speed_up"],
    },

    // Homing test
    HOMING_TEST: {
      player1: ["homing", "homing", "homing"], // Strong homing
      player2: ["speed_up", "speed_up"], // Fast movement to test homing
    },
  },

  // Set to a preset name to use it, or null to use individual arrays above
  ACTIVE_PRESET: null, // e.g., 'RICOCHET_TEST'

  // Other debug options
  INFINITE_AMMO: false, // Players never run out of ammo
  NO_COOLDOWNS: false, // Remove all shooting/dash cooldowns
  INVINCIBLE_PLAYERS: false, // Players can't take damage
  SHOW_COLLISION_BOXES: false, // Visual debug for collision boxes
  FAST_ROUNDS: false, // Shorter victory animations

  // Console logging
  LOG_UPGRADES: true, // Log when upgrades are applied
  LOG_BULLET_BOUNCES: false, // Log when bullets bounce
  LOG_DAMAGE: false, // Log all damage events

  // Get the actual starting upgrades for a player
  getStartingUpgrades(playerNumber) {
    // Use preset if active
    if (this.ACTIVE_PRESET && this.PRESETS[this.ACTIVE_PRESET]) {
      const preset = this.PRESETS[this.ACTIVE_PRESET];
      return playerNumber === 1 ? preset.player1 : preset.player2;
    }

    // Use individual arrays
    return playerNumber === 1
      ? this.PLAYER_1_STARTING_UPGRADES
      : this.PLAYER_2_STARTING_UPGRADES;
  },
};

// Available upgrade IDs for reference:
export const AVAILABLE_UPGRADES = {
  // Offensive
  damage_up: "Damage Up (+10 bullet damage)",
  fire_rate: "Rapid Fire (20% faster shooting)",
  triple_shot: "Triple Shot (+2 more bullets)",
  piercing: "Piercing Rounds (Pierce +1 more target)",
  explosive: "Explosive Rounds (+20% explosion radius/pushback)",
  rebound: "Ricochet Rounds (Bullets bounce +2 times)",
  homing: "Homing Rounds (Bullets gently curve towards enemies)",
  bigger_bullets: "Bigger Bullets (Larger bullet hitbox)",
  berserker: "Berserker (+25% dmg bonus, +10 HP threshold)",

  // Defensive
  health_up: "Health Up (+25 max health)",
  armor: "Armor (20% damage reduction)",
  regeneration: "Regeneration (Heal 1 HP/sec)",
  shield: "Shield (-2s shield cooldown)",

  // Movement
  speed_up: "Speed Boost (+25% move speed)",
  extra_dash: "Extra Dash (+1 dash charge)",
  phase_dash: "Phase Dash (Dash through bullets)",
  quick_feet: "Quick Feet (No slowdown shooting)",

  // Utility
  fast_reload: "Fast Reload (50% faster reload)",
  extended_mag: "Extended Mag (+2 magazine size)",
  bullet_speed: "Bullet Speed (30% faster bullets)",
  vampirism: "Vampirism (Heal 5 HP on hit)",
  slash_range: "Long Slash (+30% melee range)",
};

// Quick setup functions for common test scenarios
export const QuickSetup = {
  // Enable ricochet testing
  enableRicochetTest() {
    DebugConfig.DEBUG_MODE = true;
    DebugConfig.ACTIVE_PRESET = "RICOCHET_TEST";
    console.log(
      "🔄 Ricochet test enabled - Player 1 gets 6 bounces, Player 2 gets 2"
    );
  },

  // Enable spread shot testing
  enableSpreadTest() {
    DebugConfig.DEBUG_MODE = true;
    DebugConfig.ACTIVE_PRESET = "SPREAD_TEST";
    console.log(
      "🔱 Spread test enabled - Player 1 gets 5 bullets, Player 2 gets 3"
    );
  },

  // Enable explosive testing
  enableExplosiveTest() {
    DebugConfig.DEBUG_MODE = true;
    DebugConfig.ACTIVE_PRESET = "EXPLOSIVE_TEST";
    console.log("💥 Explosive test enabled - Big explosive bullets");
  },

  // Enable homing testing
  enableHomingTest() {
    DebugConfig.DEBUG_MODE = true;
    DebugConfig.ACTIVE_PRESET = "HOMING_TEST";
    console.log("🎯 Homing test enabled - Player 1 gets strong homing bullets");
  },

  // Disable debug mode
  disable() {
    DebugConfig.DEBUG_MODE = false;
    DebugConfig.ACTIVE_PRESET = null;
    console.log("❌ Debug mode disabled");
  },
};

// Console commands available in browser console
if (typeof window !== "undefined") {
  window.QuickSetup = QuickSetup;
  window.DebugConfig = DebugConfig;
  console.log(
    "🔧 Debug tools loaded! Use QuickSetup.enableRicochetTest() or modify DebugConfig directly"
  );
}
