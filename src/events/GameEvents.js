// Game Events Definition
export const GameEvents = {
    // Player events
    PLAYER_DEATH: 'player:death',
    PLAYER_RESPAWN: 'player:respawn',
    PLAYER_DAMAGE_TAKEN: 'player:damage_taken',
    PLAYER_HEALTH_CHANGED: 'player:health_changed',
    
    // Combat events
    BULLET_FIRED: 'combat:bullet_fired',
    BULLET_HIT: 'combat:bullet_hit',
    BULLET_DESTROYED: 'combat:bullet_destroyed',
    MELEE_ATTACK: 'combat:melee_attack',
    MELEE_HIT: 'combat:melee_hit',
    BULLET_REFLECTED: 'combat:bullet_reflected',
    
    // Movement events
    PLAYER_DASH: 'movement:player_dash',
    PLAYER_MOVED: 'movement:player_moved',
    
    // Game state events
    ROUND_START: 'game:round_start',
    ROUND_END: 'game:round_end',
    SCORE_CHANGED: 'game:score_changed',
    GAME_PAUSED: 'game:paused',
    GAME_RESUMED: 'game:resumed',
    
    // UI events
    UI_UPDATE_NEEDED: 'ui:update_needed',
    DEPTH_UPDATE_NEEDED: 'ui:depth_update_needed',
    
    // Effect events
    EFFECT_CREATE_TRAIL: 'effect:create_trail',
    EFFECT_CREATE_REFLECTION: 'effect:create_reflection',
    
    // Input events
    INPUT_GAMEPAD_CONNECTED: 'input:gamepad_connected',
    INPUT_GAMEPAD_DISCONNECTED: 'input:gamepad_disconnected'
};