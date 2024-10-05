(function () {
  let template = document.createElement("template");
  template.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }

        .container {
          margin: 20px auto;
          max-width: 600px;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 10px;
          background-color: #f9f9f9;
        }

        .input-container {
          display: flex;
          flex-direction: column;
          margin-bottom: 20px;
        }

        .input-container label {
          margin-bottom: 5px;
          font-weight: bold;
        }

        .input-container input, 
        .input-container textarea {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 5px;
          margin-bottom: 10px;
        }

        #file-input {
          margin-top: 10px;
        }

        #generate-button {
          padding: 10px;
          font-size: 16px;
          background-color: #3cb6a9;
          color: #fff;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        }

        #generated-text {
          width: 100%;
          height: 150px;
          font-size: 16px;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
          background-color: #fff;
        }
      </style>

      <div class="container">
        <center>
          <img src="https://1000logos.net/wp-content/uploads/2023/02/ChatGPT-Emblem.png" width="200"/>
          <h1>Bintech AI</h1>
        </center>

        <!-- Section for file upload (CSV) -->
        <div class="input-container">
          <label for="file-input">Carga un archivo CSV (opcional):</label>
          <input type="file" id="file-input" accept=".csv" />
        </div>

        <!-- Section for prompt input -->
        <div class="input-container">
          <label for="prompt-input">Ingresa un prompt:</label>
          <input type="text" id="prompt-input" placeholder="Ingresa un prompt" />
        </div>

        <!-- Generate button -->
        <button id="generate-button">Generar Texto</button>

        <!-- Textarea for generated text -->
        <textarea id="generated-text" readonly></textarea>
      </div>
    `;

  class Widget extends HTMLElement {
    constructor() {
      super();
      let shadowRoot = this.attachShadow({
        mode: "open"
      });
      shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};
    }

    async connectedCallback() {
      this.initMain();
    }

    async initMain() {
      const generatedText = this.shadowRoot.getElementById("generated-text");
      const apiKey = this._props.apiKey || ""; // Asegúrate de ingresar tu API Key correcta aquí
      const max_tokens = this._props.max_tokens || 1024;

      const generateButton = this.shadowRoot.getElementById("generate-button");
      const fileInput = this.shadowRoot.getElementById("file-input");

      let csvContent = "";

      // Función para limitar el contenido del CSV a las primeras 100 líneas
      function limitCSVContent(csv, maxLines = 100) {
        const lines = csv.split("\n");
        return lines.slice(0, maxLines).join("\n");
      }

      // Manejo de la carga de archivos CSV
      fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            csvContent = e.target.result;
            csvContent = limitCSVContent(csvContent); // Limitar a las primeras 100 líneas
            console.log("CSV content loaded: ", csvContent); // Verifica el contenido CSV cargado
          };
          reader.readAsText(file);
        }
      });

      // Manejo del botón de generación de texto
      generateButton.addEventListener("click", async () => {
        const promptInput = this.shadowRoot.getElementById("prompt-input");
        const generatedText = this.shadowRoot.getElementById("generated-text");
        generatedText.value = "Buscando resultado...";
        const prompt = promptInput.value;

        if (!apiKey) {
          alert("API Key is missing! Please provide a valid API key.");
          return;
        }

        // Definir el contenido del contexto basado en el CSV o solo el prompt si no hay CSV
        let contextData = csvContent || "Sin datos de CSV cargados.";

        try {
          // Combinar el contenido (CSV si está presente) y el prompt del usuario
          const fullPrompt = `context data: ${contextData}, Responde las consultas utilizando los datos del contexto en menos de 30 palabras, basado en el siguiente prompt: ${prompt}`;

          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
              "model": "gpt-4", // Cambia a "gpt-3.5-turbo" si no tienes acceso a gpt-4
              "messages": [
                {
                  "role": "system",
                  "content": "Eres un asistente útil."
                },
                {
                  "role": "user",
                  "content": fullPrompt
                }
              ],
              "max_tokens": parseInt(max_tokens),
              "temperature": 0.5
            })
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log("API Response: ", responseData);
            const generatedTextValue = responseData.choices[0].message.content;
            generatedText.value = generatedTextValue.trim();
          } else {
            const error = await response.json();
            console.error("OpenAI Error Response: ", error);
            alert("Error: " + error.error.message);
            generatedText.value = "";
          }
        } catch (error) {
          console.error("Request failed:", error);
          alert("Request failed: " + error.message);
        }
      });
    }

    onCustomWidgetBeforeUpdate(changedProperties) {
      this._props = {
        ...this._props,
        ...changedProperties
      };
    }

    onCustomWidgetAfterUpdate(changedProperties) {
      this.initMain();
    }
  }

  customElements.define("com-bintech-sap-chatgptwidget", Widget);
})();
