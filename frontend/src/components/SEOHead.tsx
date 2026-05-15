import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: 'website' | 'video.movie' | 'book';
  canonicalPath?: string;
  structuredData?: object;
}

export function SEOHead({ title, description, ogImage, ogType = 'website', canonicalPath, structuredData }: SEOHeadProps) {
  const fullTitle = title ? `${title} | RecoApp` : 'RecoApp — Kişisel İçerik Öneri Platformu';
  const baseUrl = 'https://recoapp.com';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:type" content={ogType} />
      {canonicalPath && <link rel="canonical" href={`${baseUrl}${canonicalPath}`} />}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
