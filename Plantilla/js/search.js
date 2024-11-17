//Esperamos a que se cargue el árbol DON para hacer la búsqueda.
document.addEventListener("DOMContentLoaded", function () {
  // Obtenemos la palabra que queremos buscar, que se envía por parámetro
  const urlParams = new URLSearchParams(window.location.search);
  const searchTerm = urlParams.get("buscarPalabra")?.replace(/\s+/g, "");

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
    resultsContainer.innerHTML = "";

    // Indicamos al usuario la palabra que ha buscado
    document.getElementById("palabraBuscada").innerHTML =
      "<h3>Palabra buscada: " + searchTerm + "</h3>";

    /**
     * Función que busca una palabra en el contenido de la página, sin tener en cuenta mayúsculas
     * @param {*} text Texto en el que buscar la palabra
     * @param {*} searchTerm Palabra que estamos buscando
     * @returns Si el texto coincide o no
     */
    function isSubstringMatch(text, searchTerm) {
      const lowerCaseText = text.toLowerCase();
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      return lowerCaseText.includes(lowerCaseSearchTerm);
    }

    /**
     * Función que obtiene la oración en la que se encuentra la palabra buscada.
     * @param {*} text Texto en el que buscar la palabra
     * @param {*} searchTerm Palabra que estamos buscando
     * @returns La oración dónde se encuentra la palabra
     */
    function extractSentence(text, searchTerm) {
      const regex = new RegExp(`([^.]*?${searchTerm}[^.]*\.)`, "gi");
      const match = text.match(regex);
      return match ? match[0] : "No se ha encontrado la palabra en el texto";
    }

    /**
     * Función que busca una determinada palabra en el fichero especificado
     * @param {*} file Nombre del fichero
     * @param {*} searchTerm Palabra que estamos buscando
     */
    async function searchFile(file, searchTerm) {
      try {
        //Cargamos el fichero y obtenemos el texto que contiene.
        const response = await fetch(file);
        const text = await response.text();

        // Creamos un parseador que tenga el árbol DOM del texto del fichero y extraemos su main para buscar la palabra
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const mainText = doc.querySelector("main");
        // Obtenemos el título del contenido para mostrarlo en la búsqueda
        const mainTitle = doc.querySelector("h2").innerText;

        // Comprobamos si la palabra se encuentra dentro del texto y mostramos el resultado
        if (isSubstringMatch(mainText, searchTerm)) {
          const sentence = extractSentence(mainText, searchTerm);
          const highlightedSentence = highlightSearchTerm(sentence, searchTerm);
          displayResults(file, mainTitle, highlightedSentence);
        }
      } catch (error) {
        console.error("Error fetching or processing file:", file, error);
      }
    }

    /**
     * Función que resalta la palabra buscada en negrita
     * @param {*} sentence Frase donde se encontró la palabra
     * @param {*} searchTerm Palabra buscada
     * @returns La frase con la palabra resaltada en negrita
     */
    function highlightSearchTerm(sentence, searchTerm) {
      const regex = new RegExp(`(${searchTerm})`, "gi");
      return sentence.replace(regex, "<strong>$1</strong>");
    }

    /**
     * Función que muestra el resultado en la pantalla de búsqueda
     * @param {*} file Referencia al fichero en el que hemos encontrado resultados
     * @param {*} mainTitle Título del main del fichero que estamos consultando
     * @param {*} sentence Frase donde se ha encontrado la palabra buscada
     */
    function displayResults(file, mainTitle, sentence) {
      const fileLink = "<a href=" + file + ">" + mainTitle + "</a>";
      let resultHTML = '<article class="result">' + fileLink + "</article>";
      resultHTML += '<article class="result"><p>' + sentence + "</p></article>";

      resultsContainer.innerHTML += resultHTML;
    }

    /**
     * Función que comprueba si se ha encontrado un resultado o no
     */
    function checkResults() {
      const resultsContainer = document.getElementById("resultados");
      if (resultsContainer.children.length === 0) {
        resultsContainer.innerHTML =
          "<p>No hay resultados para su búsqueda</p>";
      }
    }

    /**
     * Método que busca en todos los ficheros la palabra especificada en la búsqueda
     */
    async function searchFiles() {
      for (const file of files) {
        await searchFile(file, searchTerm);
      }

      // Si no hay resultados, mostramos un error
      checkResults();
    }

    searchFiles();
  }
});
