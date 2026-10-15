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

// --- LÓGICA DE NOTIFICACIONES ---
function pedirPermisoNotificaciones() {
    if (!("Notification" in window)) {
        alert("Tu navegador o dispositivo no soporta notificaciones web.");
        return;
    }
    Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
            new Notification("¡Permiso concedido!", {
                body: "Te recordaré tomar el agua y la creatina.",
                icon: "icono.jpeg"
            });
        } else {
            alert("Permiso denegado. Puedes activarlo en los ajustes del iPhone.");
        }
    });
}

// --- LÓGICA DEL AGUA ---
const WATER_GOAL = 2500; 

const today = obtenerFechaDeHoy(); 
const savedDate = localStorage.getItem('waterDate');

if (savedDate !== today) {
    localStorage.setItem('waterAmount', 0); 
    localStorage.setItem('waterDate', today);
}

let currentWater = parseInt(localStorage.getItem('waterAmount')) || 0;

function updateBottle() {
    const fillPercent = Math.min((currentWater / WATER_GOAL) * 100, 100);
    
    document.getElementById('waterFill').style.height = fillPercent + '%';
    document.getElementById('waterText').innerText = currentWater + ' ml';
    
    localStorage.setItem('waterAmount', currentWater);
}

function addWater(amount) {
    currentWater += amount;
    updateBottle();
}

function addCustomWater() {
    const amount = prompt("¿Cuántos mililitros has tomado?");
    if (amount && !isNaN(amount) && amount > 0) {
        addWater(parseInt(amount));
    }
}

// Inicializar botella
updateBottle();
