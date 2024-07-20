
import { SanDaHaDeck } from './sandaha.js';
import { Player } from './player.js';
import characters from './playernames.js';
import { Suits } from './poker.js';

class Game {
    constructor() {
        this.deck = new SanDaHaDeck();
        this.players = [];
        this.trumpSuit = null; // 主牌花色
        this.dealerIndex = 0; // 庄家索引
        this.biddingScores = [80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5];
    }

    // 创建一副牌并洗牌
    createAndShuffleDeck() {
        this.deck.initializeDeck();
        this.deck.shuffle();
    }

    /**
     * 创建四个玩家，随机一个设定为用户
     * @returns {Player}
     */
    createPlayers() {
        const names = Game.getRandomUniqueValues(characters, 4);
        for (let i = 1; i <= 4; i++) {
            const player = new Player(names[i-1], i);
            this.players.push(player);
        }

        // 随机设定一个玩家为用户
        const randomIndex = Math.floor(Math.random() * 4);
        this.players[randomIndex].setUser(true);
        console.log(`你获得的角色是 ${this.players[randomIndex].name}，你的拿牌顺序是 ${randomIndex}`);
        return this.players[randomIndex];
    }

    /**
     * @template T
     * @param {T []} array 
     * @param {Number} n 
     * @returns {T []}
     */
    static getRandomUniqueValues(array, n) {
        if (n > array.length) {
            throw new Error("N cannot be greater than the length of the array");
        }
    
        const result = [];
        const usedIndices = new Set();
    
        while (result.length < n) {
            const randomIndex = Math.floor(Math.random() * array.length);
            if (!usedIndices.has(randomIndex)) {
                result.push(array[randomIndex]);
                usedIndices.add(randomIndex);
            }
        }
    
        return result;
    }

    /**
     * 洗牌
     */
    shuffle() {
        this.deck.shuffle();
    }

    /**
     * 发牌，每人发21张牌，留8张牌作为底牌
     */
    dealCards() {
        for (let i = 0; i < 21; i++) {
            for (let j = 0; j < 4; j++) {
                const card = this.deck.cards.pop();
                this.players[j].receiveCards([card]);
            }
        }

        // 留8张牌作为底牌
        const bottomCards = this.deck.cards;
        return bottomCards;
    }

        /**
         * 发好牌的函数
         * @param {number} p - 概率（0到1之间的值）
         */
        dealGoodCards(p) {
            const remainingCards = [...this.deck.cards];
    
            // 发牌
            for (let i = 0; i < 21; i++) {
                for (let j = 0; j < 4; j++) {
                    if (i > 0 && Math.random() < p) {
                        // 前面牌的对子
                        const randomIndex = Math.floor(Math.random() * this.players[j].hand.length);
                        const previousCard =  this.players[j].hand[randomIndex];
                        const pairCardIndex = remainingCards.findIndex(
                            card => card.isPairWith(previousCard)
                        );
                        if (pairCardIndex > -1) {
                            this.players[j].receiveCards(remainingCards.splice(pairCardIndex, 1)[0]);
                        } else {
                            this.players[j].receiveCards(remainingCards.pop());
                        }
                    } else {
                        // 随机发牌
                        this.players[j].receiveCards(remainingCards.pop());
                    }
                }
            }
    
            // 留8张牌作为底牌
            this.deck.cards = remainingCards;
            
            return this.deck.cards;
        }

    setTrumpSuit(suit) {
        this.trumpSuit = suit;
        this.deck.setTrumpSuit(suit);

        for (let p of this.players) {
            p.setTrumpSuit(suit);
        }
    }

     // 开始叫分
    async startBidding() {
        let currentPlayerIndex = 0;
        let currentScore = 85;
        let playersStatus = [];
        let calledScores = [];

        for (let i = 0 ; i < 4; i++) {
            playersStatus[i] = true;
        }

        while (true) {
            let player = this.players[currentPlayerIndex];
            if (playersStatus[currentPlayerIndex]) {
                // Prompt player to call score or pass
                const bid = await this.promptBid(player, currentScore);
                console.log(`玩家【${player.name}】叫分了 ${bid}`);

                if (bid === 'pass') {
                    playersStatus[currentPlayerIndex] = false;
                } else if (bid === 5) {
                    // Call score 5, end bidding immediately
                    this.endBidding(player);
                    return;
                } else if (this.biddingScores.includes(bid) && bid < currentScore) {
                    // Valid bid
                    calledScores[player] = bid;
                    currentScore = bid;
                    currentPlayerIndex = (currentPlayerIndex + 1) % 4;
                    if (Object.keys(calledScores).length >= 1 && playersStatus.filter(status => status).length === 1) {
                        // Only one player is left to call
                        this.endBidding(this.players.find((_, i) => playersStatus[i]));
                        return;
                    }
                } else {
                    console.log('Invalid bid or not allowed to bid');
                }
            } else {
                currentPlayerIndex = (currentPlayerIndex + 1) % 4;
            }

            // Check if 3 players have passed
            if (playersStatus.filter(status => !status).length >= 3) {
                this.endBidding(this.players.find((_, i) => playersStatus[i]));
                return;
            }
        }
    }

    // 提示玩家叫分
    async promptBid(player, currentScore) {
        // Simulate player's action (In real scenarios, you would get this from user input)
        // Here we just return a simulated bid for demonstration purposes
        return await player.promptBid(currentScore);
    }

    // 结束叫分
    endBidding(winner) {
        console.log(`叫分结束，玩家【${winner.name}】是庄家，获得了底牌.`);
        this.dealer = winner;
        this.teams = this.players.filter(player => player !== winner);
        console.log(`庄家: ${this.dealer.name}`);
        console.log(`闲家: ${this.teams.map(p => p.name).join(', ')}`);

        // 玩家获得剩余8张底牌
        winner.receiveCards(this.deck.cards);

        // 展示玩家手牌
        winner.showHand();
    }

    // 确定主牌花色和底牌
    determineTrumpAndBottom() {
        const dealer = this.players[this.dealerIndex];
        this.trumpSuit = dealer.chooseTrumpSuit();
        console.log(`${dealer.name} chooses ${this.trumpSuit} as trump suit.`);

        // 庄家拿底牌
        dealer.receiveBottomCards(this.deck.cards);
    }

    // 游戏主流程
    startGame() {
        this.createAndShuffleDeck();
        this.createPlayers();
        this.dealCards();
        this.bidding();
        this.determineTrumpAndBottom();

        // TODO: 实现出牌、结算等后续流程
    }

    // 找到第一个必须叫分的玩家
    findFirstBidder() {
        for (let i = 0; i < 4; i++) {
            if (this.players[i].isUser) {
                return i;
            }
        }
        return 0; // 默认从第一个玩家开始叫分
    }
}


let game = new Game();
let player = game.createPlayers();
// 洗牌
game.shuffle();
// 默认设置无主
game.setTrumpSuit(Suits.NO_TRUMP);
// 发牌
const bottomCards = game.dealGoodCards(0.7);

// for (let p of game.players) {
//     p.showHand();
// }
player.showHand();

console.log('底牌：' + bottomCards.map(card => card.toString()).join(' '));

await game.startBidding();