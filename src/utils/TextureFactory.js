export class TextureFactory {
    static textureCache = new Set();
    
    static createRectangleTexture(scene, key, width, height, color) {
        if (!scene || !key || !width || !height) {
            throw new Error('Invalid parameters for createRectangleTexture');
        }
        
        if (this.textureCache.has(key)) {
            return key;
        }
        
        try {
            const graphics = scene.add.graphics();
            graphics.fillStyle(color, 1);
            graphics.fillRect(0, 0, width, height);
            graphics.generateTexture(key, width, height);
            graphics.destroy();
            
            this.textureCache.add(key);
            return key;
        } catch (error) {
            console.error(`Failed to create texture ${key}:`, error);
            return null;
        }
    }
    
    static createCircleTexture(scene, key, radius, color) {
        if (!scene || !key || !radius) {
            throw new Error('Invalid parameters for createCircleTexture');
        }
        
        if (this.textureCache.has(key)) {
            return key;
        }
        
        try {
            const graphics = scene.add.graphics();
            graphics.fillStyle(color, 1);
            graphics.fillCircle(radius, radius, radius);
            graphics.generateTexture(key, radius * 2, radius * 2);
            graphics.destroy();
            
            this.textureCache.add(key);
            return key;
        } catch (error) {
            console.error(`Failed to create texture ${key}:`, error);
            return null;
        }
    }
    
    static clearCache() {
        this.textureCache.clear();
    }
}