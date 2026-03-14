// Глобальные переменные
let currentUser = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, есть ли сохраненный токен
    const savedToken = localStorage.getItem('lapcase_token');
    if (savedToken) {
        loginWithToken(savedToken);
    }
    
    // Обработчики кнопок
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Навигация
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            showPage(page);
        });
    });
    
    // Закрытие модалки
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('caseModal').classList.remove('active');
    });
    
    // Открытие кейса
    document.getElementById('openCaseBtn').addEventListener('click', startCaseOpening);
    
    // Трейд
    document.getElementById('tradeBtn').addEventListener('click', tradeItem);
});

// Вход по токену
function login() {
    const token = document.getElementById('tokenInput').value.trim();
    if (!token) {
        showError('Введи токен');
        return;
    }
    
    loginWithToken(token);
}

async function loginWithToken(token) {
    try {
        showLoading();
        
        const url = `${CONFIG.googleSheets.webAppUrl}?action=getUser&token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            
            // Сохраняем в localStorage
            localStorage.setItem('lapcase_token', token);
            
            // Обновляем интерфейс
            document.getElementById('userNameDisplay').textContent = currentUser.name;
            document.getElementById('userTokenDisplay').textContent = currentUser.token;
            document.getElementById('balanceDisplay').textContent = currentUser.balance;
            
            // Переключаем экраны
            document.getElementById('loginScreen').classList.remove('active');
            document.getElementById('mainScreen').classList.add('active');
            
            // Загружаем данные
            loadShop();
            loadInventory();
            loadCollection();
            loadMarket();
            loadTradeItems();
        } else {
            showError('Неверный токен');
        }
    } catch (error) {
        showError('Ошибка соединения');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Выход
function logout() {
    localStorage.removeItem('lapcase_token');
    currentUser = null;
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('tokenInput').value = '';
}

// Показать страницу
function showPage(pageName) {
    // Обновляем кнопки
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === pageName) {
            btn.classList.add('active');
        }
    });
    
    // Обновляем страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}Page`).classList.add('active');
    
    // Загружаем данные для страницы
    switch(pageName) {
        case 'shop':
            loadShop();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'collection':
            loadCollection();
            break;
        case 'market':
            loadMarket();
            break;
        case 'trade':
            loadTradeItems();
            break;
    }
}

// Загрузка магазина
function loadShop() {
    const container = document.getElementById('casesContainer');
    container.innerHTML = '';
    
    for (const [key, caseData] of Object.entries(CONFIG.cases)) {
        const card = document.createElement('div');
        card.className = 'case-card';
        card.innerHTML = `
            <img src="${caseData.image}" alt="${caseData.name}">
            <h3>${caseData.name}</h3>
            <div class="case-price">${caseData.price} руб</div>
            <button class="buy-btn" data-case="${key}">Купить кейс</button>
        `;
        
        card.querySelector('.buy-btn').addEventListener('click', () => buyCase(key));
        
        container.appendChild(card);
    }
}

// Покупка кейса
async function buyCase(caseKey) {
    if (!currentUser) return;
    
    const caseData = CONFIG.cases[caseKey];
    
    if (currentUser.balance < caseData.price) {
        alert('Недостаточно средств!');
        return;
    }
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=buyCase&token=${currentUser.token}&caseName=${caseData.name}&price=${caseData.price}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentUser.balance = data.newBalance;
            document.getElementById('balanceDisplay').textContent = currentUser.balance;
            alert('Кейс куплен!');
        }
    } catch (error) {
        alert('Ошибка при покупке');
    }
}

// Загрузка инвентаря
async function loadInventory() {
    if (!currentUser) return;
    
    const container = document.getElementById('inventoryContainer');
    container.innerHTML = '<p>Загрузка...</p>';
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=getCases&token=${currentUser.token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.cases) {
            container.innerHTML = '';
            
            const unopenedCases = data.cases.filter(c => c.status === 'не открыт');
            
            if (unopenedCases.length === 0) {
                container.innerHTML = '<p class="empty">У тебя пока нет неоткрытых кейсов</p>';
                return;
            }
            
            unopenedCases.forEach(c => {
                const card = document.createElement('div');
                card.className = 'inventory-card';
                card.innerHTML = `
                    <h3>${c.caseName}</h3>
                    <p class="case-price">${c.price} руб</p>
                    <p class="case-status">Статус: ${c.status}</p>
                    <button class="open-case-btn" data-case="${c.caseName}">Открыть кейс</button>
                `;
                
                card.querySelector('.open-case-btn').addEventListener('click', () => {
                    openCaseModal(c.caseName);
                });
                
                container.appendChild(card);
            });
        }
    } catch (error) {
        container.innerHTML = '<p>Ошибка загрузки</p>';
    }
}

// Открыть модалку кейса
function openCaseModal(caseName) {
    document.getElementById('modalCaseName').textContent = `Открытие: ${caseName}`;
    document.getElementById('caseModal').dataset.caseName = caseName;
    document.getElementById('caseModal').classList.add('active');
    
    // Создаем слоты для анимации
    const slotsContainer = document.getElementById('slotsContainer');
    slotsContainer.innerHTML = '';
    
    for (let i = 0; i < 20; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slotsContainer.appendChild(slot);
    }
    
    // Скрываем результат
    document.getElementById('resultItem').classList.add('hidden');
}

// Начать открытие кейса
function startCaseOpening() {
    const caseName = document.getElementById('caseModal').dataset.caseName;
    const caseKey = Object.keys(CONFIG.cases).find(key => CONFIG.cases[key].name === caseName);
    const caseData = CONFIG.cases[caseKey];
    
    // Анимация прокрутки
    const slots = document.querySelectorAll('.slot');
    let counter = 0;
    
    const interval = setInterval(() => {
        slots.forEach(slot => {
            const randomItem = caseData.items[Math.floor(Math.random() * caseData.items.length)];
            slot.innerHTML = `
                <img src="${randomItem.image}" alt="${randomItem.name}">
                <span>${randomItem.name}</span>
            `;
        });
        
        counter++;
        
        if (counter > 20) {
            clearInterval(interval);
            
            // Выбираем предмет по шансам
            const item = getRandomItemByChance(caseData.items);
            
            // Показываем результат
            document.getElementById('resultImage').src = item.image;
            document.getElementById('resultName').textContent = item.name;
            document.getElementById('resultRarity').textContent = item.rarity;
            document.getElementById('resultRarity').className = `rarity rarity-${item.rarity.toLowerCase()}`;
            document.getElementById('resultItem').classList.remove('hidden');
            
            // Сохраняем результат
            saveOpenedCase(caseName, item);
        }
    }, 100);
}

// Выбор предмета по шансам
function getRandomItemByChance(items) {
    const random = Math.random() * 100;
    let cumulativeChance = 0;
    
    for (const item of items) {
        cumulativeChance += item.chance;
        if (random < cumulativeChance) {
            return item;
        }
    }
    
    return items[0];
}

// Сохранить открытый кейс
async function saveOpenedCase(caseName, item) {
    if (!currentUser) return;
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=openCase&token=${currentUser.token}&caseName=${caseName}&item=${item.name}&image=${item.image}&rarity=${item.rarity}`;
        await fetch(url);
        
        // Обновляем инвентарь и коллекцию
        loadInventory();
        loadCollection();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

// Загрузка коллекции
async function loadCollection() {
    if (!currentUser) return;
    
    const container = document.getElementById('collectionContainer');
    container.innerHTML = '<p>Загрузка...</p>';
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=getCollection&token=${currentUser.token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.items) {
            container.innerHTML = '';
            
            if (data.items.length === 0) {
                container.innerHTML = '<p class="empty">Коллекция пуста</p>';
                return;
            }
            
            data.items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card';
                card.innerHTML = `
                    <img src="${item.image}" alt="${item.item}">
                    <h4>${item.item}</h4>
                    <p class="rarity rarity-${item.rarity.toLowerCase()}">${item.rarity}</p>
                    <button class="sell-btn" data-item="${item.item}">Продать</button>
                `;
                
                card.querySelector('.sell-btn').addEventListener('click', () => sellItem(item.item));
                
                container.appendChild(card);
            });
        }
    } catch (error) {
        container.innerHTML = '<p>Ошибка загрузки</p>';
    }
}

// Продажа предмета
async function sellItem(itemName) {
    const price = prompt('Введи цену для продажи (в рублях):');
    
    if (!price || isNaN(price) || price <= 0) {
        alert('Введи корректную цену');
        return;
    }
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=sellItem&token=${currentUser.token}&itemName=${itemName}&price=${price}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            alert('Товар выставлен на продажу!');
            loadCollection();
            loadMarket();
        }
    } catch (error) {
        alert('Ошибка при продаже');
    }
}

// Загрузка торговой площадки
async function loadMarket() {
    const container = document.getElementById('marketContainer');
    container.innerHTML = '<p>Загрузка...</p>';
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=getMarket`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.items) {
            container.innerHTML = '';
            
            if (data.items.length === 0) {
                container.innerHTML = '<p class="empty">На площадке пока нет товаров</p>';
                return;
            }
            
            data.items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'market-card';
                card.innerHTML = `
                    <h4>${item.item}</h4>
                    <p>Продавец: ${item.seller}</p>
                    <p class="case-price">${item.price} руб</p>
                    <button class="buy-item-btn" data-id="${item.id}" data-seller="${item.seller}" data-item="${item.item}" data-price="${item.price}">Купить</button>
                `;
                
                card.querySelector('.buy-item-btn').addEventListener('click', () => buyItem(item.id, item.seller, item.item, item.price));
                
                container.appendChild(card);
            });
        }
    } catch (error) {
        container.innerHTML = '<p>Ошибка загрузки</p>';
    }
}

// Покупка предмета с площадки
async function buyItem(itemId, sellerToken, itemName, price) {
    if (!currentUser) return;
    
    if (sellerToken === currentUser.token) {
        alert('Нельзя купить свой товар');
        return;
    }
    
    if (currentUser.balance < price) {
        alert('Недостаточно средств');
        return;
    }
    
    if (!confirm(`Купить ${itemName} за ${price} руб?`)) return;
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=buyItem&buyerToken=${currentUser.token}&itemId=${itemId}&price=${price}&sellerToken=${sellerToken}&itemName=${itemName}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            // Обновляем баланс
            currentUser.balance -= price;
            document.getElementById('balanceDisplay').textContent = currentUser.balance;
            
            alert('Покупка совершена!');
            loadMarket();
            loadCollection();
        } else {
            alert(data.error || 'Ошибка при покупке');
        }
    } catch (error) {
        alert('Ошибка при покупке');
    }
}

// Загрузка предметов для трейда
async function loadTradeItems() {
    if (!currentUser) return;
    
    const select = document.getElementById('tradeItemSelect');
    select.innerHTML = '<option value="">Загрузка...</option>';
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=getCollection&token=${currentUser.token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        select.innerHTML = '<option value="">Выбери предмет</option>';
        
        if (data.success && data.items) {
            data.items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.item;
                option.textContent = `${item.item} (${item.rarity})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

// Трейд предмета
async function tradeItem() {
    const itemName = document.getElementById('tradeItemSelect').value;
    const toToken = document.getElementById('tradeTokenInput').value.trim();
    
    if (!itemName) {
        showTradeMessage('Выбери предмет');
        return;
    }
    
    if (!toToken) {
        showTradeMessage('Введи токен получателя');
        return;
    }
    
    if (toToken === currentUser.token) {
        showTradeMessage('Нельзя отправить самому себе');
        return;
    }
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=tradeItem&fromToken=${currentUser.token}&toToken=${toToken}&itemName=${itemName}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            showTradeMessage('✅ Предмет отправлен!', 'success');
            document.getElementById('tradeItemSelect').value = '';
            document.getElementById('tradeTokenInput').value = '';
            loadTradeItems();
            loadCollection();
        } else {
            showTradeMessage('❌ ' + data.error);
        }
    } catch (error) {
        showTradeMessage('❌ Ошибка при отправке');
    }
}

// Вспомогательные функции
function showError(message) {
    document.getElementById('loginError').textContent = message;
}

function showTradeMessage(message, type = 'error') {
    const el = document.getElementById('tradeMessage');
    el.textContent = message;
    el.style.color = type === 'success' ? '#4ecdc4' : '#ff6b6b';
    
    setTimeout(() => {
        el.textContent = '';
    }, 3000);
}

function showLoading() {
    // Можно добавить прелоадер
}

function hideLoading() {
    // Скрыть прелоадер
}
