import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RecoveryStatusBoundary, RecoveryStatusSlot } from './RecoveryStatusBoundary';

describe('recovery status placement', () => {
  it('keeps status available before a learner shell mounts without hiding the runtime', () => {
    const markup = renderToStaticMarkup(createElement(RecoveryStatusBoundary, {
      status: createElement('aside', { role: 'status' }, 'Thay đổi chưa lưu'),
      children: createElement('main', null, 'Học tiếp'),
    }));
    expect(markup).toContain('role="status"');
    expect(markup.indexOf('Thay đổi chưa lưu')).toBeLessThan(markup.indexOf('<main>'));
    expect(markup).toContain('Học tiếp');
  });

  it('does not add a status message when there is none', () => {
    const markup = renderToStaticMarkup(createElement(RecoveryStatusBoundary, {
      status: null, children: createElement(RecoveryStatusSlot),
    }));
    expect(markup).toBe('<div class="recovery-status-slot"></div>');
  });

  it('reserves session viewport space rather than floating over navigation or the CTA', () => {
    const source = readFileSync(new URL('../critical.css', import.meta.url), 'utf8');
    const status = source.match(/\.recovery-status \{([^}]+)\}/u)![1];
    expect(status).toContain('position: relative');
    expect(status).not.toMatch(/position:\s*(fixed|absolute)/u);
    expect(status).toContain('overflow-y: auto');
    expect(source).toContain('- var(--recovery-status-block, 0px)');
    const shell = readFileSync(new URL('./AppShell.tsx', import.meta.url), 'utf8');
    expect(shell.indexOf('<RecoveryStatusSlot />')).toBeGreaterThan(shell.indexOf('<NgocHeader'));
    expect(shell.indexOf('<RecoveryStatusSlot />')).toBeLessThan(shell.indexOf('<main className="main-stage"'));
  });
});
