const fs = require('fs');
const data = require('./ca_search_data.json');
function findResults(obj, depth = 0) {
    if (depth > 10) return;
    if (Array.isArray(obj)) {
        obj.forEach(x => findResults(x, depth + 1));
    } else if (typeof obj === 'object' && obj !== null) {
        if (obj.title && obj.id && (obj.type === 'movie' || obj.type === 'series' || obj.is_series !== undefined)) {
            console.log(obj.title, obj.id, obj.type, obj.release_date || obj.year);
        }
        for (const key in obj) {
            findResults(obj[key], depth + 1);
        }
    }
}
findResults(data);
