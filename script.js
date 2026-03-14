// Глобальные переменные
let currentUser = null;
let allUsers = []; // Для поиска по имени

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    // Сразу показываем прелоадер
    showLoading();
    
    // Загружаем всех пользователей
    await loadAllUsers();
    
    // Проверяем, есть ли сохраненная сессия
    const savedSession = localStorage.getItem('lapcase_session');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            // Проверяем, не устарела ли сессия (например, 24 часа)
            const sessionAge = Date.now() - session.timestamp;
            if (sessionAge < 24 * 60 * 60 * 1000) { // 24 часа
                await loginWithToken(session.token);
            } else {
                // Сессия устарела
                localStorage.removeItem('lapcase_session');
                hideLoading();
            }
        } catch (e) {
            localStorage.removeItem('lapcase_session');
            hideLoading();
        }
    } else {
        hideLoading();
    }
    
    // Обработчики кнопок
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Навигация
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            showPage(page);
            
            // Обновляем активную кнопку
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
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
    
    // Добавляем эффекты при наведении
    addHoverEffects();
});

// Функция для добавления эффектов
function addHoverEffects() {
    // Добавляем случайные цвета для карточек
    document.querySelectorAll('.case-card, .inventory-card, .item-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            const hue = Math.random() * 360;
            card.style.borderColor = `hsl(${hue}, 70%, 60%)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = '';
        });
    });
}

// Показать загрузку
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
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 50px;
        height: 50px;
        border: 3px solid #2b2f3a;
        border-top-color: #6e8cff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    `;
    
    loader.appendChild(spinner);
    document.body.appendChild(loader);
    
    // Добавляем стиль для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Скрыть загрузку
function hideLoading() {
    const loader = document.querySelector('.global-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
    }
}

// Загрузка всех пользователей (для поиска по имени)
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
    showLoading();
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=getUser&token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            
            // Сохраняем сессию с временной меткой
            const session = {
                token: token,
                timestamp: Date.now(),
                userName: currentUser.name
            };
            localStorage.setItem('lapcase_session', JSON.stringify(session));
            
            // Обновляем интерфейс
            document.getElementById('userNameDisplay').textContent = currentUser.name;
            document.getElementById('balanceDisplay').textContent = currentUser.balance;
            
            // Переключаем экраны
            document.getElementById('loginScreen').classList.remove('active');
            document.getElementById('mainScreen').classList.add('active');
            
            // Загружаем все данные сразу
            await Promise.all([
                loadShop(),
                loadInventory(),
                loadCollection(),
                loadMarket(),
                loadTradeItems()
            ]);
            
            // Добавляем эффекты
            addHoverEffects();
            
            // Показываем приветствие
            showNotification(`Добро пожаловать, ${currentUser.name}!`);
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

// Показать уведомление
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #6e8cff, #9f7aff)' : '#ff6b6b'};
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Выход
function logout() {
    localStorage.removeItem('lapcase_session');
    currentUser = null;
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('tokenInput').value = '';
    showNotification('Вы вышли из аккаунта', 'info');
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
        showNotification('Недостаточно средств!', 'error');
        return;
    }
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=buyCase&token=${currentUser.token}&caseName=${caseData.name}&price=${caseData.price}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentUser.balance = data.newBalance;
            document.getElementById('balanceDisplay').textContent = currentUser.balance;
            showNotification('Кейс куплен!');
            loadInventory(); // Обновляем инвентарь
            
            // Обновляем сессию
            updateSession();
        } else {
            showNotification(data.error || 'Ошибка при покупке', 'error');
        }
    } catch (error) {
        showNotification('Ошибка при покупке', 'error');
    }
}

// Обновление сессии
function updateSession() {
    const session = localStorage.getItem('lapcase_session');
    if (session) {
        const sessionData = JSON.parse(session);
        sessionData.timestamp = Date.now();
        localStorage.setItem('lapcase_session', JSON.stringify(sessionData));
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
            
            unopenedCases.forEach((c, index) => {
                const card = document.createElement('div');
                card.className = 'inventory-card';
                card.style.animationDelay = `${index * 0.1}s`;
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

// Открыть модалку кейса
function openCaseModal(caseName) {
    document.getElementById('modalCaseName').textContent = caseName;
    document.getElementById('caseModal').dataset.caseName = caseName;
    document.getElementById('caseModal').classList.add('active');
    
    // Находим предметы для этого кейса
    const caseKey = Object.keys(CONFIG.cases).find(key => CONFIG.cases[key].name === caseName);
    const caseData = CONFIG.cases[caseKey];
    
    // Создаем карусель
    const track = document.getElementById('carouselTrack');
    track.innerHTML = '';
    track.classList.remove('spinning', 'stopping');
    
    // Добавляем много предметов для длинной прокрутки
    for (let i = 0; i < 30; i++) {
        caseData.items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'carousel-item';
            itemDiv.style.animationDelay = `${index * 0.1}s`;
            itemDiv.innerHTML = `
                <img src="${item.image}" alt="${item.name}" onerror="this.src='images/placeholder.png'">
                <span>${item.name}</span>
            `;
            track.appendChild(itemDiv);
        });
    }
    
    // Скрываем результат
    document.getElementById('resultItem').classList.add('hidden');
}

// Начать открытие кейса
function startCaseOpening() {
    const caseName = document.getElementById('caseModal').dataset.caseName;
    const caseKey = Object.keys(CONFIG.cases).find(key => CONFIG.cases[key].name === caseName);
    const caseData = CONFIG.cases[caseKey];
    
    const track = document.getElementById('carouselTrack');
    const container = document.querySelector('.carousel-container');
    
    // Убираем старые классы
    track.classList.remove('stopping');
    track.classList.add('spinning');
    
    // Выключаем кнопку на время анимации
    const openBtn = document.getElementById('openCaseBtn');
    openBtn.disabled = true;
    openBtn.style.opacity = '0.5';
    
    // Добавляем визуальный эффект
    container.style.boxShadow = '0 0 30px rgba(110, 140, 255, 0.5)';
    
    // Останавливаем через рандомное время
    setTimeout(() => {
        // Останавливаем анимацию
        track.classList.remove('spinning');
        track.classList.add('stopping');
        
        // Вычисляем позицию остановки
        const scrollAmount = Math.random() * 2000 + 1000;
        
        // Плавно прокручиваем до позиции
        container.scrollTo({
            left: scrollAmount,
            behavior: 'smooth'
        });
        
        // Убираем эффект
        container.style.boxShadow = '';
        
        // Ждем окончания прокрутки
        setTimeout(() => {
            // Получаем элемент под стрелкой (примерно середина)
            const containerRect = container.getBoundingClientRect();
            const centerX = containerRect.left + containerRect.width / 2;
            
            // Ищем элемент под центром
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
                
                // Находим полный предмет
                const item = caseData.items.find(i => i.name === name);
                
                // Показываем результат с анимацией
                document.getElementById('resultImage').src = img;
                document.getElementById('resultName').textContent = name;
                document.getElementById('resultRarity').textContent = item ? item.rarity : '';
                document.getElementById('resultRarity').className = `rarity rarity-${item ? item.rarity.toLowerCase() : ''}`;
                document.getElementById('resultItem').classList.remove('hidden');
                
                // Сохраняем результат
                if (item) {
                    saveOpenedCase(caseName, item);
                    showNotification(`Выпал: ${item.name}!`, 'success');
                }
            }
            
            // Включаем кнопку
            openBtn.disabled = false;
            openBtn.style.opacity = '1';
            
        }, 2000); // Ждем окончания smooth scroll
        
    }, Math.random() * 1000 + 1500); // Останавливаем через 1.5-2.5 секунды
}

// Сохранить открытый кейс
async function saveOpenedCase(caseName, item) {
    if (!currentUser) return;
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=openCase&token=${currentUser.token}&caseName=${caseName}&item=${encodeURIComponent(item.name)}&image=${encodeURIComponent(item.image)}&rarity=${encodeURIComponent(item.rarity)}`;
        await fetch(url);
        
        // Обновляем инвентарь и коллекцию
        loadInventory();
        loadCollection();
        updateSession();
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
            
            data.items.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'item-card';
                card.style.animationDelay = `${index * 0.1}s`;
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
        showNotification('Введи корректную цену', 'error');
        return;
    }
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=sellItem&token=${currentUser.token}&itemName=${encodeURIComponent(itemName)}&price=${price}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            showNotification('Товар выставлен на продажу!');
            loadCollection();
            loadMarket();
            updateSession();
        } else {
            showNotification(data.error || 'Ошибка при продаже', 'error');
        }
    } catch (error) {
        showNotification('Ошибка при продаже', 'error');
    }
}

// Загрузка торговой площадки
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
            
            data.items.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'market-card';
                card.style.animationDelay = `${index * 0.1}s`;
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

// Покупка предмета с площадки
async function buyItem(itemId, sellerToken, itemName, price) {
    if (!currentUser) return;
    
    if (sellerToken === currentUser.token) {
        showNotification('Нельзя купить свой товар', 'error');
        return;
    }
    
    if (currentUser.balance < price) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    if (!confirm(`Купить ${itemName} за ${price} ₽?`)) return;
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=buyItem&buyerToken=${currentUser.token}&itemId=${itemId}&price=${price}&sellerToken=${sellerToken}&itemName=${encodeURIComponent(itemName)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            // Обновляем баланс
            currentUser.balance -= price;
            document.getElementById('balanceDisplay').textContent = currentUser.balance;
            
            showNotification('Покупка совершена!');
            loadMarket();
            loadCollection();
            updateSession();
        } else {
            showNotification(data.error || 'Ошибка при покупке', 'error');
        }
    } catch (error) {
        showNotification('Ошибка при покупке', 'error');
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

// Трейд предмета (по имени получателя)
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
    
    // Ищем пользователя по имени
    const toUser = allUsers.find(u => u.name.toLowerCase() === toName.toLowerCase());
    
    if (!toUser) {
        showTradeMessage('Пользователь с таким именем не найден');
        return;
    }
    
    if (toUser.name === currentUser.name) {
        showTradeMessage('Нельзя отправить самому себе');
        return;
    }
    
    try {
        const url = `${CONFIG.googleSheets.webAppUrl}?action=tradeItem&fromToken=${currentUser.token}&toToken=${toUser.token}&itemName=${encodeURIComponent(itemName)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            showTradeMessage('✅ Предмет отправлен!', 'success');
            document.getElementById('tradeItemSelect').value = '';
            document.getElementById('tradeNameInput').value = '';
            loadTradeItems();
            loadCollection();
            updateSession();
            showNotification(`Предмет отправлен ${toUser.name}!`);
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
    el.style.color = type === 'success' ? '#6e8cff' : '#ff6b6b';
    
    setTimeout(() => {
        el.textContent = '';
    }, 3000);
}
