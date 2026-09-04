const fs = require('fs');
const code = fs.readFileSync('pages/Participant/NextSprintRecommendation.tsx', 'utf8');
const fixed = code.replace(
    /(\s*)<\/div>\s*\);\s*};\s*export default NextSprintRecommendation;/,
    '\n            <DailyStreakWidget streak={(user as any)?.impactStats?.streak || 0} bottomPosition="bottom-32" />\n        </div>\n    );\n};\nexport default NextSprintRecommendation;'
);
fs.writeFileSync('pages/Participant/NextSprintRecommendation.tsx', fixed);
