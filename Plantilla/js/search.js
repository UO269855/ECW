// Buscamos la palabra, que se envía por parámetro al html de búsqueda
const urlParams = new URLSearchParams(window.location.search);
const searchTerm = urlParams.get("buscarPalabra");

//Si el parámetro es vacío, mostramos que no hay resultados.
if (!searchTerm) {
  document.getElementById("results").innerHTML =
    "<p>No se han encontrado resultados.</p>";
} else {
  //Lista de los ficheros donde queremos buscar
  const files = [
    "index.html",
    "aboutMe.html",
    "personalProjects.html",
    "help.html",
  ];

  //Obtenemos y limpiamos
  const resultsContainer = document.getElementById("resultados");
  resultsContainer.innerHTML = "";

  /**
   * Función que busca la palabra que queremos en los htmls de la web personal utilizando el coeficiente de Jaccard.
   */
  async function searchFile(file, searchTerm) {
    try {
      //Cargamos el fichero y lo convertimos a texto
      const response = await fetch(file);
      const text = await response.text();

      // Creamos un parser con el contenido del body del fichero para no buscar en el elemento head.
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const bodyText = doc.body.textContent || doc.body.innerText;

      // Tokenizamos tanto la palabra que queremos buscar como el texto donde queremos buscar.
      const searchSet = tokenize(searchTerm);
      const bodySet = tokenize(bodyText);

      // Calculamos la similitud entre la búsqueda y el texto con el coeficiente de Jaccard
      const similarity = jaccardIndex(searchSet, bodySet);

      if (similarity > 0.1) {
        displayResults(file, similarity);
      }
    } catch (error) {
      console.error("Error fetching or processing file:", file, error);
    }
  }

  function jaccardIndex(setA, setB) {
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  function tokenize(text) {
    return new Set(text.toLowerCase().match(/\w+/g));
  }

  function displayResults(file, matches) {
    const fileName = file.split("/").pop();
    const fileLink = `<a href="${file}" target="_blank">${fileName}</a>`;
    let resultHTML = `<div class="result"><strong>Found in: ${fileLink}</strong><ul>`;

    matches.forEach((match) => {
      resultHTML += `<li>Position: ${match.position}</li>`;
    });
    resultHTML += "</ul></div>";

    resultsContainer.innerHTML += resultHTML;
    return;
  }

  // Search all files
  files.forEach((file) => searchFile(file, searchTerm));
}
