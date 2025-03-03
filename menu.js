document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------
    // Inicialización de Firebase
    // ----------------------------
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();

    // Verificar usuario autenticado
    auth.onAuthStateChanged(user => {
        if (user) {
            const userEmail = user.email;
            const userName = userEmail.split('@')[0];
            document.getElementById('user-name').textContent = userName;
        } else {
            window.location.href = 'index.html';
        }
    });

    // Botón para cerrar sesión
    const logoutButton = document.getElementById('logout-btn');
    logoutButton.addEventListener('click', async () => {
        try {
            await auth.signOut();
            alert('Sesión cerrada exitosamente.');
            window.location.href = 'index.html';
        } catch (error) {
            alert('Error al cerrar sesión: ' + error.message);
        }
    });

    // ----------------------------
    // Función para descargar y llenar la plantilla
    // ----------------------------
    async function obtenerPlantillaDesdeFirebase() {
        try {
            const storageRef = storage.ref("/plantilla.docx");
            const url = await storageRef.getDownloadURL();
            const response = await fetch(url);
            return await response.blob();
        } catch (error) {
            console.error("Error al obtener la plantilla:", error);
        }
    }
    async function generarDocumento(ticketData) {
        try {
            const plantillaBlob = await obtenerPlantillaDesdeFirebase();
            if (!plantillaBlob) return;

            const reader = new FileReader();
            reader.onload = async function(event) {
                const contenidoArrayBuffer = event.target.result;
                const zip = new PizZip(contenidoArrayBuffer);
                const doc = new window.docxtemplater(zip);

                doc.setData({
                    fecha: ticketData.date || "N/A",
                    hora: ticketData.time || "N/A",
                    local: ticketData.local || "N/A",
                    estado: ticketData.estado || "N/A",
                    tipoIncidente: ticketData.incidentType || "N/A",
                    tipoSistema: ticketData.systemType || "N/A",
                    observaciones: ticketData.observations || "N/A"
                });

                doc.render();
                const docBlob = doc.getZip().generate({ type: "blob" });
                saveAs(docBlob, "Reporte.docx");
            };
            reader.readAsArrayBuffer(plantillaBlob);
        } catch (error) {
            console.error("Error generando el documento:", error);
        }
    }


    async function convertirDocxAPdf(docxBlob) {
        const formData = new FormData();
        formData.append("file", docxBlob, "documento.docx");

        const response = await fetch("https://api.pdf.co/v1/pdf/convert/from/docx", {
            method: "POST",
            headers: {
                "x-api-key": "xalbertxxa@gmail.com_Lh3Ni5NOjCLqOcNgetR41K0nce2O7GeDjsLN16zoijFfKLirVEIWswXeW17mKI74"
            },
            body: formData
        });

        const result = await response.json();
        if (result.error) {
            console.error("Error al convertir a PDF:", result.message);
            return;
        }

        return result.url;
    }


    // ----------------------------
    // Función para Cargar Tickets Pendientes y Resueltos en Tablas
    // ----------------------------
    async function loadTickets(estado, tablaId) {
        try {
            const querySnapshot = await db.collection('incidents').where('estado', '==', estado).get();
            const tabla = document.getElementById(tablaId).querySelector('tbody');
            tabla.innerHTML = ''; // Limpiar la tabla antes de cargar nuevos datos

            querySnapshot.forEach(doc => {
                const ticket = doc.data();
                const row = document.createElement('tr');

                row.innerHTML = `
                    <td>${ticket.date || 'N/A'}</td>
                    <td>${ticket.time || 'N/A'}</td>
                    <td>${ticket.local || 'N/A'}</td>
                    <td>${ticket.estado || 'N/A'}</td>
                    <td>${ticket.incidentType || 'N/A'}</td>
                    <td>${ticket.systemType || 'N/A'}</td>
                    <td>${ticket.observations || 'N/A'}</td>
                    <td><button class="download-btn">Descargar</button></td>
                `;
                const downloadButton = row.querySelector('.download-btn');
                downloadButton.addEventListener('click', () => {
                    generarDocumento(ticket);
                });

                tabla.appendChild(row);
            });
            
        } catch (error) {
            console.error(`Error cargando los tickets (${estado}):`, error);
        }
    }

        

    // Cargar tickets resueltos cuando se accede a la sección
    document.querySelector("[data-section='tickets-resueltos']").addEventListener("click", () => {
        loadTickets('Resuelto', 'tabla-resueltos');
    });

    // ---------------------------------
    // Manejo de Navegación entre Secciones
    // ---------------------------------
    const menuOptions = document.querySelectorAll('.menu-option');
    const sections = document.querySelectorAll('.dashboard-section');

    menuOptions.forEach(option => {
        option.addEventListener('click', () => {
            const targetSection = option.getAttribute('data-section');

            // Ocultar todas las secciones
            sections.forEach(section => {
                section.style.display = 'none';
            });

            // Mostrar la sección objetivo
            const activeSection = document.getElementById(targetSection);
            if (activeSection) {
                activeSection.style.display = 'block';

                // Si la sección es Dashboard Tickets, reinicializar y cargar gráficos
                if (targetSection === 'dashboard-tickets') {
                    resetCharts();
                    initializeCharts();
                }
                // Cargar los datos cuando se entra a Tickets Pendientes o Resueltos
                if (targetSection === 'tickets-pendientes') {
                    loadTickets('Pendiente', 'tabla-pendientes');
                } else if (targetSection === 'tickets-resueltos') {
                    loadTickets('Resuelto', 'tabla-resueltos');
                }
            }
        });
        console.log('✅ Nueva función de carga de tickets añadida correctamente.');
    });

    // Mostrar la sección INICIO por defecto
    document.getElementById('inicio').style.display = 'block';

    // ----------------------------
    // Variables y Referencias a Canvas para Chart.js
    // ----------------------------
    const ticketsCanvas = document.getElementById('ticketsChart');
    const localCanvas = document.getElementById('localChart');
    const localPieCanvas = document.getElementById('localPieChart');
    const systemTypeCanvas = document.getElementById('systemTypeChart');

    let ticketsChart = null;
    let localChart = null;
    let localPieChart = null;
    let systemTypeChart = null;

    // ----------------------------
    // Funciones para crear Gráficos
    // ----------------------------

    function createBarChart(ctx, label) {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgb(43, 38, 73)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: { enabled: true }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    function createPieChart(ctx, label) {
        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: [
                        'rgba(8, 24, 240, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: { enabled: true }
                }
            }
        });
    }

    function updateChart(chart, labels, data) {
        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.update();
        }
    }

    function resetCharts() {
        if (ticketsChart) ticketsChart.destroy();
        if (localChart) localChart.destroy();
        if (localPieChart) localPieChart.destroy();
        if (systemTypeChart) systemTypeChart.destroy();

        ticketsChart = null;
        localChart = null;
        localPieChart = null;
        systemTypeChart = null;
    }

    function initializeCharts() {
        if (ticketsCanvas && !ticketsChart) {
            ticketsChart = createBarChart(ticketsCanvas.getContext('2d'), 'Cantidad de Incidencias');
        }
        if (localCanvas && !localChart) {
            localChart = createBarChart(localCanvas.getContext('2d'), 'Cantidad de Registros por Local');
        }
        if (localPieCanvas && !localPieChart) {
            localPieChart = createPieChart(localPieCanvas.getContext('2d'), 'Distribución de Registros por Local');
        }
        if (systemTypeCanvas && !systemTypeChart) {
            systemTypeChart = createBarChart(systemTypeCanvas.getContext('2d'), 'Cantidad de Registros por Tipo de Sistema');
        }
    }

    async function exportToExcel() {
        try {
            const selectedMonth = document.getElementById('filter-month').value;
            let querySnapshot = await firebase.firestore().collection('incidents').get();

            if (querySnapshot.empty) {
                alert('No se encontraron datos para exportar.');
                return;
            }

            const data = [];
            querySnapshot.forEach(doc => {
                const ticket = doc.data();
                const timestamp = ticket.timestamp;

                if (timestamp) {
                    const dateObject = timestamp.toDate();
                    const month = dateObject.getMonth() + 1;

                    if (!selectedMonth || month === Number(selectedMonth)) {
                        data.push({
                            Date: ticket.date || '',
                            Estado: ticket.estado || '',
                            Local: ticket.local || '',
                            'Incident Type': ticket.incidentType || '',
                            'System Type': ticket.systemType || ''
                        });
                    }
                }
            });

            if (data.length === 0) {
                alert('No hay datos para exportar en el mes seleccionado.');
                return;
            }

            console.log("📊 Datos a exportar:", data);

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Incidentes");
            XLSX.writeFile(wb, `Reporte_Incidentes.xlsx`);

        } catch (error) {
            console.error('⚠ Error al exportar los datos:', error);
            alert('❌ Ocurrió un error al exportar los datos.');
        }
    }

    // ----------------------------
    // Función para Cargar Datos Filtrados por Mes y Actualizar Gráficos
    // ----------------------------
    async function loadFilteredData() {
        try {
            const selectedMonth = document.getElementById('filter-month').value;
            let querySnapshot = await firebase.firestore().collection('incidents').get();

            if (querySnapshot.empty) {
                resetCharts();
                alert('No se encontraron datos en la colección "incidents".');
                return;
            }

            const incidentCounts = {};
            const localCounts = {};
            const systemTypeCounts = {};

            querySnapshot.forEach(doc => {
                const ticket = doc.data();
                const timestamp = ticket.timestamp;

                if (timestamp) {
                    const dateObject = timestamp.toDate();
                    const month = dateObject.getMonth() + 1;

                    if (!selectedMonth || month === Number(selectedMonth)) {
                        const type = ticket.incidentType || 'Sin especificar';
                        incidentCounts[type] = (incidentCounts[type] || 0) + 1;

                        const local = ticket.local || 'Sin especificar';
                        localCounts[local] = (localCounts[local] || 0) + 1;

                        const systemType = ticket.systemType || 'Sin especificar';
                        systemTypeCounts[systemType] = (systemTypeCounts[systemType] || 0) + 1;
                    }
                }
            });

            console.log("📌 Datos obtenidos de Firestore:", querySnapshot.docs.map(doc => doc.data()));
            console.log("📊 Datos Procesados:", { incidentCounts, localCounts, systemTypeCounts });

            updateChart(ticketsChart, Object.keys(incidentCounts), Object.values(incidentCounts));
            updateChart(localChart, Object.keys(localCounts), Object.values(localCounts));
            updateChart(localPieChart, Object.keys(localCounts), Object.values(localCounts));
            updateChart(systemTypeChart, Object.keys(systemTypeCounts), Object.values(systemTypeCounts));

        } catch (error) {
            console.error('⚠ Error obteniendo los datos:', error);
            alert('❌ Error al cargar los datos.');
        }
    }

    const searchButton = document.getElementById('search-btn');
    if (searchButton) {
        searchButton.addEventListener('click', loadFilteredData);
    } else {
        console.error('No se encontró el botón de búsqueda en el DOM.');
    }

    const exportButton = document.getElementById('export-btn');
    if (exportButton) {
        exportButton.addEventListener('click', exportToExcel);
    }

    initializeCharts();
    console.log('✅ main.js cargado y ejecutado correctamente.');

    
});

