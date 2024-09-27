(function () {
  let template = document.createElement("template");
  template.innerHTML = `
      <style>
        :host {}

        /* Aquí van tus estilos CSS */
      </style>
     <div>
    <center>
    <img src="https://1000logos.net/wp-content/uploads/2023/02/ChatGPT-Emblem.png" width="200"/>
    <h1>ChatGPT</h1></center>
      <div class="input-container">
        <input type="text" id="prompt-input" placeholder="Ingresa un mensaje">
        <button id="generate-button">Generar Texto</button>
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
      generatedText.value = "";
      const apiKey = this._props.apiKey || ""; // Asegúrate de ingresar tu API Key aquí
      const max_tokens = this._props.max_tokens || 1024;

      const generateButton = this.shadowRoot.getElementById("generate-button");
      generateButton.addEventListener("click", async () => {
        const promptInput = this.shadowRoot.getElementById("prompt-input");
        const generatedText = this.shadowRoot.getElementById("generated-text");
        generatedText.value = "Buscando resultado...";
        const prompt = promptInput.value;

        try {
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
                  "content": prompt
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
            alert("OpenAI Response: " + error.error.message);
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
