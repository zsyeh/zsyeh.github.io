const isEssays = import.meta.env.SITE_VARIANT === 'em';

export const SITE = {
  title: isEssays ? 'eH Essays' : 'eH Blog',
  description: isEssays
    ? 'Essays and observations on education, work, society, and living with complex systems.'
    : 'Technical notes about engineering, systems, and making things work.',
  brandSuffix: isEssays ? 'Essays' : 'Blog',
  kicker: isEssays ? 'EH ESSAYS' : 'EH BLOG',
  latestTitle: isEssays ? 'Latest essays' : 'Latest technical notes',
  author: 'eH',
  owner: 'eH',
  haloUrl: 'https://dxlab.ehzsy.space',
};
