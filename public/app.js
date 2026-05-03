// Globals
let menuItems = [];
let cart = [];
let currentCategory = 'all';
let currentUser = null;
let authToken = null;

// DOM elements
const menuContainer = document.getElementById('menu-container');
const categoriesContainer = document.getElementById('categories');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsDiv = document.getElementById('cart-items');
const cartTotalSpan = document.getElementById('cart-total');
const cartCountSpan = document.getElementById('cart-count');
const navMenu = document.getElementById('nav-menu');
const navCart = document.getElementById('nav-cart');
const navOrders = document.getElementById('nav-orders');
const closeCartBtn = document.getElementById('close-cart');
const checkoutBtn = document.getElementById('checkout-btn');
const userBtn = document.getElementById('user-btn');
const authModal = new bootstrap.Modal(document.getElementById('authModal'));
const ordersModal = new bootstrap.Modal(document.getElementById('ordersModal'));

// Helper functions
function storeAuth(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    userBtn.textContent = `👤 ${user.name || user.email.split('@')[0]}`;
    userBtn.classList.remove('btn-outline-secondary');
    userBtn.classList.add('btn-outline-success');
}
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    userBtn.textContent = '👤 Sign In';
    userBtn.classList.add('btn-outline-secondary');
    userBtn.classList.remove('btn-outline-success');
}
function loadAuthFromStorage() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        userBtn.textContent = `👤 ${currentUser.name || currentUser.email.split('@')[0]}`;
        userBtn.classList.remove('btn-outline-secondary');
        userBtn.classList.add('btn-outline-success');
    }
}

// API calls
async function apiCall(url, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

async function loadMenu() {
    try {
        const data = await apiCall('/api/menu');
        menuItems = data;
        renderCategories();
        renderMenu();
    } catch(err) { console.error(err); menuContainer.innerHTML = '<div class="alert alert-danger">Failed to load menu</div>'; }
}

function renderCategories() {
    const categories = ['all', ...new Set(menuItems.map(item => item.category))];
    categoriesContainer.innerHTML = categories.map(cat => 
        `<span class="category-pill ${cat === currentCategory ? 'active' : ''}" data-category="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>`
    ).join('');
    document.querySelectorAll('.category-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;
            document.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenu();
        });
    });
}

function renderMenu() {
    let filtered = currentCategory === 'all' ? menuItems : menuItems.filter(item => item.category === currentCategory);
    if (filtered.length === 0) { menuContainer.innerHTML = '<div class="col-12 text-center">No items</div>'; return; }
    menuContainer.innerHTML = filtered.map(item => `
        <div class="col-md-4 col-sm-6">
            <div class="menu-card" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/400x300?text=Food'">
                <div class="mt-2">
                    <h6 class="mb-1">${item.name}</h6>
                    <p class="small text-muted mb-1">${item.description.substring(0, 60)}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="price">$${item.price.toFixed(2)}</span>
                        <button class="btn btn-sm btn-primary add-to-cart" data-id="${item.id}">+ Add</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); addToCart(parseInt(btn.dataset.id)); });
    });
}

function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    const existing = cart.find(i => i.id === itemId);
    if (existing) existing.quantity++;
    else cart.push({ ...item, quantity: 1 });
    updateCartUI();
}

function updateCartUI() {
    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    cartCountSpan.textContent = totalItems;
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<div class="text-center text-muted">Your cart is empty</div>';
        cartTotalSpan.textContent = '$0.00';
        return;
    }
    cartItemsDiv.innerHTML = cart.map(item => `
        <div class="cart-item d-flex justify-content-between mb-2 pb-2 border-bottom">
            <div><strong>${item.name}</strong><br><small>$${item.price.toFixed(2)} x ${item.quantity}</small></div>
            <div>$${(item.price * item.quantity).toFixed(2)} <button class="btn btn-sm btn-danger remove-item" data-id="${item.id}">🗑️</button></div>
        </div>
    `).join('');
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    cartTotalSpan.textContent = `$${total.toFixed(2)}`;
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            cart = cart.filter(i => i.id !== id);
            updateCartUI();
        });
    });
}

function openCart() { cartDrawer.classList.add('open'); cartOverlay.style.display = 'block'; }
function closeCart() { cartDrawer.classList.remove('open'); cartOverlay.style.display = 'none'; }

async function placeOrder() {
    if (!currentUser) { alert('Please sign in to place an order'); authModal.show(); return; }
    if (cart.length === 0) { alert('Cart is empty'); return; }

    let location = null;
    if (navigator.geolocation) {
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });
            location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch(e) { console.warn('Location not available', e); }
    }

    const items = cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }));
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    try {
        const data = await apiCall('/api/orders', {
            method: 'POST',
            body: JSON.stringify({ items, total, paymentMethod: 'table', customerNote: '', locationLat: location?.lat, locationLng: location?.lng })
        });
        if (data.success) {
            alert(`Order placed! Your order number: ${data.orderId}`);
            cart = [];
            updateCartUI();
            closeCart();
            if (ordersModal._isShown) loadUserOrders();
        } else alert('Order failed');
    } catch(err) { alert('Error placing order: ' + err.message); }
}

async function loadUserOrders() {
    if (!currentUser) { ordersModal.hide(); alert('Please sign in first'); return; }
    try {
        const orders = await apiCall('/api/orders/my');
        const ordersList = document.getElementById('orders-list');
        if (orders.length === 0) {
            ordersList.innerHTML = '<p class="text-muted">No orders yet.</p>';
        } else {
            ordersList.innerHTML = orders.map(order => `
                <div class="card mb-2">
                    <div class="card-body">
                        <h6>Order #${order.id}</h6>
                        <p>Total: $${order.total.toFixed(2)} | Status: <span class="badge bg-secondary">${order.status}</span></p>
                        <p class="small">Placed: ${new Date(order.created_at).toLocaleString()}</p>
                        ${order.location_lat ? `<p><small>📍 Delivery location: (${order.location_lat}, ${order.location_lng})</small></p>` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch(err) {
        document.getElementById('orders-list').innerHTML = `<p class="text-danger">Failed to load orders: ${err.message}</p>`;
    }
}

// Auth forms
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const data = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.success) {
            storeAuth(data.token, data.user);
            authModal.hide();
            alert('Logged in successfully');
        } else alert('Login failed');
    } catch(err) { alert('Login error: ' + err.message); }
});

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try {
        const data = await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name })
        });
        if (data.success) {
            storeAuth(data.token, data.user);
            authModal.hide();
            alert('Account created and logged in');
        } else alert('Registration failed');
    } catch(err) { alert('Registration error: ' + err.message); }
});

userBtn.addEventListener('click', () => {
    if (currentUser) {
        if (confirm(`Logged in as ${currentUser.email}. Log out?`)) logout();
    } else {
        authModal.show();
    }
});

navOrders.addEventListener('click', () => {
    if (!currentUser) { alert('Please sign in to view your orders'); authModal.show(); return; }
    loadUserOrders();
    ordersModal.show();
});

// Initialize
loadAuthFromStorage();
loadMenu();
navMenu.addEventListener('click', closeCart);
navCart.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
checkoutBtn.addEventListener('click', placeOrder);

// --- QR Code Scanning ---
let currentStream = null;
let currentFacingMode = 'environment'; // back camera
let qrModal = null;
let scanning = false;

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

async function startCamera() {
    stopCamera();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: currentFacingMode } }
        });
        currentStream = stream;
        const video = document.getElementById('qr-video');
        video.srcObject = stream;
        video.play();
        scanning = true;
        scanQRCode();
    } catch (err) {
        console.warn('Camera error:', err);
        // fallback to any camera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            currentStream = stream;
            const video = document.getElementById('qr-video');
            video.srcObject = stream;
            video.play();
            scanning = true;
            scanQRCode();
        } catch(e) {
            document.getElementById('qr-result').innerHTML = '<span class="text-danger">Camera not accessible</span>';
        }
    }
}

async function scanQRCode() {
    if (!scanning) return;
    const video = document.getElementById('qr-video');
    const canvas = document.getElementById('qr-canvas');
    const context = canvas.getContext('2d');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        if (code && code.data) {
            scanning = false;
            stopCamera();
            handleQRData(code.data);
            const modal = bootstrap.Modal.getInstance(document.getElementById('qrModal'));
            modal.hide();
        }
    }
    if (scanning) requestAnimationFrame(scanQRCode);
}

function handleQRData(data) {
    console.log('QR scanned:', data);
    if (data.startsWith('product:')) {
        const productId = parseInt(data.split(':')[1]);
        const item = menuItems.find(i => i.id === productId);
        if (item) {
            addToCart(productId);
            alert(`Added ${item.name} to cart via QR!`);
        } else {
            alert('Product not found in menu.');
        }
    } else if (data.startsWith('table:')) {
        const tableId = data.split(':')[1];
        localStorage.setItem('tableId', tableId);
        alert(`Table ${tableId} set. Your order will be linked to this table.`);
    } else if (data.startsWith('order:')) {
        const orderId = data.split(':')[1];
        window.location.href = `/order/${orderId}`;
    } else {
        alert('Unknown QR code: ' + data);
    }
}

// --- UI event handlers for QR ---
document.getElementById('scan-qr-btn')?.addEventListener('click', () => {
    qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
    qrModal.show();
    startCamera();
});

document.getElementById('qrModal')?.addEventListener('hidden.bs.modal', () => {
    scanning = false;
    stopCamera();
});

document.getElementById('switch-camera')?.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startCamera();
});

document.getElementById('qr-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById('qr-canvas');
            const context = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0, img.width, img.height);
            const imageData = context.getImageData(0, 0, img.width, img.height);
            const code = jsQR(imageData.data, img.width, img.height);
            if (code && code.data) {
                handleQRData(code.data);
                const modal = bootstrap.Modal.getInstance(document.getElementById('qrModal'));
                modal.hide();
            } else {
                alert('No QR code found in image.');
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});
