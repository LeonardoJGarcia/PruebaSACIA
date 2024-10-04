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
        .input-container select, 
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
          <h1>ChatGPT</h1>
        </center>

        <!-- Section for selecting a SAC model -->
        <div class="input-container">
          <label for="model-select">Select SAC Model:</label>
          <select id="model-select">
            <option value="">-- Select a model --</option>
          </select>
          <button id="load-model-button">Load Model Data</button>
        </div>

        <!-- Section for file upload (CSV) -->
        <div class="input-container">
          <label for="file-input">Or upload CSV file:</label>
          <input type="file" id="file-input" accept=".csv" />
        </div>

        <!-- Section for prompt input -->
        <div class="input-container">
          <label for="prompt-input">Enter a prompt:</label>
          <input type="text" id="prompt-input" placeholder="Enter a prompt" />
        </div>

        <!-- Generate button -->
        <button id="generate-button">Generate Text</button>

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
      const modelSelect = this.shadowRoot.getElementById("model-select");
      const loadModelButton = this.shadowRoot.getElementById("load-model-button");

      let csvContent = "";
      let sacModelContent = "";

      // Función para limitar el contenido del CSV a las primeras 100 líneas
      function limitCSVContent(csv, maxLines = 100) {
        const lines = csv.split("\n");
        return lines.slice(0, maxLines).join("\n");
      }

      // Función para cargar los modelos de datos desde SAC
      async function loadModelsFromSAC() {
        try {
          const models = await sap.fpa.ui.story.getAvailableDataSources(); // Obtener modelos disponibles
          models.forEach(model => {
            const option = document.createElement("option");
            option.value = model.id;
            option.text = model.label;
            modelSelect.appendChild(option);
          });
        } catch (error) {
          console.error("Error loading models from SAC:", error);
        }
      }

      // Función para cargar datos del modelo seleccionado en SAC
      async function loadModelData(modelId) {
        try {
          const dataSource = await sap.fpa.ui.story.getDataSource(modelId); // Cargar el modelo
          const resultSet = await dataSource.getResultSet(); // Obtener los datos del modelo
          sacModelContent = JSON.stringify(resultSet); // Convertir los datos del modelo a formato JSON
          console.log("SAC model content:", sacModelContent);
        } catch (error) {
          console.error("Error loading model data:", error);
        }
      }

      // Llamada para cargar los modelos al cargar el widget
      await loadModelsFromSAC();

      // Manejo del botón para cargar datos del modelo seleccionado
      loadModelButton.addEventListener("click", async () => {
        const selectedModelId = modelSelect.value;
        if (selectedModelId) {
          await loadModelData(selectedModelId);
        } else {
          alert("Please select a model to load.");
        }
      });

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

        // Definir el contenido del contexto basado en el CSV o el modelo de SAC cargado
        let contextData = csvContent || sacModelContent;
        if (!contextData) {
          alert("Please upload a CSV file or load a model from SAC.");
          return;
        }

        try {
          // Combinar el contenido (CSV o modelo de SAC) y el prompt del usuario
          const fullPrompt = `context data: ${contextData}, Please answer the queries using the context data in less than 30 words based on the following prompt: ${prompt}`;

          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
              "model": "gpt-4o", // Cambia a "gpt-3.5-turbo" si no tienes acceso a gpt-4
              "messages": [
                {
                  "role": "system",
                  "content": "You are a helpful assistant."
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
            console.error("OpenAI Error Response:", error);
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
