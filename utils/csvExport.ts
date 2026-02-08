export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) {
      alert("No hay datos para exportar.");
      return;
  }

  // Flatten object for CSV if necessary or select specific keys
  // For this generic implementation, we assume a flat structure or simply take top-level keys
  const separator = ',';
  const keys = Object.keys(data[0]);

  const csvContent =
    keys.join(separator) +
    '\n' +
    data.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        
        // Handle Arrays or Objects inside cells
        if (typeof cell === 'object') {
            cell = JSON.stringify(cell).replace(/"/g, '""');
        } else {
            cell = cell.toString().replace(/"/g, '""');
        }
        
        // Escape logic
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};