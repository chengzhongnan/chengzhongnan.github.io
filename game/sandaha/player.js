import readline from 'readline';
import { BiddingAi } from './gameAi.js';

export class Player {
    constructor(name, index) {
        this.name = name;
        this.hand = [];
        this.trumpSuit = null;
        this.friends = [];
        this.index = index;
        this.isUser = false;
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
    chooseTrumpSuit(suit, onChooseTrumpSuitCallback) {
        this.trumpSuit = suit;
        onChooseTrumpSuitCallback(this.name, this.trumpSuit);
    }

    onOtherChooseTrumpSuit(playerName, suit) {
        this.trumpSuit = suit;
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
            userBid = await question('请输入你选择的分数: ');
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
}