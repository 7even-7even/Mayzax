import { JobPortal, ExtractedMetadata } from '../types';

export function extractPageMetadata(doc: Document, url: string, portal: JobPortal): ExtractedMetadata {
  const pageTitle = doc.title || '';
  let company = '';
  let jobTitle = '';

  // 1. Attempt portal-specific DOM parsing
  switch (portal) {
    case JobPortal.LINKEDIN: {
      const titleEl = doc.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title');
      const companyEl = doc.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name');
      if (titleEl) jobTitle = titleEl.textContent?.trim() || '';
      if (companyEl) company = companyEl.textContent?.trim() || '';
      break;
    }
    case JobPortal.GREENHOUSE: {
      const companyEl = doc.querySelector('.company-name');
      const titleEl = doc.querySelector('.app-title');
      if (companyEl) company = companyEl.textContent?.replace(/at\s+/i, '').trim() || '';
      if (titleEl) jobTitle = titleEl.textContent?.trim() || '';
      break;
    }
    case JobPortal.LEVER: {
      const companyEl = doc.querySelector('.posting-header-company-logo, img[alt*="logo"]');
      const titleEl = doc.querySelector('.posting-header h2');
      if (titleEl) jobTitle = titleEl.textContent?.trim() || '';
      if (companyEl) {
        company = companyEl.getAttribute('alt')?.replace(/logo/i, '').trim() || '';
      }
      break;
    }
    default:
      break;
  }

  // 2. Generic Metatag/Microdata extraction if empty
  if (!company) {
    const ogCompany = doc.querySelector('meta[property="og:site_name"]');
    if (ogCompany) company = ogCompany.getAttribute('content') || '';
  }
  if (!jobTitle) {
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle) jobTitle = ogTitle.getAttribute('content') || '';
  }

  // 3. Title tag parsing fallback
  if (!jobTitle && pageTitle) {
    // Usually formatted as "Job Title at Company" or "Job Title - Company"
    const splitters = [' at ', ' - ', ' | ', ' @ '];
    for (const splitter of splitters) {
      if (pageTitle.includes(splitter)) {
        const parts = pageTitle.split(splitter);
        jobTitle = parts[0]?.trim();
        if (!company) {
          company = parts[1]?.trim();
        }
        break;
      }
    }
  }

  // Extract company from URL path for known platforms if not found in DOM
  if (!company) {
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname.toLowerCase();
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if ((host.includes('greenhouse.io') || host.includes('greenhouse.com')) && pathParts.length > 0) {
        company = pathParts[0];
      } else if (host.includes('lever.co') && pathParts.length > 0) {
        company = pathParts[0];
      }
    } catch {
      // ignore
    }
  }

  // Cleanup and normalize strings
  company = company.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  jobTitle = jobTitle.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Filter out generic, non-specific job titles (e.g. success/confirmation messages)
  const genericTitles = [
    'thank you',
    'application received',
    'application submitted',
    'success',
    'job application',
    'confirmation',
    'apply',
    'submitted',
    'your application'
  ];
  const lowercaseTitle = jobTitle.toLowerCase();
  if (genericTitles.some(t => lowercaseTitle.includes(t))) {
    jobTitle = '';
  }

  // Last fallbacks (avoiding generic platforms/subdomains)
  if (!company) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      const firstPart = hostname.split('.')[0];
      const genericKeywords = ['job-boards', 'boards', 'jobs', 'careers', 'lever', 'greenhouse', 'workatastartup', 'simplyhired', 'indeed', 'glassdoor', 'linkedin'];
      if (!genericKeywords.includes(firstPart.toLowerCase())) {
        company = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
      }
    } catch {
      // ignore
    }
  }

  // Only fallback to pageTitle if it doesn't contain generic success messages
  if (!jobTitle && pageTitle) {
    const lowercasePageTitle = pageTitle.toLowerCase();
    if (!genericTitles.some(t => lowercasePageTitle.includes(t))) {
      jobTitle = pageTitle;
    }
  }

  return {
    company: company || '',
    jobTitle: jobTitle || '',
    pageTitle,
    portal
  };
}
