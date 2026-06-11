const fs = require('fs');

function checkTags(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Minimal tokenizer for tags: <div ...> or </div>
  const lines = content.split('\n');
  const stack = [];
  
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    
    // We strip JSX comments {/* ... */}
    const cleanLine = line.replace(/\{\s*\/\*.*?\*\/\s*\}/g, '').replace(/\/\/.*$/, '');
    
    // Let's find tags on this line
    // We can use a regex that matches JSX tags: <tag, </tag>, or self-closing tags
    const tagRegex = /<\/?[a-zA-Z0-9.-]+(?:\s+[^>]*?)?>/g;
    let match;
    
    while ((match = tagRegex.exec(cleanLine)) !== null) {
      const fullTag = match[0];
      
      // Ignore comments of HTML
      if (fullTag.startsWith('<!--') || fullTag.startsWith('<!')) continue;
      
      const tagNameMatch = fullTag.match(/<\/??([a-zA-Z0-9.-]+)/);
      if (!tagNameMatch) continue;
      const tagName = tagNameMatch[1];
      
      // Ignore common self-closing tags
      if (['img', 'input', 'br', 'hr', 'defs', 'linearGradient', 'stop', 'Area', 'CartesianGrid', 'XAxis', 'YAxis', 'Tooltip', 'RefreshCw', 'Sparkles', 'Sliders', 'TrendingUp', 'TrendingDown'].includes(tagName)) {
        continue;
      }
      
      const isClosing = fullTag.startsWith('</');
      const isSelfClosing = fullTag.endsWith('/>');
      
      if (isSelfClosing) continue;
      
      if (isClosing) {
        if (stack.length === 0) {
          console.log(`Error: Closing tag </${tagName}> on line ${lineNum} has no matching opening tag.`);
        } else {
          const last = stack.pop();
          if (last.name !== tagName) {
            console.log(`Error: Mismatched tags. </${tagName}> on line ${lineNum} tries to close <${last.name}> from line ${last.line}`);
          }
        }
      } else {
        stack.push({ name: tagName, line: lineNum });
      }
    }
  }
  
  while (stack.length > 0) {
    const last = stack.pop();
    console.log(`Error: Unclosed tag <${last.name}> on line ${last.line}`);
  }
}

checkTags('./components/LojistaCopilot.tsx');
