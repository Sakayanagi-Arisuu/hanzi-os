import type { Metadata } from 'next';
import { HanziPasswordAction } from '../../../../src/components/HanziPasswordAction';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Khôi phục tài khoản | HANZI.OS',
  referrer: 'no-referrer', robots: { index: false, follow: false },
};

/** Reset/verification links never pass their code through server props or metadata. */
export default function PasswordActionPage() { return <HanziPasswordAction />; }
