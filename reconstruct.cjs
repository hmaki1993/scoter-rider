const fs = require('fs');

const logPath = 'C:/Users/skinz/.gemini/antigravity/brain/94f92082-ca7d-47ba-bc72-9f644dcf5961/.system_generated/logs/transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.error('Log file does not exist at:', logPath);
  process.exit(1);
}

const logContent = fs.readFileSync(logPath, 'utf8');
const lines = logContent.split('\n');

let parts = {};

lines.forEach((line, idx) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'VIEW_FILE' && obj.content && obj.content.includes('File Path:')) {
      const content = obj.content;
      const pathLine = content.split('\n').find(l => l.includes('File Path:'));
      
      if (idx === 13) {
        console.log('DEBUG: Line 13 pathLine:', pathLine);
        console.log('DEBUG: Line 13 includes src/App.tsx:', pathLine && pathLine.includes('src/App.tsx'));
        const matchRange = content.match(/Showing lines (\d+) to (\d+)/);
        console.log('DEBUG: Line 13 matchRange:', matchRange);
      }

      if (pathLine && pathLine.includes('src/App.tsx') && !pathLine.includes('.restored') && !pathLine.includes('original')) {
        const matchRange = content.match(/Showing lines (\d+) to (\d+)/);
        if (matchRange) {
          const start = parseInt(matchRange[1], 10);
          console.log(`Step ${obj.step_index} (log line ${idx}): Reconstructing App.tsx range: ${start} to ${matchRange[2]}`);
          const contentLines = content.split('\n');
          contentLines.forEach(cl => {
            const m = cl.match(/^\s*(\d+):\s(.*)$/);
            if (m) {
              const lineNum = parseInt(m[1], 10);
              const lineCode = m[2];
              parts[lineNum] = lineCode;
            }
          });
        }
      }
    }
  } catch (e) {
    console.error('JSON parse error at index', idx, e.message);
  }
});
