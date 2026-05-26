import { spawn } from 'node:child_process';
import { platform } from 'node:os';

export function openUrl(url) {
  const p = platform();
  const cmd = p === 'darwin' ? 'open' : p === 'win32' ? 'start' : 'xdg-open';
  const args = p === 'win32' ? ['', url] : [url];
  const child = spawn(cmd, args, {
    stdio: 'ignore',
    detached: true,
    shell: p === 'win32',
  });
  child.unref();
}
