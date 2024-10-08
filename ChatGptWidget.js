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
          // Obtener el contexto de datos desde la tabla de SAC
          let contextData = await this.getSACDataAsCSV();

          // Combinar el contenido del contexto (datos de la tabla) y el prompt del usuario
          const fullPrompt = `context data: ${contextData}, Responde las consultas utilizando los datos del contexto en menos de 30 palabras, basado en el siguiente prompt: ${prompt}`;

          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
              "model": "gpt-4o", // Uso del modelo GPT-4o
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

    // Función para obtener datos de la tabla de SAC y generar el CSV dinámicamente
    async getSACDataAsCSV() {
      try {
        // Obtener la historia activa y acceder a la página con "Table_1"
        const story = sap.fpa.ui.story.getActiveStory();
        const page1 = story.getPages()[0]; // Asegurarse de que estamos en la página correcta

        // Obtener el widget de la tabla "Table_1"
        const tableWidget = page1.getWidgets().find(widget => widget.name === "Table_1");

        if (!tableWidget) {
          throw new Error('No se encontró la tabla "Table_1" en la página 1.');
        }

        // Obtener el modelo de datos de la tabla
        const dataSource = tableWidget.getDataSource();

        // Obtener los miembros de la dimensión (por ejemplo, empleados)
        const nameDim = await dataSource.getMembers("name");

        // Obtener el conjunto de resultados (medidas) de la tabla
        const accData = await dataSource.getResultSet();

        // Crear el archivo CSV dinámico
        let stringCSV = "Nombre_Empleado,Fecha_Entrada,Aniversario,Dias_Vacaciones_2023,Pendientes_2022\n"; // Agregar encabezados dinámicos

        for (let i = 0; i < nameDim.length; i++) {
          let name = nameDim[i].id; // Obtener nombre del empleado
          stringCSV += `${name},`;

          // Recorrer los datos para agregar medidas dinámicas
          let flag = true;
          for (let j = 0; j < accData.length; j++) {
            if (accData[j]["name"].id === name) {
              if (flag) {
                stringCSV += `${accData[j]["FECHA DE ENTRADA"].rawValue},${accData[j]["ANIVERSARIO"].rawValue},${accData[j]["DIAS DE VACACIONES 2023"].rawValue},${accData[j]["DIAS PENDIENTES DE TOMAR 2022"].rawValue || ""}\n`;
                flag = false; // Solo procesar una vez por empleado
              }
            }
          }
        }

        console.log("Generated CSV from SAC data:", stringCSV);
        return stringCSV;
      } catch (error) {
        console.error("Error al obtener datos de SAC:", error);
        return "";
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
