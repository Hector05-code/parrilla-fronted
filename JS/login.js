const API = 'http://localhost:3000';

async function login() {
  const correo = document.getElementById('correo').value.trim();
  const contrasena = document.getElementById('contrasena').value.trim();
  const btn = document.getElementById('btn-login');
  const alerta = document.getElementById('alerta');

  alerta.className = 'alert';
  alerta.textContent = '';

  if (!correo || !contrasena) {
    mostrarAlerta('Por favor completa todos los campos', 'error');
    return;
  }

  btn.textContent = 'ENTRANDO...';
  btn.classList.add('loading');

  try {
    // INTENTO 1: login como admin o cliente
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contraseña: contrasena })
    });

    const data = await res.json();

    if (res.ok) {
      // ✅ Es admin o cliente
      localStorage.setItem('token', data.token);
      localStorage.setItem('rol', data.rol);
      localStorage.setItem('nombre', data.nombre);
      localStorage.setItem('id_cliente', data.id || '');

      mostrarAlerta(`¡Bienvenido ${data.nombre}! 🔥`, 'success');

      // ← LÍNEA 38: cambiá las redirecciones para pasar el token en la URL
      setTimeout(() => {
        if (data.rol === 'admin') {
          window.location.href = `dashboard.html?token=${data.token}&rol=admin&nombre=${encodeURIComponent(data.nombre)}`;
        } else {
          window.location.href = `app.html?token=${data.token}&rol=cliente&nombre=${encodeURIComponent(data.nombre)}&id=${data.id || ''}`;
        }
      }, 1000);

      return;
    }

    // Si falla, INTENTO 2: login como empleado
    const resEmp = await fetch(`${API}/auth/login/empleado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: correo, contraseña: contrasena })
    });

    const dataEmp = await resEmp.json();

    if (resEmp.ok) {
      // ✅ Es empleado
      localStorage.setItem('token', dataEmp.token);
      localStorage.setItem('rol', dataEmp.rol);
      localStorage.setItem('nombre', dataEmp.nombre);

      mostrarAlerta(`¡Bienvenido ${dataEmp.nombre}! 🔥`, 'success');
            // ← LÍNEA 63: cambiá la redirección del empleado
      setTimeout(() => { 
        window.location.href = `empleado.html?token=${dataEmp.token}&rol=empleado&nombre=${encodeURIComponent(dataEmp.nombre)}`; 
      }, 1000);
      return;
    }

    // ❌ Ninguno funcionó
    mostrarAlerta(dataEmp.mensaje || data.mensaje || 'Credenciales incorrectas', 'error');
    btn.textContent = 'ENTRAR';
    btn.classList.remove('loading');

  } catch (e) {
    console.error(e);
    mostrarAlerta('No se pudo conectar al servidor', 'error');
    btn.textContent = 'ENTRAR';
    btn.classList.remove('loading');
  }
}

function mostrarAlerta(msg, tipo) {
  const alerta = document.getElementById('alerta');
  alerta.textContent = msg;
  alerta.className = `alert ${tipo} show`;
}

function toggleTheme() {
  document.body.classList.toggle('light');
  const icon = document.getElementById('theme-icon');
  icon.textContent = document.body.classList.contains('light') ? '🌙' : '☀️';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});

// Redirigir si ya hay sesión activa
const token = localStorage.getItem('token');
const rol = localStorage.getItem('rol');

if (token && rol) {
  if (rol === 'admin') {
    window.location.href = 'dashboard.html';
  } else if (rol === 'empleado') {
    window.location.href = 'empleado.html';
  } else {
    window.location.href = 'app.html';
  }
}