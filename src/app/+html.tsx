import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var path=window.location.pathname||'/';var hash=window.location.hash||'';var search=window.location.search||'';var onReset=path==='/redefinir-senha'||path==='/redefinir-senha/';var recovery=hash.indexOf('type=recovery')!==-1||search.indexOf('type=recovery')!==-1||search.indexOf('token_hash=')!==-1||(onReset&&(hash.indexOf('access_token=')!==-1||search.indexOf('code=')!==-1));if(!recovery)return;sessionStorage.setItem('utime.recovery-url',window.location.href);if(onReset&&!hash)return;history.replaceState(null,'','/redefinir-senha'+search);}catch(e){}})();`,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: 'html, body, #root { height: 100%; background-color: #000000; }',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
