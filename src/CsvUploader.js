import React, { useState } from 'react';

export default function CsvUploader() {
  const [csvData, setCsvData] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parseCsv(text);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
  };

  const parseCsv = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(';').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(';');
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] ? values[i].trim() : '';
      });
      return obj;
    });
    setCsvData(rows);
    setError(null);
  };

  return (
    <div>
      <h2>Upload dan Baca File CSV</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      {error && <p style={{color: 'red'}}>{error}</p>}
      {csvData && (
        <table border="1" cellPadding="5" style={{ marginTop: 20 }}>
          <thead>
            <tr>
              {Object.keys(csvData[0]).map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {csvData.map((row, idx) => (
              <tr key={idx}>
                {Object.values(row).map((val, i) => (
                  <td key={i}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
