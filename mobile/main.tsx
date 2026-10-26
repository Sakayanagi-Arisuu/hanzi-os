import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { ClientApp } from '../app/client-app';
import { AuthConsole } from '../src/components/AuthConsole';
import { installNativeTransport, signInNativeHanzi, startNativeGithubSignIn, startNativeSignIn } from '../src/native/nativeRuntime';
import '../src/critical.css';
import '../src/components/AuthGuild.css';
import '../src/components/GuildTypography.css';
import './native.css';

function NativeEntry() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  if (path === '/signin' || path === '/signin-with-chatgpt') return (
    <main className="signin-page auth-guild">
      <nav className="signin-nav"><a href="/">← HANZI.OS</a></nav>
      <section className="signin-console native-signin">
        <AuthConsole mode="signin" initialCapabilities={{ google: true, hanzi: false, github: false, facebook: false, emailOtp: false, passkey: false }}
          onGoogleSignIn={startNativeSignIn} onGithubSignIn={startNativeGithubSignIn} onHanziSignIn={signInNativeHanzi} />
      </section>
    </main>
  );
  return <ClientApp />;
}

await installNativeTransport();
createRoot(document.getElementById('root')!).render(<NativeEntry />);
