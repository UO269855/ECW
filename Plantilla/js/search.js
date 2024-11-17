// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Extract the search term from the URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const searchTerm = urlParams.get("buscarPalabra");

  if (!searchTerm) {
    // If no search term is provided, show an error message
    document.getElementById("resultados").innerHTML =
      "<p>No search term provided.</p>";
  } else {
    const files = [
      "aboutMe.html",
      "index.html",
      "personalProjects.html",
      "help.html",
    ];
    const resultsContainer = document.getElementById("resultados");
    resultsContainer.innerHTML = ""; // Clear previous results

    document.getElementById("palabraBuscada").innerHTML =
      "<p>Palabra buscada:" + searchTerm + "</p>";

    // Function to check if the search term exists in the text (case-insensitive)
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

        // Check if the search term appears in the body text
        if (isSubstringMatch(bodyText, searchTerm)) {
          const sentence = extractSentence(bodyText, searchTerm);
          displayResults(file, sentence); // Display result with sentence
        }
      } catch (error) {
        console.error("Error fetching or processing file:", file, error);
      }
    }

    // Function to display the results for a file
    function displayResults(file, sentence) {
      const fileName = file.split("/").pop(); // Get the file name
      const fileLink = "<a href=" + file + ">" + fileName + "</a>";
      let resultHTML = '<article class="result">' + fileLink + "</article>";
      resultHTML += '<article class="result"><p>' + sentence + "</p></article>";

      resultsContainer.innerHTML += resultHTML;
    }

    // Search all files
    files.forEach((file) => searchFile(file, searchTerm)); // Loop through the files and call searchFile
  }
});
