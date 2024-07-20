export const Suits = {
    SPADES: '♠',
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
    NO_TRUMP: '无主'
};

export class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    // 返回卡片的字符串表示
    toString() {
        return `${this.suit || ''}${this.rank}`;
    }
}

export class Deck {
    constructor() {
        this.suits = [Suits.SPADES, Suits.HEARTS, Suits.DIAMONDS, Suits.CLUBS];
        this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.cards = [];

        // 初始化一副扑克牌
        this.initDeck();
    }

    // 初始化一副扑克牌
    initDeck() {
        this.cards = [];
        for (const suit of this.suits) {
            for (const rank of this.ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    // 洗牌
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    // 发一张牌
    dealOneCard() {
        return this.cards.pop();
    }

    // 返回剩余牌数
    remainingCards() {
        return this.cards.length;
    }
}