export class CardSystem {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.db = gameCore.db;
        this.gameId = gameCore.gameId;
        this.playerId = gameCore.playerId;
        
        // カードデータの定義
        this.cardTemplates = {
            // バトルカード（攻撃）
            attackCards: Array(10).fill().map((_, i) => ({
                type: 'battle',
                value: i + 1,
                effect: 'damage',
                name: `攻撃カード${i + 1}`
            })),
            // バトルカード（回復）
            healCards: Array(5).fill().map((_, i) => ({
                type: 'battle',
                value: i + 1,
                effect: 'heal',
                name: `回復カード${i + 1}`
            })),
            // 効果カード
            effectCards: [
                {
                    type: 'effect',
                    value: 0,
                    effect: 'draw',
                    name: 'ドローカード'
                },
                {
                    type: 'effect',
                    value: 0,
                    effect: 'reveal',
                    name: '手札確認'
                },
                {
                    type: 'effect',
                    value: 2,
                    effect: 'boost',
                    name: '強化カード'
                }
            ],
            // 神の一手カード
            godCards: [
                {
                    type: 'god',
                    value: 5,
                    effect: 'damage_boost',
                    name: '神の一撃'
                },
                {
                    type: 'god',
                    value: 0,
                    effect: 'discard_hand',
                    name: '手札破棄'
                },
                {
                    type: 'god',
                    value: 0,
                    effect: 'nullify',
                    name: 'ダメージ無効'
                }
            ]
        };
    }

    async initializeCards() {
        try {
            const deckRef = this.db.collection('deck');
            const allCards = [
                ...this.cardTemplates.attackCards,
                ...this.cardTemplates.healCards,
                ...this.cardTemplates.effectCards,
                ...this.cardTemplates.godCards
            ];

            for (const card of allCards) {
                await deckRef.add(card);
            }
            console.log('カードの初期化が完了しました');
        } catch (error) {
            console.error('カードの初期化中にエラーが発生しました:', error);
            throw error;
        }
    }

    async initializePlayerDeck() {
        try {
            console.log('デッキ初期化開始');
            const deckRef = this.db.collection('Deck').doc(this.playerId);
            const deckDoc = await deckRef.get();

            if (!deckDoc.exists) {
                throw new Error('デッキが見つかりません');
            }

            const deckData = deckDoc.data();
            if (!deckData.cards || !Array.isArray(deckData.cards)) {
                throw new Error('デッキのカードデータが不正です');
            }

            const allCards = this.mapCardsData(deckData.cards);
            if (allCards.length !== 30) {
                throw new Error('デッキのカード枚数が不正です（30枚である必要があります）');
            }

            await this.setupInitialHand(allCards);

        } catch (error) {
            console.error('デッキ初期化エラー:', error);
            throw error;
        }
    }

    mapCardsData(cards) {
        return cards.map(card => ({
            id: card.name,
            type: card.type,
            effect: card.effect,
            name: card.name,
            image: card.image,
            value: card.value,
            isCreated: card.isCreated
        }));
    }

    async setupInitialHand(allCards) {
        const shuffledDeck = this.shuffleArray(allCards);
        const initialHand = shuffledDeck.slice(0, 5);
        const remainingDeck = shuffledDeck.slice(5);

        const gameRef = this.db.collection('games').doc(this.gameId);
        await gameRef.update({
            [`players.${this.playerId}.deck`]: remainingDeck,
            [`players.${this.playerId}.hand`]: initialHand
        });

        return { deck: remainingDeck, hand: initialHand };
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    getCardTypeText(type) {
        const typeMap = {
            attack: '攻撃',
            heal: '回復',
            effect: '効果',
            god: '神'
        };
        return typeMap[type] || type;
    }

    getEffectDescription(effect) {
        const effectDescriptions = {
            'draw': 'カードを1枚ドローする',
            'check': '相手の手札を2枚確認する',
            'boost': 'カードの数値を+2する',
            'reveal': '手札確認',
            'damage': '攻撃',
            'heal': '回復',
            'damage_boost': 'ダメージ+5',
            'discard_hand': '手札破棄',
            'nullify': 'ダメージ無効'
        };
        return effectDescriptions[effect] || '効果カード';
    }

    getGodCardDescription(effect) {
        const godCardDescriptions = {
            'damage_boost': 'ダメージ+5',
            'discard_hand': '手札を捨てる',
            'nullify': 'ダメージを無効化',
            'recover': 'カードを回収する'
        };
        return godCardDescriptions[effect] || '神の一手カード';
    }
} 