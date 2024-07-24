import { Suits } from "./poker.js";

class AIBase {
    countMainCards() {
        return this.handCards.filter(card => card.isTrumpSuit()).length;
    }

    countPairs() {
        const rankCount = {};
        this.handCards.forEach(card => {
            rankCount[card.rank + card.suit * 100] = (rankCount[card.rank + card.suit * 100] || 0) + 1;
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

    countCardsBySuit() {
        const suitCounts = {};
        suitCounts[Suits.CLUBS] = 0;
        suitCounts[Suits.DIAMONDS] = 0;
        suitCounts[Suits.HEARTS] = 0;
        suitCounts[Suits.SPADES] = 0;

        const suitValuesCount = {};
        suitValuesCount[Suits.CLUBS] = [];
        suitValuesCount[Suits.DIAMONDS] = [];
        suitValuesCount[Suits.HEARTS] = [];
        suitValuesCount[Suits.SPADES] = [];

        let totalCards = 0;

        this.handCards.forEach(card => {
            if (!card.isTrumpSuit()) {
                suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
                suitValuesCount[card.suit][card.rank] = 1;
                totalCards += 1;
            }
        });

        function countRealLength(arr) {
            let count = 0;
            for (let key in arr) count++;
            return count;
        }

        function countPair(suit) {
            return  suitCounts[suit] - countRealLength(suitValuesCount[suit]);
        }

        const pairCounts = {};
        pairCounts[Suits.CLUBS] = countPair(Suits.CLUBS);
        pairCounts[Suits.DIAMONDS] = countPair(Suits.DIAMONDS);
        pairCounts[Suits.HEARTS] = countPair(Suits.HEARTS);
        pairCounts[Suits.SPADES] = countPair(Suits.SPADES);

        return {
            suitCounts,
            pairCounts,
            totalCards
        };
    }
}

export class DispatchCardAi extends AIBase {
    constructor(handCards) {
        super();
    }
}

export class BiddingAi extends AIBase {

    constructor(handCards) {
        super();
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
}

export class ChooseTrumpSuitAi extends AIBase{
    constructor(handCards) {
        super();
        this.handCards = handCards;
    }

    chooseTrumpSuit() {
        // 如果手牌中某一门副牌数量超过总数的一半，那么直接选择为主牌
        // 选择手牌中对子最多的一门，必须比其他任何一门对子都多，则选择为主牌
        // 如果某两门手牌中对子最多并且相同，那么比较这两门手牌中总数最多的一门为主牌
        // 选择手牌中最长的一门为主牌

        const { suitCounts, pairCounts, totalCards } = this.countCardsBySuit();

        // 1. 如果手牌中某一门副牌数量超过总数的一半，那么直接选择为主牌
        for (let suit in suitCounts) {
            if (suitCounts[suit] >= totalCards / 2) {
                return suit;
            }
        }

        // 2. 选择手牌中对子最多的一门，必须比其他任何一门对子都多，则选择为主牌
        let maxPairs = 0;
        let maxPairSuit = null;
        let maxPairSuits = [];

        for (let suit in pairCounts) {
            if (pairCounts[suit] > maxPairs) {
                maxPairs = pairCounts[suit];
                maxPairSuit = suit;
                maxPairSuits = [suit];
            } else if (pairCounts[suit] === maxPairs && pairCounts[suit] !== 0) {
                maxPairSuits.push(suit);
            }
        }

        if (maxPairSuits.length === 1) {
            return maxPairSuit;
        }

        // 3. 如果某两门手牌中对子最多并且相同，并且都大于2对，那么比较这两门手牌中总数最多的一门为主牌
        if (maxPairSuits.length > 1) {
            if (suitCounts[maxPairSuits[0]] >= 2) {
                if (suitCounts[maxPairSuits[0]] > suitCounts[maxPairSuits[1]]) {
                    return maxPairSuits[0];
                } else if (suitCounts[maxPairSuits[0]] < suitCounts[maxPairSuits[1]]){
                    return maxPairSuits[1];
                }
            }
        }

        // 4. 选择手牌中最长的一门为主牌
        let maxSuitCount = 0;
        let maxSuit = null;

        for (let suit in suitCounts) {
            if (suitCounts[suit] > maxSuitCount) {
                maxSuitCount = suitCounts[suit];
                maxSuit = suit;
            }
        }

        return maxSuit;
    }
}

export class PlayGameAi {
    constructor() {}

    
    getCards(handCards, currentCards, is) {
    }
}