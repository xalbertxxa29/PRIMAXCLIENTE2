// Inicializar Firebase Auth
const auth = firebase.auth();

// Función para registrar un nuevo usuario (opcional)
async function registrarUsuario(email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log(`Usuario registrado: ${userCredential.user.email}`);
        alert(`Usuario registrado exitosamente: ${userCredential.user.email}`);
    } catch (error) {
        console.error("Error al registrar usuario:", error.message);
        alert(`Error: ${error.message}`);
    }
}

// Escuchar cambios en el estado de autenticación
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`Usuario autenticado: ${user.email}`);
    } else {
        console.log('No hay usuario autenticado.');
    }
});

// Registrar el Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration);

                // Verificar actualizaciones del Service Worker
                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // Nueva versión disponible
                                console.log('Nueva versión disponible. Recarga para actualizar.');
                                mostrarActualizacion(); // Mostrar notificación de nueva versión
                            } else {
                                // Contenido cacheado por primera vez
                                console.log('El contenido está disponible offline.');
                            }
                        }
                    };
                };
            })
            .catch(error => {
                console.error('Error al registrar el Service Worker:', error);
            });
    });
}

// Mostrar notificación para actualizar a nueva versión
function mostrarActualizacion() {
    const updateNotification = document.createElement('div');
    updateNotification.style.position = 'fixed';
    updateNotification.style.bottom = '20px';
    updateNotification.style.left = '50%';
    updateNotification.style.transform = 'translateX(-50%)';
    updateNotification.style.backgroundColor = '#007BFF';
    updateNotification.style.color = 'white';
    updateNotification.style.padding = '15px 20px';
    updateNotification.style.borderRadius = '8px';
    updateNotification.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
    updateNotification.style.zIndex = '1000';
    updateNotification.style.cursor = 'pointer';
    updateNotification.textContent = 'Nueva versión disponible. Haz clic para actualizar.';

    updateNotification.addEventListener('click', () => {
        location.reload(); // Recargar la página al hacer clic
    });

    document.body.appendChild(updateNotification);

    // Eliminar automáticamente la notificación después de 15 segundos
    setTimeout(() => {
        document.body.removeChild(updateNotification);
    }, 15000);
}

// Notificar al usuario sobre el estado de conexión
function mostrarEstadoConexion(estado) {
    const connectionNotification = document.createElement('div');
    connectionNotification.style.position = 'fixed';
    connectionNotification.style.top = '20px';
    connectionNotification.style.left = '50%';
    connectionNotification.style.transform = 'translateX(-50%)';
    connectionNotification.style.backgroundColor = estado === 'online' ? '#28a745' : '#dc3545';
    connectionNotification.style.color = 'white';
    connectionNotification.style.padding = '10px 15px';
    connectionNotification.style.borderRadius = '8px';
    connectionNotification.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
    connectionNotification.style.zIndex = '1000';
    connectionNotification.textContent = estado === 'online' 
        ? 'Has recuperado la conexión.' 
        : 'Te has desconectado. Algunas funciones pueden no estar disponibles.';

    document.body.appendChild(connectionNotification);

    // Eliminar automáticamente la notificación después de 5 segundos
    setTimeout(() => {
        document.body.removeChild(connectionNotification);
    }, 5000);
}

window.addEventListener('offline', () => mostrarEstadoConexion('offline'));
window.addEventListener('online', () => mostrarEstadoConexion('online'));
