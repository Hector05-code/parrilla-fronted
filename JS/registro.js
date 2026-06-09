
    const API = 'https://parrilla-backend-production.up.railway.app';

    function checkPass() {
      const pass = document.getElementById('contrasena').value;
      const bars = [document.getElementById('pb1'), document.getElementById('pb2'), document.getElementById('pb3'), document.getElementById('pb4')];
      const text = document.getElementById('pass-text');

      bars.forEach(b => b.style.background = '#2a2a2a');

      let strength = 0;
      if (pass.length >= 6) strength++;
      if (pass.length >= 8) strength++;
      if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) strength++;
      if (/[^A-Za-z0-9]/.test(pass)) strength++;

      const colors = ['#cc1f1f', '#f5a800', '#f5a800', '#27ae60'];
      const labels = ['Muy débil', 'Débil', 'Buena', 'Fuerte'];

      for (let i = 0; i < strength; i++) {
        bars[i].style.background = colors[strength - 1];
      }

      text.textContent = pass.length === 0 ? 'Mínimo 6 caracteres' : labels[strength - 1] || 'Muy débil';
      updateSteps();
    }

    function updateSteps() {
      const nombre = document.getElementById('nombre').value;
      const apellido = document.getElementById('apellido').value;
      const cedula = document.getElementById('cedula').value;
      const correo = document.getElementById('correo').value;
      const pass = document.getElementById('contrasena').value;

      const s1 = document.getElementById('s1');
      const s2 = document.getElementById('s2');
      const s3 = document.getElementById('s3');

      if (nombre && apellido && cedula) {
        s1.classList.add('done'); s1.classList.remove('active');
        s2.classList.add('active');
      } else {
        s1.classList.remove('done'); s1.classList.add('active');
        s2.classList.remove('active');
      }

      if (correo && pass.length >= 6) {
        s2.classList.add('done'); s2.classList.remove('active');
        s3.classList.add('active');
      } else {
        s2.classList.remove('done');
        s3.classList.remove('active');
      }
    }

    function togglePass(id, btn) {
      const input = document.getElementById(id);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁';
      }
    }

    async function registrar() {
      const nombre = document.getElementById('nombre').value.trim();
      const apellido = document.getElementById('apellido').value.trim();
      const cedula = document.getElementById('cedula').value.trim();
      const telefono = document.getElementById('telefono').value.trim();
      const correo = document.getElementById('correo').value.trim();
      const contrasena = document.getElementById('contrasena').value;
      const contrasena2 = document.getElementById('contrasena2').value;
      const btn = document.getElementById('btn-registro');

      // Limpiar errores
      ['nombre','apellido','cedula','correo','contrasena','contrasena2'].forEach(id => {
        document.getElementById(id).classList.remove('error-field');
      });

      if (!nombre || !apellido || !cedula || !correo || !contrasena || !contrasena2) {
        mostrarAlerta('Por favor completa todos los campos', 'error');
        return;
      }

      if (contrasena.length < 6) {
        mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
        document.getElementById('contrasena').classList.add('error-field');
        return;
      }

      if (contrasena !== contrasena2) {
        mostrarAlerta('Las contraseñas no coinciden', 'error');
        document.getElementById('contrasena2').classList.add('error-field');
        return;
      }

      btn.textContent = 'CREANDO CUENTA...';
      btn.classList.add('loading');

      try {
        const res = await fetch(`${API}/auth/registro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, apellido, cedula, telefono, correo, contraseña: contrasena })
        });

        const data = await res.json();

        if (!res.ok) {
          mostrarAlerta(data.mensaje || 'Error al registrarse', 'error');
          btn.textContent = 'CREAR CUENTA 🔥';
          btn.classList.remove('loading');
          return;
        }

        document.getElementById('s3').classList.add('done');
        mostrarAlerta('¡Cuenta creada exitosamente! 🔥 Redirigiendo...', 'success');

        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);

      } catch (e) {
        mostrarAlerta('No se pudo conectar al servidor', 'error');
        btn.textContent = 'CREAR CUENTA 🔥';
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
      document.getElementById('theme-icon').textContent = document.body.classList.contains('light') ? '🌙' : '☀️';
    }
