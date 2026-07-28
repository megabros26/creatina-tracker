const btnTachar = document.getElementById('btn-tachar');
const rachaEl = document.getElementById('racha');
const calendarioEl = document.getElementById('calendario');

// Obtenemos los datos guardados o iniciamos un array vacío
let fechasTomadas = JSON.parse(localStorage.getItem('historialCreatina')) || [];

// Devuelve la fecha de hoy en formato "YYYY-MM-DD"
function obtenerFechaDeHoy() {
    const hoy = new Date();
    // Ajuste de zona horaria local
    const offset = hoy.getTimezoneOffset() * 60000;
    const fechaLocal = new Date(hoy.getTime() - offset);
    return fechaLocal.toISOString().split('T')[0];
}

// Lógica al pulsar el botón
btnTachar.addEventListener('click', () => {
    const hoy = obtenerFechaDeHoy();
    
    if (!fechasTomadas.includes(hoy)) {
        fechasTomadas.push(hoy);
        // Guardamos en el navegador
        localStorage.setItem('historialCreatina', JSON.stringify(fechasTomadas));
        actualizarUI();
    }
});

// Calcula los días consecutivos
function calcularRacha() {
    if (fechasTomadas.length === 0) return 0;
    
    // Ordenamos las fechas de más reciente a más antigua
    const fechasOrdenadas = [...fechasTomadas].sort().reverse();
    const hoy = obtenerFechaDeHoy();
    
    let racha = 0;
    let fechaAComprobar = new Date(hoy);

    // Si hoy no está marcado, empezamos a comprobar desde ayer
    if (fechasOrdenadas[0] !== hoy) {
        fechaAComprobar.setDate(fechaAComprobar.getDate() - 1);
        const ayer = fechaAComprobar.toISOString().split('T')[0];
        if (fechasOrdenadas[0] !== ayer) {
            return 0; // Si no se tomó ni hoy ni ayer, se pierde la racha
        }
    }

    // Contamos hacia atrás
    for (const fechaGuardada of fechasOrdenadas) {
        const fechaComprobarStr = fechaAComprobar.toISOString().split('T')[0];
        if (fechaGuardada === fechaComprobarStr) {
            racha++;
            fechaAComprobar.setDate(fechaAComprobar.getDate() - 1); // Restamos un día
        } else {
            break;
        }
    }
    return racha;
}

// Dibuja el calendario del mes actual
function renderizarCalendario() {
    calendarioEl.innerHTML = '';
    const hoy = new Date();
    const mes = hoy.getMonth();
    const ano = hoy.getFullYear();
    
    // Obtenemos cuántos días tiene el mes actual
    const diasEnElMes = new Date(ano, mes + 1, 0).getDate();

    for (let i = 1; i <= diasEnElMes; i++) {
        const divDia = document.createElement('div');
        divDia.classList.add('day');
        divDia.innerText = i;

        // Formateamos para comparar (YYYY-MM-DD)
        const mesStr = String(mes + 1).padStart(2, '0');
        const diaStr = String(i).padStart(2, '0');
        const fechaCasilla = `${ano}-${mesStr}-${diaStr}`;

        if (fechasTomadas.includes(fechaCasilla)) {
            divDia.classList.add('checked');
        }

        calendarioEl.appendChild(divDia);
    }
}

// Actualiza toda la interfaz
function actualizarUI() {
    const hoy = obtenerFechaDeHoy();
    
    if (fechasTomadas.includes(hoy)) {
        btnTachar.innerText = "¡Creatina tomada! 💪";
        btnTachar.classList.add('disabled');
        btnTachar.disabled = true;
    }
    
    rachaEl.innerText = calcularRacha();
    renderizarCalendario();
}

// Iniciar app
actualizarUI();