import { GameConfig } from '../config/GameConfig';

export class InputManager {
    static getMovementInput(gamepad) {
        if (!gamepad || !gamepad.connected) return { x: 0, y: 0 };
        
        try {
            const deadzone = GameConfig.player.gamepad.moveDeadzone;
            let moveX = gamepad.axes[0] || 0;
            let moveY = gamepad.axes[1] || 0;
            
            // Apply deadzone
            if (Math.abs(moveX) < deadzone) moveX = 0;
            if (Math.abs(moveY) < deadzone) moveY = 0;
            
            return { x: moveX, y: moveY };
        } catch (error) {
            return { x: 0, y: 0 };
        }
    }
    
    static getAimInput(gamepad) {
        if (!gamepad || !gamepad.connected) return { x: 0, y: 0 };
        
        try {
            const deadzone = GameConfig.player.gamepad.aimDeadzone;
            let aimX = gamepad.axes[2] || 0;
            let aimY = gamepad.axes[3] || 0;
            
            // Apply deadzone
            if (Math.abs(aimX) < deadzone) aimX = 0;
            if (Math.abs(aimY) < deadzone) aimY = 0;
            
            return { x: aimX, y: aimY };
        } catch (error) {
            return { x: 0, y: 0 };
        }
    }
    
    static isButtonPressed(gamepad, buttonIndex) {
        if (!gamepad || !gamepad.connected || !gamepad.buttons) return false;
        
        try {
            const button = gamepad.buttons[buttonIndex];
            return button && button.pressed;
        } catch (error) {
            return false;
        }
    }
    
    static getTriggerValue(gamepad, triggerName) {
        if (!gamepad || !gamepad.connected) return 0;
        
        try {
            switch (triggerName) {
                case 'RT':
                case 'R2':
                    return gamepad.R2 || 0;
                case 'LT':
                case 'L2':
                    return gamepad.L2 || 0;
                default:
                    return 0;
            }
        } catch (error) {
            return 0;
        }
    }
    
    static isTriggerPressed(gamepad, triggerName, threshold = 0.5) {
        return this.getTriggerValue(gamepad, triggerName) > threshold || 
               (triggerName === 'RT' && this.isButtonPressed(gamepad, 7)) ||
               (triggerName === 'LT' && this.isButtonPressed(gamepad, 6));
    }
}