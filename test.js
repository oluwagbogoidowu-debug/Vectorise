const fs = require('fs');
const content = fs.readFileSync('pages/Participant/RiseBlog.tsx', 'utf8');
console.log(content.includes('pb-4'));
