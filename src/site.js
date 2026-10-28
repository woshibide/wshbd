// Site-wide copy and links. Edit here, every page picks it up.

export const SITE_URL = 'https://its-pyotr.com';
export const EMAIL = 'yes@its-pyotr.com';
export const TELEGRAM = 'https://t.me/itspyotr';
export const AVAILABILITY = 'Limited availability until November 2026';
export const AVAILABILITY_SHORT = "Limited availability until November '26";

export const KEYWORDS = 'design, creative coding, web design, editorial design';

export const DESCRIPTION =
    'Pyotr is a computational designer, blurring the line between design and engineering. As design evolves from fixed environments into adaptable systems, he builds his own tooling to reshape the process itself, removing friction between idea and execution. This approach accelerates both his own speed and internal team workflows, without compromising precision or visual quality. Fluent across both creative and technical domains, he understands the underlying mechanics that connect them, allowing him to design with systems, code, and a clear awareness of how implementation shape material and ultimately the outcomes.';

// Same text as the description, introduced by full name.
export const NAV_INTRO = DESCRIPTION.replace(/^Pyotr is/, 'Pyotr Goloub is');

export const NAV_LINKS = [
    { label: 'main', href: '/' },
    { label: 'archive', href: '/archive/' },
    { label: 'profile', href: '/about/' },
    { label: 'theatre', href: '/theatre/' },
];

// Footer columns. Clicking a brief filters the archive by the matching area.
export const DESIGN_BRIEF = ['art direction', 'apparel', 'editorial', 'experience', 'motion', 'visual identity'];
export const CODING_BRIEF = ['data visualisation', 'front end', 'processing', 'generative graphics'];

export const FOOTER_LINKS = [
    { label: 'behance', href: 'https://be.net/woshibide' },
    { label: 'github', href: 'https://github.com/woshibide' },
    { label: 'arena', href: 'https://www.are.na/pyotr-g' },
];

export const PROFILE_LINKS = [
    { label: 'arena', href: 'https://www.are.na/pyotr-g' },
    { label: 'github', href: 'https://github.com/woshibide' },
    { label: 'behance', href: 'https://be.net/woshibide' },
    { label: 'unity', href: 'http://play.unity.com/u/woshibide' },
];

export const WEB_ESSAYS = [
    { label: 'les essais', href: '/web-essays/montaigne/' },
    { label: 'the forest passage', href: '/web-essays/the-forrest-passage/' },
    { label: 'choo choo', href: 'https://kabk.github.io/go-theses-26-pyotr-petrovich-goloub/' },
];

export const ERROR_CODES = [400, 401, 403, 404, 500, 502, 503, 504];
