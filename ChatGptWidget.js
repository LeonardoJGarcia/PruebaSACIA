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

        .input-container input {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 5px;
          margin-bottom: 10px;
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

      generateButton.addEventListener("click", async () => {
        const promptInput = this.shadowRoot.getElementById("prompt-input");
        const generatedText = this.shadowRoot.getElementById("generated-text");
        generatedText.value = "Buscando resultado...";
        const prompt = promptInput.value;

        if (!apiKey) {
          alert("API Key is missing! Please provide a valid API key.");
          return;
        }

        try {
          // Obtener el contexto de datos desde SAC para la tabla "Table_1"
          let contextData = await this.getSACDataAsCSV();

          if (!contextData) {
            throw new Error("No se pudo generar el CSV con los datos de la tabla.");
          }

          // Combinar el contenido del contexto (datos de SAC) y el prompt del usuario
          const fullPrompt = `context data: ${contextData}, Responde las consultas utilizando los datos del contexto en menos de 30 palabras, basado en el siguiente prompt: ${prompt}`;

          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
              "model": "gpt-4o", // Uso del modelo gpt-4o
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

    // Función para obtener los datos de la tabla "Table_1" y generar CSV
    async getSACDataAsCSV() {
      try {
        const story = sap.fpa.ui.story.getActiveStory();
        const page1 = story.getPages()[0]; // Acceder a la página 1
        const tableWidget = page1.getWidgets().find(widget => widget.name === "Table_1");

        if (!tableWidget) {
          console.error("La tabla 'Table_1' no se encontró en la página.");
          return null;
        }

        const dataSource = tableWidget.getDataSource();
        const members = await dataSource.getMembers("name");
        const resultSet = await dataSource.getResultSet();

        if (resultSet.length === 0) {
          console.error("No se encontraron datos en la tabla.");
          return null;
        }

        // Generar CSV dinámico
        let csvContent = "";
        let headers = Object.keys(resultSet[0]); // Obtener los encabezados dinámicamente

        csvContent += headers.join(",") + "\n"; // Añadir encabezados al CSV

        members.forEach(member => {
          let row = [member.id];
          headers.forEach(header => {
            const cell = resultSet.find(data => data[header].id === member.id);
            row.push(cell ? cell.rawValue : ""); // Añadir valor o vacío
          });
          csvContent += row.join(",") + "\n";
        });

        console.log("Generated CSV from SAC data:", csvContent);
        return csvContent;
      } catch (error) {
        console.error("Error al obtener datos de SAC:", error);
        return null;
      }
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
