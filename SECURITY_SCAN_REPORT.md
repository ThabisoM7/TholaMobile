# 🛡️ Thola App - Static Code Security Audit Report

*Generated automatically on: 2026-05-20T22:25:05.253Z*

## 📊 Executive Summary
| Metric | Value |
| :--- | :--- |
| **Total Files Audited** | 49 |
| **Critical Findings** | 0 🔴 |
| **High Findings** | 1 🟠 |
| **Medium Findings** | 2 🟡 |

## 🚨 Detailed Vulnerability Records

### [MEDIUM] Cleartext HTTP connection protocols (SEC-003)
* **File**: [`backend\src\scripts\scan-security.js`](file:///C:/Users/LAPTOPONE/Downloads/TholaApp1/backend/src/scripts/scan-security.js#L33)
* **Line Number**: 33
* **Vulnerability Description**: Detects cleartext transmission protocol schemas (http:// instead of https://) for public endpoints.
* **Matching Snippet**:
  ```typescript
  description: 'Detects cleartext transmission protocol schemas (http:// instead of https://) for public endpoints.'
  ```

---

### [HIGH] Dangerous innerHTML rendering (SEC-004)
* **File**: [`backend\src\scripts\scan-security.js`](file:///C:/Users/LAPTOPONE/Downloads/TholaApp1/backend/src/scripts/scan-security.js#L38)
* **Line Number**: 38
* **Vulnerability Description**: Detects raw HTML insertions. Renders application vulnerable to Cross-Site Scripting (XSS) attacks.
* **Matching Snippet**:
  ```typescript
  regex: /dangerouslySetInnerHTML/gi,
  ```

---

### [MEDIUM] Cleartext HTTP connection protocols (SEC-003)
* **File**: [`frontend\src\api\client.ts`](file:///C:/Users/LAPTOPONE/Downloads/TholaApp1/frontend/src/api/client.ts#L6)
* **Line Number**: 6
* **Vulnerability Description**: Detects cleartext transmission protocol schemas (http:// instead of https://) for public endpoints.
* **Matching Snippet**:
  ```typescript
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.179:5000';
  ```

---

