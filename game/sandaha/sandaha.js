import {Card, Deck, Suits} from './poker.js'

export class SanDaHaCard extends Card {
    constructor(suit, rank, trumpSuit, order) {
        super(suit, rank);
        this.trumpSuit = trumpSuit;
        this.order = order;
        this.pointValue = this.determinePointValue();
    }

    determinePointValue() {
        if (this.rank === '5') return 5;
        if (this.rank === '10' || this.rank === 'K') return 10;
        return 0;
    }

    /**
     * 排序的时候比较，将同一花色的牌整理到一起
     * @param {SanDaHaCard} otherCard 
     */
    sortCompareWith(otherCard) {
        // 先比较主牌或副牌，主牌比副牌大
        if (this.isTrumpSuit() !== otherCard.isTrumpSuit()) {
            return this.isTrumpSuit() ? 1 : -1
        }

        // 都是主牌，或者都是副牌，并且是同一花色牌，那么比较order
        if ((this.isTrumpSuit() && otherCard.isTrumpSuit()) || (this.suit === otherCard.suit)) {
            return this.order >= otherCard.order ? 1 : -1
        }

        // 都是副牌，并且不是同一花色
        if (this.suit !== otherCard.suit) {
            return this.suit >= otherCard.suit ? 1: -1
        }

        throw Error('Invalid card comparison');
    }

    compareWith(otherCard) {
        // 先比较主牌或副牌，主牌比副牌大
        if (this.isTrumpSuit() !== otherCard.isTrumpSuit()) {
            return this.isTrumpSuit() ? 1 : -1
        }

        // 如果都是主牌或者是同一花色牌，那么比较order
        if ((this.isTrumpSuit() && otherCard.isTrumpSuit()) || (this.suit === otherCard.suit)) {
            return this.order >= otherCard.order ? 1 : -1
        }

        // 都是副牌，并且花色不同，那么先出的一方为大
        return 1;
    }

    setTrumpSuit(trumpSuit) {
        this.trumpSuit = trumpSuit;
    }

    isTrumpSuit() {
        if (['王', '7', '2'].includes(this.rank)) 
            return true

        return this.suit === this.trumpSuit;
    }

    isPairWith(otherCard) {
        return (
            this.order === otherCard.order &&
            this.rank === otherCard.rank &&
            this.suit === otherCard.suit
        );
    }

    toString() {
        return `${this.suit || ''}${this.rank}{${this.order}}`;
    }
}

export class SanDaHaDeck extends Deck {
    constructor(trumpSuit = Suits.NO_TRUMP) {
        super();
        this.trumpSuit = trumpSuit;

        // 去掉3和4
        this.ranks = ['2', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

        // 初始化三打哈的扑克牌
        this.initSanDaHaDeck();
    }

    // 初始化三打哈的扑克牌
    initSanDaHaDeck() {
        this.cards = [];

        // 两副牌
        for (let i = 0; i < 2; i++) {
            for (const suit of this.suits) {
                for (const rank of this.ranks) {
                    this.cards.push(new SanDaHaCard(suit, rank, this.trumpSuit, 0));
                }
            }
            // 大小王直接赋予order值
            this.cards.push(new SanDaHaCard(null, '王', Suits.NO_TRUMP, 21)); // 大王
            this.cards.push(new SanDaHaCard(null, '王', Suits.NO_TRUMP, 20)); // 小王
        }
    }

    // 设置主牌花色
    setTrumpSuit(trumpSuit) {
        this.trumpSuit = trumpSuit;
        for (const card of this.cards) {
            const order = this.determineOrder(card.suit, card.rank);
            if (order !== undefined) {
                card.order = order;
            }
        }
    }

    // 确定卡片的排序值（order）
    determineOrder(suit, rank) {
        const rankOrder = ['5', '6', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const isTrumpSuit = suit === this.trumpSuit;
        const isLordRank = ['王'].includes(rank);
        if (isLordRank) return undefined;

        if (this.trumpSuit === Suits.NO_TRUMP) {
            if (rank === '7') return 19;
            if (rank === '2') return 18;
            return 15 - (rankOrder.indexOf('A') - rankOrder.indexOf(rank));
        } else {
            if (isTrumpSuit && rank === '7') return 19;
            if (!isTrumpSuit && rank === '7') return 18;
            if (isTrumpSuit && rank === '2') return 17;
            if (!isTrumpSuit && rank === '2') return 16;
            return 15 - (rankOrder.indexOf('A') - rankOrder.indexOf(rank));
        }
    }

    static comparePairs(pair1, pair2) {
        if (isPairs(pair1)) {
            // 比较对子
            if (isPairs(pair2)) return pair1[0].compareWith(pair2[0]);

            // pair1是对子，pair2不是对子，pair1大
            return 1;         
        } else {
            // pair1不是对子
            for (let i = 0; i < pair1.length; i++) {
                for (let j = 0; j < pair2.length; j++) {
                    if (pair1[i].compareWith(pair2[j]) !== 0) 
                        return -1; // pair1中有牌比pair2中的牌小，pair1小
                }
            }
            return 1;
        }
    }

    // 判断两张牌是否为对子
    isPairs(cards) {
        return cards.length === 2 && cards[0].isPairWith(cards[1]);
    }

    // 判断是否为拖拉机
    isTractor(cards) {
        if (cards.length % 2 !== 0) {
            return false; // 必须是偶数张牌
        }

        // 检查是否全部是对子
        for (let i = 0; i < cards.length; i += 2) {
            if (!cards[i].isPairWith(cards[i + 1])) {
                return false;
            }
        }

        // 检查是否全部为主牌或副牌
        const isTrump = this.trumpSuit !== null;
        const firstSuit = cards[0].suit;
        for (let card of cards) {
            if ((isTrump && card.suit !== this.trumpSuit) || (!isTrump && card.suit !== firstSuit)) {
                return false;
            }
        }

        // 检查副牌是否为同一种花色
        if (!isTrump) {
            const nonTrumpSuit = firstSuit;
            for (let card of cards) {
                if (card.suit !== nonTrumpSuit) {
                    return false;
                }
            }
        }

        // 检查对子的每单张牌面值的order构成公差为1的等差数列
        const firstOrder = cards[0].order;
        for (let i = 0; i < cards.length; i += 2) {
            if (cards[i].order !== firstOrder - (i / 2 >> 0)) {
                return false;
            }
        }

        return true;
    }
}