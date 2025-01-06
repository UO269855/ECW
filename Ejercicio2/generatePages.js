document.getElementById("generateBtn").addEventListener("click", function () {
  const fileInput = document.getElementById("xmlFileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please upload an XML file first.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const xmlText = e.target.result;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    // Get all <page> elements from the XML
    const pages = xmlDoc.getElementsByTagName("page");

    // Iterate over each page and generate corresponding HTML
    Array.from(pages).forEach((page) => {
      const htmlContent = generateHTML(page);

      // Create a downloadable HTML file for each <page>
      const blob = new Blob([htmlContent], { type: "text/html" });
      const link = document.createElement("a");
      const pageName = page.getAttribute("name");
      link.href = URL.createObjectURL(blob);
      link.download = pageName;
      link.click();
    });
  };

  reader.readAsText(file);
});

// Recursive function to generate HTML content based on XML structure
function generateHTML(xmlNode) {
  const title = xmlNode.getAttribute("title") || "Untitled"; // Fallback title
  const stylesheet = xmlNode.getAttribute("stylesheet") || ""; // Optional stylesheet

  let html = `
              <!DOCTYPE html>
              <html lang="es">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>${title}</title>
                  ${
                    stylesheet
                      ? `<link rel="stylesheet" href="${stylesheet}" type="text/css">`
                      : ""
                  }
              </head>
              <body>
              <h1>${title}</h1>`;

  // Add navigation bar with links to all pages
  html += `<nav><ul>`;

  // Get all pages and generate links to them
  const pages = xmlNode.parentNode.getElementsByTagName("page");
  Array.from(pages).forEach((page) => {
    const pageName = page.getAttribute("name");
    if (pageName) {
      html += `<li><a href="${pageName}">${page.getAttribute(
        "title"
      )}</a></li>`;
    }
  });

  html += `</ul></nav>`;

  // Start the body content generation
  const children = xmlNode.childNodes;
  if (children.length > 0) {
    Array.from(children).forEach((child) => {
      html += generateBody(child, 2); // Increase level for deeper nesting
    });
  }

  html += `</body></html>`;
  return html;
}

// Recursive function to generate body content based on XML structure
function generateBody(xmlNode, level = 1) {
  let html = "";

  // If it's an element node (not text or comment)
  if (xmlNode.nodeType === 1) {
    const type = xmlNode.getAttribute("type");
    const title = xmlNode.getAttribute("title");

    const headingtype = "h" + level;

    // Open the tag based on 'type' (could be section, article, etc.)
    html += `<${type}>`;
    html += `<${headingtype}>${title}</${headingtype}>`;

    // Recursively process child nodes (nested textblocks)
    const children = xmlNode.childNodes;
    if (children.length > 0) {
      Array.from(children).forEach((child) => {
        html += generateBody(child, level + 1); // Increase level for deeper nesting
      });
    }

    html += `</${type}>`;
  }

  // If it's a text node (like plain text inside an element)
  else if (xmlNode.nodeType === 3) {
    const content = xmlNode.textContent.trim();
    if (content) {
      // Only create <p> if content is not empty
      html += `<p>${content}</p>`;
    }
  }

  return html;
}
