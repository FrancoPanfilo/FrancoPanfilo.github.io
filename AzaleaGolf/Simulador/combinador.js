document.getElementById("combinador").addEventListener("click",combineCSVFiles)
function combineCSVFiles() {
  const fileInput = document.getElementById("csvCombinerInput");
  const status = document.getElementById("status");
  const files = fileInput.files;

  if (files.length < 1) {
    status.textContent = "Por favor, selecciona al menos un archivo CSV";
    return;
  }

  status.textContent = "Procesando...";
  let shotsByClub = {};
  let header = "";
  let processedFiles = 0;

  for (let i = 0; i < files.length; i++) {
    const reader = new FileReader();

    reader.onload = function (e) {
      const text = e.target.result;
      const lines = text.split("\n").filter((line) => line.trim() !== "");

      if (i === 0 && lines.length > 0) {
        header = lines[0].trim();
      }

      for (let j = 1; j < lines.length; j++) {
        const columns = lines[j].split(",");
        if (columns.length < 2) continue;

        const clubName = columns[1].trim();
        if (!shotsByClub[clubName]) {
          shotsByClub[clubName] = [];
        }
        shotsByClub[clubName].push(lines[j].trim());
      }

      processedFiles++;

      if (processedFiles === files.length) {
        let combinedData = [];
        let shotNumber = 1;

        Object.keys(shotsByClub)
          .sort()
          .forEach((club) => {
            shotsByClub[club].forEach((line) => {
              const columns = line.split(",");
              columns[0] = shotNumber.toString();
              combinedData.push(columns.join(","));
              shotNumber++;
            });
          });

        const finalCSV = header + "\n" + combinedData.join("\n");

        const blob = new Blob([finalCSV], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          "combined_shots_renumbered_" +
          new Date().toISOString().slice(0, 10) +
          ".csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        status.textContent = `Se han combinado ${files.length} archivos con ${combinedData.length} tiros renumerados exitosamente`;
      }
    };

    reader.onerror = function () {
      status.textContent = "Error al leer el archivo " + files[i].name;
    };

    reader.readAsText(files[i]);
  }
}
