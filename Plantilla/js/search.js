document.addEventListener("DOMContentLoaded", function () {
  // Obtenemos la palabra que queremos buscar, que se envía por parámetro
  const urlParams = new URLSearchParams(window.location.search);
  const searchTerm = urlParams.get("buscarPalabra")?.replace(/\s+/g, "");

  if (!searchTerm) {
    // Si no hay ningún parámetro, que se indique al usuario
    document.getElementById("resultados").innerHTML =
      "<p>No se ha introducido ninguna palabra para la búsqueda</p>";
  } else {
    // Indicamos los ficheros en los que buscar la palabra
    const files = [
      "aboutMe.html",
      "index.html",
      "personalProjects.html",
      "help.html",
    ];

    // Obtenemos el contenedor donde mostrar los resultados y lo limpiamos.
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
     * Función que obtiene el elemento HTML que contiene la palabra buscada.
     * Extrae el contenido de ese elemento donde se encuentra la palabra.
     * @param {*} doc El documento HTML donde se busca la palabra
     * @param {*} searchTerm La palabra que estamos buscando
     * @returns El contenido del elemento donde se encuentra la palabra
     */
    function extractElementWithSearchTerm(doc, searchTerm) {
      // Buscamos en todos los elementos de tipo texto dentro del body
      const elements = doc.body.querySelectorAll(
        "p, div, span, h1, h2, h3, li"
      ); // Se pueden añadir más tipos de elementos según sea necesario.
      for (const element of elements) {
        if (isSubstringMatch(element.textContent, searchTerm)) {
          return element; // Devolvemos el primer elemento que contiene la palabra
        }
      }
      return null; // Si no se encuentra la palabra en ningún elemento
    }

    /**
     * Función que busca una determinada palabra en el fichero especificado
     * @param {*} file Nombre del fichero
     * @param {*} searchTerm Palabra que estamos buscando
     */
    async function searchFile(file, searchTerm) {
      try {
        // Cargamos el fichero y obtenemos el texto que contiene.
        const response = await fetch(file);
        const text = await response.text();

        // Creamos un parseador que tenga el árbol DOM del texto del fichero
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");

        // Buscamos el elemento que contiene la palabra
        const elementWithSearchTerm = extractElementWithSearchTerm(
          doc,
          searchTerm
        );

        if (elementWithSearchTerm) {
          // Si se encuentra, resaltar la palabra y mostrar el resultado
          const highlightedText = highlightSearchTerm(
            elementWithSearchTerm.innerHTML,
            searchTerm
          );
          displayResults(file, elementWithSearchTerm, highlightedText);
        }
      } catch (error) {
        console.error("Error fetching or processing file:", file, error);
      }
    }

    /**
     * Función que resalta la palabra buscada en negrita
     * @param {*} text Texto donde se encontró la palabra
     * @param {*} searchTerm Palabra buscada
     * @returns El texto con la palabra resaltada en negrita
     */
    function highlightSearchTerm(text, searchTerm) {
      const regex = new RegExp(`(${searchTerm})`, "gi");
      return text.replace(regex, "<strong>$1</strong>");
    }

    /**
     * Función que muestra el resultado en la pantalla de búsqueda
     * @param {*} file Referencia al fichero en el que hemos encontrado resultados
     * @param {*} element Elemento HTML que contiene la palabra
     * @param {*} highlightedText El texto resaltado con la palabra buscada
     */
    function displayResults(file, element, highlightedText) {
      const fileLink =
        "<a href=" +
        file +
        ">" +
        element.tagName +
        " - " +
        element.textContent.substring(0, 30) +
        "...</a>"; // Short description of the element
      let resultHTML = '<article class="result">' + fileLink + "</article>";
      resultHTML +=
        '<article class="result"><p>' + highlightedText + "</p></article>";

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

    // Función principal que se encarga de buscar en todos los ficheros
    async function searchFiles() {
      // Buscamos en todos los ficheros
      for (const file of files) {
        await searchFile(file, searchTerm); // Esperamos a que se termine de buscar en cada fichero
      }

      // Después de buscar en todos los ficheros, verificamos si se encontraron resultados
      checkResults();
    }

    // Iniciamos la búsqueda
    searchFiles();
  }
});
