/**
 * Head Manager Utility
 * Programmatically manipulates document.title, meta[name='description'], OpenGraph,
 * and social card tags to ensure full dynamic metadata synchronization for SSR crawlers and client navigation.
 */

export function updateHeadMetadata(title: string, description: string): void {
  if (typeof document === 'undefined') return;

  // 1. Update Document Title
  document.title = title;

  // Helper to ensure meta tag exists and update its content
  const setMetaTag = (selector: string, attributeName: string, attributeValue: string, content: string) => {
    let tag = document.querySelector(selector);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attributeName, attributeValue);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // Helper to ensure link tag exists and update its href
  const setLinkTag = (rel: string, href: string) => {
    let tag = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!tag) {
      tag = document.createElement('link');
      tag.setAttribute('rel', rel);
      document.head.appendChild(tag);
    }
    tag.setAttribute('href', href);
  };

  // 2. Update Primary SEO Meta Description
  setMetaTag("meta[name='description']", 'name', 'description', description);

  // 3. Update OpenGraph Tags
  setMetaTag("meta[property='og:title']", 'property', 'og:title', title);
  setMetaTag("meta[property='og:description']", 'property', 'og:description', description);

  if (typeof window !== 'undefined') {
    const currentUrl = window.location.href;
    setMetaTag("meta[property='og:url']", 'property', 'og:url', currentUrl);
    setLinkTag('canonical', currentUrl);
  }

  // 4. Update Twitter / X Tags
  setMetaTag("meta[name='twitter:title']", 'name', 'twitter:title', title);
  setMetaTag("meta[name='twitter:description']", 'name', 'twitter:description', description);
}
