const fs = require('fs');
let code = fs.readFileSync('pages/Coach/CoachSprints.tsx', 'utf8');
code = code.replace(
    /\{label\} \{count > 0 \? `\(\$\{count\}\)` : ''\}/g,
    ''
);
code = code.replace(
    /\{label\} \(\{count\}\)/g,
    '{label} {count > 0 ? `(${count})` : ""}'
);
code = code.replace(
    /<button\s*\n\s*key=\{f\}\s*\n\s*onClick=\{[^}]*\}\s*\n\s*className=\{[^}]*\}\s*>\s*\n\s*\{label\} \{count > 0 \? `\(\$\{count\}\)` : ""\}\s*\n\s*<\/button>/g,
    '<button key={f} onClick={() => setFilter(f)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border cursor-pointer ${filter === f ? "bg-primary text-white border-primary shadow-md" : "bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary"}`}>\n                            {label} {count > 0 ? `(${count})` : ""}\n                        </button>'
);
fs.writeFileSync('pages/Coach/CoachSprints.tsx', code);
