const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCAN_DIRS = [
  { name: 'Backend', path: path.join(PROJECT_ROOT, 'backend/src') },
  { name: 'Frontend', path: path.join(PROJECT_ROOT, 'frontend/src') }
];
const REPORT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'SECURITY_SCAN_REPORT.md');

// Scan rules (regex pattern + severity + description)
const RULES = [
  {
    id: 'SEC-001',
    name: 'Hardcoded Cryptographic Secret or Key',
    regex: /(?:const|let|var|env)\s+\w*(?:key|secret|token|password|auth)\w*\s*=\s*['"`][A-Za-z0-9+/=_\-]{16,}['"`]/gi,
    severity: 'CRITICAL',
    description: 'Detects strings resembling hardcoded tokens, API keys, passwords, or secrets longer than 16 characters.'
  },
  {
    id: 'SEC-002',
    name: 'Insecure Client AsyncStorage session storage',
    regex: /AsyncStorage\.setItem\s*\(\s*['"`](?:token|jwt|session|password|auth|key|cred)['"`]/gi,
    severity: 'HIGH',
    description: 'Detects sensitive credentials stored in AsyncStorage. Use expo-secure-store for hardware-backed security.'
  },
  {
    id: 'SEC-003',
    name: 'Cleartext HTTP connection protocols',
    regex: /http:\/\/(?!localhost|127\.0\.0\.1|10\.0\.2\.2)/gi,
    severity: 'MEDIUM',
    description: 'Detects cleartext transmission protocol schemas (http:// instead of https://) for public endpoints.'
  },
  {
    id: 'SEC-004',
    name: 'Dangerous innerHTML rendering',
    regex: /dangerouslySetInnerHTML/gi,
    severity: 'HIGH',
    description: 'Detects raw HTML insertions. Renders application vulnerable to Cross-Site Scripting (XSS) attacks.'
  }
];

// Helper to recursively walk files
function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (file !== 'node_modules' && file !== '.expo' && file !== '.git') {
        getFiles(name, fileList);
      }
    } else {
      if (/\.(js|ts|tsx|jsx)$/.test(file)) {
        fileList.push(name);
      }
    }
  }
  return fileList;
}

// Perform scan
function executeScan() {
  console.log('🤖 Initializing Thola Local Static Security Scanner...');
  const findings = [];
  let filesScanned = 0;

  for (const target of SCAN_DIRS) {
    console.log(`🔍 Crawling ${target.name} directory: ${target.path}`);
    const files = getFiles(target.path);
    filesScanned += files.length;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (const rule of RULES) {
        // Reset regex index
        rule.regex.lastIndex = 0;
        let match;
        
        // Scan line by line for precise match reporting
        for (let i = 0; i < lines.length; i++) {
          const lineContent = lines[i];
          rule.regex.lastIndex = 0;
          if (rule.regex.test(lineContent)) {
            // Scrub matching secret values to prevent double leakage in report
            let scrubbedContent = lineContent.trim();
            if (rule.id === 'SEC-001') {
              scrubbedContent = scrubbedContent.replace(/(=\s*['"`]).*(['"`])/, '$1********$2');
            }
            
            findings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              description: rule.description,
              file: path.relative(PROJECT_ROOT, file),
              line: i + 1,
              content: scrubbedContent
            });
          }
        }
      }
    }
  }

  // Generate Report
  generateMarkdownReport(filesScanned, findings);
}

function generateMarkdownReport(filesCount, findings) {
  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;

  let report = `# 🛡️ Thola App - Static Code Security Audit Report\n\n`;
  report += `*Generated automatically on: ${new Date().toISOString()}*\n\n`;
  report += `## 📊 Executive Summary\n`;
  report += `| Metric | Value |\n`;
  report += `| :--- | :--- |\n`;
  report += `| **Total Files Audited** | ${filesCount} |\n`;
  report += `| **Critical Findings** | ${criticalCount} 🔴 |\n`;
  report += `| **High Findings** | ${highCount} 🟠 |\n`;
  report += `| **Medium Findings** | ${mediumCount} 🟡 |\n\n`;

  if (findings.length === 0) {
    report += `### 🎉 Security Status: EXCELLENT\n`;
    report += `No high-severity vulnerabilities, hardcoded credentials, or cleartext connections were detected in the source directories. Excellent job adhering to OWASP best practices!\n`;
  } else {
    report += `## 🚨 Detailed Vulnerability Records\n\n`;
    for (const item of findings) {
      report += `### [${item.severity}] ${item.ruleName} (${item.ruleId})\n`;
      report += `* **File**: [\`${item.file}\`](file:///${PROJECT_ROOT.replace(/\\/g, '/')}/${item.file.replace(/\\/g, '/')}#L${item.line})\n`;
      report += `* **Line Number**: ${item.line}\n`;
      report += `* **Vulnerability Description**: ${item.description}\n`;
      report += `* **Matching Snippet**:\n  \`\`\`typescript\n  ${item.content}\n  \`\`\`\n\n`;
      report += `---\n\n`;
    }
  }

  fs.writeFileSync(REPORT_OUTPUT_PATH, report);
  console.log(`\n🎉 Scan complete! ${findings.length} findings logged.`);
  console.log(`📄 Security report written to: ${REPORT_OUTPUT_PATH}`);
}

executeScan();
