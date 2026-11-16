export type ParsedDeviceCategory = 'mobile' | 'desktop' | 'api' | 'browser';

export interface ParsedClientDevice {
  displayName: string;
  category: ParsedDeviceCategory;
  os: string;
  browser: string;
  fingerprintKey: string;
  isAutomated: boolean;
}

function detectBrowserName(raw: string): string {
  // Check Chromium derivatives BEFORE Chrome/Safari tokens
  if (/EdgA|EdgiOS|Edg\//i.test(raw)) return 'Microsoft Edge';
  if (/OPR\/|OPiOS\/|OPT\/|Opera/i.test(raw)) return 'Opera';
  if (/SamsungBrowser/i.test(raw)) return 'Samsung Internet';
  if (/YaBrowser/i.test(raw)) return 'Yandex Browser';
  if (/UCBrowser/i.test(raw)) return 'UC Browser';
  if (/DuckDuckGo/i.test(raw)) return 'DuckDuckGo';
  if (/Vivaldi/i.test(raw)) return 'Vivaldi';
  if (/Brave/i.test(raw)) return 'Brave';
  if (/FxiOS|Firefox\//i.test(raw)) return 'Firefox';
  if (/CriOS|Chrome\//i.test(raw)) return 'Google Chrome';
  if (/Safari\//i.test(raw)) return 'Safari';
  return 'Web Browser';
}

/**
 * Parses a User-Agent string into an accurate device, OS, and browser summary.
 * Matches Chromium derivative tokens (Edge, Opera, Samsung Internet) ahead of
 * Chrome/Safari so macOS Edge and Windows Opera are classified accurately.
 */
export function parseDeviceSession(ua?: string | null): ParsedClientDevice {
  const raw = (ua || '').trim();
  const lower = raw.toLowerCase();

  if (!raw || lower === 'node' || lower.startsWith('node/')) {
    return {
      displayName: 'Automated Client',
      category: 'api',
      os: 'Node.js Runtime',
      browser: 'HTTP Client',
      fingerprintKey: 'api:node',
      isAutomated: true,
    };
  }

  if (lower.includes('undici') || lower.includes('node-fetch') || lower.includes('axios') || lower.includes('got/')) {
    return {
      displayName: 'API Integration (Node.js)',
      category: 'api',
      os: 'Node.js Runtime',
      browser: 'HTTP Client',
      fingerprintKey: 'api:nodejs-http',
      isAutomated: true,
    };
  }

  if (lower.includes('curl')) {
    return {
      displayName: 'API Client (cURL)',
      category: 'api',
      os: 'Command Line',
      browser: 'cURL',
      fingerprintKey: 'api:curl',
      isAutomated: false,
    };
  }

  if (lower.includes('postman')) {
    return {
      displayName: 'API Client (Postman)',
      category: 'api',
      os: 'Postman',
      browser: 'Postman',
      fingerprintKey: 'api:postman',
      isAutomated: false,
    };
  }

  if (lower.includes('insomnia')) {
    return {
      displayName: 'API Client (Insomnia)',
      category: 'api',
      os: 'Insomnia',
      browser: 'Insomnia',
      fingerprintKey: 'api:insomnia',
      isAutomated: false,
    };
  }

  if (lower.includes('python')) {
    return {
      displayName: 'API Integration (Python)',
      category: 'api',
      os: 'Python Runtime',
      browser: 'Python',
      fingerprintKey: 'api:python',
      isAutomated: false,
    };
  }

  if (lower.includes('go-http-client')) {
    return {
      displayName: 'API Integration (Go)',
      category: 'api',
      os: 'Go Runtime',
      browser: 'Go Client',
      fingerprintKey: 'api:go',
      isAutomated: false,
    };
  }

  if (/iPhone/i.test(raw)) {
    const versionMatch = raw.match(/OS (\d+)[_.](\d+)/i);
    const osVersion = versionMatch ? `iOS ${versionMatch[1]}.${versionMatch[2]}` : 'iOS';
    const browser = detectBrowserName(raw);
    return {
      displayName: `iPhone (${osVersion}) · ${browser}`,
      category: 'mobile',
      os: `Apple ${osVersion}`,
      browser,
      fingerprintKey: `mobile:iphone:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  if (/iPad/i.test(raw)) {
    const versionMatch = raw.match(/OS (\d+)[_.](\d+)/i);
    const osVersion = versionMatch ? `iPadOS ${versionMatch[1]}` : 'iPadOS';
    const browser = detectBrowserName(raw);
    return {
      displayName: `iPad (${osVersion}) · ${browser}`,
      category: 'mobile',
      os: osVersion,
      browser,
      fingerprintKey: `mobile:ipad:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  if (/Android/i.test(raw)) {
    const androidVerMatch = raw.match(/Android (\d+(?:\.\d+)?)/i);
    const os = androidVerMatch ? `Android ${androidVerMatch[1]}` : 'Android';
    let brand = 'Android Device';
    if (/Samsung|SM-[A-Z0-9]+/i.test(raw)) brand = 'Samsung Galaxy';
    else if (/Pixel\s?[0-9a-z]+/i.test(raw)) brand = 'Google Pixel';
    else if (/Xiaomi|Redmi|POCO/i.test(raw)) brand = 'Xiaomi Device';
    else if (/TECNO/i.test(raw)) brand = 'TECNO Device';
    else if (/Infinix/i.test(raw)) brand = 'Infinix Device';
    else if (/itel/i.test(raw)) brand = 'itel Device';
    else if (/OPPO|CPH[0-9]+/i.test(raw)) brand = 'OPPO Device';
    else if (/Vivo/i.test(raw)) brand = 'Vivo Device';
    else if (/OnePlus/i.test(raw)) brand = 'OnePlus Device';

    const browser = detectBrowserName(raw);
    return {
      displayName: `${brand} (${os}) · ${browser}`,
      category: 'mobile',
      os,
      browser,
      fingerprintKey: `mobile:android:${brand.toLowerCase()}:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  if (/Windows/i.test(raw)) {
    const os = /Windows NT 10\.0/i.test(raw) ? 'Windows 10/11' : 'Windows';
    const browser = detectBrowserName(raw);
    return {
      displayName: `${os} · ${browser}`,
      category: 'desktop',
      os,
      browser,
      fingerprintKey: `desktop:windows:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  if (/Macintosh|Mac OS X/i.test(raw)) {
    const os = 'macOS';
    const browser = detectBrowserName(raw);
    return {
      displayName: `Mac (${os}) · ${browser}`,
      category: 'desktop',
      os,
      browser,
      fingerprintKey: `desktop:macos:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  if (/CrOS/i.test(raw)) {
    const browser = detectBrowserName(raw);
    return {
      displayName: `Chromebook · ${browser}`,
      category: 'desktop',
      os: 'ChromeOS',
      browser,
      fingerprintKey: `desktop:chromeos:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  if (/Linux/i.test(raw)) {
    const browser = detectBrowserName(raw);
    return {
      displayName: `Linux · ${browser}`,
      category: 'desktop',
      os: 'Linux',
      browser,
      fingerprintKey: `desktop:linux:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  const browser = detectBrowserName(raw);
  return {
    displayName: browser !== 'Web Browser' ? browser : raw.length > 36 ? `${raw.slice(0, 36)}…` : raw,
    category: 'browser',
    os: 'Web Platform',
    browser,
    fingerprintKey: `browser:${browser.toLowerCase()}`,
    isAutomated: false,
  };
}

