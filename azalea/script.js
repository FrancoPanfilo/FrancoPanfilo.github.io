function loadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    populateTable(json);
  };

  reader.readAsArrayBuffer(file);
}

function populateTable(data) {
  const tbody = document
    .getElementById("dataTable")
    .getElementsByTagName("tbody")[0];
  tbody.innerHTML = "";

  data.forEach((row, index) => {
    const tr = document.createElement("tr");

    if (index === 0) {
      row.unshift("average");
    } else {
      row.unshift(index);
    }

    row.forEach((cell) => {
      const td = document.createElement("td");
      td.contentEditable = true;
      td.innerText = cell;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function downloadTableAsImage() {
  const table = document.getElementById("dataTable");
  html2canvas(table).then((canvas) => {
    const link = document.createElement("a");
    link.download = "table.jpg";
    link.href = canvas.toDataURL("image/jpeg");
    link.click();
  });
}
