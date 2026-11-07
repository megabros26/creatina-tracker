'use strict';

/* =========================================================
   Utilidades de fecha (siempre en hora LOCAL, sin UTC)
   ========================================================= */

// Date -> "YYYY-MM-DD" usando la fecha local del dispositivo
function claveFecha(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// "YYYY-MM-DD" -> Date a las 12:00 locales (inmune a cambios de hora)
function fechaDesdeClave(clave) {
    const [y, m, d] = clave.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
}

function sumarDias(fecha, dias) {
    const f = new Date(fecha);
    f.setDate(f.getDate() + dias);
    return f;
}

function hoyClave() {
    return claveFecha(new Date());
}

/* =========================================================
   Almacenamiento seguro (no rompe la app si hay datos corruptos)
   ========================================================= */

function leer(clave, porDefecto) {
    try {
        const valor = localStorage.getItem(clave);
        return valor === null ? porDefecto : JSON.parse(valor);
    } catch {
        return porDefecto;
    }
}

function guardar(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
        mostrarAviso('No se ha podido guardar. ¿Modo privado?');
    }
}

/* =========================================================
   Elementos
   ========================================================= */

const $ = (id) => document.getElementById(id);

const btnTachar = $('btn-tachar');
const btnLabel = $('btn-label');
const btnHint = $('btn-hint');
const rachaEl = $('racha');
const mejorRachaEl = $('mejor-racha');
const totalMesEl = $('total-mes');
const calendarioEl = $('calendario');
const tituloMesEl = $('titulo-mes');
const btnMesAnterior = $('mes-anterior');
const btnMesSiguiente = $('mes-siguiente');
const toastEl = $('toast');

/* =========================================================
   Aviso flotante y vibración
   ========================================================= */

let toastTimer;
function mostrarAviso(texto) {
    toastEl.textContent = texto;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function vibrar(ms = 15) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

/* =========================================================
   CREATINA
   ========================================================= */

const CLAVE_CREATINA = 'historialCreatina';

// Set de fechas "YYYY-MM-DD" (sin duplicados y solo formatos válidos)
const historialGuardado = leer(CLAVE_CREATINA, []);
let fechasTomadas = new Set(
    (Array.isArray(historialGuardado) ? historialGuardado : [])
        .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f))
);

function guardarCreatina() {
    guardar(CLAVE_CREATINA, [...fechasTomadas].sort());
}

function alternarDia(clave) {
    if (fechasTomadas.has(clave)) {
        fechasTomadas.delete(clave);
    } else {
        fechasTomadas.add(clave);
    }
    guardarCreatina();
    vibrar();
    return fechasTomadas.has(clave);
}

// Días consecutivos hasta hoy (si hoy aún no se ha marcado, cuenta hasta ayer)
function calcularRacha() {
    let cursor = new Date();
    if (!fechasTomadas.has(claveFecha(cursor))) {
        cursor = sumarDias(cursor, -1);
    }
    let racha = 0;
    while (fechasTomadas.has(claveFecha(cursor))) {
        racha++;
        cursor = sumarDias(cursor, -1);
    }
    return racha;
}

function calcularMejorRacha() {
    const ordenadas = [...fechasTomadas].sort();
    let mejor = 0;
    let actual = 0;
    let anterior = null;
    for (const clave of ordenadas) {
        if (anterior && claveFecha(sumarDias(fechaDesdeClave(anterior), 1)) === clave) {
            actual++;
        } else {
            actual = 1;
        }
        mejor = Math.max(mejor, actual);
        anterior = clave;
    }
    return mejor;
}

// Mes que se está viendo en el calendario
let mesVisto = new Date();
mesVisto.setDate(1);

function renderizarCalendario() {
    calendarioEl.innerHTML = '';
    const ano = mesVisto.getFullYear();
    const mes = mesVisto.getMonth();
    const hoy = hoyClave();
    const ahora = new Date();

    const nombreMes = mesVisto.toLocaleDateString('es-ES', { month: 'long' });
    tituloMesEl.textContent = `${nombreMes[0].toUpperCase()}${nombreMes.slice(1)} ${ano}`;

    // Huecos para que el día 1 caiga en su día de la semana (lunes = primera columna)
    const huecos = (new Date(ano, mes, 1).getDay() + 6) % 7;
    for (let i = 0; i < huecos; i++) {
        const vacio = document.createElement('div');
        vacio.className = 'day empty';
        calendarioEl.appendChild(vacio);
    }

    const diasEnElMes = new Date(ano, mes + 1, 0).getDate();
    for (let dia = 1; dia <= diasEnElMes; dia++) {
        const clave = claveFecha(new Date(ano, mes, dia));
        const esFuturo = clave > hoy;
        const el = document.createElement(esFuturo ? 'div' : 'button');
        el.className = 'day';
        el.textContent = dia;

        if (esFuturo) el.classList.add('future');
        if (clave === hoy) el.classList.add('today');
        if (fechasTomadas.has(clave)) el.classList.add('checked');

        if (!esFuturo) {
            el.type = 'button';
            el.setAttribute('aria-pressed', fechasTomadas.has(clave));
            el.setAttribute('aria-label', `${dia} de ${tituloMesEl.textContent}`);
            el.addEventListener('click', () => {
                const marcado = alternarDia(clave);
                mostrarAviso(marcado ? `Día ${dia} marcado ✅` : `Día ${dia} desmarcado`);
                actualizarUI();
            });
        }
        calendarioEl.appendChild(el);
    }

    // No dejar avanzar más allá del mes actual
    btnMesSiguiente.disabled =
        ano > ahora.getFullYear() || (ano === ahora.getFullYear() && mes >= ahora.getMonth());
}

function contarMesActual() {
    const prefijo = hoyClave().slice(0, 7);
    let total = 0;
    for (const f of fechasTomadas) if (f.startsWith(prefijo)) total++;
    return total;
}

function actualizarUI() {
    const tomadaHoy = fechasTomadas.has(hoyClave());

    btnTachar.classList.toggle('done', tomadaHoy);
    btnTachar.setAttribute('aria-pressed', tomadaHoy);
    btnLabel.textContent = tomadaHoy ? '¡Tomada! 💪' : 'Tachar toma de hoy';
    btnHint.textContent = tomadaHoy ? 'Mañana más. Toca para desmarcar.' : 'Toca para marcar el día';

    rachaEl.textContent = calcularRacha();
    mejorRachaEl.textContent = calcularMejorRacha();
    totalMesEl.textContent = contarMesActual();

    $('fecha-hoy').textContent = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long',
    });

    renderizarCalendario();
}

btnTachar.addEventListener('click', () => {
    const hoy = hoyClave();
    if (fechasTomadas.has(hoy)) {
        if (!confirm('¿Desmarcar la toma de hoy?')) return;
        alternarDia(hoy);
    } else {
        alternarDia(hoy);
        btnTachar.classList.remove('pop');
        void btnTachar.offsetWidth; // reinicia la animación
        btnTachar.classList.add('pop');
        const racha = calcularRacha();
        mostrarAviso(racha > 1 ? `¡${racha} días seguidos! 🔥` : '¡Hecho! 💪');
    }
    actualizarUI();
});

btnMesAnterior.addEventListener('click', () => {
    mesVisto.setMonth(mesVisto.getMonth() - 1);
    renderizarCalendario();
});

btnMesSiguiente.addEventListener('click', () => {
    mesVisto.setMonth(mesVisto.getMonth() + 1);
    renderizarCalendario();
});

/* =========================================================
   AGUA
   ========================================================= */

const META_AGUA = 2500;
const MAX_POR_TOMA = 5000;
const formatoMl = new Intl.NumberFormat('es-ES');

// Cada entrada de hoy se guarda aparte para poder deshacer la última
let aguaEntradas = [];

function cargarAgua() {
    const hoy = hoyClave();
    if (localStorage.getItem('waterDate') !== hoy) {
        aguaEntradas = [];
        try { localStorage.setItem('waterDate', hoy); } catch { /* sin almacenamiento */ }
        guardarAgua();
        return;
    }
    const entradas = leer('waterEntries', null);
    if (Array.isArray(entradas)) {
        aguaEntradas = entradas.filter((n) => Number.isFinite(n) && n > 0);
    } else {
        // Migración desde la versión anterior, que solo guardaba el total
        const total = parseInt(localStorage.getItem('waterAmount'), 10) || 0;
        aguaEntradas = total > 0 ? [total] : [];
    }
}

function guardarAgua() {
    guardar('waterEntries', aguaEntradas);
    guardar('waterAmount', totalAgua());
}

function totalAgua() {
    return aguaEntradas.reduce((a, b) => a + b, 0);
}

function actualizarBotella() {
    const total = totalAgua();
    const porcentaje = Math.min((total / META_AGUA) * 100, 100);

    const fill = $('waterFill');
    fill.style.height = porcentaje + '%';
    fill.dataset.empty = total === 0;

    $('waterText').textContent = formatoMl.format(total);
    $('waterGoal').textContent = formatoMl.format(META_AGUA);
    $('waterBarFill').style.width = porcentaje + '%';
    $('waterBar').setAttribute('aria-valuenow', Math.round(porcentaje));
    $('agua-deshacer').disabled = aguaEntradas.length === 0;

    const estado = $('waterStatus');
    const faltan = META_AGUA - total;
    estado.classList.toggle('goal', faltan <= 0);
    if (total === 0) estado.textContent = '¡A por el primer vaso!';
    else if (faltan > 0) estado.textContent = `Te faltan ${formatoMl.format(faltan)} ml`;
    else estado.textContent = '¡Meta cumplida! 🎉';
}

function anadirAgua(ml) {
    const antes = totalAgua();
    aguaEntradas.push(ml);
    guardarAgua();
    vibrar();
    actualizarBotella();
    if (antes < META_AGUA && totalAgua() >= META_AGUA) {
        mostrarAviso('¡Meta de agua cumplida! 🎉');
    }
}

document.querySelectorAll('.water-buttons [data-ml]').forEach((btn) => {
    btn.addEventListener('click', () => anadirAgua(Number(btn.dataset.ml)));
});

$('form-agua').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('agua-custom');
    const ml = Math.round(Number(input.value));
    if (!Number.isFinite(ml) || ml <= 0 || ml > MAX_POR_TOMA) {
        mostrarAviso(`Pon una cantidad entre 1 y ${formatoMl.format(MAX_POR_TOMA)} ml`);
        return;
    }
    anadirAgua(ml);
    input.value = '';
    input.blur();
});

$('agua-deshacer').addEventListener('click', () => {
    const quitada = aguaEntradas.pop();
    if (quitada === undefined) return;
    guardarAgua();
    actualizarBotella();
    mostrarAviso(`Quitados ${formatoMl.format(quitada)} ml`);
});

/* =========================================================
   RECORDATORIO (evento diario en el calendario del móvil)
   Las notificaciones web no pueden programarse sin servidor,
   así que se genera un .ics con aviso diario.
   ========================================================= */

const horaInput = $('hora-recordatorio');
horaInput.value = leer('horaRecordatorio', '09:00');

$('btn-recordatorio').addEventListener('click', () => {
    const [hh, mm] = (horaInput.value || '09:00').split(':');
    guardar('horaRecordatorio', `${hh}:${mm}`);

    const hoy = hoyClave().replace(/-/g, '');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Creatina Tracker//ES',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:creatina-${Date.now()}@creatina-tracker`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${hoy}T${hh}${mm}00`,
        'DURATION:PT5M',
        'RRULE:FREQ=DAILY',
        'SUMMARY:Tomar creatina 💪',
        'DESCRIPTION:Y márcalo en la app para no perder la racha.',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Tomar creatina',
        'TRIGGER:PT0M',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recordatorio-creatina.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    mostrarAviso('Abre el archivo para añadirlo al calendario');
});

/* =========================================================
   Cambio de día con la app abierta
   ========================================================= */

let diaMostrado = hoyClave();

function comprobarCambioDeDia() {
    const hoy = hoyClave();
    if (hoy === diaMostrado) return;
    diaMostrado = hoy;
    mesVisto = new Date();
    mesVisto.setDate(1);
    cargarAgua();
    actualizarBotella();
    actualizarUI();
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) comprobarCambioDeDia();
});
setInterval(comprobarCambioDeDia, 60 * 1000);

/* =========================================================
   Inicio
   ========================================================= */

cargarAgua();
actualizarBotella();
actualizarUI();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
    });
}
