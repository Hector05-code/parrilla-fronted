
  const API = 'http://localhost:3000';
  const token = localStorage.getItem('token');
  const nombre = localStorage.getItem('nombre') || 'Admin';
  let productoEditandoId = null;
let imagenFile = null;
const H = { 'Content-Type': 'application/json', 'authorization': token };

  if (!token || localStorage.getItem('rol') !== 'admin') {
    window.location.href = 'login.html';
  }

  // Headers
  const headers = { 'Content-Type': 'application/json', 'authorization': token };

  // Estado global
  let tasaDolar = 0;
  let todosLosPedidos = [];
  let todosLosProductos = [];

  // Init
  document.getElementById('admin-name').textContent = nombre;
  document.getElementById('admin-avatar').textContent = nombre.charAt(0).toUpperCase();

  // =================== NAVEGACIÓN ===================
  function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelector(`[onclick="showPage('${page}')"]`).classList.add('active');

    const titles = {
      inicio: ['INICIO', 'Resumen del día'],
      pedidos: ['PEDIDOS', 'Gestión de pedidos'],
      productos: ['PRODUCTOS', 'Catálogo de productos'],
      inventario: ['INVENTARIO', 'Stock de bebidas'],
      clientes: ['CLIENTES', 'Clientes registrados'],
      ventas: ['VENTAS', 'Reporte de ventas'],
      configuracion: ['CONFIGURACIÓN', 'Ajustes del sistema']
    };

    document.getElementById('topbar-title').textContent = titles[page][0];
    document.getElementById('topbar-sub').textContent = titles[page][1];
    closeSidebar();

    if (page === 'pedidos') cargarPedidos();
    if (page === 'productos') cargarProductos();
    if (page === 'inventario') cargarInventario();
    if (page === 'clientes') cargarClientes();
    if (page === 'ventas') cargarVentas();
    if (page === 'configuracion') cargarConfiguracion();
  }

  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay-bg').classList.toggle('show');
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay-bg').classList.remove('show');
  }

  // =================== TOAST ===================
  function toast(msg, tipo = 'ok') {
    const t = document.getElementById('toast');
    t.textContent = (tipo === 'ok' ? '✅ ' : '❌ ') + msg;
    t.style.borderColor = tipo === 'ok' ? 'rgba(39,174,96,0.4)' : 'rgba(204,31,31,0.4)';
    t.style.color = tipo === 'ok' ? '#6bff9e' : '#ff6b6b';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  // =================== MODAL ===================
  function cerrarModal(id) { document.getElementById(id).classList.remove('show'); }

  // =================== TASA ===================
async function cargarTasa() {
    try {
      const res = await fetch(`${API}/configuracion`, { headers });
      console.log('Status configuracion:', res.status); // ← agregá esto
      const data = await res.json();
      console.log('Data configuracion:', data); // ← y esto
      if (data.length > 0) {
        tasaDolar = parseFloat(data[0].tasa_dolar) || 0;
        document.getElementById('tasa-display').textContent = `💵 Tasa: Bs ${tasaDolar.toFixed(2)}`;
        document.getElementById('nueva-tasa').value = tasaDolar;
      }
    } catch (e) { console.error('Error tasa:', e); }
  }

  async function actualizarTasa() {
    const nueva = parseFloat(document.getElementById('nueva-tasa').value);
    if (!nueva || nueva <= 0) { toast('Ingresa una tasa válida', 'err'); return; }

    try {
      const resConfig = await fetch(`${API}/configuracion`, { headers });
      const configs = await resConfig.json();

      let res;
      if (configs.length > 0) {
        res = await fetch(`${API}/configuracion/${configs[0].id_configuracion}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ tasa_dolar: nueva })
        });
      } else {
        res = await fetch(`${API}/configuracion`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ tasa_dolar: nueva })
        });
      }

      if (res.ok) {
        tasaDolar = nueva;
        document.getElementById('tasa-display').textContent = `💵 Tasa: Bs ${tasaDolar.toFixed(2)}`;
        toast('Tasa actualizada correctamente');
        cargarProductos();
        cargarPrecios();
      }
    } catch (e) { toast('Error al actualizar tasa', 'err'); }
  }

  // =================== INICIO ===================
  async function cargarInicio() {
    await cargarTasa();
    await cargarEstadisticas();
    await cargarPedidosRecientes();
    await cargarChartVentas();
    await cargarStockCritico();
  }

  async function cargarEstadisticas() {
    try {
      const [pedRes, cliRes] = await Promise.all([
        fetch(`${API}/pedido`, { headers }),
        fetch(`${API}/cliente`, { headers })
      ]);

      const pedidos = await pedRes.json();
      const clientes = await cliRes.json();

      const hoy = new Date().toDateString();
      const pedidosHoy = pedidos.filter(p => new Date(p.fecha).toDateString() === hoy);
      const pendientes = pedidos.filter(p => p.estado === 'pendiente');
      const ventasHoy = pedidosHoy.filter(p => p.estado === 'entregado').reduce((a, p) => a + parseFloat(p.total || 0), 0);

      document.getElementById('stat-pedidos-hoy').textContent = pedidosHoy.length;
      document.getElementById('stat-ventas-hoy').textContent = `$${ventasHoy.toFixed(2)}`;
      document.getElementById('stat-pendientes').textContent = pendientes.length;
      document.getElementById('stat-clientes').textContent = clientes.length;
      document.getElementById('badge-pedidos').textContent = pendientes.length;

      todosLosPedidos = pedidos;
    } catch (e) { console.error(e); }
  }

  async function cargarPedidosRecientes() {
    const cont = document.getElementById('pedidos-recientes-list');
    if (todosLosPedidos.length === 0) {
      cont.innerHTML = '<div class="empty"><div class="empty-icon">📋</div>Sin pedidos recientes</div>';
      return;
    }

    const recientes = todosLosPedidos.slice(-5).reverse();
    cont.innerHTML = recientes.map(p => `
      <div class="pedido-item" style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
        <div>
          <div style="font-size:13px; font-weight:600;">#${p.id_pedidos}</div>
          <div style="font-size:11px; color:var(--texto2);">${new Date(p.fecha).toLocaleDateString('es-VE')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px; color:var(--dorado);">$${parseFloat(p.total||0).toFixed(2)}</div>
          <span class="badge badge-${p.estado}">${p.estado}</span>
        </div>
      </div>
    `).join('');
  }

  function cargarChartVentas() {
    const dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    const valores = dias.map(() => Math.random() * 100);
    const max = Math.max(...valores);
    const chart = document.getElementById('chart-ventas');
    const labels = document.getElementById('chart-labels');

    chart.innerHTML = valores.map((v, i) => `
      <div class="bar-wrap">
        <div class="bar" style="height:${(v/max)*100}%" data-val="$${v.toFixed(0)}"></div>
      </div>
    `).join('');

    labels.innerHTML = dias.map(d => `<span style="flex:1; text-align:center; font-size:9px; color:var(--texto2);">${d}</span>`).join('');
  }

  async function cargarStockCritico() {
    try {
      const res = await fetch(`${API}/bebida`, { headers });
      const bebidas = await res.json();
      const cont = document.getElementById('stock-critico-list');
      const criticas = bebidas.filter(b => b.stock < 10);

      if (criticas.length === 0) {
        cont.innerHTML = '<div class="empty"><div class="empty-icon">✅</div>Todo el stock está bien</div>';
        return;
      }

      cont.innerHTML = criticas.map(b => {
        const pct = Math.min((b.stock / 20) * 100, 100);
        const cls = b.stock < 5 ? 'stock-critical' : 'stock-low';
        return `
          <div class="inv-item">
            <span class="inv-name">${b.nombre}</span>
            <div class="inv-bar-wrap"><div class="inv-bar ${cls}" style="width:${pct}%"></div></div>
            <span class="inv-stock ${cls}">${b.stock} uds</span>
          </div>
        `;
      }).join('');
    } catch (e) { console.error(e); }
  }

  // =================== PEDIDOS ===================
async function cargarPedidos() {
    try {
      const [resPedidos, resClientes] = await Promise.all([
        fetch(`${API}/pedido`, { headers }),
        fetch(`${API}/cliente`, { headers })
      ]);

      const pedidos   = await resPedidos.json();
      const clientes  = await resClientes.json();

      // Crear mapa id_clientes → nombre completo
      const mapaClientes = {};
      clientes.forEach(c => {
        mapaClientes[c.id_clientes] = `${c.nombre} ${c.apellido}`;
      });

      // Inyectar el nombre del cliente en cada pedido
      todosLosPedidos = pedidos.map(p => ({
        ...p,
        cliente: mapaClientes[p.id_clientes] || `Cliente ${p.id_clientes}`
      }));
      
      todosLosPedidos = todosLosPedidos.filter(p => p.estado !== 'entregado' && p.estado !== 'cancelado');
      renderPedidos(todosLosPedidos);
    } catch (e) { toast('Error al cargar pedidos', 'err'); }
  }

  function renderPedidos(pedidos) {
    const tbody = document.getElementById('pedidos-tbody');
    document.getElementById('pedidos-count').textContent = `${pedidos.length} pedidos`;

    if (pedidos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty"><div class="empty-icon">📋</div>Sin pedidos</td></tr>';
      return;
    }

    tbody.innerHTML = pedidos.map(p => `
      <tr>
        <td><strong>#${p.id_pedidos}</strong></td>
        <td>${p.cliente}</td>
        <td>${new Date(p.fecha).toLocaleDateString('es-VE')}</td>
        <td style="color:var(--dorado);">$${parseFloat(p.total||0).toFixed(2)}</td>
        <td style="font-size:11px; color:var(--texto2);">${p.referencia_pago || '-'}</td>
        <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
        <td><button class="btn btn-ghost btn-sm" onclick="abrirModalPedido(${p.id_pedidos}, '${p.estado}', '${p.referencia_pago||''}')">✏️ Editar</button></td>
      </tr>
    `).join('');
  }

  function filtrarPedidos(estado) {
    if (estado === 'todos') renderPedidos(todosLosPedidos);
    else renderPedidos(todosLosPedidos.filter(p => p.estado === estado));
  }

  function abrirModalPedido(id, estado, ref) {
    document.getElementById('modal-pedido-id').value = id;
    document.getElementById('modal-pedido-estado').value = estado;
    document.getElementById('modal-pedido-ref').value = ref;
    document.getElementById('modal-pedido').classList.add('show');
  }

  async function guardarPedido() {
    const id = document.getElementById('modal-pedido-id').value;
    const estado = document.getElementById('modal-pedido-estado').value;
    const ref = document.getElementById('modal-pedido-ref').value;

    const pedido = todosLosPedidos.find(p => p.id_pedidos == id);
    if (!pedido) return;

    try {
      const res = await fetch(`${API}/pedido/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...pedido, estado, referencia_pago: ref })
      });

      if (res.ok) {
        toast('Pedido actualizado');
        cerrarModal('modal-pedido');
        cargarPedidos();
        cargarEstadisticas();
      }
    } catch (e) { toast('Error al actualizar pedido', 'err'); }
  }

  // =================== PRODUCTOS ===================
  async function cargarProductos() {
    try {
      const res = await fetch(`${API}/producto`, { headers });
      todosLosProductos = await res.json();
      renderProductos();
    } catch (e) { toast('Error al cargar productos', 'err'); }
  }

  function renderProductos() {
    const tbody = document.getElementById('productos-tbody');
    if (todosLosProductos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Sin productos</td></tr>';
      return;
    }

    tbody.innerHTML = todosLosProductos.map(p => `
      <tr>
        <td>#${p.id_producto}</td>
        <td>${p.nombre}</td>
        <td><span class="badge ${p.tipo === 'parrilla' ? 'badge-preparando' : 'badge-pendiente'}">${p.tipo}</span></td>
        <td style="color:var(--dorado);">$${parseFloat(p.precio).toFixed(2)}</td>
        <td style="color:var(--texto2);">Bs ${(parseFloat(p.precio) * tasaDolar).toFixed(2)}</td>
        <td style="display:flex; gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="abrirModalProducto(${p.id_producto})">✏️</button>
          <button class="btn btn-red btn-sm" onclick="eliminarProducto(${p.id_producto})">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  function abrirModalProducto(id = null) {
    productoEditandoId = id;
    imagenFile = null;

    if (id) {
        const p = todosLosProductos.find(x => x.id_producto == id);
        document.getElementById('modal-producto-title').textContent = '✏️ Editar Producto';
        document.getElementById('mprod-nombre').value = p.nombre;
        document.getElementById('mprod-precio').value = p.precio;
        document.getElementById('mprod-tipo').value = p.tipo;
        document.getElementById('mprod-tamano').value = p.tamano || 'mediana';
        document.getElementById('mprod-stock').value = '0';

        // Mostrar imagen existente si es bebida y tiene imagen
        const preview = document.getElementById('mprod-img-preview');
        const label   = document.getElementById('mprod-img-label');
        if (p.tipo === 'bebida' && p.imagen) {
            preview.src = p.imagen;
            preview.style.display = 'block';
            label.style.display = 'none';
        } else {
            preview.style.display = 'none';
            label.style.display = 'flex';
        }

        toggleTipoFields(p.tipo);
        if (p.tipo === 'bebida') cargarCategorias();
    } else {
        document.getElementById('modal-producto-title').textContent = '+ Nuevo Producto';
        document.getElementById('mprod-nombre').value = '';
        document.getElementById('mprod-precio').value = '';
        document.getElementById('mprod-tipo').value = 'parrilla';
        document.getElementById('mprod-tamano').value = 'mediana';
        document.getElementById('mprod-stock').value = '0';
        document.getElementById('mprod-img-preview').style.display = 'none';
        document.getElementById('mprod-img-label').style.display = 'flex';
        toggleTipoFields('parrilla');
        cargarCategorias(); // cargar siempre para que estén listas al cambiar a bebida
    }

    document.getElementById('modal-producto').classList.add('show');
}

async function guardarProducto() {
    const nombre = document.getElementById('mprod-nombre').value.trim();
    const precio = parseFloat(document.getElementById('mprod-precio').value);
    const tipo   = document.getElementById('mprod-tipo').value;
    const tamano = document.getElementById('mprod-tamano').value;

    if (!nombre || !precio) { toast('Completa todos los campos', 'err'); return; }

    try {
        // Paso 1 — crear en producto
        const resP = await fetch(API + '/producto', {
            method: 'POST',
            headers: H,
            body: JSON.stringify({ nombre, precio, tipo })
        });

        const prodData = await resP.json();
        if (!resP.ok) { toast('Error al crear producto', 'err'); return; }

        const idProducto = prodData.id;

        // Paso 2 — según tipo
        if (tipo === 'parrilla') {
            await fetch(API + '/parrilla', {
                method: 'POST',
                headers: H,
                body: JSON.stringify({ id_producto: idProducto, tamaño: tamano })
            });
        } else if (tipo === 'bebida') {
            let imagenUrl = null;
            if (imagenFile) {
                const formData = new FormData();
                formData.append('imagen', imagenFile);
                const resImg = await fetch(API + '/upload', {
                    method: 'POST',
                    headers: { 'authorization': token },
                    body: formData
                });
                const imgData = await resImg.json();
                imagenUrl = imgData.url;
            }

            await fetch(API + '/bebida', {
                method: 'POST',
                headers: H,
                body: JSON.stringify({
                    fk_producto_bebidas:  idProducto,
                    nombre:               nombre,
                    id_categoria_bebidas: parseInt(document.getElementById('mprod-categoria').value) || 1,
                    stock:                parseInt(document.getElementById('mprod-stock').value) || 0,
                    imagen:               imagenUrl
                })
            });
        }

        toast(tipo === 'parrilla' ? '🥩 Parrilla creada' : '🧃 Bebida creada');
        document.getElementById('modal-producto').classList.remove('show');
        imagenFile = null;
        cargarProductos();

    } catch (e) { toast('Error de conexión', 'err'); }
}

async function guardarProducto() {
    const nombre = document.getElementById('mprod-nombre').value.trim();
    const precio = parseFloat(document.getElementById('mprod-precio').value);
    const tipo   = document.getElementById('mprod-tipo').value;
    const tamano = document.getElementById('mprod-tamano').value;

    if (!nombre || !precio) { toast('Completa todos los campos', 'err'); return; }

    try {
        // Paso 1 — crear en producto
        const resP = await fetch(API + '/producto', {
            method: 'POST',
            headers: H,
            body: JSON.stringify({ nombre, precio, tipo })
        });

        const prodData = await resP.json();
        if (!resP.ok) { toast('Error al crear producto', 'err'); return; }

        const idProducto = prodData.id;

        // Paso 2 — según tipo
        if (tipo === 'parrilla') {
            await fetch(API + '/parrilla', {
                method: 'POST',
                headers: H,
                body: JSON.stringify({ id_producto: idProducto, tamaño: tamano })
            });
        } else if (tipo === 'bebida') {
            let imagenUrl = null;
            if (imagenFile) {
                const formData = new FormData();
                formData.append('imagen', imagenFile);
                const resImg = await fetch(API + '/upload', {
                    method: 'POST',
                    headers: { 'authorization': token },
                    body: formData
                });
                const imgData = await resImg.json();
                imagenUrl = imgData.url;
            }

            await fetch(API + '/bebida', {
                method: 'POST',
                headers: H,
                body: JSON.stringify({
                    fk_producto_bebidas:  idProducto,
                    nombre:               nombre,
                    id_categoria_bebidas: parseInt(document.getElementById('mprod-categoria').value) || 1,
                    stock:                parseInt(document.getElementById('mprod-stock').value) || 0,
                    imagen:               imagenUrl
                })
            });
        }

        toast(tipo === 'parrilla' ? '🥩 Parrilla creada' : '🧃 Bebida creada');
        document.getElementById('modal-producto').classList.remove('show');
        imagenFile = null;
        cargarProductos();

    } catch (e) { toast('Error de conexión', 'err'); }
}

  async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      const res = await fetch(`${API}/producto/${id}`, { method: 'DELETE', headers });
      if (res.ok) { toast('Producto eliminado'); cargarProductos(); }
    } catch (e) { toast('Error al eliminar', 'err'); }
  }

  function abrirModalBebida() {
    abrirModalProducto();
}
  // =================== INVENTARIO ===================
  async function cargarInventario() {
    try {
      const res = await fetch(`${API}/bebida`, { headers });
      const bebidas = await res.json();
      const cont = document.getElementById('inventario-list');

      if (bebidas.length === 0) {
        cont.innerHTML = '<div class="empty"><div class="empty-icon">🧃</div>Sin bebidas en inventario</div>';
        return;
      }

      cont.innerHTML = `<div class="inv-grid">${bebidas.map(b => {
        const cls = b.stock < 5 ? 'stock-critical' : b.stock < 15 ? 'stock-low' : 'stock-ok';
        const pct = Math.min((b.stock / 50) * 100, 100);
        const imgHtml = b.imagen
          ? `<img src="http://localhost:3000${b.imagen}" alt="${b.nombre}" class="inv-card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
          : '';
        const placeholderStyle = b.imagen ? 'display:none' : 'display:flex';
        return `
          <div class="inv-card">
            <div class="inv-card-photo">
              ${imgHtml}
              <div class="inv-card-placeholder" style="${placeholderStyle}">🧃</div>
            </div>
            <div class="inv-card-body">
              <div class="inv-card-nombre">${b.nombre}</div>
              <div class="inv-bar-wrap" style="margin:6px 0;">
                <div class="inv-bar ${cls}" style="width:${pct}%"></div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="inv-stock ${cls}">${b.stock} uds</span>
                <button class="btn btn-ghost btn-sm" onclick="editarStock(${b.id_bebidas}, ${b.stock})">✏️ Editar</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}</div>`;
    } catch (e) { toast('Error al cargar inventario', 'err'); }
  }

  async function editarStock(id, stockActual) {
    const nuevo = prompt(`Stock actual: ${stockActual}\nNuevo stock:`, stockActual);
    if (nuevo === null || isNaN(nuevo)) return;

    try {
      const resB = await fetch(`${API}/bebida/${id}`, { headers });
      const bebida = await resB.json();
      const res = await fetch(`${API}/bebida/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...bebida, stock: parseInt(nuevo) })
      });
      if (res.ok) { toast('Stock actualizado'); cargarInventario(); }
    } catch (e) { toast('Error al actualizar stock', 'err'); }
  }

function abrirNuevoProducto() {
    productoEditandoId = null;
    imagenFile = null;
    document.getElementById('modal-producto-title').textContent = '+ Nuevo Producto';
    document.getElementById('mprod-nombre').value = '';
    document.getElementById('mprod-precio').value = '';
    document.getElementById('mprod-tipo').value = 'parrilla';
    document.getElementById('mprod-tamano').value = 'mediana';
    document.getElementById('mprod-stock').value = '0';
    document.getElementById('mprod-img-preview').style.display = 'none';
    document.getElementById('mprod-img-label').style.display = 'flex';
    toggleTipoFields('parrilla');
    cargarCategorias(); // cargar siempre para que estén listas al cambiar a bebida
    document.getElementById('modal-producto').classList.add('show');
}

function toggleTipoFields(tipo) {
    document.getElementById('campo-tamano').style.display = tipo === 'parrilla' ? 'block' : 'none';
    document.getElementById('campo-imagen').style.display = tipo === 'bebida' ? 'block' : 'none';
}

function onTipoChange() {
    const tipo = document.getElementById('mprod-tipo').value;
    toggleTipoFields(tipo);
    if (tipo === 'bebida') cargarCategorias(); // ← estaba faltando
}

function onImagenSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    imagenFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById('mprod-img-preview').src = ev.target.result;
        document.getElementById('mprod-img-preview').style.display = 'block';
        document.getElementById('mprod-img-label').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

  // =================== CLIENTES ===================
  async function cargarClientes() {
    try {
      const res = await fetch(`${API}/cliente`, { headers });
      const clientes = await res.json();
      const cont = document.getElementById('clientes-list');
      document.getElementById('clientes-count').textContent = `${clientes.length} clientes`;

      if (clientes.length === 0) {
        cont.innerHTML = '<div class="empty"><div class="empty-icon">👥</div>Sin clientes registrados</div>';
        return;
      }

      cont.innerHTML = clientes.map(c => `
        <div class="cliente-item">
          <div class="cliente-avatar">${c.nombre.charAt(0).toUpperCase()}</div>
          <div class="cliente-info">
            <div class="cliente-nombre">${c.nombre} ${c.apellido}</div>
            <div class="cliente-data">📱 ${c.telefono || 'Sin teléfono'} &nbsp;|&nbsp; 🪪 ${c.cedula}</div>
            <div class="cliente-data" style="color:var(--dorado); font-size:10px;">${c.correo || ''}</div>
          </div>
        </div>
      `).join('');
    } catch (e) { toast('Error al cargar clientes', 'err'); }
  }

// =================== VENTAS ===================
async function cargarVentas() {
  try {
    const [resPedidos, resClientes] = await Promise.all([
      fetch(`${API}/pedido`, { headers }),
      fetch(`${API}/cliente`, { headers })
    ]);
    const pedidos  = await resPedidos.json();
    const clientes = await resClientes.json();

    const mapaClientes = {};
    clientes.forEach(c => {
      mapaClientes[c.id_clientes] = `${c.nombre} ${c.apellido}`;
    });

    const entregados = pedidos.filter(p => p.estado === 'entregado');
    const totalMes = entregados.reduce((a, p) => a + parseFloat(p.total || 0), 0);
    const ticket = entregados.length > 0 ? totalMes / entregados.length : 0;

    document.getElementById('total-ventas-mes').textContent = `$${totalMes.toFixed(2)}`;
    document.getElementById('total-pedidos-mes').textContent = entregados.length;
    document.getElementById('ticket-promedio').textContent = `$${ticket.toFixed(2)}`;

    const tbody = document.getElementById('ventas-tbody');
    tbody.innerHTML = pedidos.reverse().map(p => {
      const nombreCliente = (mapaClientes[p.id_clientes] || `Cliente ${p.id_clientes}`).replace(/'/g, '');
      const fecha = p.fecha;
      return `
        <tr style="cursor:pointer;" onclick="window.verDetalleVenta(${p.id_pedidos}, '${nombreCliente}', '${fecha}', ${p.total||0}, ${p.total_bs||0}, '${p.estado}')">
          <td>#${p.id_pedidos}</td>
          <td>${new Date(p.fecha).toLocaleDateString('es-VE')}</td>
          <td>${mapaClientes[p.id_clientes] || `Cliente ${p.id_clientes}`}</td>
          <td style="color:var(--dorado);">$${parseFloat(p.total||0).toFixed(2)}</td>
          <td style="color:var(--texto2);">Bs ${(parseFloat(p.total||0) * tasaDolar).toFixed(2)}</td>
          <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
        </tr>
      `;
    }).join('');
  } catch (e) { toast('Error al cargar ventas', 'err'); }
}

async function verDetalleVenta(idPedido, cliente, fecha, total, totalBs, estado) {
  const cont = document.getElementById('detalle-venta-content');
  cont.innerHTML = '<div style="text-align:center; padding:20px; color:var(--texto2);">Cargando...</div>';
  document.getElementById('modal-detalle-venta').classList.add('show');

  try {
    const res = await fetch(`${API}/detalle/pedido/${idPedido}`, { headers });
    const detalles = await res.json();

    const estadoBadge = {
      pendiente: '⏳', preparando: '🔥', entregado: '✅', cancelado: '❌'
    };

    cont.innerHTML = `
      <div style="background:rgba(245,168,0,0.05); border:1px solid rgba(245,168,0,0.1); border-radius:10px; padding:14px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span style="font-size:13px; color:var(--texto2);">Pedido</span>
          <span style="font-size:13px; font-weight:600;">#${idPedido}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span style="font-size:13px; color:var(--texto2);">Cliente</span>
          <span style="font-size:13px; font-weight:600;">${cliente}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span style="font-size:13px; color:var(--texto2);">Fecha</span>
          <span style="font-size:13px;">${new Date(fecha).toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="font-size:13px; color:var(--texto2);">Estado</span>
          <span class="badge badge-${estado}">${estadoBadge[estado] || ''} ${estado}</span>
        </div>
      </div>

      <div style="font-size:12px; color:var(--texto2); margin-bottom:8px; font-weight:600;">PRODUCTOS</div>

      ${detalles.length === 0
        ? '<div style="text-align:center; color:var(--texto2); padding:16px;">Sin productos registrados</div>'
        : detalles.map(d => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <div>
              <div style="font-size:13px; font-weight:600;">${d.nombre || 'Producto #' + d.id_producto}</div>
              <div style="font-size:11px; color:var(--texto2);">x${d.cantidad} × $${parseFloat(d.precio_unitario).toFixed(2)}</div>
            </div>
            <div style="color:var(--dorado); font-weight:600;">$${(d.cantidad * parseFloat(d.precio_unitario)).toFixed(2)}</div>
          </div>
        `).join('')
      }

      <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.07);">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:var(--texto2); font-size:13px;">Total USD</span>
          <span style="color:var(--dorado); font-weight:700; font-size:15px;">$${parseFloat(total).toFixed(2)}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--texto2); font-size:13px;">Total Bs</span>
          <span style="color:#27ae60; font-weight:600; font-size:13px;">Bs ${parseFloat(totalBs || 0).toFixed(2)}</span>
        </div>
      </div>
    `;
  } catch(e) {
    cont.innerHTML = '<div style="text-align:center; color:#ff6b6b; padding:16px;">Error al cargar detalles</div>';
  }
}

// ← AGREGÁ ESTAS LÍNEAS AL FINAL DEL ARCHIVO
window.verDetalleVenta = verDetalleVenta;
window.cerrarModal = cerrarModal;

  // =================== CONFIGURACIÓN ===================
  async function cargarConfiguracion() {
    await cargarTasa();
    await cargarPrecios();
  }

  async function cargarPrecios() {
    try {
      const res = await fetch(`${API}/producto`, { headers });
      todosLosProductos = await res.json();
      const cont = document.getElementById('precios-productos-list');

      cont.innerHTML = todosLosProductos.map(p => `
        <div class="precio-item">
          <span class="precio-nombre">${p.tipo === 'parrilla' ? '🥩' : '🧃'} ${p.nombre}</span>
          <span class="precio-bs">Bs ${(parseFloat(p.precio) * tasaDolar).toFixed(2)}</span>
          <input type="number" class="input precio-input" id="precio-${p.id_producto}" value="${parseFloat(p.precio).toFixed(2)}" step="0.01" oninput="actualizarPrecioBs(${p.id_producto})" />
        </div>
      `).join('');
    } catch (e) { toast('Error al cargar precios', 'err'); }
  }

  function actualizarPrecioBs(id) {
    const val = parseFloat(document.getElementById(`precio-${id}`).value) || 0;
    const item = document.querySelector(`#precio-${id}`).closest('.precio-item');
    item.querySelector('.precio-bs').textContent = `Bs ${(val * tasaDolar).toFixed(2)}`;
  }

  async function guardarPrecios() {
    try {
      const promises = todosLosProductos.map(p => {
        const nuevo = parseFloat(document.getElementById(`precio-${p.id_producto}`).value);
        return fetch(`${API}/producto/${p.id_producto}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ nombre: p.nombre, precio: nuevo, tipo: p.tipo })
        });
      });

      await Promise.all(promises);
      toast('Precios actualizados correctamente');
      cargarProductos();
    } catch (e) { toast('Error al guardar precios', 'err'); }
  }

  // =================== LOGOUT ===================
  function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
  }

  // =================== CATEGORÍAS ===================
async function cargarCategorias() {
    try {
        const res = await fetch(API + '/categoria', { headers });
        const cats = await res.json();
        const select = document.getElementById('mprod-categoria');

        if (cats.length === 0) {
            select.innerHTML = '<option value="">Sin categorías — crea una</option>';
            return;
        }

        select.innerHTML = cats.map(c =>
            `<option value="${c.id_categoria_bebidas}">${c.nombre_categoria}</option>`
        ).join('');
    } catch (e) { toast('Error al cargar categorías', 'err'); }
}

function mostrarNuevaCategoria() {
    const campo = document.getElementById('campo-nueva-categoria');
    campo.style.display = campo.style.display === 'none' ? 'block' : 'none';
    document.getElementById('mprod-nueva-categoria').value = '';
}

async function crearCategoria() {
    const nombre = document.getElementById('mprod-nueva-categoria').value.trim();
    console.log('🔵 crearCategoria llamada, nombre:', nombre);
    if (!nombre) { toast('Ingresa un nombre para la categoría', 'err'); return; }

    try {
        const res = await fetch(API + '/categoria', {
            method: 'POST',
            headers,
            body: JSON.stringify({ nombre_categoria: nombre })
        });
        const data = await res.json();
        console.log('🔵 Respuesta servidor:', res.status, data);

        if (res.ok) {
            toast('Categoría "' + nombre + '" creada ✅');
            document.getElementById('campo-nueva-categoria').style.display = 'none';
            await cargarCategorias();
        } else { 
            console.error('❌ Error del servidor:', data);
            toast('Error al crear categoría', 'err'); 
        }
    } catch (e) { 
        console.error('❌ Error de conexión:', e);
        toast('Error de conexión', 'err'); 
    }
}

function onTipoChange() {
    const tipo = document.getElementById('mprod-tipo').value;
    toggleTipoFields(tipo);
    if (tipo === 'bebida') cargarCategorias();
}

  // =================== CARGA GENERAL ===================
  function cargarTodo() {
    cargarInicio();
    toast('Datos actualizados');
  }

  // Init
  cargarInicio();

  // Auto-refresh cada 60s
  setInterval(() => {
    cargarEstadisticas();
  }, 60000);