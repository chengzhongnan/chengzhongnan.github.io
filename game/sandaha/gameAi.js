export class BiddingAi {

    constructor(handCards) {
        this.handCards = handCards;
    }

    promptBidRobot(currentScore) {
        const mainCardCount = this.countMainCards();
        const pairCount = this.countPairs();
        const highCardCount = this.countHighCards();
        const goodSuitCount = this.countGoodSuit();

        let conditionsMet = 0;

        if (mainCardCount > 6) conditionsMet++;
        if (mainCardCount < 3) conditionsMet--;
        if (pairCount > 5) conditionsMet++;
        if (highCardCount > 6) conditionsMet++;
        if (goodSuitCount > 8) conditionsMet++;

        const bidValues = [];
        for (let i = 5; i < currentScore; i += 5) {
            bidValues.push(i);
        }

        let bidScore;
        
        if (conditionsMet >= 3) {
            const randomScores = [5, 10, 15, 20];
            const randomIndex = Math.floor(Math.random() * randomScores.length);
            bidScore = randomScores[randomIndex];
        } else if (conditionsMet === 2) {
            const randomScores = [35, 40, 45, 50];
            const randomIndex = Math.floor(Math.random() * randomScores.length);
            bidScore = randomScores[randomIndex];
            if (Math.random() > 0.8) bidScore = 60; // 50% chance to bid 50 instead of 30
        } else if (conditionsMet === 1) {
            const randomScores = [55, 60, 65];
            const randomIndex = Math.floor(Math.random() * randomScores.length);
            bidScore = randomScores[randomIndex];
            if (Math.random() > 0.8) bidScore = 80; // 50% chance to bid 80 instead of 50
        } else {
            const randomScores = [70, 75, 80];
            const randomIndex = Math.floor(Math.random() * randomScores.length);
            bidScore = randomScores[randomIndex];
        }

        // Ensure bidScore is within valid range and adjust it if necessary
        if (bidScore >= currentScore) {
            return 'pass';
        }

        const validBids = bidValues.filter(score => score <= bidScore);
        let finalBid = validBids.length ? Math.max(...validBids) : 'pass';

        if (!finalBid) {
            finalBid = bidValues[bidValues.length - 1];
        }

        // Random chance to pass based on certain conditions
        if ((conditionsMet === 1 && Math.random() > 0.8) || (conditionsMet === 2 && Math.random() > 0.8)) {
            return 'pass';
        }

        return finalBid || 'pass';
    }

    countMainCards() {
        return this.handCards.filter(card => card.isTrumpSuit()).length;
    }

    countPairs() {
        const rankCount = {};
        this.handCards.forEach(card => {
            rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
        });
        return Object.values(rankCount).filter(count => count >= 2).length;
    }

    countHighCards() {
        return this.handCards.filter(card => card.rank === 'A' || card.rank === 'K').length;
    }

    countGoodSuit() {
        const suitCount = {};
        this.handCards.forEach(card => {
            if (!card.isTrumpSuit()) {
                suitCount[card.suit] = (suitCount[card.suit] || 0) + 1;
            }
        });
        return Math.max(...Object.values(suitCount));
    }
}