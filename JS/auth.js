(function() {
    const params = new URLSearchParams(window.location.search);
    const tokenParam  = params.get('token');
    const rolParam    = params.get('rol');
    const nombreParam = params.get('nombre');
    const idParam     = params.get('id');

    if (tokenParam) {
        localStorage.setItem('token', tokenParam);
        localStorage.setItem('rol', rolParam);
        localStorage.setItem('nombre', decodeURIComponent(nombreParam));
        if (idParam) localStorage.setItem('id_cliente', idParam);
        window.history.replaceState({}, '', window.location.pathname);
    }
})();