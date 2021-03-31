document.addEventListener("deviceready", onDeviceReady, false);
ons.ready(todoCargado);

// Le decimos qué hacer cuando el dispositivo se queda sin internet.
document.addEventListener(
    "offline",
    function () {
        myNavigator.pushPage("offline.html");
    },
    false
);

// Le decimos qué hacer cuando el dispositivo vuelve a tener acceso a internet.
document.addEventListener(
    "online",
    function () {
        myNavigator.popPage();
    },
    false
);

function onDeviceReady() {
    // Pido permisos para usar la camara.
    QRScanner.prepare(prepareCallback);
}


/******************************
 * Variables globales
 ******************************/
// API
const urlBase = 'http://ec2-54-210-28-85.compute-1.amazonaws.com:3000/api/';
// Sesión
let usuarioLogueado = [];
let tokenGuardado = null;
// Productos
const productos = [];
let usuarios = [];
let sucursales = [];
let pedidos = [];
let listadoUsuarioFavoritos;
let favoritosUsuarioLogueado = [];
let spinnerModal;


// Referencia a etiqueta html
let myNavigator;



function todoCargado() {
    myNavigator = document.getElementById('myNavigator');
    spinnerModal = document.querySelector('#spinnerModal');
    inicializar();
}

// Oculto todo y muestro lo que corresponda.
function inicializar() {
    // Oculto todo.
    ocultarOpcionesMenu();
    $("#item1").show();
    $("#item2").show();

    // Chequeo si en el localStorage hay token guardado.
    tokenGuardado = window.localStorage.getItem("APPObligatorioToken");

    // Al chequeo de la sesión, le paso como parámetro una función anónima que dice qué hacer después.
    chequearSesion(function () {
        // Muestro lo que corresponda en base a si hay o no usuario logueado.
        if (!usuarioLogueado) {
            verItem(1);
        } else {
            navegar('home', true);
            mostrarMenuUsuarioAutenticado();
        }
        spinnerModal.hide();

    });
}

function verItem(nroProducto) {
    navegar(`paginaItem${nroProducto}`, false)
    chequearCatalogo(nroProducto);
}

function chequearCatalogo(nroProducto) {
    switch (nroProducto) {
        case 3:
            cargarListadoProductos();
            break;
        case 4:
            cargarListadoFavoritos(nroProducto);
            break;
        case 5:
            cargarPedidosAPI();
            break;
    }
}

/* Funcionalidades de navegación y menú */
function navegar(paginaDestino, resetStack, datos) {
    if (resetStack) {
        myNavigator.resetToPage(`${paginaDestino}.html`);
    } else {
        myNavigator.bringPageTop(`${paginaDestino}.html`, datos);
    }
    cerrarMenu();
}

function navegarAtras() {
    myNavigator.popPage();
    cerrarMenu();
}

function abrirMenu() {
    document.getElementById("menu").open();
}

function cerrarMenu() {
    document.getElementById("menu").close();
}

function ocultarOpcionesMenu() {
    let i = 0;
    while (i < 10) {
        $(`#item${i}`).hide();
        i++;
    }
}

function mostrarContrasena() {
    let valorSwitch = $("#mostrarSwitch").val();
    if (valorSwitch == "on") {
        $("#contraseñaLogin").attr("type", "text");
    } else {
        $("#contraseñaLogin").attr("type", "password");

    }
    verItem(1);
}

/* Home */
function cargarListadoProductos() {
    $.ajax({
        type: 'GET',
        url: urlBase + 'productos',
        beforeSend: cargarTokenEnRequest,
        success: listaDeProductos,
        error: errorCallback,
    })
}

function listaDeProductos(data) {
    let nroProducto = $("#contentCatalogo").attr("nroItem");
    console.log(data);
    crearListadoProductos(pasarAarray(data), nroProducto);
}

//filtramos la data cuando viene de la api
function pasarAarray(datosRecibidosAPI) {
    let dataProductos = null;
    dataProductos = datosRecibidosAPI.data;
    return dataProductos;
}

function crearListadoProductos(dataProductos, nroProducto) {
    $("#verProductos").hide();
    $("#contentCatalogo").show();
    // Vacío el array de productos.
    productos.splice(0, productos.length);
    if (dataProductos && dataProductos.length > 0) {
        // Si hay productos, completo y muestro la tabla.
        let filas = ``;
        for (let i = 0; i < dataProductos.length; i++) {
            let unProducto = dataProductos[i];
            let unProductoObjeto = new Producto(unProducto._id, unProducto.codigo, unProducto.nombre, unProducto.precio, unProducto.urlImagen, unProducto.estado, unProducto.etiquetas);
            // Agrego el producto a mi array de productos.
            productos.push(unProductoObjeto);
            filas += `<ons-list-header class="liProductoNombre headerList" productoId="${unProductoObjeto._id}">${unProductoObjeto.nombre}</ons-list-header>
                <ons-list-item>Precio: $ ${unProductoObjeto.precio}</ons-list-item>
                <ons-list-item><img class="liProductoNombre" productoId="${unProductoObjeto._id}" onError="imgError(this);" src="http://ec2-54-210-28-85.compute-1.amazonaws.com:3000/assets/imgs/${unProductoObjeto.urlImagen}.jpg" width="50"></ons-list-item>
                <ons-list-item>Código: ${unProductoObjeto.codigo}</ons-list-item>
                <ons-list-item>Etiquetas: ${unProductoObjeto.etiquetas}</ons-list-item>
                <ons-list-item style="color: ${obtenerColorStock(unProductoObjeto.estado)};">${unProductoObjeto.estado}</ons-list-item>
                <ons-list-item productoId="${unProductoObjeto._id}" nroItem="${nroProducto}" class="btnProductoFavorito" > <ons-icon icon="fa-heart" style="color:${obtenerColorBotonFavorito(unProductoObjeto)};" size="20px"></ons-icon></ons-list-item>
                </ons-list>`;
        }

        // TODO: Estaría bueno revisar los favoritos para ver si hay en favoritos algun producto que ya no esté en la base de datos para borrarla.
        $(".tablaTbodyProductos").html(filas);
        $(".btnProductoFavorito").click(btnProductoFavoritoHandler);
        $(".liProductoNombre").click(tdProductoNombreHandler);
    } else {
        // Si no hay productos, aviso que no hay productos.
        $("#tablaProductosFavoritos").hide();
    }
}

function obtenerColorStock(estado) {
    let color = "";
    if (estado === "en stock") {
        color = "green";
    } else {
        color = "red";
    }
    return color;
}

function btnProductoFavoritoHandler() {
    let productoId = $(this).attr("productoId");
    let nroProducto = $(this).attr("nroItem");
    let favoritosLocalStorage = window.localStorage.getItem("APPProductosFavoritos");
    let favoritosJSON = null;
    let producto = obtenerProductoPorID(productoId);
    if (favoritosLocalStorage) {
        favoritosJSON = JSON.parse(favoritosLocalStorage);
        let i = 0;
        let encontrada = false;
        while (!encontrada && i < favoritosJSON.length) {
            let unFavorito = favoritosJSON[i];
            if (unFavorito._id === productoId) {
                encontrada = true;
                // Elimino lo producto del array de favoritos
                favoritosJSON.splice(i, 1);
                ons.notification.toast('Producto borrado de los Favoritos.', { timeout: 1000 });
            }
            i++;
        }
        // Si no encontré el producto entre los favoritos, lo agrego.
        if (!encontrada) {
            if (producto) {
                favoritosJSON.push(producto);
                ons.notification.toast('Producto añadido a favoritos!', { timeout: 1000 });
            }
        }
    } else {
        // Si no tenía ningún favorito en localStorage, agrego el producto en cuestión.
        if (producto) {
            favoritosJSON = [producto];
            ons.notification.toast('Producto añadido a favoritos!', { timeout: 1000 });
        }
    }
    // Actualizo mis favoritos en el localStorage.
    window.localStorage.setItem("APPProductosFavoritos", JSON.stringify(favoritosJSON));
    verItem(parseInt(nroProducto));
}


function obtenerColorBotonFavorito(producto) {
    let color = "gray";
    let favoritosLocalStorage = window.localStorage.getItem("APPProductosFavoritos");
    let favoritosJSON = null;
    if (favoritosLocalStorage) {
        favoritosJSON = JSON.parse(favoritosLocalStorage);
        let i = 0;
        let encontrada = false;
        while (!encontrada && i < favoritosJSON.length) {
            let unFavorito = favoritosJSON[i];
            if (unFavorito._id === producto._id) {
                encontrada = true;
                color = "red";
            }
            i++;
        }
    }
    return color;
}

function cargarListadoFavoritos(nroProducto) {
    let favoritos = window.localStorage.getItem("APPProductosFavoritos");
    favoritosJSON = JSON.parse(favoritos);
    crearListadoProductos(favoritosJSON, nroProducto);
}


function tdProductoNombreHandler() {
    let productoId = $(this).attr("productoId");
    mostrarDetalleProducto(productoId);
}

function mostrarDetalleProducto(productoId) {
    // Le paso 2 parámetros, el id del producto que quiero mostrar y una función de callback
    verItem(6);
    cargarDetalleProducto(productoId);
}

/* Detalle de producto */
function cargarDetalleProducto(productoId) {
    if (productoId) {
        $.ajax({
            type: 'GET',
            url: urlBase + `productos/${productoId}`,
            beforeSend: cargarTokenEnRequest,
            success: actualizarDetalleProducto,
            error: errorCallback
        })
    } else {
        alert("Ha ocurrido un error al cargar los datos del producto");
    }
}

//Detalle de producto seleccionado
function actualizarDetalleProducto(productoRecibidoAPI) {
    $("#btnComprarProductoIndividual").hide();
    let unProducto = pasarAarray(productoRecibidoAPI);
    console.log(unProducto);
    let unProductoObjeto = new Producto(unProducto._id, unProducto.codigo, unProducto.nombre, unProducto.precio, unProducto.urlImagen, unProducto.estado, unProducto.etiquetas);
    let datos = ``;
    datos += `<p productoDetalleId="${unProductoObjeto._id}"><b>Nombre:</b> ${unProductoObjeto.nombre}.</p>`;
    datos += `<p><img onError="imgError(this);" target="_blank" src="http://ec2-54-210-28-85.compute-1.amazonaws.com:3000/assets/imgs/${unProductoObjeto.urlImagen}.jpg" width="50"></p>`;
    datos += `<p><b>Precio:</b> $ ${unProductoObjeto.precio}.</p>`;
    datos += `<p><b>Estado:</b> ${unProductoObjeto.estado}.</p>`;
    datos += `<p><b>Puntaje:</b> ${unProducto.puntaje}/10.</p>`;
    datos += `<p><b>Descripción:</b> ${unProducto.descripcion}.</p>`;

    let listaEtiquetas = `<p><b>Etiquetas:</b>`;
    for (let i = 0; i < unProductoObjeto.etiquetas.length; i++) {
        let unaEtiqueta = unProductoObjeto.etiquetas[i];
        if (i == unProductoObjeto.etiquetas.length - 1) {
            listaEtiquetas += ` ${unaEtiqueta}.`;
        } else {
            listaEtiquetas += ` ${unaEtiqueta},`;
        }
    }

    //Chequeo si tiene stock, muestro el boton y le doy la función
    if (unProductoObjeto.estado == "en stock") {
        $("#btnComprarProductoIndividual").show();
        $("#btnComprarProductoIndividual").click(function () { navegar("paginaItem7", false, { data: unProductoObjeto }) });
    }
    //Lo muestro 
    $("#pDetalleProductoIndividual").html(datos);
    $("#listaEtiquetasDetalle").html(listaEtiquetas);
    $(".btnProductoFavorito").click(btnProductoFavoritoHandler);
}


/* ****************INICIO Funciones ELI*********************** */

function cargarDetalleCompra(objetoRecibido) {
    //$("#titleNuevoPedido").show();
    //$("#titleNuevoPedido").html(`${unProductoObjeto.nombre}`);
    let datos = ``;
    datos += `<p id="nombreProducto" productoDetalleId="${objetoRecibido._id}"><b>Nombre:</b> ${objetoRecibido.nombre}.</p>`;
    datos += `<p><img onError="imgError(this);" src="http://ec2-54-210-28-85.compute-1.amazonaws.com:3000/assets/imgs/${objetoRecibido.urlImagen}.jpg" width="50"></p>`
    datos += `<p><b>Precio:</b> $ ${objetoRecibido.precio}.</p>`;
    console.log(datos)

    $("#productoSeleccionado").html(datos);

    listaSucursales();
    cargarPosicionDelUsuario();
    $("#btnDibujarPosicionDelUsuario").click(btnDibujarPosicionDelUsuarioHandler);
    $("#btnBuscarDireccion").click(btnBuscarDireccionHandler);

}

function calcularTotal(data) {
    let cantidad = $("#inputCantidad").val();
    let precio = data.precio;
    let total = precio * cantidad;
    if (cantidad <= 0 || cantidad == null) {
        $("#pedirTotal").show();
        $("#pCantidadTotal").hide();
    } else {
        $("#pedirTotal").hide();
        $("#pCantidadTotal").show();
        $("#pCantidadTotal").html("El precio total es: $ " + total);
        $("#inputCantidad").blur();
    }
}


function confirmar() {
    let articuloId = $("#nombreProducto").attr("productoDetalleId")
    const cantidad = $("#inputCantidad").val();
    let sucursal = $("#selectSucursalCompra").val();
    if (cantidad > 0 && sucursal) {
        const datos = {
            cantidad: cantidad,
            idProducto: articuloId,
            idSucursal: sucursal
        };
        cargarNuevoPedido(datos);
    } else {
        const opciones = {
            title: 'Error'
        };
        mensaje = 'Debe seleccionar la cantidad a comprar y la sucursal.';
        ons.notification.alert(mensaje, opciones);
    }
}



//Cargar nueva compra llamando a la API
function cargarNuevoPedido(datos) {
    $.ajax({
        type: 'POST',
        url: urlBase + 'Pedidos',
        contentType: "application/json",
        beforeSend: cargarTokenEnRequest,
        data: JSON.stringify(datos),
        success: llamarAmostrarPedidos,
        error: errorCallback
    })
}

function llamarAmostrarPedidos(data) {
    ons.notification.toast('Compra realizada con éxito!', { timeout: 1000 });
    myNavigator.resetToPage("paginaItem5.html");
}

/* cargar detalles de pedidos   */
function cargarPedidosAPI() {
    $.ajax({
        type: 'GET',
        url: urlBase + 'Pedidos',
        beforeSend: cargarTokenEnRequest,
        success: mostrarPedidos,
        error: errorCallback
    })
}

//function mandarPedidosAmostrar(pedidosRecibidos) {
//irAtrás
//myNavigator.popPage({ data: pedidosRecibidos });
//myNavigator.resetToPage(`paginaItem5`, { data: pedidosRecibidos })
//navegar("paginaItem5", false, { data: pedidosRecibidos });
//mostrarPedidos(pedidosRecibidos);
//navegar("paginaItem7", false, {data});
//}

function mostrarPedidos(data) {
    let losPedidos = pasarAarray(data);
    //navegar("paginaItem5", false);
    if (losPedidos && losPedidos.length > 0) {
        // Si hay productos, completo y muestro la tabla.
        let filas = ``;
        for (let i = 0; i < losPedidos.length; i++) {
            let unPedido = losPedidos[i];
            filas += `
                    <ons-list-header class="liPedidoNombre headerList" idPedido="${unPedido._id}" id="pedidoId">Nombre:  ${unPedido.producto.nombre}</ons-list-header>
                    <ons-list-item>Precio: $ ${unPedido.producto.precio}</ons-list-item>
                    <ons-list-item><img onError="imgError(this);" src="http://ec2-54-210-28-85.compute-1.amazonaws.com:3000/assets/imgs/${unPedido.producto.urlImagen}.jpg" width="50"></ons-list-item>
                    <ons-list-item>Código: ${unPedido.producto.codigo}</ons-list-item>
                    <ons-list-item>Etiquetas: ${unPedido.producto.etiquetas}</ons-list-item>
                    <ons-list-item>Sucursal: ${unPedido.sucursal.nombre}</ons-list-item>
                    <ons-list-item>Total: $ ${unPedido.total}</ons-list-item>
                    <ons-list-item>Stock: ${unPedido.estado}</ons-list-item>
                    
                    `;

            if (unPedido.estado == "pendiente") {
                filas += `<ons-input id="pComentario${unPedido._id}" placeholder="Ingrese un comentario"></ons-input>
                            <ons-button onclick=registrarComentario('${unPedido._id}') id="btnComentario" productoId="${unPedido._id}">
                                Enviar</ons-button>`
            } else {
                filas += `<ons-list-item>Comentario: ${unPedido.comentario}</ons-list-item>`
            }
        }
        $(".tablaTbodyPedidos").html(filas);
        navegar("paginaItem5", false);
    }
}

function registrarComentario(productoId) {
    let txtComentario = $("#pComentario" + `${productoId}`).val();
    let datos = { comentario: txtComentario };
    if (datos) {
        $.ajax({
            type: 'PUT',
            url: urlBase + `pedidos/${productoId} `,
            contentType: "application/json",
            data: JSON.stringify(datos),
            beforeSend: cargarTokenEnRequest,
            success: mostrarMensaje,
            error: errorCallback
        })
    }
}

function mostrarMensaje() {
    ons.notification.toast('Comentario realizado con éxito!', { timeout: 1000 });
    verItem(5);
}

/* ****************FIN Funciones ELI*********************** */

function imgError(img) {
    $(img).attr("src", "./img/productos/noDisponible.png");
}


// En caso de encontrar en mi array de productos uno con el id que le paso, lo retorna. En caso contrario, devuelve null.
function obtenerProductoPorID(idProducto) {
    let producto = null;
    let i = 0;
    while (!producto && i < productos.length) {
        let unProducto = productos[i];
        if (unProducto._id === idProducto) {
            producto = productos[i];
        }
        i++;
    }
    return producto;
}

/* function llamarFavoritos() {
    //recorrer la lista y buscar el email, si es igual: 
    localStorage.setItem("listadoUsuarioFavoritos", favoritosUsuarioLogueado);
    if (listadoUsuarioFavoritos.length > 0) {
        for (let i = 0; i < listadoUsuarioFavoritos.length; i++) {
            let favoritosDeUsuario = listadoUsuarioFavoritos[i];
            let data = {
                email: usuarioLogueado.email,
                favoritos: favoritosDeUsuario.favoritos
            }
            if (favoritosDeUsuario.email == usuarioLogueado.email) {
                localStorage.setItem("listadoUsuarioFavoritos", data);
            }
        }
    } else {
        listadoUsuarioFavoritos.push({
            email: usuarioLogueado.email,
            favoritos: favoritosUsuarioLogueado
        })
    }
} */

/* function llamarFavoritos() {
    for (let i = 0; i < listadoUsuarioFavoritos.length; i++) {
        let item = listadoUsuarioFavoritos[i];
        if (item.email === usuarioLogueado.email) {
            favoritosUsuarioLogueado = item.favoritos;
            return;
        }
    }
    favoritosUsuarioLogueado = [];
    listadoUsuarioFavoritos = JSON.parse(window.localStorage.getItem("listadoUsuarioFavoritos"));
} */


/* Sesión */
function chequearSesion(despuesDeChequearSesion) {
    // Asumo que no hay usuario logueado y en caso de que si, lo actualizo.
    usuarioLogueado = null;

    if (tokenGuardado) {
        spinnerModal.show();
        // Hago la llamada ajax usando el endpoint de validación de token que me retorna el usuario.
        $.ajax({
            type: 'GET',
            url: urlBase + 'usuarios/session',
            contentType: "application/json",
            beforeSend: cargarTokenEnRequest,
            // Volvemos a utilizar una función anónima.
            success: crearUsuario,
            error: errorCallback,
            complete: despuesDeChequearSesion
        });
    } else {
        // Si no tengo token guardado, el usuarioLogueado no se actualiza (queda null) y sigo de largo.
        despuesDeChequearSesion();
    }
}

function crearUsuario(data) {
    let response = pasarAarray(data);
    usuarioLogueado = new Usuario(response._id, response.nombre, response.apellido, response.email, response.direccion, null);
    //llamarFavoritos();
}


function cargarTokenEnRequest(jqXHR) {
    jqXHR.setRequestHeader("x-auth", tokenGuardado);
}


function getProductoById(productoId) {
    $.ajax({
        type: 'GET',
        url: urlBase + `productos / ${productoId} `,
        beforeSend: cargarTokenEnRequest,
        success: function () {
            let producto = response;
            return producto;
        },
        error: errorCallback,
        complete: completeCallback
    })
}

/* function filtrarProductos() {
    let txtFiltro = $("#txtSearch").val();
    let txtMin = txtFiltro.toLowerCase();
    let productosFiltrados = [];
    $("#btnBorrarFiltro").hide();
 
    for (let i = 0; i < productos.length; i++) {
        let unProducto = productos[i];
        let unaEtiqueta;
        for (let i = 0; i < unProducto.etiquetas.length; i++) {
            unaEtiqueta = unProducto.etiquetas[i].toLowerCase();
            if (txtMin == unaEtiqueta) {
                productosFiltrados.push(unProducto);
            }
        }
        let nombreProducto = unProducto.nombre.toLowerCase();
        let hayFiltro = nombreProducto.includes(txtMin)
        if (hayFiltro) {
            productosFiltrados.push(unProducto);
        }
    }
    crearListadoProductos(productosFiltrados);
 
    if (txtFiltro != null) {
        $("#btnBorrarFiltro").show();
    }
} */

function borrarFiltro() {
    $("#txtSearch").val("");
    verItem(3);

}

function filtrarProductos() {
    let txtFiltro = $("#txtSearch").val();
    let productosFiltrados = [];

    // TODO llamada  a la api para filtrar por nombres
    for (let i = 0; i < productos.length; i++) {
        let unProducto = productos[i];
        let unaEtiqueta;
        for (let i = 0; i < unProducto.etiquetas.length; i++) {
            unaEtiqueta = unProducto.etiquetas[i];
            if (txtFiltro == unaEtiqueta) {
                productosFiltrados.push(unProducto);
            } else {
                buscarProductoFiltrado(txtFiltro);

            }
        }
    }
    crearListadoProductos(productosFiltrados);
}

function buscarProductoFiltrado(palabra) {
    spinnerModal.show();
    $.ajax({
        type: 'GET',
        url: urlBase + `productos?nombre=${palabra}`,
        beforeSend: cargarTokenEnRequest,
        success: listaDeProductos,
        error: errorCallback,
        complete: completeCallback
    });
}



function mostrarMenuUsuarioAutenticado() {
    ocultarOpcionesMenu();
    $("#item3").show();
    $("#item4").show();
    $("#item5").show();
    $("#item6").show();
    $("#item7").show();
    $("#usuarioLogueado").html(usuarioLogueado.nombre);
}

function loginIniciarSesionHandler() {
    let emailIngresado = $("#emailLogin").val();
    let passwordIngresado = $("#contraseñaLogin").val();
    let correoOk = verificarCorreo(emailIngresado);
    if (emailIngresado && passwordIngresado) {

        // El correo debe tener un formato válido.
        if (correoOk) {
            // El password debe tener como mínimo 8 caracteres.
            if (passwordIngresado.length > 7) {

                const datosUsuario = {
                    email: emailIngresado,
                    password: passwordIngresado
                };
                spinnerModal.show();
                $.ajax({
                    type: 'POST',
                    url: urlBase + 'usuarios/session',
                    contentType: "application/json",
                    data: JSON.stringify(datosUsuario),
                    success: iniciarSesion,
                    error: errorCallback,
                    complete: completeCallback
                })
            } else {
                ons.notification.alert("La contraseña debe tener más de 7 caracteres.");
                $("#contraseñaLogin").focus();
            }

        } else {
            ons.notification.alert("El correo no tiene el formato válido.");
            $("#usuarioLogin").focus();

        }
    } else {
        ons.notification.alert("Debe completar todos los campos.");
        $("#correoRegistro").focus();
    }
}

function iniciarSesion(dataUsuario) {
    usuarioLogueado = new Usuario(null, dataUsuario.data.nombre, dataUsuario.data.apellido, dataUsuario.data.email, dataUsuario.data.direccion, null);
    tokenGuardado = dataUsuario.data.token;
    window.localStorage.setItem("APPObligatorioToken", tokenGuardado);
    //llamarFavoritos();
    //localStorage.setItem("listadoUsuarioFavoritos", favoritosUsuarioLogueado);

    ons.notification.toast('Usuario logueado correctamente!', { timeout: 2000 });
    navegar('home', true);
    mostrarMenuUsuarioAutenticado();
}

function registroRegistrarseHandler() {
    $("#pRegistroMensajes").html("");//No hay párrafo de mensajes aún
    $("#correoRegistro").focus();

    let nombreIngresado = $("#nombreRegistro").val();
    let apellidoIngresado = $("#apellidoRegistro").val();
    let emailIngresado = $("#correoRegistro").val();
    let direccionIngresada = $("#direccionRegistro").val();
    let numeroDireccionIngresada = $("#direccionNumeroRegistro").val();
    let contraseñaIngresada = $("#contraseñaRegistro").val();
    let verificarContraseñaIngresada = $("#verificarContraseñaRegistro").val();

    // Verifrico que todos los campos tengan algún valor
    if (nombreIngresado && apellidoIngresado && emailIngresado && direccionIngresada && numeroDireccionIngresada && contraseñaIngresada && verificarContraseñaIngresada) {
        // Verifico los datos
        let correoValido = verificarCorreo(emailIngresado);
        if (correoValido) {
            let usuario = obtenerUsuarioPorEmail(emailIngresado);
            if (!usuario) {/* si no existe el usuario, tomo los datos y se los paso a la API */
                let contraseñaOK = verificarContrasenas(contraseñaIngresada, verificarContraseñaIngresada);
                if (contraseñaOK) {
                    const datosUsuario = {
                        nombre: nombreIngresado,
                        apellido: apellidoIngresado,
                        email: emailIngresado,
                        direccion: direccionIngresada + " " + numeroDireccionIngresada,
                        password: contraseñaIngresada
                    };
                    spinnerModal.show();
                    $.ajax({
                        type: 'POST',
                        url: urlBase + 'usuarios',
                        contentType: "application/json",
                        data: JSON.stringify(datosUsuario),
                        success: function () {
                            ons.notification.alert("El usuario ha sido creado correctamente");
                            navegar('home', true);
                        },
                        error: errorCallback,
                        complete: completeCallback
                    })
                } else {
                    ons.notification.alert("Las contraseñas deben ser iguales y más de 7 caracteres.");
                    $("#contraseñaRegistro").focus();
                }
            } else {
                ons.notification.alert("El usuario ya está en uso");
                $("#correoRegistro").focus();

            }
        } else {
            ons.notification.alert("El correo no tiene el formato válido.");
            $("#correoRegistro").focus();

        }
    } else {
        ons.notification.alert("Debe completar todos los campos.");
        $("#correoRegistro").focus();
    }
}

/****** Verificaciones para el registro ******/
function obtenerUsuarioPorEmail(emailIngresado) {
    let usuario = null;
    let i = 0;
    while (!usuario && i < usuarios.length) {
        let unUsuario = usuarios[i];
        if (unUsuario.email === emailIngresado) {
            usuario = unUsuario;
        }
        i++;
    }
    return usuario;
}

function verificarCorreo(correo) {
    let correoOk = false;
    let re = /^([\da-z_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/;
    if (re.exec(correo)) {
        ons.notification.toast('Correo verificado!', { timeout: 2000 });
        correoOk = true;
    }
    return correoOk;
}

function verificarContrasenas(psw1, psw2) {
    // Verifico que la contraseña y la verificación sean iguales y 8 o +
    let contraseñaOK = false;
    if (psw1 == psw2 && psw1.length >= 8) {
        contraseñaOK = true;
    }
    return contraseñaOK;
}



/* Generales */
function errorCallback(error) {
    ons.notification.alert("Ha ocurrido un error. Por favor, intente nuevamente.");
    console.log(error);
}

function cerrarSesion() {
    // Así remuevo específicamente el token guardado.
    // window.localStorage.removeItem("APPObligatorioToken");
    // Así vacío todo lo que haya guardado.
    window.localStorage.clear();
    inicializar();
}


/* ************* Mapa y geolocalización ********************** */
let posicionDelUsuario;
let miMapa;

function cargarPosicionDelUsuario() {


    window.navigator.geolocation.getCurrentPosition(
        // Callback de éxito.
        function (pos) {
            posicionDelUsuario = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
            }
            inicializarMapa();
        },
        // Calback de error.
        function () {
            posicionDelUsuario = {
                latitude: -34.903816878014354,
                longitude: -56.19059048108193
            }
            inicializarMapa();
        }
    )
}

function inicializarMapa() {
    // Guardo referencia global a mi mapa.
    miMapa = L.map("contenedorDeMapa").setView([posicionDelUsuario.latitude, posicionDelUsuario.longitude], 25);


    // Vacío el mapa.
    miMapa.eachLayer(m => m.remove());

    // Dibujo la cartografía base.
    L.tileLayer(
        "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWNhaWFmYSIsImEiOiJjanh4cThybXgwMjl6M2RvemNjNjI1MDJ5In0.BKUxkp2V210uiAM4Pd2YWw",
        {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery ©️ <a href="https://www.mapbox.com/">Mapbox</a>',
            id: "mapbox/streets-v11",
            accessToken: "your.mapbox.access.token"
        }
    ).addTo(miMapa);
    btnDibujarPosicionDelUsuarioHandler();
}



function btnDibujarPosicionDelUsuarioHandler() {
    L.marker([posicionDelUsuario.latitude, posicionDelUsuario.longitude], 20).addTo(miMapa).bindPopup('Ubicación del usuario').openPopup();
    miMapa.panTo(new L.LatLng(posicionDelUsuario.latitude, posicionDelUsuario.longitude));
}


function btnBuscarDireccionHandler() {
    const direccionBuscada = $("#inputDireccionBuscada").val();
    buscarDireccion(direccionBuscada);
}

function dibujarPosicion(lat, long) {
    L.marker([lat, long]).addTo(miMapa)
}


// Función que usa la API de OpenStreetMap para buscar las coordenadas de una dirección.
function buscarDireccion(direccionBuscada) {
    $.ajax({
        type: 'GET',
        url: `https://nominatim.openstreetmap.org/search?format=json&q=${direccionBuscada}, Uruguay`,
        contentType: "application/json",
        success: function (data) {
            if (data.length > 0) {
                L.marker([data[0].lat, data[0].lon]).addTo(miMapa).bindPopup(direccionBuscada).openPopup();
                dibujarDistancia(data[0].lat, data[0].lon);
            } else {
                ons.notification.alert("No se han encontrado datos");
            }
        },
        error: function (error) {
            console.log(error);
        }
    });
}

// Función que se encarga de dibujar un punto en el mapa y agregar una una línea desde la posición del usuario hasta el punto dibujado.
function dibujarDistancia(lat, lon) {
    // Dibujo el punto en el mapa.
    L.marker([lat, lon]).addTo(miMapa);
    // Array con los puntos del mapa que voy a usar para la línea.
    const puntosLinea = [
        [posicionDelUsuario.latitude, posicionDelUsuario.longitude],
        [lat, lon]
    ];
    // Calculo la distancia usando la librería. Divido entre 1000 para obtener los km y me quedo con 2 decimales.
    const distancia = Number(miMapa.distance([posicionDelUsuario.latitude, posicionDelUsuario.longitude], [lat, lon]) / 1000).toFixed(2);
    // Dibujo una línea amarilla con un pop up mostrando la distancia.
    const polyline = L.polyline(puntosLinea, { color: 'yellow' }).addTo(miMapa).bindPopup(`Distancia ${distancia} km.`).openPopup();;
    // Centro el mapa en la línea.
    miMapa.fitBounds(polyline.getBounds());
}

function listaSucursales() {
    $.ajax({
        type: 'GET',
        url: urlBase + 'sucursales',
        beforeSend: cargarTokenEnRequest,
        success: crearListadoSucursales,
        error: errorCallback,
    })
}

function centrarEnSucursal() {
    let seleccion = $("#selectSucursalCompra").val();
    let direccionBuscada = "";
    if (seleccion != 0) {
        let i = 0;
        let encontrada = false;
        while (!encontrada && i < sucursales.length) {
            let unaSuc = sucursales[i];
            if (unaSuc._id == seleccion) {
                direccionBuscada = unaSuc.direccion;
                encontrada = true;
            }
            i++;
        }

        $.ajax({
            type: 'GET',
            url: `https://nominatim.openstreetmap.org/search?format=json&q=${direccionBuscada}, Uruguay`,
            contentType: "application/json",
            success: function (data) {
                if (data.length > 0) {
                    miMapa.panTo([data[0].lat, data[0].lon]);
                    miMapa.setZoom(15);
                } else {
                    ons.notification.alert("No se han encontrado datos");
                }
            },
            error: function (error) {
                console.log(error);
            }
        });
    }
}

function completeCallback() {
    spinnerModal.hide();
}



//elii
function crearListadoSucursales(dataSucursalAPI) {
    let dataSucursal = pasarAarray(dataSucursalAPI);
    // Vacío el array de productos.
    sucursales.splice(0, sucursales.length);
    if (dataSucursal && dataSucursal.length > 0) {
        // Si hay productos, completo y muestro la tabla.
        let select = `<option value="0" disabled selected>Seleccione una...</option>`;
        for (let i = 0; i < dataSucursal.length; i++) {
            let unaSuc = dataSucursal[i];
            let unaSucObjeto = new Sucursal(unaSuc._id, unaSuc.nombre, unaSuc.direccion, unaSuc.ciudad, unaSuc.pais);
            sucursales.push(unaSucObjeto);
            buscarDireccion(unaSuc.direccion);

            // Agrego el producto a mi array de productos.
            select += `<option id="sucursalCompra" value="${unaSucObjeto._id}">${unaSucObjeto.nombre}</option>`;
        }
        $("#selectSucursalCompra").html(select);
        // TODO: Estaría bueno revisar los favoritos para ver si hay en favoritos algun producto que ya no esté en la base de datos para borrarla.
        //agregar div en html $("#tablaTbodyHomeProductos").html(select);
        //$("#tablaProductos").show();
        //$(".btnRecetaFavorito").click(btnRecetaFavoritoHandler);
        //$(".tdRecetaNombre").click(tdRecetaNombreHandler);
    } else {
        // Si no hay productos, aviso que no hay productos.
        $("#pHomeMensajes").html("No se encontraron sucursales.");
    }
}




/* ************* QR **************** */
function prepareCallback(err, status) {
    if (err) {
        // En caso de cualquier tipo de error.
        ons.notification.alert(JSON.stringify(err));
    }
    if (status.authorized) {
        // Tenemos acceso y el escaner está inicializado.
    } else if (status.denied) {
        // El usuario rechazó el pedido, la pantalla queda en negro.
        ons.notification.alert('status.denied');
        // Podemos volver a preguntar mandando al usuario a la configuración de permisos con QRScanner.openSettings().
    } else {
        // Nos rechazaron solo por esta vez. Podríamos volver a hacer el pedido.
        ons.notification.toast("Nos cancelaron una sola vez", { timeout: 2000 });
    }
}

// Función que me lleva a la pantalla de escaneo.
function irAlScan() {
    myNavigator.pushPage("qrPage.html");
}

// Función que se dispara al ingresar a la página de escaneo.
function escanear() {
    // Si hay scanner
    if (window.QRScanner) {
        // Esto lo uso para mostrar la cam en la app.
        // Por defecto la vista previa queda por encima del body y el html.
        // Pero por un tema de compatibilidad con Onsen, queda por debajo de la page.
        // Mirar el css y ver cómo hay que hacer que esta page sea transparente para que se vea la cámara.
        window.QRScanner.show(
            function (status) {
                // Función de scan y su callback
                window.QRScanner.scan(scanCallback);
            }
        );
    }
}

function scanCallback(err, text) {
    if (err) {
        // Ocurrió un error o el escaneo fue cancelado(error code '6').
        ons.notification.alert(JSON.stringify(err));
    } else {
        // Si no hay error escondo el callback y vuelvo a la pantalla anterior pasando el string que se escaneó con la url del producto.
        QRScanner.hide();
        myNavigator.popPage({ data: { scanText: text } });
    }
}

// Función que carga el home, si hay algo escaneado trae el producto y lo muestra
function cargarQr() {
    // Si me pasaron datos por parámetro en la navegación.
    // Hacer this.data es lo mismo que hacer myNavigator.topPage.data
    if (this.data && this.data.scanText) {
        $.ajax({
            type: "GET",
            url: this.data.scanText,
            contentType: "application/json",
            beforeSend: cargarTokenEnRequest,
            success: function (responseBody) {
                ons.notification.toast("success", { timeout: 1500 });
                let r = responseBody.data[0];
                let stringHtml =
                    `
                <ons-list-item>
                    <div class="left">
                        <img class="list-item__thumbnail" src="http://ec2-54-210-28-85.compute-1.amazonaws.com:3000/assets/imgs/${r.urlImagen}.jpg">
                    </div>
                    <div class="center">
                        <span class="list-item__title">${r.nombre}</span>
                        <span class="list-item__subtitle">${r.etiquetas.join(',')}</span>
                    </div>
                    <div class="right">
                        <span class="list-item__title">$${r.precio}</span>
                    </div>
                </ons-list-item>
                `;

                $('#productos-list').html(stringHtml);
                $('#contentCatalogo').hide();
            },
            error: errorCallBackQr
        });
    }
}

function errorCallBackQr(resp) {
    console.log(resp);
    // Si el status es 401 quiere decir que no estoy autorizado.
    if (resp.status === 401) {
        ons.notification.alert("Usuario no autorizado");
    } else {
        ons.notification.alert(resp.responseJSON.error);
    }
}

function irAlFalsoScan() {
    myNavigator.pushPage("falsoScan.html");
}
function falsoScan() {
    myNavigator.popPage({ data: { scanText: 'http://ec2-54-210-28-85.compute-1.amazonaws.com:3000/api/productos?codigo=PRCODE001' } });
}   