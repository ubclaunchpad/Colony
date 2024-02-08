export function parseCsv(csvData) {
  // Split the CSV data into rows
  const rows = csvData.split("\n");

  // Assuming the first row contains headers, split them into an array
  const headers = rows[0]
    .split(",")
    .map((header) => header.trim().replace(/\r/g, ""));

  // Initialize an array to store the parsed data
  const parsedData = [];

  // Loop through the remaining rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].split(",");

    // Create an object with key-value pairs using headers and row data
    const rowData = {};
    for (let j = 0; j < headers.length; j++) {
      rowData[headers[j]] = row[j];
    }

    // Push the object into the parsed data array
    parsedData.push(rowData);
  }

  return parsedData;
}
