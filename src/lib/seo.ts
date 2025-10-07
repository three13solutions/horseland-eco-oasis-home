// SEO Utility Functions for Structured Data (Schema.org JSON-LD)

interface BreadcrumbItem {
  name: string;
  url: string;
}

export const generateBreadcrumbSchema = (items: BreadcrumbItem[]) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
};

interface ArticleSchemaProps {
  title: string;
  description: string;
  author: string;
  publishedDate: string;
  modifiedDate?: string;
  imageUrl: string;
  url: string;
}

export const generateArticleSchema = ({
  title,
  description,
  author,
  publishedDate,
  modifiedDate,
  imageUrl,
  url
}: ArticleSchemaProps) => {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "author": {
      "@type": "Person",
      "name": author
    },
    "datePublished": publishedDate,
    "dateModified": modifiedDate || publishedDate,
    "image": imageUrl,
    "url": url
  };
};

interface HotelSchemaProps {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  telephone?: string;
  email?: string;
  priceRange?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl: string;
  url: string;
}

export const generateHotelSchema = ({
  name,
  description,
  address,
  telephone,
  email,
  priceRange,
  rating,
  reviewCount,
  imageUrl,
  url
}: HotelSchemaProps) => {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": name,
    "description": description,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": address.street,
      "addressLocality": address.city,
      "addressRegion": address.state,
      "postalCode": address.postalCode,
      "addressCountry": address.country
    },
    "image": imageUrl,
    "url": url
  };

  if (telephone) schema.telephone = telephone;
  if (email) schema.email = email;
  if (priceRange) schema.priceRange = priceRange;
  
  if (rating && reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": rating,
      "reviewCount": reviewCount
    };
  }

  return schema;
};

interface EventSchemaProps {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: string;
  imageUrl: string;
  url: string;
  price?: string;
  availability?: 'InStock' | 'SoldOut' | 'PreOrder';
}

export const generateEventSchema = ({
  name,
  description,
  startDate,
  endDate,
  location,
  imageUrl,
  url,
  price,
  availability
}: EventSchemaProps) => {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": name,
    "description": description,
    "startDate": startDate,
    "image": imageUrl,
    "url": url,
    "location": {
      "@type": "Place",
      "name": location
    }
  };

  if (endDate) schema.endDate = endDate;
  
  if (price) {
    schema.offers = {
      "@type": "Offer",
      "price": price,
      "priceCurrency": "INR",
      "availability": `https://schema.org/${availability || 'InStock'}`
    };
  }

  return schema;
};

interface FAQSchemaItem {
  question: string;
  answer: string;
}

export const generateFAQSchema = (items: FAQSchemaItem[]) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };
};

interface OrganizationSchemaProps {
  name: string;
  description: string;
  url: string;
  logo: string;
  contactPoint?: {
    telephone: string;
    email: string;
    contactType: string;
  };
  sameAs?: string[]; // Social media URLs
}

export const generateOrganizationSchema = ({
  name,
  description,
  url,
  logo,
  contactPoint,
  sameAs
}: OrganizationSchemaProps) => {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": name,
    "description": description,
    "url": url,
    "logo": logo
  };

  if (contactPoint) {
    schema.contactPoint = {
      "@type": "ContactPoint",
      "telephone": contactPoint.telephone,
      "email": contactPoint.email,
      "contactType": contactPoint.contactType
    };
  }

  if (sameAs && sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  return schema;
};
