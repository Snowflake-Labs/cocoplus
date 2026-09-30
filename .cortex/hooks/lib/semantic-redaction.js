'use strict';

const SECRET_KEYS = new Set([
  'apikey',
  'authorization',
  'clientsecret',
  'connectionstring',
  'cookie',
  'credential',
  'credentials',
  'idtoken',
  'password',
  'passwd',
  'privatekey',
  'proxyauthorization',
  'pwd',
  'refreshtoken',
  'secret',
  'setcookie',
  'token',
  'accesstoken',
  'accesskey',
  'awssecretaccesskey',
  'secretkey',
]);

const PII_KEYS = new Map([
  ['address', 'ADDRESS'],
  ['birthdate', 'DOB'],
  ['cardnumber', 'PAYMENT_CARD'],
  ['creditcard', 'PAYMENT_CARD'],
  ['dateofbirth', 'DOB'],
  ['dob', 'DOB'],
  ['email', 'EMAIL'],
  ['emailaddress', 'EMAIL'],
  ['firstname', 'NAME'],
  ['fullname', 'NAME'],
  ['lastname', 'NAME'],
  ['mailingaddress', 'ADDRESS'],
  ['mobile', 'PHONE'],
  ['name', 'NAME'],
  ['pan', 'PAYMENT_CARD'],
  ['phone', 'PHONE'],
  ['phonenumber', 'PHONE'],
  ['socialsecurity', 'SSN'],
  ['socialsecuritynumber', 'SSN'],
  ['ssn', 'SSN'],
  ['streetaddress', 'ADDRESS'],
  ['telephone', 'PHONE'],
]);

const SECRET_LABEL = '(?:password|passwd|pwd|secret(?:[_-]?key)?|token|access[_-]?(?:token|key)|refresh[_-]?token|id[_-]?token|api[_-]?key|client[_-]?secret|private[_-]?key|credential|authorization|cookie|connection[_-]?string|aws[_-]?secret[_-]?access[_-]?key)';
const NAME_LABEL = '(?:name|full[_ -]?name|first[_ -]?name|last[_ -]?name)';
const ADDRESS_LABEL = '(?:address|street[_ -]?address|mailing[_ -]?address)';

function normalizedKey(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function redactStructured(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[REDACTED_CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redactStructured(item, seen));

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    if (SECRET_KEYS.has(normalized)) output[key] = '[REDACTED_SECRET]';
    else if (PII_KEYS.has(normalized)) output[key] = `[REDACTED_${PII_KEYS.get(normalized)}]`;
    else output[key] = redactStructured(item, seen);
  }
  return output;
}

function redactText(value) {
  let text = String(value || '');
  const trimmed = text.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      text = JSON.stringify(redactStructured(JSON.parse(trimmed)));
    } catch (_) { /* redact the original text below */ }
  }

  const labelledSecret = new RegExp(`((?:["']?)\\b${SECRET_LABEL}\\b(?:["']?)\\s*[:=]\\s*)(?:"[^"\\r\\n]*"|'[^'\\r\\n]*'|[^,;\\r\\n}\\]]+)`, 'gi');
  const labelledName = new RegExp(`(\\b${NAME_LABEL}\\b\\s*[:=]\\s*)(?:"[^"\\r\\n]*"|'[^'\\r\\n]*'|[^,;\\r\\n}\\]]+)`, 'gi');
  const labelledAddress = new RegExp(`(\\b${ADDRESS_LABEL}\\b\\s*[:=]\\s*)(?:"[^"\\r\\n]*"|'[^'\\r\\n]*'|[^;\\r\\n}\\]]+)`, 'gi');
  return text
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]{0,12000}?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}\b/gi, '[REDACTED_AUTH]')
    .replace(/\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_KEY]')
    .replace(/\b(?:sk|pk|ghp|gho|ghu|ghs|github_pat|xox[baprs]|npm)_[A-Za-z0-9_-]{8,}\b/gi, '[REDACTED_KEY]')
    .replace(/:\/\/[^:/\s]+:[^@\s]+@/g, '://[REDACTED_CREDENTIALS]@')
    .replace(labelledSecret, '$1[REDACTED_SECRET]')
    .replace(labelledName, '$1[REDACTED_NAME]')
    .replace(labelledAddress, '$1[REDACTED_ADDRESS]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_PAYMENT_CARD]')
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]')
    .replace(/\b(dob|date of birth|birthdate)\b\s*[:=]\s*(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/gi, '$1=[REDACTED_DOB]');
}

function redactSemanticContext(value, maxLength = 4000) {
  const sanitized = redactStructured(value);
  const limit = Math.max(0, Number(maxLength) || 4000);
  let serialized;
  try {
    serialized = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
  } catch (_) {
    serialized = '[REDACTED_UNSERIALIZABLE]';
  }
  return redactText(serialized.slice(0, limit + 8192)).slice(0, limit);
}

module.exports = { redactSemanticContext };
