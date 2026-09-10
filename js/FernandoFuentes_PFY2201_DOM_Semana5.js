/**
 * FernandoFuentes_PFY2201_DOM_Semana5.js
 * ---------------------------------------------------------------
 * Desarrollo Frontend I (PFY2201) — Semana 5
 * "Manipulando el DOM con JavaScript para mejorar la interactividad"
 *
 * Este archivo agrega tres capas de interactividad sobre el sitio
 * GameZone (HTML + Bootstrap 5 de las semanas anteriores):
 *
 *   1) Manipulación del DOM  -> favoritos (createElement/appendChild)
 *                                y ficha técnica al pasar el mouse.
 *   2) Eventos                -> click, mouseover/mouseout y submit.
 *   3) Fetch API + promesas   -> catálogo externo de accesorios,
 *                                con manejo de errores y reintento.
 *
 * Convención de código: cada bloque de funcionalidad se inicializa
 * desde init(), que se ejecuta una sola vez cuando el DOM está listo.
 * Se evita repetir código usando delegación de eventos (un solo
 * listener por sección en vez de uno por tarjeta) y funciones
 * auxiliares reutilizables para crear elementos.
 * ---------------------------------------------------------------
 */
'use strict';

document.addEventListener('DOMContentLoaded', init);

/**
 * Punto de entrada: se ejecuta una vez que el DOM terminó de cargar.
 * Inicializa, en orden, cada funcionalidad independiente del sitio.
 */
function init() {
  initFavoritos();
  initFichaTecnica();
  initFormularioContacto();
  cargarOfertasExternas();
}

/* =================================================================
   1. FAVORITOS
   Manipulación del DOM (createElement/appendChild) + evento click.
   Se usa delegación de eventos: un único listener en el contenedor
   del catálogo detecta los clics en cualquier botón .btn-favorito,
   incluso si las tarjetas se regeneraran dinámicamente más adelante.
   ================================================================= */

/** Lista en memoria de los productos marcados como favoritos. */
const favoritos = new Map();

function initFavoritos() {
  const contenedorCatalogo = document.getElementById('contenedorCatalogo');
  if (!contenedorCatalogo) return;

  contenedorCatalogo.addEventListener('click', (evento) => {
    const boton = evento.target.closest('.btn-favorito');
    if (!boton) return; // el clic no fue sobre un botón de favorito

    const card = boton.closest('.card');
    toggleFavorito(card, boton);
  });
}

/**
 * Agrega o quita un producto de la lista de favoritos según su
 * estado actual, y refresca tanto el botón como el panel de
 * "Mis favoritos" y el contador del navbar.
 */
function toggleFavorito(card, boton) {
  const id = card.dataset.id;
  const producto = {
    id,
    nombre: card.dataset.nombre,
    precio: Number(card.dataset.precio),
  };

  const yaEsFavorito = favoritos.has(id);

  if (yaEsFavorito) {
    favoritos.delete(id);
    boton.classList.remove('activo');
    boton.textContent = '♡';
    boton.setAttribute('aria-pressed', 'false');
  } else {
    favoritos.set(id, producto);
    boton.classList.add('activo');
    boton.textContent = '♥';
    boton.setAttribute('aria-pressed', 'true');
    mostrarToast(`${producto.nombre} se agregó a tus favoritos`);
  }

  renderFavoritos();
}

/**
 * Reconstruye por completo la lista de favoritos en el DOM a partir
 * del estado actual en memoria. Demuestra creación dinámica de
 * elementos (createElement + appendChild) y eliminación de contenido
 * (innerHTML = '' antes de reconstruir).
 */
function renderFavoritos() {
  const lista = document.getElementById('listaFavoritos');
  lista.innerHTML = ''; // limpia el contenido anterior (elimina nodos)

  if (favoritos.size === 0) {
    const vacio = document.createElement('li');
    vacio.id = 'favoritosVacio';
    vacio.className = 'list-group-item text-center text-secondary';
    vacio.textContent = 'Aún no has agregado favoritos. Haz clic en el ♡ de un producto del catálogo.';
    lista.appendChild(vacio);
  } else {
    favoritos.forEach((producto) => {
      const item = document.createElement('li');
      item.className = 'list-group-item d-flex justify-content-between align-items-center';

      const nombre = document.createElement('span');
      nombre.textContent = producto.nombre;

      const precio = document.createElement('span');
      precio.className = 'badge text-bg-primary rounded-pill';
      precio.textContent = `$${producto.precio.toLocaleString('es-CL')}`;

      item.appendChild(nombre);
      item.appendChild(precio);
      lista.appendChild(item);
    });
  }

  actualizarContadorFavoritos();
}

/** Actualiza el badge numérico del navbar con la cantidad de favoritos. */
function actualizarContadorFavoritos() {
  const contador = document.getElementById('contadorFavoritos');
  contador.textContent = String(favoritos.size);
}

/**
 * Crea una notificación "toast" temporal, la agrega al DOM y la
 * elimina automáticamente después de unos segundos. Es otro ejemplo
 * de agregar Y quitar contenido dinámicamente (createElement /
 * appendChild / remove).
 */
function mostrarToast(mensaje) {
  const contenedor = document.getElementById('contenedorToasts');

  const toast = document.createElement('div');
  toast.className = 'toast-gz';
  toast.textContent = mensaje;
  contenedor.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

/* =================================================================
   2. FICHA TÉCNICA AL PASAR EL MOUSE
   Eventos mouseover / mouseout + manipulación del DOM.
   También usa delegación de eventos sobre el contenedor del
   catálogo (mouseover/mouseout no burbujean igual que mouseenter/
   mouseleave, por lo que se valida relatedTarget para no disparar
   el evento de más al mover el mouse entre hijos de la misma card).
   ================================================================= */

function initFichaTecnica() {
  const contenedorCatalogo = document.getElementById('contenedorCatalogo');
  if (!contenedorCatalogo) return;

  contenedorCatalogo.addEventListener('mouseover', (evento) => {
    const card = evento.target.closest('.card');
    if (!card) return;
    if (card.querySelector('.ficha-tecnica')) return; // ya está visible

    const ficha = document.createElement('div');
    ficha.className = 'ficha-tecnica';
    ficha.textContent = `${card.dataset.genero} · ${card.dataset.jugadores}`;
    card.appendChild(ficha);
  });

  contenedorCatalogo.addEventListener('mouseout', (evento) => {
    const card = evento.target.closest('.card');
    if (!card) return;
    // Si el mouse se movió hacia otro elemento dentro de la misma card, no hacer nada
    if (card.contains(evento.relatedTarget)) return;

    const ficha = card.querySelector('.ficha-tecnica');
    if (ficha) ficha.remove();
  });
}

/* =================================================================
   3. FORMULARIO DE CONTACTO
   Evento submit + validación + feedback dinámico en el DOM.
   ================================================================= */

function initFormularioContacto() {
  const formulario = document.getElementById('formContacto');
  if (!formulario) return;

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault(); // evita el envío/recarga real del formulario

    const nombre = document.getElementById('nombreContacto').value.trim();
    const correo = document.getElementById('correoContacto').value.trim();
    const mensaje = document.getElementById('mensajeContacto').value.trim();

    if (!nombre || !correo || !mensaje) {
      mostrarFeedbackContacto('danger', 'Por favor completa todos los campos antes de enviar.');
      return;
    }

    if (!validarCorreo(correo)) {
      mostrarFeedbackContacto('danger', 'Ingresa un correo electrónico válido.');
      return;
    }

    // No existe un backend real en esta actividad formativa: se simula
    // el envío exitoso y se limpia el formulario.
    mostrarFeedbackContacto('success', `¡Gracias, ${nombre}! Recibimos tu mensaje y te responderemos a ${correo} a la brevedad.`);
    formulario.reset();
  });
}

/** Validación simple de formato de correo electrónico mediante expresión regular. */
function validarCorreo(correo) {
  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return patron.test(correo);
}

/**
 * Muestra una alerta de Bootstrap (éxito o error) dentro del formulario,
 * reemplazando cualquier mensaje anterior.
 */
function mostrarFeedbackContacto(tipo, mensaje) {
  const contenedor = document.getElementById('feedbackContacto');
  contenedor.innerHTML = ''; // quita el mensaje anterior, si existía

  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo}`;
  alerta.setAttribute('role', 'alert');
  alerta.textContent = mensaje;

  contenedor.appendChild(alerta);
}

/* =================================================================
   4. FETCH API — catálogo externo de accesorios
   Carga datos desde una API pública (Fake Store API), maneja la
   promesa con .then()/.catch() y construye las tarjetas en el DOM.
   Incluye estado de carga (spinner) y manejo de errores con opción
   de reintentar.
   ================================================================= */

const URL_OFERTAS_EXTERNAS = 'https://fakestoreapi.com/products/category/electronics';

function cargarOfertasExternas() {
  const estado = document.getElementById('ofertasEstado');
  const contenedor = document.getElementById('contenedorOfertas');

  // Estado de carga: se muestra el spinner y se limpia cualquier resultado previo
  estado.innerHTML = `
    <div class="spinner-border text-info" role="status">
      <span class="visually-hidden">Cargando ofertas externas…</span>
    </div>`;
  contenedor.innerHTML = '';

  fetch(URL_OFERTAS_EXTERNAS)
    .then((respuesta) => {
      // fetch() solo rechaza la promesa ante errores de red; un 404/500
      // hay que detectarlo explícitamente revisando "ok".
      if (!respuesta.ok) {
        throw new Error(`Error HTTP ${respuesta.status} al consultar la API externa`);
      }
      return respuesta.json();
    })
    .then((productos) => {
      estado.innerHTML = '';
      renderOfertas(productos.slice(0, 6));
    })
    .catch((error) => {
      console.error('No se pudieron cargar las ofertas externas:', error);
      mostrarErrorOfertas();
    });
}

/** Construye una tarjeta de Bootstrap por cada producto recibido de la API. */
function renderOfertas(productos) {
  const contenedor = document.getElementById('contenedorOfertas');

  productos.forEach((producto) => {
    contenedor.appendChild(crearCardOferta(producto));
  });
}

function crearCardOferta(producto) {
  const columna = document.createElement('div');
  columna.className = 'col';

  const card = document.createElement('div');
  card.className = 'card card-oferta h-100 shadow-sm';

  const imagen = document.createElement('img');
  imagen.src = producto.image;
  imagen.alt = producto.title;
  imagen.loading = 'lazy';

  const cuerpo = document.createElement('div');
  cuerpo.className = 'card-body d-flex flex-column';

  const titulo = document.createElement('h3');
  titulo.className = 'h6 card-title';
  titulo.textContent = producto.title;

  const precio = document.createElement('p');
  precio.className = 'fw-bold mb-0 mt-auto';
  precio.textContent = `US$ ${producto.price.toFixed(2)}`;

  cuerpo.appendChild(titulo);
  cuerpo.appendChild(precio);
  card.appendChild(imagen);
  card.appendChild(cuerpo);
  columna.appendChild(card);

  return columna;
}

/** Muestra un mensaje de error con un botón para reintentar la carga. */
function mostrarErrorOfertas() {
  const estado = document.getElementById('ofertasEstado');

  estado.innerHTML = '';

  const alerta = document.createElement('div');
  alerta.className = 'alert alert-warning d-inline-block';
  alerta.setAttribute('role', 'alert');
  alerta.textContent = 'No se pudo cargar el catálogo externo en este momento.';

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn btn-sm btn-outline-light ms-3';
  boton.textContent = 'Reintentar';
  boton.addEventListener('click', cargarOfertasExternas);

  alerta.appendChild(boton);
  estado.appendChild(alerta);
}
