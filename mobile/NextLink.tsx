import type { AnchorHTMLAttributes, ReactNode } from 'react';

export default function NativeLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  return <a {...props} href={href}>{children}</a>;
}
