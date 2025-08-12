/**
 * Utility functions for visual effects and graphics
 */
export class VisualUtils {
    /**
     * Convert HSV to RGB color
     */
    static hsvToRgb(h, s, v) {
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        
        let r, g, b;
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    /**
     * Draw a star shape on a graphics object
     */
    static drawStar(graphics, x, y, points, innerRadius, outerRadius) {
        const step = Math.PI / points;
        
        graphics.beginPath();
        graphics.moveTo(x + Math.cos(-Math.PI / 2) * outerRadius, y + Math.sin(-Math.PI / 2) * outerRadius);
        
        for (let i = 0; i < points; i++) {
            const angle = -Math.PI / 2 + i * step * 2;
            
            // Outer point
            graphics.lineTo(
                x + Math.cos(angle) * outerRadius,
                y + Math.sin(angle) * outerRadius
            );
            
            // Inner point
            graphics.lineTo(
                x + Math.cos(angle + step) * innerRadius,
                y + Math.sin(angle + step) * innerRadius
            );
        }
        
        graphics.closePath();
        graphics.fillPath();
    }
    
    /**
     * Create victory animation
     */
    static createVictoryAnimation(scene, winner, centerX, centerY) {
        const victoryText = scene.add.text(centerX, centerY - 100, `Player ${winner} Wins!`, {
            fontSize: '64px',
            fontWeight: 'bold',
            color: winner === 1 ? '#00ff00' : '#0099ff',
            stroke: '#000000',
            strokeThickness: 8
        });
        victoryText.setOrigin(0.5);
        victoryText.setDepth(1000);
        
        // Pulsing animation
        scene.tweens.add({
            targets: victoryText,
            scale: 1.2,
            duration: 500,
            yoyo: true,
            repeat: 2,
            ease: 'Power2'
        });
        
        // Star burst
        const stars = [];
        const starColors = [0xffff00, 0xffffff, 0x00ffff, 0xff00ff, 0x00ff00];
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const star = scene.add.graphics();
            const color = Phaser.Math.RND.pick(starColors);
            star.fillStyle(color, 1);
            VisualUtils.drawStar(star, 0, 0, 5, 10, 20);
            star.setPosition(centerX, centerY);
            star.setDepth(999);
            stars.push(star);
            
            scene.tweens.add({
                targets: star,
                x: centerX + Math.cos(angle) * 300,
                y: centerY + Math.sin(angle) * 300,
                scale: 0,
                alpha: 0,
                duration: 1500,
                ease: 'Power2'
            });
        }
        
        return { victoryText, stars };
    }
}