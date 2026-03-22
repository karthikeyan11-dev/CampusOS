'use client';

export function ThemeInitializer() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'light') {
              document.documentElement.classList.add('light');
              document.documentElement.classList.remove('dark');
              document.documentElement.style.colorScheme = 'light';
            } else {
              document.documentElement.classList.add('dark');
              document.documentElement.classList.remove('light');
              document.documentElement.style.colorScheme = 'dark';
            }
          })()
        `,
      }}
    />
  );
}
