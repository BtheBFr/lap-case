// Конфигурация Lap.case от Lap.comp (от Завода "Осколки")
const CONFIG = {
    // Google Apps Script URL (твой)
    googleSheets: {
        webAppUrl: 'https://script.google.com/macros/s/AKfycbzidvZM4_O7Wg0yN36z8Q5Lszw59Yu74FJST34dMy1F_0HhiB-spzwV330AghsBki2K/exec'
    },
    
    // Настройки кейсов
    cases: {
        dota: {
            name: 'Dota 2',
            price: 50,
            image: 'images/cases/dota_case.png',
            items: [
                { name: 'Pudge', rarity: 'Легендарный', image: 'images/dota/pudge.png', chance: 5 },
                { name: 'Invoker', rarity: 'Мифический', image: 'images/dota/invoker.png', chance: 10 },
                { name: 'Crystal Maiden', rarity: 'Редкий', image: 'images/dota/cm.png', chance: 15 },
                { name: 'Sven', rarity: 'Обычный', image: 'images/dota/sven.png', chance: 25 },
                { name: 'Drow Ranger', rarity: 'Обычный', image: 'images/dota/drow.png', chance: 25 },
                { name: 'Axe', rarity: 'Необычный', image: 'images/dota/axe.png', chance: 20 }
            ]
        },
        cs2: {
            name: 'CS 2',
            price: 75,
            image: 'images/cases/cs2_case.png',
            items: [
                { name: 'AWP Dragon Lore', rarity: 'Тайное', image: 'images/cs2/awp.png', chance: 3 },
                { name: 'Karambit Fade', rarity: 'Легендарное', image: 'images/cs2/knife.png', chance: 5 },
                { name: 'AK-47 Fire Serpent', rarity: 'Мифическое', image: 'images/cs2/ak.png', chance: 12 },
                { name: 'M4A4 Howl', rarity: 'Редкое', image: 'images/cs2/m4.png', chance: 15 },
                { name: 'USP-S Orion', rarity: 'Необычное', image: 'images/cs2/usp.png', chance: 25 },
                { name: 'Glock-18 Water Elemental', rarity: 'Обычное', image: 'images/cs2/glock.png', chance: 40 }
            ]
        },
        bubbu: {
            name: 'Bubbu',
            price: 30,
            image: 'images/cases/bubbu_case.png',
            items: [
                { name: 'Милая Кошка', rarity: 'Легендарная', image: 'images/bubbu/cat_1.png', chance: 5 },
                { name: 'Пушистый Кролик', rarity: 'Мифический', image: 'images/bubbu/cat_2.png', chance: 10 },
                { name: 'Веселая Панда', rarity: 'Редкая', image: 'images/bubbu/cat_3.png', chance: 15 },
                { name: 'Золотая Рыбка', rarity: 'Необычная', image: 'images/bubbu/cat_4.png', chance: 20 },
                { name: 'Сонный Енот', rarity: 'Обычный', image: 'images/bubbu/cat_5.png', chance: 25 },
                { name: 'Веселый Хомяк', rarity: 'Обычный', image: 'images/bubbu/cat_6.png', chance: 25 }
            ]
        },
        pou: {
            name: 'Pou',
            price: 40,
            image: 'images/cases/pou_case.png',
            items: [
                { name: 'Золотой Pou', rarity: 'Легендарный', image: 'images/pou/pou_1.png', chance: 5 },
                { name: 'Космический Pou', rarity: 'Мифический', image: 'images/pou/pou_2.png', chance: 10 },
                { name: 'Пожарный Pou', rarity: 'Редкий', image: 'images/pou/pou_3.png', chance: 15 },
                { name: 'Шахтер Pou', rarity: 'Необычный', image: 'images/pou/pou_4.png', chance: 20 },
                { name: 'Повар Pou', rarity: 'Обычный', image: 'images/pou/pou_5.png', chance: 25 },
                { name: 'Спортсмен Pou', rarity: 'Обычный', image: 'images/pou/pou_6.png', chance: 25 }
            ]
        }
    }
};
