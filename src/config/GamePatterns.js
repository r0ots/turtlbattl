// Shared patterns for crates and walls to reduce code duplication
export const CRATE_PATTERNS = [
    // Single crate
    { name: 'single', blocks: [{x: 0, y: 0}] },
    
    // Two crates
    { name: 'two_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}] },
    { name: 'two_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}] },
    
    // Three crates
    { name: 'three_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}] },
    { name: 'three_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}] },
    { name: 'L_bl', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}] },
    { name: 'L_br', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}] },
    { name: 'L_tl', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}] },
    { name: 'L_tr', blocks: [{x: 0, y: 1}, {x: 1, y: 0}, {x: 1, y: 1}] },
    
    // Four crates
    { name: 'four_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}] },
    { name: 'four_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}] },
    { name: 'four_2x2', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}] },
    { name: 'four_T_up', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 1, y: 1}] },
    { name: 'four_T_down', blocks: [{x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}] },
    { name: 'four_T_left', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 1}] },
    { name: 'four_T_right', blocks: [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x: 0, y: 1}] },
    { name: 'four_Z_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}] },
    { name: 'four_Z_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 2}] },
    { name: 'four_S_h', blocks: [{x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}] },
    { name: 'four_S_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 2}] },
    
    // Five crates
    { name: 'five_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 4, y: 0}] },
    { name: 'five_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}, {x: 0, y: 4}] },
    { name: 'five_plus', blocks: [{x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}] },
    { name: 'five_T_up', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}] },
    { name: 'five_T_down', blocks: [{x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}] },
    { name: 'five_T_left', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 1}, {x: 2, y: 1}] },
    { name: 'five_T_right', blocks: [{x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 1, y: 1}, {x: 0, y: 1}] },
    { name: 'five_L_bl', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}] },
    { name: 'five_L_br', blocks: [{x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 0, y: 2}, {x: 1, y: 2}] },
    { name: 'five_L_tl', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}] },
    { name: 'five_L_tr', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}] },
    { name: 'five_U_up', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 2, y: 0}] },
    { name: 'five_U_down', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 2, y: 1}] },
    { name: 'five_U_left', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}] },
    { name: 'five_U_right', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x: 0, y: 2}] },
    
    // Six crates
    { name: 'six_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 4, y: 0}, {x: 5, y: 0}] },
    { name: 'six_v', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}, {x: 0, y: 4}, {x: 0, y: 5}] },
    { name: 'six_2x3_h', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}] },
    { name: 'six_3x2_v', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}] },
    { name: 'six_L_large_bl', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2}] },
    { name: 'six_L_large_br', blocks: [{x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 2}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}] },
    { name: 'six_L_large_tl', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}] },
    { name: 'six_L_large_tr', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 2}] },
    { name: 'six_C_up', blocks: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 1, y: 2}] },
    { name: 'six_C_down', blocks: [{x: 1, y: 0}, {x: 0, y: 1}, {x: 2, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}] },
    { name: 'six_C_left', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 1}] },
    { name: 'six_C_right', blocks: [{x: 1, y: 0}, {x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 1, y: 2}, {x: 0, y: 1}] },
    { name: 'six_T_large_up', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}] },
    { name: 'six_T_large_down', blocks: [{x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 3, y: 1}] },
    { name: 'six_Z_large', blocks: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 3, y: 2}] },
    { name: 'six_S_large', blocks: [{x: 2, y: 0}, {x: 3, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}] }
];

export const WALL_PATTERNS = [
    // Single walls
    { name: 'single_h', blocks: [{x: 0, y: 0, orientation: 'horizontal'}] },
    { name: 'single_v', blocks: [{x: 0, y: 0, orientation: 'vertical'}] },
    
    // Long horizontal walls (2-10 segments)
    { name: 'wall_h_2', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}] },
    { name: 'wall_h_3', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}] },
    { name: 'wall_h_4', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}] },
    { name: 'wall_h_5', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}] },
    { name: 'wall_h_6', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 5, y: 0, orientation: 'horizontal'}] },
    { name: 'wall_h_7', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 5, y: 0, orientation: 'horizontal'}, {x: 6, y: 0, orientation: 'horizontal'}] },
    { name: 'wall_h_8', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 5, y: 0, orientation: 'horizontal'}, {x: 6, y: 0, orientation: 'horizontal'}, {x: 7, y: 0, orientation: 'horizontal'}] },
    { name: 'wall_h_10', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 5, y: 0, orientation: 'horizontal'}, {x: 6, y: 0, orientation: 'horizontal'}, {x: 7, y: 0, orientation: 'horizontal'}, {x: 8, y: 0, orientation: 'horizontal'}, {x: 9, y: 0, orientation: 'horizontal'}] },
    
    // Long vertical walls (2-10 segments)
    { name: 'wall_v_2', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}] },
    { name: 'wall_v_3', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}] },
    { name: 'wall_v_4', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}] },
    { name: 'wall_v_5', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}] },
    { name: 'wall_v_6', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 0, y: 5, orientation: 'vertical'}] },
    { name: 'wall_v_7', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 0, y: 5, orientation: 'vertical'}, {x: 0, y: 6, orientation: 'vertical'}] },
    { name: 'wall_v_8', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 0, y: 5, orientation: 'vertical'}, {x: 0, y: 6, orientation: 'vertical'}, {x: 0, y: 7, orientation: 'vertical'}] },
    { name: 'wall_v_10', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 0, y: 5, orientation: 'vertical'}, {x: 0, y: 6, orientation: 'vertical'}, {x: 0, y: 7, orientation: 'vertical'}, {x: 0, y: 8, orientation: 'vertical'}, {x: 0, y: 9, orientation: 'vertical'}] },
    
    // Parallel walls (creating corridors)
    { name: 'corridor_h_3', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 0, y: 2, orientation: 'horizontal'}, {x: 1, y: 2, orientation: 'horizontal'}, {x: 2, y: 2, orientation: 'horizontal'}] },
    { name: 'corridor_v_3', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}, {x: 2, y: 2, orientation: 'vertical'}] },
    { name: 'corridor_h_5', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 0, y: 2, orientation: 'horizontal'}, {x: 1, y: 2, orientation: 'horizontal'}, {x: 2, y: 2, orientation: 'horizontal'}, {x: 3, y: 2, orientation: 'horizontal'}, {x: 4, y: 2, orientation: 'horizontal'}] },
    { name: 'corridor_v_5', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}, {x: 0, y: 4, orientation: 'vertical'}, {x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}, {x: 2, y: 2, orientation: 'vertical'}, {x: 2, y: 3, orientation: 'vertical'}, {x: 2, y: 4, orientation: 'vertical'}] },
    
    // L-shapes (no overlapping corners)
    { name: 'L_small_br', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}] },
    { name: 'L_small_bl', blocks: [{x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}] },
    { name: 'L_small_tr', blocks: [{x: 0, y: 1, orientation: 'horizontal'}, {x: 1, y: 1, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}] },
    { name: 'L_small_tl', blocks: [{x: 1, y: 1, orientation: 'horizontal'}, {x: 2, y: 1, orientation: 'horizontal'}, {x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}] },
    
    // Large L-shapes
    { name: 'L_large_br', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'vertical'}, {x: 4, y: 1, orientation: 'vertical'}, {x: 4, y: 2, orientation: 'vertical'}, {x: 4, y: 3, orientation: 'vertical'}] },
    { name: 'L_large_bl', blocks: [{x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 3, y: 0, orientation: 'horizontal'}, {x: 4, y: 0, orientation: 'horizontal'}, {x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 0, y: 3, orientation: 'vertical'}] },
    
    // Rooms (no overlapping corners)
    { name: 'room_small', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 0, y: 2, orientation: 'horizontal'}, {x: 1, y: 2, orientation: 'horizontal'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}] },
    { name: 'room_medium', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 0, y: 3, orientation: 'horizontal'}, {x: 1, y: 3, orientation: 'horizontal'}, {x: 2, y: 3, orientation: 'horizontal'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 3, y: 1, orientation: 'vertical'}, {x: 3, y: 2, orientation: 'vertical'}] },
    
    // T-shapes
    { name: 'T_up', blocks: [{x: 0, y: 0, orientation: 'horizontal'}, {x: 1, y: 0, orientation: 'horizontal'}, {x: 2, y: 0, orientation: 'horizontal'}, {x: 1, y: 1, orientation: 'vertical'}, {x: 1, y: 2, orientation: 'vertical'}] },
    { name: 'T_down', blocks: [{x: 1, y: 0, orientation: 'vertical'}, {x: 1, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'horizontal'}, {x: 1, y: 2, orientation: 'horizontal'}, {x: 2, y: 2, orientation: 'horizontal'}] },
    { name: 'T_left', blocks: [{x: 0, y: 0, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'vertical'}, {x: 0, y: 2, orientation: 'vertical'}, {x: 1, y: 1, orientation: 'horizontal'}, {x: 2, y: 1, orientation: 'horizontal'}] },
    { name: 'T_right', blocks: [{x: 2, y: 0, orientation: 'vertical'}, {x: 2, y: 1, orientation: 'vertical'}, {x: 2, y: 2, orientation: 'vertical'}, {x: 0, y: 1, orientation: 'horizontal'}, {x: 1, y: 1, orientation: 'horizontal'}] }
];