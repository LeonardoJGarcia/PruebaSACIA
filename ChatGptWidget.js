(function () {
  let template = document.createElement("template");
  template.innerHTML = `
      <style>
        :host {}

        /* Style for the container */
        div {
          margin: 20px auto;
          max-width: 800px;
          padding: 20px;
          font-family: Arial, sans-serif;
        }

        h1 {
          text-align: center;
          color: #3cb6a9;
        }

        /* Style for the input container */
        .input-container {
          display: flex;
          flex-direction: column;
          margin-bottom: 20px;
        }

        /* Style for the select container */
        .select-container {
          margin-bottom: 20px;
        }

        /* Style for the input field */
        #prompt-input, #model-select, #file-input {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 5px;
          margin-bottom: 10px;
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
        }

        /* Style for the generated text area */
        #generated-text {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 5px;
          width: 96%;
          height: 150px;
          resize: none;
        }

        .section-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
      </style>
     <div>
      <h1>ChatGPT Widget</h1>
      <div class="select-container">
        <div class="section-title">Select a SAC Model:</div>
        <select id="model-select">
          <option value="">-- Select Model from SAC --</option>
        </select>
      </div>
      <div class="input-container">
        <div class="section-title">Or Upload a CSV File:</div>
        <input type="file" id="file-input" accept=".csv" />
      </div>
      <div class="input-container">
        <div class="section-title">Enter Your Prompt:</div>
        <input type="text" id="prompt-input" placeholder="Enter a prompt">
      </div>
      <button id="generate-button">Generate Text</button>
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
      const modelSelect = this.shadowRoot.getElementById("model-select");
      const fileInput = this.shadowRoot.getElementById("file-input");
      const generateButton = this.shadowRoot.getElementById("generate-button");

      let csvContent = "";
      let sacModelData = "";

      // Cargar modelos de SAC disponibles
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
            sacModelData = ""; // Reiniciar el modelo de SAC cuando se sube un CSV
            console.log("CSV content loaded: ", csvContent); // Verifica el contenido CSV cargado
          };
          reader.readAsText(file);
        }
      });

      // Manejo de la selección de modelos de SAC
      modelSelect.addEventListener("change", async () => {
        const selectedModel = modelSelect.value;
        if (selectedModel) {
          sacModelData = await this.loadSACModelData(selectedModel);
          csvContent = ""; // Reiniciar el CSV cuando se selecciona un modelo de SAC
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

        if (!csvContent && !sacModelData) {
          alert("Please either select a SAC model or upload a CSV file.");
          return;
        }

        try {
          const contextData = sacModelData || csvContent;
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

    async loadSACModels(modelSelect) {
      // Obtener los modelos dentro de la historia de SAC
      let models = await sap.fpa.ui.story.getModels(); // Devuelve los modelos disponibles en la historia
      if (models && models.length > 0) {
        models.forEach(model => {
          const option = document.createElement("option");
          option.value = model.id;
          option.text = model.name;
          modelSelect.appendChild(option);
        });
      }
    }

    async loadSACModelData(modelId) {
      // Obtener los datos del modelo seleccionado
      const dataSource = sap.fpa.ui.story.getDataSource(modelId);
      const members = await dataSource.getMembers("name"); // Obtener los miembros de la dimensión
      const resultSet = await dataSource.getResultSet(); // Obtener el conjunto de resultados
      let stringCSV = "Name,Value\n"; // Formato de CSV
      members.forEach(member => {
        const name = member.id;
        const value = resultSet.find(result => result.name === name).value;
        stringCSV += `${name},${value}\n`;
      });
      return stringCSV;
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
