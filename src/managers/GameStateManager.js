export class GameStateManager {
    constructor(scene) {
        this.scene = scene;
        this.state = 'playing';
        this.scores = { player1: 0, player2: 0 };
        this.roundInProgress = true;
        
        // Cache DOM elements for performance
        this.domElements = {
            p1Score: null,
            p2Score: null
        };
        this.cacheDOMElements();
    }
    
    cacheDOMElements() {
        try {
            this.domElements.p1Score = document.getElementById('p1-score');
            this.domElements.p2Score = document.getElementById('p2-score');
        } catch (error) {
            console.warn('Failed to cache DOM elements:', error);
        }
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