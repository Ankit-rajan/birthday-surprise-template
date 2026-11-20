import { useEffect } from 'react';

/** Sets the tab title and robots meta for the current page, and restores the defaults when the page unmounts. */
export function useDocumentMeta({ title, noindex = false, description } = {}) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;

    let robots = document.querySelector('meta[name="robots"]');
    const created = !robots;
    const previousRobots = robots?.getAttribute('content');
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow, noarchive');
    }

    const desc = document.querySelector('meta[name="description"]');
    const previousDesc = desc?.getAttribute('content');
    if (description && desc) desc.setAttribute('content', description);

    return () => {
      document.title = previousTitle;
      if (noindex && robots) {
        if (created) robots.remove();
        else robots.setAttribute('content', previousRobots ?? 'index, follow');
      }
      if (description && desc && previousDesc) desc.setAttribute('content', previousDesc);
    };
  }, [title, noindex, description]);
}
