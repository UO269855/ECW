//Esperamos a que se cargue el árbol DON para hacer la búsqueda.
document.addEventListener("DOMContentLoaded", function () {
  // Obtenemos la palabra que queremos buscar, que se envía por parámetro
  const urlParams = new URLSearchParams(window.location.search);
  const searchTerm = urlParams.get("buscarPalabra");

  if (!searchTerm) {
    // Si no hay ningún parámetro, que se indique al usuario
    document.getElementById("resultados").innerHTML =
      "<p>No se ha introducido ninguna palabra para la búsqueda</p>";
  } else {
    //Inidcamos los ficheros en los que buscar la palabra
    const files = [
      "aboutMe.html",
      "index.html",
      "personalProjects.html",
      "help.html",
    ];
    //Obtenemos el contenedor donde mostrar los resultados y lo limpiamos.
    const resultsContainer = document.getElementById("resultados");
    resultsContainer.innerHTML = ""; // Clear previous results

    // Indicamos al usuario la palabra que ha buscado
    document.getElementById("palabraBuscada").innerHTML =
      "<h3>Palabra buscada: " + searchTerm + "</h3>";

    /**
     * Función que busca una palabra en el contenido de la página, sin tener en cuenta mayúsculas
     * @param {*} text Texto en el que buscar la palabra
     * @param {*} searchTerm
     * @returns
     */
    function isSubstringMatch(text, searchTerm) {
      const lowerCaseText = text.toLowerCase();
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      return lowerCaseText.includes(lowerCaseSearchTerm);
    }

    function extractSentence(text, searchTerm) {
      // Regular expression to find the sentence containing the search term
      const regex = new RegExp(`([^.]*?${searchTerm}[^.]*\.)`, "gi");
      const match = text.match(regex);
      return match ? match[0] : "Sentence not found";
    }

    // Function to search for the term in the HTML content of a file
    async function searchFile(file, searchTerm) {
      try {
        const response = await fetch(file); // Fetch the file's content
        const text = await response.text();

        // Create a DOM parser to parse the HTML content
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const bodyText = doc.body.textContent || doc.body.innerText;
        const firstH2 = doc.querySelector("h2").innerText;

        // Check if the search term appears in the body text
        if (isSubstringMatch(bodyText, searchTerm)) {
          const sentence = extractSentence(bodyText, searchTerm);
          displayResults(file, firstH2, sentence); // Display result with sentence
        }
      } catch (error) {
        console.error("Error fetching or processing file:", file, error);
      }
    }

    // Function to display the results for a file
    function displayResults(file, firstH2, sentence) {
      const fileLink = "<a href=" + file + ">" + firstH2 + "</a>";
      let resultHTML = '<article class="result">' + fileLink + "</article>";
      resultHTML += '<article class="result"><p>' + sentence + "</p></article>";

      resultsContainer.innerHTML += resultHTML;
    }

    // Search all files
    files.forEach((file) => searchFile(file, searchTerm)); // Loop through the files and call searchFile
  }
});
