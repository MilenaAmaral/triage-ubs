const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const { parseDocument } = require('htmlparser2');
const dom = parseDocument(html, { sourceCodeLocationInfo: true });
const errors = [];
function traverse(node) {
  if (!node) return;
  if (node.type === 'tag' && node.sourceCodeLocation && node.sourceCodeLocation.startTag && node.sourceCodeLocation.endTag) {
    if (node.sourceCodeLocation.startTag.startLine && node.sourceCodeLocation.endTag.startLine && node.name === 'main') {
      // no-op
    }
  }
  if (node.childNodes) node.childNodes.forEach(traverse);
}
traverse(dom);
console.log('parsed without crash');
