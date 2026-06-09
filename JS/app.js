const API = 'http://localhost:3000';
const token = localStorage.getItem('token');
const rol = localStorage.getItem('rol');
const nombreUsuario = localStorage.getItem('nombre') || 'Cliente';
const idCliente = parseInt(localStorage.getItem('id_cliente')) || 1;

if (!token || rol !== 'cliente') window.location.href = 'login.html';

let carrito = [], todosProductos = [], tasaDolar = 0, metodoSeleccionado = null;
let tipoSeleccionado = 'sitio'; // 'sitio' o 'delivery'
const headers = { 'Content-Type': 'application/json', 'authorization': token };

document.getElementById('saludo-nombre').textContent = nombreUsuario;
document.getElementById('perfil-avatar').textContent = nombreUsuario.charAt(0).toUpperCase();
document.getElementById('perfil-nombre').textContent = nombreUsuario;

// =================== NAVEGACIÓN ===================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const nb = document.getElementById('nav-' + page);
  if (nb) nb.classList.add('active');
  if (page === 'pedidos') cargarMisPedidos();
  if (page === 'perfil')  cargarPerfil();
  if (page === 'carrito') renderCarrito();
}

// =================== TIPO DE PEDIDO ===================
function seleccionarTipo(tipo) {
  tipoSeleccionado = tipo;

  const btnSitio    = document.getElementById('btn-tipo-sitio');
  const btnDelivery = document.getElementById('btn-tipo-delivery');
  const campoUbic   = document.getElementById('campo-ubicacion');

  const estiloActivo   = 'flex:1; padding:12px; border-radius:10px; border:1.5px solid rgba(245,168,0,0.6); background:rgba(245,168,0,0.1); color:var(--dorado); font-size:13px; font-family:Poppins,sans-serif; font-weight:600; cursor:pointer;';
  const estiloInactivo = 'flex:1; padding:12px; border-radius:10px; border:1.5px solid rgba(255,255,255,0.08); background:transparent; color:#888; font-size:13px; font-family:Poppins,sans-serif; font-weight:600; cursor:pointer;';

  if (tipo === 'sitio') {
    btnSitio.style.cssText    = estiloActivo;
    btnDelivery.style.cssText = estiloInactivo;
    campoUbic.style.display   = 'none';
    document.getElementById('link-ubicacion').value = '';
  } else {
    btnDelivery.style.cssText = estiloActivo;
    btnSitio.style.cssText    = estiloInactivo;
    campoUbic.style.display   = 'block';
  }
}

// =================== TOAST ===================
function toast(msg, tipo) {
  const t = document.getElementById('toast');
  t.textContent = (tipo === 'err' ? '❌ ' : '✅ ') + msg;
  t.style.borderColor = tipo === 'err' ? 'rgba(204,31,31,0.4)' : 'rgba(39,174,96,0.4)';
  t.style.color = tipo === 'err' ? '#ff6b6b' : '#6bff9e';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// =================== TASA ===================
async function cargarTasa() {
  try {
    const res = await fetch(API + '/configuracion', { headers });
    const data = await res.json();
    if (data.length > 0) {
      tasaDolar = parseFloat(data[0].tasa_dolar) || 0;
      document.getElementById('tasa-display').textContent = 'Bs ' + tasaDolar.toFixed(2);
    }
  } catch(e) {}
}

// =================== MENÚ ===================
async function cargarProductos() {
  try {
    const res = await fetch(API + '/producto', { headers });
    todosProductos = await res.json();
    renderProductos(todosProductos);
  } catch(e) { toast('Error al cargar el menú', 'err'); }
}

function renderProductos(productos) {
  const grid = document.getElementById('productos-grid');
  if (!productos.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;"><div class="empty-icon">🍽️</div>Sin productos</div>';
    return;
  }
  grid.innerHTML = productos.map(p => {
    const emoji = p.tipo === 'parrilla' ? '🥩' : '🧃';
    const imgHtml = p.imagen
      ? `<img src="http://localhost:3000${p.imagen}" alt="${p.nombre}" onerror="this.remove()">`
      : '';
    return `
      <div class="producto-card">
        <div class="producto-img">
          ${imgHtml}
          ${p.imagen ? '' : emoji}
          <span class="producto-tipo-badge">${p.tipo}</span>
        </div>
        <div class="producto-info">
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio-usd">$${parseFloat(p.precio).toFixed(2)}</div>
          <div class="producto-precio-bs">Bs ${(parseFloat(p.precio) * tasaDolar).toFixed(2)}</div>
          <button class="btn-add" onclick="agregarAlCarrito(${p.id_producto})">+ AGREGAR</button>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarMenu(tipo, btn) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProductos(tipo === 'todos' ? todosProductos : todosProductos.filter(p => p.tipo === tipo));
}

// =================== CARRITO ===================
function agregarAlCarrito(id) {
  const p = todosProductos.find(x => x.id_producto == id);
  if (!p) return;
  const ex = carrito.find(c => c.id_producto == id);
  if (ex) ex.cantidad++;
  else carrito.push({ ...p, cantidad: 1 });
  actualizarBadge();
  toast(p.nombre + ' agregado 🔥');
}

function actualizarBadge() {
  const total = carrito.reduce((a, c) => a + c.cantidad, 0);
  const b = document.getElementById('cart-badge');
  b.style.display = total > 0 ? 'flex' : 'none';
  b.textContent = total;
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(c => c.id_producto == id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter(c => c.id_producto != id);
  actualizarBadge();
  renderCarrito();
}

function renderCarrito() {
  const cont     = document.getElementById('carrito-contenido');
  const checkout = document.getElementById('checkout-section');

  if (!carrito.length) {
    cont.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <div style="font-size:14px; margin-bottom:6px;">Tu carrito está vacío</div>
        <div style="font-size:12px;">Agrega productos del menú</div>
        <button class="btn-add" style="margin-top:16px; width:auto; padding:10px 24px;" onclick="showPage('menu')">VER MENÚ</button>
      </div>`;
    checkout.style.display = 'none';
    return;
  }

  cont.innerHTML = carrito.map(item => {
    const emoji = item.tipo === 'parrilla' ? '🥩' : '🧃';
    return `
      <div class="cart-item">
        <div class="cart-item-icon">${emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-nombre">${item.nombre}</div>
          <div class="cart-item-precio">$${(parseFloat(item.precio) * item.cantidad).toFixed(2)}</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="cambiarCantidad(${item.id_producto}, -1)">−</button>
          <span class="qty-num">${item.cantidad}</span>
          <button class="qty-btn" onclick="cambiarCantidad(${item.id_producto}, 1)">+</button>
        </div>
      </div>`;
  }).join('');

  const total = carrito.reduce((a, c) => a + parseFloat(c.precio) * c.cantidad, 0);
  document.getElementById('subtotal-usd').textContent  = '$' + total.toFixed(2);
  document.getElementById('subtotal-bs').textContent   = 'Bs ' + (total * tasaDolar).toFixed(2);
  document.getElementById('total-display').textContent = '$' + total.toFixed(2);
  checkout.style.display = 'block';
}

// =================== MÉTODOS DE PAGO ===================
async function cargarMetodosPago() {
  try {
    const res = await fetch(API + '/metodopago', { headers });
    const metodos = await res.json();
    document.getElementById('metodos-pago-list').innerHTML = metodos.map(m =>
      `<button class="metodo-btn" onclick="seleccionarMetodo(${m.id_metodos_pago}, this)">${m.nombre}</button>`
    ).join('');
  } catch(e) {}
}

function seleccionarMetodo(id, btn) {
  metodoSeleccionado = id;
  document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// =================== REALIZAR PEDIDO ===================
async function realizarPedido() {
  if (!carrito.length)     { toast('Agrega productos al carrito', 'err');  return; }
  if (!metodoSeleccionado) { toast('Selecciona un método de pago', 'err'); return; }

  const ref = document.getElementById('referencia-pago').value.trim();
  if (!ref) { toast('Ingresa el número de referencia', 'err'); return; }

  // Validar link si es delivery
  const linkUbicacion = document.getElementById('link-ubicacion').value.trim();
  if (tipoSeleccionado === 'delivery' && !linkUbicacion) {
    toast('Pega el link de tu ubicación para el delivery', 'err');
    return;
  }

  const total = carrito.reduce((a, c) => a + parseFloat(c.precio) * c.cantidad, 0);
  const btn   = document.getElementById('btn-pedir');
  btn.classList.add('loading');
  btn.textContent = 'PROCESANDO...';

  try {
    const resPedido = await fetch(API + '/pedido', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id_clientes:     idCliente,
        id_metodos_pago: metodoSeleccionado,
        total:           total.toFixed(2),
        total_bs:        (total * tasaDolar).toFixed(2),
        estado:          'pendiente',
        referencia_pago: ref,
        tipo:            tipoSeleccionado,
        link_ubicacion:  tipoSeleccionado === 'delivery' ? linkUbicacion : null,
        ref_foto:        null
      })
    });

    const pedidoData = await resPedido.json();

    if (!resPedido.ok) {
      toast('Error al crear el pedido', 'err');
      btn.classList.remove('loading');
      btn.textContent = 'HACER PEDIDO 🔥';
      return;
    }

    await Promise.all(carrito.map(item =>
      fetch(API + '/detalle', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id_pedidos:      pedidoData.id,
          id_producto:     item.id_producto,
          cantidad:        item.cantidad,
          precio_unitario: parseFloat(item.precio)
        })
      })
    ));

    carrito = [];
    metodoSeleccionado = null;
    tipoSeleccionado = 'sitio';
    document.getElementById('referencia-pago').value = '';
    document.getElementById('link-ubicacion').value  = '';
    seleccionarTipo('sitio');
    actualizarBadge();
    toast('¡Pedido realizado con éxito! 🔥');

    setTimeout(() => {
      showPage('pedidos');
      btn.classList.remove('loading');
      btn.textContent = 'HACER PEDIDO 🔥';
    }, 1500);

  } catch(e) {
    toast('Error de conexión', 'err');
    btn.classList.remove('loading');
    btn.textContent = 'HACER PEDIDO 🔥';
  }
}

// =================== MIS PEDIDOS ===================
async function cargarMisPedidos() {
  try {
    const res = await fetch(API + '/pedido/cliente/' + idCliente, { headers });
    const pedidos = await res.json();
    const cont = document.getElementById('mis-pedidos-list');

    if (!pedidos.length) {
      cont.innerHTML = '<div class="empty"><div class="empty-icon">📋</div>Aún no tienes pedidos</div>';
      return;
    }

    const emojis = { pendiente: '⏳', preparando: '🔥', entregado: '✅', cancelado: '❌' };
    cont.innerHTML = [...pedidos].map(p => `
      <div class="pedido-card">
        <div class="pedido-top">
          <div>
            <div class="pedido-id">Pedido #${p.id_pedidos}</div>
            <div class="pedido-fecha">${new Date(p.fecha).toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
          </div>
          <span class="badge badge-${p.estado}">${emojis[p.estado] || ''} ${p.estado}</span>
        </div>
        <div style="font-size:12px; color:var(--texto2); margin-top:4px;">
          ${p.tipo === 'delivery' ? '🛵 Delivery' : '🪑 En Sitio'}
          ${p.link_ubicacion ? `• <a href="${p.link_ubicacion}" target="_blank" style="color:var(--dorado); font-size:11px;">Ver ubicación</a>` : ''}
        </div>
        <div style="font-size:12px; color:var(--texto2);">💳 Ref: ${p.referencia_pago || '-'}</div>
        <div class="pedido-total">$${parseFloat(p.total||0).toFixed(2)} • Bs ${parseFloat(p.total_bs||0).toFixed(2)}</div>
      </div>
    `).join('');

  } catch(e) { toast('Error al cargar pedidos', 'err'); }
}

// =================== PERFIL ===================
async function cargarPerfil() {
  try {
    const res = await fetch(API + '/pedido/cliente/' + idCliente, { headers });
    const pedidos = await res.json();
    const entregados = pedidos.filter(p => p.estado === 'entregado');
    const total = pedidos.reduce((a, p) => a + parseFloat(p.total || 0), 0);
    document.getElementById('stat-pedidos').textContent    = pedidos.length;
    document.getElementById('stat-gastado').textContent    = '$' + total.toFixed(0);
    document.getElementById('stat-entregados').textContent = entregados.length;
  } catch(e) {}
}

// =================== CERRAR SESIÓN ===================
function cerrarSesion() {
  localStorage.clear();
  window.location.href = 'login.html';
}

// =================== INIT ===================
async function init() {
  await cargarTasa();
  await cargarProductos();
  await cargarMetodosPago();
}

init();