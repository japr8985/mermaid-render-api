const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises; // Usamos fs.promises para operaciones asíncronas de archivos
const { v4: uuidv4 } = require('uuid'); // Para generar nombres de archivo únicos

const app = express();
const PORT = 3000;

// Middleware para parsear el cuerpo de las solicitudes JSON
app.use(express.json());

// Endpoint para generar la imagen de Mermaid
app.post('/generate-mermaid', async (req, res) => {
    const mermaidCode = req.body.mermaid;

    if (!mermaidCode) {
        return res.status(400).send('El cuerpo de la solicitud debe contener un string de mermaid en la propiedad "mermaid".');
    }

    // Generar nombres de archivo únicos para el input y output
    const uniqueId = uuidv4();
    const inputFilePath = path.join(__dirname, `mermaid_input_${uniqueId}.mmd`);
    const outputFilePath = path.join(__dirname, `mermaid_output_${uniqueId}.png`);

    try {
        // Escribir el código Mermaid en un archivo temporal
        await fs.writeFile(inputFilePath, mermaidCode);

        // Comando para ejecutar mermaid-cli
        // Añadimos --no-sandbox para evitar problemas con Puppeteer en algunos entornos.
        // Puedes ajustar el ancho (-w) y alto (-H) según tus necesidades.
        const command = `npx @mermaid-js/mermaid-cli mmdc -i "${inputFilePath}" -o "${outputFilePath}" -t neutral --width 1200 --height 800 --puppeteerConfigFile ./puppeteer-config.json`;

        // Ejecutar el comando de mermaid-cli
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error ejecutando mermaid-cli: ${error.message}`);
                    console.error(`stderr: ${stderr}`);
                    return reject(error);
                }
                if (stderr) {
                    console.warn(`mermaid-cli stderr: ${stderr}`);
                }
                console.log(`mermaid-cli stdout: ${stdout}`);
                resolve();
            });
        });

        // Enviar la imagen generada como respuesta
        res.sendFile(outputFilePath, async (err) => {
            if (err) {
                console.error('Error al enviar el archivo:', err);
                res.status(500).send('Error al enviar la imagen.');
            }
            // Eliminar los archivos temporales después de enviarlos
            try {
                await fs.unlink(inputFilePath);
                await fs.unlink(outputFilePath);
            } catch (cleanupError) {
                console.error('Error al limpiar archivos temporales:', cleanupError);
            }
        });

    } catch (err) {
        console.error('Error en el endpoint /generate-mermaid:', err);
        res.status(500).send('Error interno del servidor al generar la imagen.');
    }
});

// Configuración de puppeteer para --no-sandbox
// Crea este archivo si necesitas deshabilitar el sandbox (común en entornos Docker/Linux)
app.get('/puppeteer-config.json', (req, res) => {
    res.json({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
});

app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en http://localhost:${PORT}`);
    console.log(`Endpoint para generar gráficos de Mermaid: POST http://localhost:${PORT}/generate-mermaid`);
    console.log(`Cuerpo de la solicitud JSON esperado: { "mermaid": "graph TD\\n  A[Inicio] --> B(Proceso)\\n  B --> C{Decisión}" }`);
});