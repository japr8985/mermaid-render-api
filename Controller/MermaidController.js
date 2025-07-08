import puppeteer from 'puppeteer';

const render = async (req, res) => async (req, res) => {
    const { mermaidString } = req.body;

    if (!mermaidString) {
        return res.status(400).json({ error: 'El cuerpo de la solicitud debe contener "mermaidString".' });
    }

    let browser;
    try {
        // Inicia Puppeteer en modo headless (sin interfaz gráfica)
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-gene'], // Recomendado para entornos de servidor
        });
        const page = await browser.newPage();

        // Contenido HTML mínimo para renderizar Mermaid
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Mermaid Renderer</title>
                <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
                <style>
                    body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                </style>
            </head>
            <body>
                <div class="mermaid">
                    ${mermaidString}
                </div>
                <script>
                    mermaid.initialize({ startOnLoad: true });
                </script>
            </body>
            </html>
        `;

        // Establece el contenido HTML en la página
        await page.setContent(htmlContent);

        // Espera un momento para que Mermaid renderice el diagrama
        // Puedes ajustar este tiempo o usar un enfoque más sofisticado para esperar el renderizado
        await new Promise(resolve => setTimeout(resolve, 500));

        // Obtiene el elemento SVG de Mermaid
        const svgElement = await page.$('.mermaid');

        if (!svgElement) {
            return res.status(500).json({ error: 'No se pudo encontrar el elemento Mermaid en la página.' });
        }

        // Toma una captura de pantalla del elemento SVG
        const imageBuffer = await svgElement.screenshot({
            type: 'png', // o 'jpeg', 'webp'
            omitBackground: true // Hace el fondo transparente si es PNG
        });

        // Opcional: Guardar la imagen en el servidor
        // const imagePath = path.join(__dirname, `mermaid-${Date.now()}.png`);
        // await fs.writeFile(imagePath, imageBuffer);
        // console.log(`Imagen guardada en: ${imagePath}`);

        // Envía la imagen como respuesta
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.length
        });
        res.end(imageBuffer);

    } catch (error) {
        console.error('Error al renderizar Mermaid:', error);
        res.status(500).json({ error: 'Error interno del servidor al renderizar el diagrama.', log: error });
    } finally {
        if (browser) {
            await browser.close(); // Cierra el navegador de Puppeteer
        }
    }
}

export default {
    render
}