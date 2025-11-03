import { useEffect, useState } from 'react';

function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md shadow bg-white/90 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${theme === 'light' ? 'ring-2 ring-indigo-400' : ''}`}
        title="Light theme"
        aria-label="Switch to light theme"
      >
        {/* Sun icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-500 dark:text-yellow-400">
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0 4a1 1 0 0 1-1-1v-1a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1Zm0-18a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1Zm10 7h-1a1 1 0 1 1 0-2h1a1 1 0 1 1 0 2ZM3 12H2a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2Zm15.657 7.071a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 0 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414ZM7.464 6.05 6.757 5.343A1 1 0 1 1 8.17 3.93l.707.707A1 1 0 1 1 7.464 6.05Zm9.9-2.12a1 1 0 0 1 1.414 1.413l-.707.707A1 1 0 0 1 16.95 4.636l.707-.707ZM7.05 16.95l-.707.707A1 1 0 0 1 4.93 16.95l.707-.707A1 1 0 0 1 7.05 16.95Z"/>
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md shadow bg-white/90 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${theme === 'dark' ? 'ring-2 ring-indigo-400' : ''}`}
        title="Dark theme"
        aria-label="Switch to dark theme"
      >
        {/* Moon icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-600 dark:text-indigo-300">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      </button>
    </div>
  );
}
