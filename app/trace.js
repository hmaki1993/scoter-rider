const fs = require('fs');
const content = fs.readFileSync('src/pages/settings/SettingsContainer.tsx', 'utf8');

const lines = content.split('\n');
let divStack = [];
let inReturn = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('return (') && !line.includes('=>')) inReturn = true;
    if (!inReturn) continue;

    let re = /<\/?div/g;
    let match;
    while ((match = re.exec(line)) !== null) {
        if (match[0] === '<div') {
            divStack.push(i + 1);
        } else if (match[0] === '</div') {
            if (divStack.length === 0) {
                console.log('Extra closing div at line', i + 1);
            } else {
                divStack.pop();
            }
        }
    }
}

if (divStack.length > 0) {
    console.log('Unclosed divs opened at lines:', divStack);
} else {
    console.log('All divs matched!');
}
