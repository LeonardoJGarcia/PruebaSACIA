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

        /* Style for the file input */
        #file-input {
          margin-bottom: 10px;
        }

        /* Style for the model selector */
        #model-select {
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
      <input type="text" id="prompt-input" placeholder="Introduce la pregunta">
      <select id="model-select">
        <option value="">Selecciona el modelo de SAC</option>
        <!-- Model options will be dynamically populated here -->
      </select>
      <input type="file" id="file-input" accept=".csv" />
      <button id="generate-button">Generar Respuesta</button>
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

      const generateButton = this.shadowRoot.getElementById("generate-button");
      const fileInput = this.shadowRoot.getElementById("file-input");
      const modelSelect = this.shadowRoot.getElementById("model-select");

      let csvContent = "";
      let sacModelContent = "";

      // Obtener los modelos de SAC (Simulación)
      this.loadSACModels(modelSelect);

      // Función para limitar el contenido del CSV a las primeras 100 líneas
      function limitCSVContent(csv, maxLines = 100) {
        const lines = csv.split("\n");
        return lines.slice(0, maxLines).join("\n");
      }

      // Manejo de la carga de archivos
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

      // Evento cuando se selecciona un modelo de SAC
      modelSelect.addEventListener("change", async (event) => {
        const selectedModel = modelSelect.value;
        if (selectedModel) {
          // Simulación: Obtener los datos del modelo seleccionado
          sacModelContent = await this.getSACModelData(selectedModel);
          console.log("SAC Model content loaded: ", sacModelContent);
        }
      });

      generateButton.addEventListener("click", async () => {
        const promptInput = this.shadowRoot.getElementById("prompt-input");
        const generatedText = this.shadowRoot.getElementById("generated-text");
        generatedText.value = "Buscando resultado...";
        const prompt = promptInput.value;

        if (!apiKey) {
          alert("API Key is missing! Please provide a valid API key.");
          return;
        }

        // Prioridad a cargar desde un modelo de SAC
        let contextData = sacModelContent || csvContent;

        if (!contextData) {
          alert("Please upload a CSV file or select a SAC model before generating text.");
          return;
        }

        try {
          // Combinar el contenido del CSV o modelo de SAC y el prompt del usuario
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

    // Simulación de la carga de modelos SAC
    async loadSACModels(modelSelect) {
      // Aquí deberías obtener la lista de modelos desde SAP SAC
      // Por ahora, lo simulo con modelos estáticos
      const models = [
        { id: "model1", name: "Sales Model" },
        { id: "model2", name: "Finance Model" }
      ];

      models.forEach(model => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      });
    }

    // Simulación de la obtención de datos desde un modelo de SAC
    async getSACModelData(modelId) {
      // Simula datos de modelos de SAC en formato CSV
      const modelData = {
        model1: "Name,Sales,Region\nJohn,1000,North\nJane,2000,South\n",
        model2: "Account,Balance,Date\nCash,10000,2023-01-01\nCredit,5000,2023-02-01\n"
      };

      return modelData[modelId] || "";
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
