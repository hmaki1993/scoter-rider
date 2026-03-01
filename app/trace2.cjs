const fs = require('fs');
const content = fs.readFileSync('src/pages/settings/SettingsContainer.tsx', 'utf8');

const lines = content.split('\n');
let divStack = [];
let inReturn = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('return (') && !line.includes('=>')) inReturn = true;
    if (!inReturn) continue;

    // A better approach: remove strings and matching brackets first?
    // Let's just find <div and </div, but check if the tag ends with />
    let pos = 0;
    while (true) {
        let openPos = line.indexOf('<div', pos);
        let closePos = line.indexOf('</div', pos);

        if (openPos === -1 && closePos === -1) break;

        if (openPos !== -1 && (closePos === -1 || openPos < closePos)) {
            // Found <div... 
            // Let's check if it closes with "/>" before the next ">"
            let tagEnd = line.indexOf('>', openPos);
            if (tagEnd !== -1 && line.substring(tagEnd - 1, tagEnd + 1) === '/>') {
                // Self closing
            } else {
                divStack.push(i + 1);
            }
            pos = openPos + 4;
        } else {
            // Found </div
            if (divStack.length === 0) {
                console.log('Extra closing div at line', i + 1);
            } else {
                divStack.pop();
            }
            pos = closePos + 5;
        }
    }
}

if (divStack.length > 0) {
    console.log('Unclosed divs opened at lines:', divStack);
} else {
    console.log('All divs matched!');
}
