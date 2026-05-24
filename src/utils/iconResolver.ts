import { getSmartIconPath } from './awsIconMapping';

interface IconResult {
  iconUrl: string;
  confidence: number;
  source: 'direct' | 'catalog' | 'search' | 'fallback';
  serviceName?: string;
}

export async function resolveServiceIcon(
  service: string,
  label: string,
  cloudProvider: string = 'aws'
): Promise<IconResult> {
  const iconPath = getSmartIconPath(service);
  
  return {
    iconUrl: iconPath || '/icons/aws-icons/aws-generic.svg',
    confidence: iconPath ? 1 : 0.5,
    source: iconPath ? 'direct' : 'fallback',
    serviceName: service
  };
} 