// Глобальные переменные
let currentUser = null;
let allUsers = [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем сессию
    const savedSession = localStorage.getItem('lapcase_session');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            await loginWithToken(session.token, false); // false = не показывать загрузку
        } catch (e) {
            localStorage.removeItem('lapcase_session');
        }
    }
    
    // Обработчики
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Навигация
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            
            // Обновляем активную кнопку
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Показываем страницу
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

// Загрузка всех пользователей
async function loadAllUsers() {
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=getAllUsers`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
            allUsers = data.users;
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

// Вход
function login() {
    const token = document.getElementById('tokenInput').value.trim();
    if (!token) {
        showError('Введи токен');
        return;
    }
    loginWithToken(token, true);
}

async function loginWithToken(token, showLoad = true) {
    if (showLoad) showLoading();
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=getUser&token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            
            // Сохраняем сессию
            localStorage.setItem('lapcase_session', JSON.stringify({
                token: token,
                userName: currentUser.name
            }));
            
            // Обновляем интерфейс
            document.getElementById('userNameDisplay').textContent = currentUser.name;
            document.getElementById('balanceDisplay').textContent = currentUser.balance;
            
            // Переключаем экраны
            document.getElementById('loginScreen').classList.remove('active');
            document.getElementById('mainScreen').classList.add('active');
            
            // Загружаем данные
            await loadAllUsers();
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
    } finally {
        if (showLoad) hideLoading();
    }
}

// Выход (удаляем куки)
function logout() {
    localStorage.removeItem('lapcase_session'); // Удаляем сессию
    currentUser = null;
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('tokenInput').value = '';
}

// Показать страницу
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}Page`).classList.add('active');
}

// Загрузка магазина
function loadShop() {
    const container = document.getElementById('casesContainer');
    container.innerHTML = '';
    
    for (const [key, caseData] of Object.entries(CONFIG.cases)) {
        const card = document.createElement('div');
        card.className = 'case-card';
        card.innerHTML = `
            <img src="${caseData.image}" alt="${caseData.name}" onerror="this.src='images/placeholder.png'">
            <h3>${caseData.name}</h3>
            <div class="case-price">${caseData.price} ₽</div>
            <button class="buy-btn" data-case="${key}">Купить</button>
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
            loadInventory();
        }
    } catch (error) {
        alert('Ошибка при покупке');
    }
}

// Загрузка инвентаря
async function loadInventory() {
    if (!currentUser) return;
    
    const container = document.getElementById('inventoryContainer');
    container.innerHTML = '<p class="loading">Загрузка...</p>';
    
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
                    <div class="case-price">${c.price} ₽</div>
                    <div class="case-status">${c.status}</div>
                    <button class="open-case-btn" data-case="${c.caseName}">Открыть</button>
                `;
                
                card.querySelector('.open-case-btn').addEventListener('click', () => {
                    openCaseModal(c.caseName);
                });
                
                container.appendChild(card);
            });
        }
    } catch (error) {
        container.innerHTML = '<p class="error">Ошибка загрузки</p>';
    }
}

// Открыть модалку
function openCaseModal(caseName) {
    document.getElementById('modalCaseName').textContent = caseName;
    document.getElementById('caseModal').dataset.caseName = caseName;
    document.getElementById('caseModal').classList.add('active');
    
    const caseKey = Object.keys(CONFIG.cases).find(key => CONFIG.cases[key].name === caseName);
    const caseData = CONFIG.cases[caseKey];
    
    const track = document.getElementById('carouselTrack');
    track.innerHTML = '';
    track.classList.remove('spinning', 'stopping');
    
    for (let i = 0; i < 20; i++) {
        caseData.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'carousel-item';
            itemDiv.innerHTML = `
                <img src="${item.image}" alt="${item.name}" onerror="this.src='images/placeholder.png'">
                <span>${item.name}</span>
            `;
            track.appendChild(itemDiv);
        });
    }
    
    document.getElementById('resultItem').classList.add('hidden');
}

// Открытие кейса
function startCaseOpening() {
    const caseName = document.getElementById('caseModal').dataset.caseName;
    const caseKey = Object.keys(CONFIG.cases).find(key => CONFIG.cases[key].name === caseName);
    const caseData = CONFIG.cases[caseKey];
    
    const track = document.getElementById('carouselTrack');
    const container = document.querySelector('.carousel-container');
    
    track.classList.remove('stopping');
    track.classList.add('spinning');
    
    const openBtn = document.getElementById('openCaseBtn');
    openBtn.disabled = true;
    openBtn.style.opacity = '0.5';
    
    setTimeout(() => {
        track.classList.remove('spinning');
        track.classList.add('stopping');
        
        const scrollAmount = Math.random() * 2000 + 1000;
        
        container.scrollTo({
            left: scrollAmount,
            behavior: 'smooth'
        });
        
        setTimeout(() => {
            const containerRect = container.getBoundingClientRect();
            const centerX = containerRect.left + containerRect.width / 2;
            
            const items = document.querySelectorAll('.carousel-item');
            let selectedItem = null;
            
            for (let item of items) {
                const rect = item.getBoundingClientRect();
                if (rect.left <= centerX && rect.right >= centerX) {
                    selectedItem = item;
                    break;
                }
            }
            
            if (selectedItem) {
                const img = selectedItem.querySelector('img').src;
                const name = selectedItem.querySelector('span').textContent;
                
                const item = caseData.items.find(i => i.name === name);
                
                document.getElementById('resultImage').src = img;
                document.getElementById('resultName').textContent = name;
                document.getElementById('resultRarity').textContent = item ? item.rarity : '';
                document.getElementById('resultRarity').className = `rarity rarity-${item ? item.rarity.toLowerCase() : ''}`;
                document.getElementById('resultItem').classList.remove('hidden');
                
                if (item) {
                    saveOpenedCase(caseName, item);
                }
            }
            
            openBtn.disabled = false;
            openBtn.style.opacity = '1';
            
        }, 2000);
        
    }, Math.random() * 1000 + 1500);
}

// Сохранить открытый кейс
async function saveOpenedCase(caseName, item) {
    if (!currentUser) return;
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=openCase&token=${currentUser.token}&caseName=${caseName}&item=${encodeURIComponent(item.name)}&image=${encodeURIComponent(item.image)}&rarity=${encodeURIComponent(item.rarity)}`;
        await fetch(url);
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
    container.innerHTML = '<p class="loading">Загрузка...</p>';
    
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
                    <img src="${item.image}" alt="${item.item}" onerror="this.src='images/placeholder.png'">
                    <h4>${item.item}</h4>
                    <div class="rarity rarity-${item.rarity.toLowerCase()}">${item.rarity}</div>
                    <button class="sell-btn" data-item="${item.item}">Продать</button>
                `;
                
                card.querySelector('.sell-btn').addEventListener('click', () => sellItem(item.item));
                container.appendChild(card);
            });
        }
    } catch (error) {
        container.innerHTML = '<p class="error">Ошибка загрузки</p>';
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
        const url = `${CONFIG.googleSheets.webAppUrl}?action=sellItem&token=${currentUser.token}&itemName=${encodeURIComponent(itemName)}&price=${price}`;
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

// Загрузка маркета
async function loadMarket() {
    const container = document.getElementById('marketContainer');
    container.innerHTML = '<p class="loading">Загрузка...</p>';
    
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
                    <div class="case-price">${item.price} ₽</div>
                    <button class="buy-item-btn" data-id="${item.id}" data-seller="${item.seller}" data-item="${item.item}" data-price="${item.price}">Купить</button>
                `;
                
                card.querySelector('.buy-item-btn').addEventListener('click', () => buyItem(item.id, item.seller, item.item, item.price));
                container.appendChild(card);
            });
        }
    } catch (error) {
        container.innerHTML = '<p class="error">Ошибка загрузки</p>';
    }
}

// Покупка предмета
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
    
    if (!confirm(`Купить ${itemName} за ${price} ₽?`)) return;
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=buyItem&buyerToken=${currentUser.token}&itemId=${itemId}&price=${price}&sellerToken=${sellerToken}&itemName=${encodeURIComponent(itemName)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentUser.balance -= price;
            document.getElementById('balanceDisplay').textContent = currentUser.balance;
            alert('Покупка совершена!');
            loadMarket();
            loadCollection();
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

// Трейд
async function tradeItem() {
    const itemName = document.getElementById('tradeItemSelect').value;
    const toName = document.getElementById('tradeNameInput').value.trim();
    
    if (!itemName) {
        showTradeMessage('Выбери предмет');
        return;
    }
    
    if (!toName) {
        showTradeMessage('Введи имя получателя');
        return;
    }
    
    const toUser = allUsers.find(u => u.name.toLowerCase() === toName.toLowerCase());
    
    if (!toUser) {
        showTradeMessage('Пользователь не найден');
        return;
    }
    
    if (toUser.name === currentUser.name) {
        showTradeMessage('Нельзя отправить себе');
        return;
    }
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=tradeItem&fromToken=${currentUser.token}&toToken=${toUser.token}&itemName=${encodeURIComponent(itemName)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            showTradeMessage('✅ Отправлено!', 'success');
            document.getElementById('tradeItemSelect').value = '';
            document.getElementById('tradeNameInput').value = '';
            loadTradeItems();
            loadCollection();
        }
    } catch (error) {
        showTradeMessage('❌ Ошибка');
    }
}

// Вспомогательные функции
function showError(message) {
    document.getElementById('loginError').textContent = message;
}

function showTradeMessage(message, type = 'error') {
    const el = document.getElementById('tradeMessage');
    el.textContent = message;
    el.style.color = type === 'success' ? '#6e8cff' : '#ff6b6b';
    setTimeout(() => el.textContent = '', 3000);
}

function showLoading() {
    const loader = document.createElement('div');
    loader.className = 'global-loader';
    loader.innerHTML = '<div class="spinner"></div>';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #0a0c0f;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.querySelector('.global-loader');
    if (loader) loader.remove();
}
