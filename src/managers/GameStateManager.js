export class GameStateManager {
    constructor(scene) {
        this.scene = scene;
        this.state = 'playing';
        this.scores = { player1: 0, player2: 0 };
        this.roundInProgress = true;
        
        // Cache DOM elements for performance
        this.domElements = {
            p1Score: null,
            p2Score: null,
            p1Stats: null,
            p2Stats: null
        };
        this.cacheDOMElements();
        
        // Store reference to players for stats updates
        this.players = [];
    }
    
    cacheDOMElements() {
        try {
            this.domElements.p1Score = document.getElementById('p1-score');
            this.domElements.p2Score = document.getElementById('p2-score');
            this.domElements.p1Stats = document.getElementById('p1-stats');
            this.domElements.p2Stats = document.getElementById('p2-stats');
        } catch (error) {
            console.warn('Failed to cache DOM elements:', error);
        }
    }
    
    setPlayers(players) {
        this.players = players;
        this.updateStatsUI();
    }
    
    updateStatsUI() {
        try {
            if (this.players && this.players.length >= 2) {
                // Update player 1 stats
                if (this.domElements.p1Stats && this.players[0]?.stats) {
                    this.domElements.p1Stats.innerHTML = this.formatPlayerStats(this.players[0].stats);
                }
                
                // Update player 2 stats
                if (this.domElements.p2Stats && this.players[1]?.stats) {
                    this.domElements.p2Stats.innerHTML = this.formatPlayerStats(this.players[1].stats);
                }
            }
        } catch (error) {
            console.error('Failed to update stats UI:', error);
        }
    }
    
    formatPlayerStats(stats) {
        if (!stats) return '';
        
        const statLines = [];
        const upgrades = stats.upgrades || [];
        
        // Show active upgrades
        if (upgrades.length > 0) {
            statLines.push('<div class="stat-upgrade">Upgrades:</div>');
            const upgradeCount = {};
            upgrades.forEach(upgrade => {
                upgradeCount[upgrade] = (upgradeCount[upgrade] || 0) + 1;
            });
            
            for (const [upgrade, count] of Object.entries(upgradeCount)) {
                const displayName = this.getUpgradeDisplayName(upgrade);
                if (count > 1) {
                    statLines.push(`<div class="stat-line">${displayName} x${count}</div>`);
                } else {
                    statLines.push(`<div class="stat-line">${displayName}</div>`);
                }
            }
        }
        
        // Always show stats (base values shown, modified values highlighted)
        const currentStats = stats.getStats ? stats.getStats() : stats;
        const baseStats = [];
        
        // Damage
        const dmgValue = currentStats.bulletDamage || 25;
        const dmgText = dmgValue !== 25 ? `<span class="stat-upgrade">DMG: ${dmgValue}</span>` : `DMG: ${dmgValue}`;
        baseStats.push(dmgText);
        
        // Speed  
        const spdValue = currentStats.moveSpeed || 400;
        const spdText = spdValue !== 400 ? `<span class="stat-upgrade">SPD: ${spdValue}</span>` : `SPD: ${spdValue}`;
        baseStats.push(spdText);
        
        // Rate of Fire
        const rofValue = currentStats.shootRate || 250;
        const rofPerSec = Math.round(1000/rofValue);
        const rofText = rofValue !== 250 ? `<span class="stat-upgrade">ROF: ${rofPerSec}/s</span>` : `ROF: ${rofPerSec}/s`;
        baseStats.push(rofText);
        
        // Magazine Size
        const magValue = currentStats.magazineSize || 3;
        const magText = magValue !== 3 ? `<span class="stat-upgrade">MAG: ${magValue}</span>` : `MAG: ${magValue}`;
        baseStats.push(magText);
        
        statLines.push('<div class="stat-line" style="margin-top: 5px;">' + baseStats.join(' | ') + '</div>');
        
        return statLines.join('');
    }
    
    getUpgradeDisplayName(upgradeId) {
        const names = {
            'rapid_fire': '🔫 Rapid Fire',
            'speed_boost': '⚡ Speed Boost',
            'damage_up': '💥 Damage Up',
            'extended_mag': '📦 Extended Mag',
            'piercing': '🎯 Piercing',
            'explosive': '💣 Explosive',
            'triple_shot': '🔱 Triple Shot',
            'vampiric': '🩸 Vampiric',
            'shield': '🛡️ Shield',
            'dash_master': '💨 Dash Master',
            'berserker': '😤 Berserker',
            'reflect': '🪞 Reflect',
            'rebound': '🔄 Ricochet',
            'homing': '🎯 Homing'
        };
        return names[upgradeId] || upgradeId;
    }
    
    setState(newState) {
        const validStates = ['playing', 'paused', 'round_end', 'game_over'];
        if (!validStates.includes(newState)) {
            console.error(`Invalid state: ${newState}`);
            return;
        }
        
        this.state = newState;
        this.onStateChange(newState);
    }
    
    onStateChange(state) {
        switch (state) {
            case 'playing':
                this.roundInProgress = true;
                break;
            case 'round_end':
                this.roundInProgress = false;
                break;
            case 'game_over':
                this.roundInProgress = false;
                break;
        }
    }
    
    addScore(playerNumber) {
        if (playerNumber !== 1 && playerNumber !== 2) {
            console.error(`Invalid player number: ${playerNumber}`);
            return;
        }
        
        this.scores[`player${playerNumber}`]++;
        this.updateScoreUI();
        this.updateStatsUI();
    }
    
    updateScoreUI() {
        try {
            // Use cached DOM elements for better performance
            if (this.domElements.p1Score) {
                this.domElements.p1Score.textContent = `P1: ${this.scores.player1}`;
            }
            if (this.domElements.p2Score) {
                this.domElements.p2Score.textContent = `P2: ${this.scores.player2}`;
            }
        } catch (error) {
            console.error('Failed to update score UI:', error);
            // Try to re-cache if elements were lost
            this.cacheDOMElements();
        }
    }
    
    getScores() {
        return { ...this.scores };
    }
    
    resetScores() {
        this.scores = { player1: 0, player2: 0 };
        this.updateScoreUI();
        this.updateStatsUI();
    }
    
    isRoundInProgress() {
        return this.roundInProgress;
    }
    
    startNewRound() {
        this.setState('playing');
    }
    
    endRound() {
        this.setState('round_end');
    }
    
    destroy() {
        // Clear DOM element references
        this.domElements = null;
        this.scene = null;
    }
}