export class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.sounds = {
            shoot: ['shoot1', 'shoot2', 'shoot3', 'shoot4'],
            hit: ['hit1', 'hit2', 'hit3', 'hit4'],
            damage: ['damage1', 'damage2', 'damage3'],
            dash: ['dash1', 'dash2', 'dash3']
        };
        
        this.volume = {
            master: 0.5,
            sfx: 0.7
        };
    }
    
    preload() {
        // Load all sound variations
        this.scene.load.audio('shoot1', '/sounds/Shoot 1.m4a');
        this.scene.load.audio('shoot2', '/sounds/Shoot 2.m4a');
        this.scene.load.audio('shoot3', '/sounds/Shoot 3.m4a');
        this.scene.load.audio('shoot4', '/sounds/Shoot 4.m4a');
        
        this.scene.load.audio('hit1', '/sounds/Hit 1.m4a');
        this.scene.load.audio('hit2', '/sounds/Hit 2.m4a');
        this.scene.load.audio('hit3', '/sounds/Hit 3.m4a');
        this.scene.load.audio('hit4', '/sounds/Hit 4.m4a');
        
        this.scene.load.audio('damage1', '/sounds/Damage 1.m4a');
        this.scene.load.audio('damage2', '/sounds/Damage 2.m4a');
        this.scene.load.audio('damage3', '/sounds/Damage 3.m4a');
        
        this.scene.load.audio('dash1', '/sounds/Dash 1.m4a');
        this.scene.load.audio('dash2', '/sounds/Dash 2.m4a');
        this.scene.load.audio('dash3', '/sounds/Dash 3.m4a');
    }
    
    playRandomSound(category, volume = 1.0) {
        if (!this.sounds[category]) {
            console.warn(`Sound category ${category} not found`);
            return;
        }
        
        const soundList = this.sounds[category];
        const randomIndex = Math.floor(Math.random() * soundList.length);
        const soundKey = soundList[randomIndex];
        
        try {
            this.scene.sound.play(soundKey, {
                volume: this.volume.master * this.volume.sfx * volume
            });
        } catch (error) {
            console.warn(`Failed to play sound ${soundKey}:`, error);
        }
    }
    
    playShoot() {
        this.playRandomSound('shoot', 0.6);
    }
    
    playHit() {
        this.playRandomSound('hit', 0.8);
    }
    
    playDamage() {
        this.playRandomSound('damage', 0.9);
    }
    
    playDash() {
        this.playRandomSound('dash', 0.7);
    }
    
    setMasterVolume(volume) {
        this.volume.master = Math.max(0, Math.min(1, volume));
    }
    
    setSFXVolume(volume) {
        this.volume.sfx = Math.max(0, Math.min(1, volume));
    }
}