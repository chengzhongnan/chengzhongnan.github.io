import readline from 'readline';
import { BiddingAi, ChooseTrumpSuitAi } from './gameAi.js';
import { Suits } from './poker.js';
import { SanDaHaCard } from './sandaha.js';
import { getRandomIntegers } from './units.js'

export class Player {
    constructor(name, index, game) {
        this.name = name;
        this.hand = [];
        this.trumpSuit = null;
        this.friends = [];
        this.index = index;
        this.isUser = false;
        this.game = game;
    }

    // 接收发牌
    receiveCards(cards) {
        if (Array.isArray(cards)) {
            this.hand.push(...cards);
        } else {
            this.hand.push(cards);
        }
        
        this.sortHand(); // 接收牌后排序手牌
    }

    // 选择主牌花色
    async chooseTrumpSuit() {
        if (this.isUser) {
            return await this.chooseTrumpSuitUser(); 
        } else {
            return this.chooseTrumpSuitRobot();
        }
    }

    async chooseTrumpSuitUser() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (text) => {
            return new Promise((resolve) => {
                rl.question(text, resolve);
            });
        };

        const suitValues = [1, 2, 3, 4, 5];

        const suitEnums = [Suits.SPADES, Suits.HEARTS, Suits.DIAMONDS, Suits.CLUBS, Suits.NO_TRUMP]
        let userSuit = 0;
        while (true) {
            if (Player.isDebugMode()) {
                userSuit = 1;
            } else {
                userSuit = await question('请输入你选择的花色序号: [1]♠ [2]♥ [3]♦ [4]♣ [5]无\n');
            }

            userSuit = parseInt(userSuit, 10);
            if (suitValues.includes(userSuit)) {
                rl.close();
                return suitEnums[userSuit - 1];
            }

            console.log('无效分数，请重新输入：');
        }
    }

    chooseTrumpSuitRobot() {
        let ai = new ChooseTrumpSuitAi(this.hand);
        return ai.chooseTrumpSuit();
    }

    onChangeTrumpSuit(suit) {
        this.trumpSuit = suit;
        console.log(`当前选择花色${suit}`);
    }

    addFriend(player) {
        this.friends.push(player);
    }

    setTrumpSuit(suit) {
        this.trumpSuit = suit;
    }

    setUser(isUser) {
        this.isUser = isUser;
    }

    // 出牌
    playCard(cardList, onPlayCardCallback) {

        // 检测打出的牌是否合法


        // 从手牌中删除要打出的牌
        for (let card of cardList) {
            let index = this.hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
            this.hand.splice(index, 1);
        }

        onPlayCardCallback(this.name, cardList);
    }

    // 排序手牌
    sortHand() {
        this.hand.sort((a, b) => {
            return a.sortCompareWith(b);
        });
    }

    // 显示手牌
    showHand() {
        console.log(`玩家 ${this.name} 的手牌:`);
        this.sortHand();

        let lineShow = 7;

        // 显示手牌，每行显示7张牌
        for (let i = 0; i < this.hand.length; i += lineShow) {
            let line = this.hand.slice(i, i + lineShow).map(card => card.toString()).join(' ')
            console.log(line)
        }
    }

    async promptBid(currentScore) {
        if (this.isUser) {
            return await this.promptBidUser(currentScore); 
        } else {
            return this.promptBidRobot(currentScore);
        }
    }

    static isDebugMode() {
        return true;
    }

    async promptBidUser(currentScore) {
        const bidValues = [];
        for (let i = 5; i < currentScore; i += 5) {
            bidValues.push(i);
        }
        bidValues.push('pass'); // Adding the option to pass

        console.log(`当前叫分: ${currentScore}`);
        console.log(`可以选择叫分: ${bidValues.join(', ')}`);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (text) => {
            return new Promise((resolve) => {
                rl.question(text, resolve);
            });
        };

        let userBid;
        while (true) {
            if (Player.isDebugMode()) {
                userBid = 'pass';
            } else {
                userBid = await question('请输入你选择的分数: ');
            }
            
            if (userBid === 'pass') {
                rl.close();
                return 'pass';
            }

            userBid = parseInt(userBid, 10);
            if (bidValues.includes(userBid)) {
                rl.close();
                return userBid;
            }

            console.log('无效分数，请重新输入：');
        }
    }

    promptBidRobot(currentScore) {
        let ai = new BiddingAi(this.hand);
        return ai.promptBidRobot(currentScore);
    }

    async pressBottomCards() {

    }

    /**
     * 查看某张牌是否成对子
     * @param {SanDaHaCard} card 
     * @param {*} options 
     */
    isUnpaired(card, options) {
        let count = 0;
        this.hand.forEach((c) => { 
            if (c.isPairWith(card)) count++;
        })

        return count < 2;
    }

    // 找到手牌中没有成对子的牌
    findUnpairedCard(count, options = null) {
        let unpairedCards = [];
        for (let card of this.hand) {
            if (this.isUnpaired(card, options)) {
                unpairedCards.push(card);
            }
        }

        if (unpairedCards.length <= count) {
            return unpairedCards;
        }

        let randomIndexs = getRandomIntegers(unpairedCards.length, count);
        let cards = [];
        for (let index of randomIndexs) {
            cards.push(unpairedCards[index]);
        }

        return cards;
    }
}