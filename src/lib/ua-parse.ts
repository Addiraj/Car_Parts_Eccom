export function parseUA(ua: string): { device: string; browser: string; os: string } {
  const s = ua || "";
  const mobile = /Mobile|Android|iPhone|iPad/i.test(s);
  const os = /Windows/i.test(s) ? "Windows"
    : /Mac OS X/i.test(s) ? "macOS"
    : /Android/i.test(s) ? "Android"
    : /iPhone|iPad|iOS/i.test(s) ? "iOS"
    : /Linux/i.test(s) ? "Linux" : "Unknown";
  const browser = /Edg\//i.test(s) ? "Edge"
    : /OPR\/|Opera/i.test(s) ? "Opera"
    : /Chrome\//i.test(s) ? "Chrome"
    : /Firefox\//i.test(s) ? "Firefox"
    : /Safari\//i.test(s) ? "Safari" : "Browser";
  const device = mobile ? "Mobile" : "Desktop";
  return { device, browser, os };
}
