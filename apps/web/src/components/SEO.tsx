import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Covet';
const BASE_URL = 'https://covet.deals';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

export function SEO({ title, description, path, noindex }: SEOProps) {
  const fullTitle = path === '/' ? title : `${title} | ${SITE_NAME}`;
  const canonical = `${BASE_URL}${path}`;
  const image = `${BASE_URL}/og-image.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
