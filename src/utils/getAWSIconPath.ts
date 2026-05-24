import { findIconByName } from './awsIconCatalog'; // AWS_ICON_CATALOG and IconEntry might not be needed if not directly used.

const GENERIC_AWS_ICON = '/icons/aws-icons/aws-generic.svg';

// Local normalizeServiceName, normalizeCategoryForPath, and findIcon functions are removed.

export function getAWSIconPath(
  serviceName?: string,
  // category parameter is kept for signature compatibility if other parts of the app call it,
  // but it's not actively used in this simplified version that relies on findIconByName.
  category?: string 
): string {
  if (!serviceName) {
    // console.warn('getAWSIconPath called with no serviceName, returning generic icon.');
    return GENERIC_AWS_ICON;
  }

  const iconEntry = findIconByName(serviceName.trim()); 

  if (iconEntry && iconEntry.path) {
    // Ensure path starts with a slash, as expected by img src or CSS background-image url
    let path = iconEntry.path;
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    // console.log(`Icon found for ${serviceName}: ${path}`);
    return path;
  }
  
  // console.warn(`AWS Icon not found for service: "${serviceName}" (category: "${category || 'N/A'}"). Using generic icon.`);
  return GENERIC_AWS_ICON;
}

// Example Usage (for testing):
// console.log('--- Testing getAWSIconPath ---');
// console.log('Amazon EC2 (Compute):', getAWSIconPath('Amazon EC2', 'Compute')); 
// console.log('EC2 (Compute):', getAWSIconPath('EC2', 'Compute'));
// console.log('lambda:', getAWSIconPath('lambda')); 
// console.log('Amazon S3 (Storage):', getAWSIconPath('Amazon S3', 'Storage')); 
// console.log('s3:', getAWSIconPath('s3'));
// console.log('Route 53 (Networking & Content Delivery):', getAWSIconPath('Route 53', 'Networking & Content Delivery'));
// console.log('NonExistentService (Compute):', getAWSIconPath('NonExistentService', 'Compute')); 
// console.log('API Gateway (Networking):', getAWSIconPath('API Gateway', 'Networking'));
// console.log('Application Load Balancer (Networking):', getAWSIconPath('Application Load Balancer', 'Networking'));
// console.log('Elastic Load Balancing:', getAWSIconPath('Elastic Load Balancing'));
// console.log('ELB:', getAWSIconPath('ELB'));
// console.log('Amazon Simple Storage Service:', getAWSIconPath('Amazon Simple Storage Service'));
// console.log('Amazon S3 Glacier:', getAWSIconPath('Amazon S3 Glacier'));
// console.log('Empty service name:', getAWSIconPath(''));
// console.log('Undefined service name:', getAWSIconPath(undefined));
// console.log('--- End Testing getAWSIconPath ---'); 