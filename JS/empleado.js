/* ============================================
   EMPLEADO.JS
   ============================================ */

const API = 'http://localhost:3000';
const token = localStorage.getItem('token');
const rol   = localStorage.getItem('rol');
const nombreEmp = localStorage.getItem('nombre') || 'Empleado';

if (!token || rol !== 'empleado') window.location.href = 'login.html';

const H = { 'Content-Type': 'application/json', 'authorization': token };

// Estado global
let tasaDolar        = 0;
let clienteActual    = null;
let carritoEmp       = [];
let todosProductos   = [];
let metodoSeleccionado = null;
let tipoPedido       = 'sitio';
let pedidoActualId   = null;

/* ============================================
   INIT
============================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('emp-user').textContent = nombreEmp;
  iniciar();
});

async function iniciar() {
  await cargarTasa();
  await cargarProductosEmp();
  await cargarMetodosPagoEmp();
  cargarPedidosActivos();
}

/* ============================================
   NAVEGACIÓN
============================================ */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.emp-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('nav-' + page).classList.add('active');
  if (page === 'activos') cargarPedidosActivos();
}

/* ============================================
   TOAST
============================================ */
function toast(msg, tipo) {
  const t = document.getElementById('toast');
  t.textContent = (tipo === 'err' ? '❌ ' : '✅ ') + msg;
  t.className = 'toast show ' + (tipo === 'err' ? 'err' : 'ok');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

/* ============================================
   TASA
============================================ */
async function cargarTasa() {
  try {
    const res = await fetch(API + '/configuracion', { headers: H });
    const data = await res.json();
    if (data.length > 0) {
      tasaDolar = parseFloat(data[0].tasa_dolar) || 0;
      document.getElementById('tasa-chip').textContent = '💵 Bs ' + tasaDolar.toFixed(2);
    }
  } catch(e) {}
}

/* ============================================
   PEDIDOS ACTIVOS
============================================ */
async function cargarPedidosActivos() {
  try {
    const res = await fetch(API + '/pedido', { headers: H });
    const todos = await res.json();

    // Solo pendientes y preparando
    const activos = todos.filter(p => p.estado === 'pendiente' || p.estado === 'preparando')
                         .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const cont = document.getElementById('pedidos-activos-list');

    if (!activos.length) {
      cont.innerHTML = `
        <div class="empty-activos">
          <div class="empty-icon">✅</div>
          <div style="font-size:14px; color:var(--texto);">Sin pedidos activos</div>
          <div style="font-size:12px; margin-top:4px;">Todo al día</div>
        </div>`;
      return;
    }

    cont.innerHTML = activos.map(p => {
      const hora = new Date(p.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
      const esDelivery = p.tipo_pedido === 'delivery';
      return `
        <div class="pedido-activo-card ${p.estado}">
          <div class="ped-top">
            <div>
              <div class="ped-id">Pedido #${p.id_pedidos}</div>
              <div class="ped-hora">${hora}</div>
            </div>
            <span class="badge badge-${p.estado}">${p.estado === 'pendiente' ? '⏳' : '🔥'} ${p.estado}</span>
          </div>
          <div class="ped-tipo">
            ${esDelivery
              ? `<span class="ped-delivery-badge">🛵 DELIVERY</span> ${p.direccion || ''}`
              : '🪑 En Sitio'}
          </div>
          <div style="font-size:12px; color:var(--texto2);">💳 Ref: ${p.referencia_pago || '-'}</div>
          <div class="ped-bottom">
            <div>
              <div class="ped-total">$${parseFloat(p.total||0).toFixed(2)}</div>
              <div class="ped-total-bs">Bs ${parseFloat(p.total_bs||0).toFixed(2)}</div>
            </div>
            <button class="btn-cambiar-estado" onclick="abrirCambiarEstado(${p.id_pedidos}, '${p.estado}')">
              🔄 Estado
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) { toast('Error al cargar pedidos', 'err'); }
}

/* ============================================
   CAMBIAR ESTADO
============================================ */
function abrirCambiarEstado(id, estadoActual) {
  pedidoActualId = id;
  document.getElementById('estado-pedido-id').value = id;
  document.getElementById('estado-pedido-info').textContent = `Pedido #${id} — Estado actual: ${estadoActual}`;
  openModal('modal-estado');
}

async function cambiarEstado(nuevoEstado) {
  const id = pedidoActualId;
  if (!id) { toast('No hay pedido seleccionado', 'err'); return; }
  try {
    const res = await fetch(`${API}/pedido/${id}/estado`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (res.ok) {
      toast('Estado cambiado a: ' + nuevoEstado);
      closeModal('modal-estado');
      cargarPedidosActivos();
    } else { toast('Error al cambiar estado', 'err'); }
  } catch(e) { toast('Error de conexión', 'err'); }
}

/* ============================================
   BUSCAR CLIENTE
============================================ */
async function buscarCliente() {
  const cedula = document.getElementById('cedula-buscar').value.trim();
  if (!cedula) { toast('Ingresa una cédula', 'err'); return; }

  try {
    const res = await fetch(API + '/cliente/cedula/' + cedula, { headers: H });

    if (res.ok) {
      const cliente = await res.json();
      clienteActual = cliente;
      mostrarClienteEncontrado(cliente);
    } else {
      // No encontrado — mostrar formulario
      clienteActual = null;
      document.getElementById('cliente-encontrado').style.display = 'none';
      document.getElementById('form-nuevo-cliente').style.display = 'block';
      document.getElementById('nc-nombre').value   = '';
      document.getElementById('nc-apellido').value = '';
      document.getElementById('nc-telefono').value = '';
    }
  } catch(e) { toast('Error al buscar cliente', 'err'); }
}

function mostrarClienteEncontrado(cliente) {
  document.getElementById('cli-avatar').textContent  = cliente.nombre.charAt(0).toUpperCase();
  document.getElementById('cli-nombre').textContent  = cliente.nombre + ' ' + cliente.apellido;
  document.getElementById('cli-data').textContent    = '📱 ' + (cliente.telefono || '-') + ' | 🪪 ' + cliente.cedula;
  document.getElementById('cliente-encontrado').style.display  = 'block';
  document.getElementById('form-nuevo-cliente').style.display  = 'none';
  toast('Cliente encontrado ✅');
}

function cambiarCliente() {
  clienteActual = null;
  document.getElementById('cedula-buscar').value = '';
  document.getElementById('cliente-encontrado').style.display = 'none';
  document.getElementById('form-nuevo-cliente').style.display = 'none';
}

async function registrarNuevoCliente() {
  const cedula   = document.getElementById('cedula-buscar').value.trim();
  const nombre   = document.getElementById('nc-nombre').value.trim();
  const apellido = document.getElementById('nc-apellido').value.trim();
  const telefono = document.getElementById('nc-telefono').value.trim();

  if (!nombre || !apellido || !cedula) { toast('Completa nombre, apellido y cédula', 'err'); return; }

  try {
    const res = await fetch(API + '/cliente', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        nombre, apellido, cedula, telefono,
        correo: cedula + '@temp.com',
        contraseña: cedula
      })
    });

    const data = await res.json();
    if (res.ok) {
      // Buscar el cliente recién creado
      const resBuscar = await fetch(API + '/cliente/cedula/' + cedula, { headers: H });
      const cliente = await resBuscar.json();
      clienteActual = cliente;
      mostrarClienteEncontrado(cliente);
      toast('Cliente registrado ✅');
    } else { toast(data.mensaje || 'Error al registrar', 'err'); }
  } catch(e) { toast('Error de conexión', 'err'); }
}

/* ============================================
   TIPO DE PEDIDO
============================================ */
function seleccionarTipo(tipo) {
  tipoPedido = tipo;
  document.getElementById('btn-sitio').classList.toggle('active', tipo === 'sitio');
  document.getElementById('btn-delivery').classList.toggle('active', tipo === 'delivery');
  document.getElementById('campo-direccion').style.display = tipo === 'delivery' ? 'block' : 'none';
}

/* ============================================
   PRODUCTOS
============================================ */
async function cargarProductosEmp() {
  try {
    const res = await fetch(API + '/producto', { headers: H });
    todosProductos = await res.json();
    renderProductosEmp(todosProductos);
  } catch(e) { toast('Error al cargar productos', 'err'); }
}

function renderProductosEmp(lista) {
  const grid = document.getElementById('productos-emp-grid');
  if (!lista.length) {
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--texto2); padding:20px;">Sin productos</div>';
    return;
  }

  grid.innerHTML = lista.map(p => {
    const emoji = p.tipo === 'parrilla' ? '🥩' : '🧃';
    return `
      <div class="prod-emp-card">
        <div class="prod-emp-emoji">${emoji}</div>
        <div class="prod-emp-nombre">${p.nombre}</div>
        <div class="prod-emp-precio">$${parseFloat(p.precio).toFixed(2)}</div>
        <div class="prod-emp-bs">Bs ${(parseFloat(p.precio) * tasaDolar).toFixed(2)}</div>
        <button class="btn-emp-add" onclick="agregarCarritoEmp(${p.id_producto})">+ AGREGAR</button>
      </div>
    `;
  }).join('');
}

function filtrarProductos(tipo, btn) {
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProductosEmp(tipo === 'todos' ? todosProductos : todosProductos.filter(p => p.tipo === tipo));
}

/* ============================================
   CARRITO EMPLEADO
============================================ */
function agregarCarritoEmp(id) {
  const p = todosProductos.find(x => x.id_producto == id);
  if (!p) return;
  const ex = carritoEmp.find(c => c.id_producto == id);
  if (ex) ex.cantidad++;
  else carritoEmp.push({ ...p, cantidad: 1 });
  renderCarritoEmp();
  toast(p.nombre + ' agregado');
}

function cambiarCantidadEmp(id, delta) {
  const item = carritoEmp.find(c => c.id_producto == id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carritoEmp = carritoEmp.filter(c => c.id_producto != id);
  renderCarritoEmp();
}

function renderCarritoEmp() {
  const cont    = document.getElementById('carrito-emp-list');
  const resumen = document.getElementById('resumen-emp');

  if (!carritoEmp.length) {
    cont.innerHTML = '<div style="text-align:center; color:var(--texto2); font-size:12px; padding:16px;">Sin productos agregados</div>';
    resumen.style.display = 'none';
    return;
  }

  cont.innerHTML = carritoEmp.map(item => `
    <div class="cart-emp-item">
      <div class="cart-emp-emoji">${item.tipo === 'parrilla' ? '🥩' : '🧃'}</div>
      <div class="cart-emp-info">
        <div class="cart-emp-nombre">${item.nombre}</div>
        <div class="cart-emp-precio">$${(parseFloat(item.precio) * item.cantidad).toFixed(2)}</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="cambiarCantidadEmp(${item.id_producto}, -1)">−</button>
        <span class="qty-num">${item.cantidad}</span>
        <button class="qty-btn" onclick="cambiarCantidadEmp(${item.id_producto}, 1)">+</button>
      </div>
    </div>
  `).join('');

  const total = carritoEmp.reduce((a, c) => a + parseFloat(c.precio) * c.cantidad, 0);
  document.getElementById('emp-subtotal-usd').textContent = '$' + total.toFixed(2);
  document.getElementById('emp-subtotal-bs').textContent  = 'Bs ' + (total * tasaDolar).toFixed(2);
  document.getElementById('emp-total').textContent        = '$' + total.toFixed(2);
  resumen.style.display = 'block';
}

/* ============================================
   MÉTODOS DE PAGO
============================================ */
async function cargarMetodosPagoEmp() {
  try {
    const res = await fetch(API + '/metodopago', { headers: H });
    const metodos = await res.json();
    document.getElementById('emp-metodos-list').innerHTML = metodos.map(m => `
      <button class="metodo-pill" onclick="seleccionarMetodoEmp(${m.id_metodos_pago}, this)">${m.nombre}</button>
    `).join('');
  } catch(e) {}
}

function seleccionarMetodoEmp(id, btn) {
  metodoSeleccionado = id;
  document.querySelectorAll('.metodo-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ============================================
   CONFIRMAR PEDIDO
============================================ */
async function confirmarPedido() {
  if (!clienteActual)        { toast('Busca o registra un cliente primero', 'err'); return; }
  if (!carritoEmp.length)    { toast('Agrega productos al pedido', 'err');          return; }
  if (!metodoSeleccionado)   { toast('Selecciona un método de pago', 'err');        return; }

  const ref = document.getElementById('emp-referencia').value.trim();
  if (!ref) { toast('Ingresa la referencia de pago', 'err'); return; }

  if (tipoPedido === 'delivery') {
    const dir = document.getElementById('direccion-input').value.trim();
    if (!dir) { toast('Ingresa la dirección de entrega', 'err'); return; }
  }

  const total    = carritoEmp.reduce((a, c) => a + parseFloat(c.precio) * c.cantidad, 0);
  const totalBs  = total * tasaDolar;
  const direccion = tipoPedido === 'delivery' ? document.getElementById('direccion-input').value.trim() : null;

  try {
    const resPed = await fetch(API + '/pedido', {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        id_clientes:     clienteActual.id_clientes,
        id_metodos_pago: metodoSeleccionado,
        total:           total.toFixed(2),
        total_bs:        totalBs.toFixed(2),
        estado:          'pendiente',
        referencia_pago: ref,
        ref_foto:        null,
        tipo_pedido:     tipoPedido,
        direccion:       direccion
      })
    });

    const pedidoData = await resPed.json();
    if (!resPed.ok) { toast('Error al crear pedido', 'err'); return; }

    // Crear detalles
    await Promise.all(carritoEmp.map(item =>
      fetch(API + '/detalle', {
        method: 'POST',
        headers: H,
        body: JSON.stringify({
          id_pedidos:      pedidoData.id,
          id_producto:     item.id_producto,
          cantidad:        item.cantidad,
          precio_unitario: parseFloat(item.precio)
        })
      })
    ));

    toast('¡Pedido #' + pedidoData.id + ' creado! 🔥');

    // Limpiar
    carritoEmp       = [];
    clienteActual    = null;
    metodoSeleccionado = null;
    tipoPedido       = 'sitio';
    document.getElementById('cedula-buscar').value    = '';
    document.getElementById('emp-referencia').value   = '';
    document.getElementById('direccion-input').value  = '';
    document.getElementById('cliente-encontrado').style.display = 'none';
    document.getElementById('form-nuevo-cliente').style.display = 'none';
    seleccionarTipo('sitio');
    renderCarritoEmp();
    document.querySelectorAll('.metodo-pill').forEach(b => b.classList.remove('active'));

    setTimeout(() => showPage('activos'), 1000);

  } catch(e) { toast('Error de conexión', 'err'); }
}

/* ============================================
   CERRAR SESIÓN
============================================ */
function cerrarSesion() {
  localStorage.clear();
  window.location.href = 'login.html';
}
