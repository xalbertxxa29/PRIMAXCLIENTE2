// Autenticar al usuario con Firebase Authentication
document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    try {
        // Intentar autenticar al usuario
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (user) {
            console.log(`Bienvenido ${user.email}`);
            // Redirigir a la página principal o guardar información del usuario
            window.location.href = "menu.html";
        }
    } catch (error) {
        // Manejar errores de autenticación
        switch (error.code) {
            case "auth/user-not-found":
                alert("Usuario no encontrado. Por favor, verifica tu correo.");
                break;
            case "auth/wrong-password":
                alert("Contraseña incorrecta. Por favor, intenta nuevamente.");
                break;
            case "auth/too-many-requests":
                alert("Demasiados intentos fallidos. Intenta más tarde.");
                break;
            default:
                alert("Error al iniciar sesión: " + error.message);
                break;
        }
    }
});
