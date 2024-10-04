(function () {
  let template = document.createElement("template");
  template.innerHTML = `
      <style>
        :host {}

        /* Style for the container */
        div {
          margin: 50px auto;
          max-width: 600px;
        }

        /* Style for the input container */
        .input-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        /* Style for the input field */
        #prompt-input {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 5px;
          width: 70%;
        }

        /* Style for the button */
        #generate-button {
          padding: 10px;
          font-size: 16px;
          background-color: #3cb6a9;
          color: #fff;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          width: 25%;
        }

        /* Style for the select input */
        #sac-model-select {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 5px;
          width: 70%;
          margin-bottom: 20px;
        }

        /* Style for the file input */
        #file-input {
          margin-bottom: 10px;
        }

        /* Style for the generated text area */
        #generated-text {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 5px;
          width: 96%;
        }
      </style>
     <div>
    <center>
    <img src="https://1000logos.net/wp-content/uploads/2023/02/ChatGPT-Emblem.png" width="200"/>
    <h1>ChatGPT</h1></center>
    <div class="input-container">
      <select id="sac-model-select">
        <option value="">Select SAC Model</option>
        <!-- Options will be populated dynamically -->
      </select>
      <input type="text" id="prompt-input" placeholder="Enter a prompt">
      <input type="file" id="file-input" accept=".csv" />
      <button id="generate-button">Generate Text</button>
    </div>
    <textarea id="generated-text" rows="10" cols="50" readonly></textarea>
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

      const sacModelSelect = this.shadowRoot.getElementById("sac-model-select");
      const fileInput = this.shadowRoot.getElementById("file-input");
      const generateButton = this.shadowRoot.getElementById("generate-button");

      let csvContent = "";
      let sacModelData = "";

      // Cargar modelos disponibles en SAC
      async function loadSACModels() {
        const models = await sap.m.getAvailableModels(); // Usar API de SAC para obtener modelos disponibles
        models.forEach((model) => {
          const option = document.createElement("option");
          option.value = model.id;
          option.text = model.description;
          sacModelSelect.appendChild(option);
        });
      }

      // Llamar a la función para cargar los modelos disponibles
      loadSACModels();

      // Función para obtener datos de un modelo de SAC seleccionado
      async function loadSACModelData(modelId) {
        if (modelId) {
          const model = sap.m.getModel(modelId); // Obtén el modelo seleccionado
          const data = await model.getResultSet(); // Obtén los datos del modelo
          sacModelData = JSON.stringify(data); // Convertir a formato JSON para enviarlo como parte del prompt
        }
      }

      // Limitar el contenido del CSV a las primeras 100 líneas
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

      // Manejo del evento de clic para generar texto
      generateButton.addEventListener("click", async () => {
        const promptInput = this.shadowRoot.getElementById("prompt-input");
        const generatedText = this.shadowRoot.getElementById("generated-text");
        const selectedModelId = sacModelSelect.value;
        generatedText.value = "Buscando resultado...";
        const prompt = promptInput.value;

        if (!apiKey) {
          alert("API Key is missing! Please provide a valid API key.");
          return;
        }

        // Verificar si se cargó un archivo CSV o se seleccionó un modelo de SAC
        if (!csvContent && !selectedModelId) {
          alert("Please upload a CSV file or select a SAC model before generating text.");
          return;
        }

        // Cargar los datos del modelo de SAC seleccionado si está presente
        if (selectedModelId) {
          await loadSACModelData(selectedModelId);
        }

        const contextData = csvContent || sacModelData;

        try {
          // Combinar el contenido del CSV o datos de SAC y el prompt del usuario
          const fullPrompt = `context data: ${contextData}, Please answer the queries using the context data in less than 30 words based on the following prompt: ${prompt}`;

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
