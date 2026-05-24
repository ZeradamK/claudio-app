const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const rename = promisify(fs.rename);

// Service name to icon file mapping
const ICON_MAPPING = {
  // Compute
  'EC2': 'Compute.svg',
  'Lambda': 'Lambda.svg',
  'ECS': 'Elastic-Container-Service.svg',
  'EKS': 'Elastic-Kubernetes-Service.svg',
  'Fargate': 'Fargate.svg',
  'Batch': 'Batch.svg',
  'App Runner': 'App-Runner.svg',
  'Elastic Beanstalk': 'Elastic-Beanstalk.svg',
  
  // Storage
  'S3': 'Simple-Storage-Service.svg',
  'EBS': 'Elastic-Block-Store.svg',
  'EFS': 'EFS.svg',
  'FSx': 'FSx.svg',
  'Glacier': 'Simple-Storage-Service-Glacier.svg',
  'Storage Gateway': 'Storage-Gateway.svg',
  
  // Database
  'RDS': 'Relational-Database-Service.svg',
  'DynamoDB': 'DynamoDB.svg',
  'Aurora': 'Aurora.svg',
  'ElastiCache': 'ElastiCache.svg',
  'Neptune': 'Neptune.svg',
  'DocumentDB': 'DocumentDB.svg',
  'Timestream': 'Timestream.svg',
  'Keyspaces': 'Keyspaces.svg',
  'MemoryDB': 'MemoryDB.svg',
  
  // Networking
  'VPC': 'Virtual-Private-Cloud.svg',
  'Route 53': 'Route-53.svg',
  'CloudFront': 'CloudFront.svg',
  'API Gateway': 'API-Gateway.svg',
  'ELB': 'Elastic-Load-Balancing.svg',
  'Direct Connect': 'Direct-Connect.svg',
  'Cloud WAN': 'Cloud-WAN.svg',
  'PrivateLink': 'PrivateLink.svg',
  
  // Security
  'IAM': 'Identity-and-Access-Management.svg',
  'Cognito': 'Cognito.svg',
  'WAF': 'WAF.svg',
  'Shield': 'Shield.svg',
  'GuardDuty': 'GuardDuty.svg',
  'KMS': 'Key-Management-Service.svg',
  'Secrets Manager': 'Secrets-Manager.svg',
  'Certificate Manager': 'Certificate-Manager.svg',
  
  // Integration
  'SNS': 'Simple-Notification-Service.svg',
  'SQS': 'Simple-Queue-Service.svg',
  'EventBridge': 'EventBridge.svg',
  'Step Functions': 'Step-Functions.svg',
  'AppSync': 'AppSync.svg',
  'MQ': 'Amazon-MQ.svg',
  
  // Analytics
  'Redshift': 'Redshift.svg',
  'Athena': 'Athena.svg',
  'EMR': 'Elastic-MapReduce.svg',
  'Kinesis': 'Kinesis.svg',
  'Glue': 'Glue.svg',
  'QuickSight': 'QuickSight.svg',
  'OpenSearch': 'OpenSearch.svg',
  
  // AI/ML
  'SageMaker': 'SageMaker.svg',
  'Rekognition': 'Rekognition.svg',
  'Comprehend': 'Comprehend.svg',
  'Polly': 'Polly.svg',
  'Lex': 'Lex.svg',
  'Personalize': 'Personalize.svg',
  'Forecast': 'Forecast.svg',
  'Textract': 'Textract.svg',
  
  // Management
  'CloudWatch': 'CloudWatch.svg',
  'CloudTrail': 'CloudTrail.svg',
  'Config': 'Config.svg',
  'Systems Manager': 'Systems-Manager.svg',
  'Organizations': 'Organizations.svg',
  'Control Tower': 'Control-Tower.svg',
  'Service Catalog': 'Service-Catalog.svg',
  'Well-Architected Tool': 'Well-Architected-Tool.svg',
  
  // Developer Tools
  'CodePipeline': 'CodePipeline.svg',
  'CodeBuild': 'CodeBuild.svg',
  'CodeCommit': 'CodeCommit.svg',
  'CodeDeploy': 'CodeDeploy.svg',
  'X-Ray': 'X-Ray.svg',
  'Cloud9': 'Cloud9.svg',
  'CodeStar': 'CodeStar.svg',
  
  // Migration
  'DMS': 'Database-Migration-Service.svg',
  'SMS': 'Server-Migration-Service.svg',
  'Migration Hub': 'Migration-Hub.svg',
  'DataSync': 'DataSync.svg',
  'Transfer Family': 'Transfer-Family.svg',
  
  // Media
  'MediaLive': 'Elemental-MediaLive.svg',
  'MediaPackage': 'Elemental-MediaPackage.svg',
  'MediaStore': 'Elemental-MediaStore.svg',
  'MediaConvert': 'Elemental-MediaConvert.svg',
  'MediaTailor': 'Elemental-MediaTailor.svg',
  'Elastic Transcoder': 'Elastic-Transcoder.svg',
  
  // AR/VR
  'Sumerian': 'Sumerian.svg',
  'RoboMaker': 'RoboMaker.svg',
  
  // Quantum
  'Braket': 'Braket.svg',
  
  // Satellite
  'Ground Station': 'Ground-Station.svg'
};

async function renameIcons() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons', 'aws-icons');
  
  try {
    // Create a backup directory
    const backupDir = path.join(iconsDir, 'backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // Get all SVG files
    const files = await readdir(iconsDir);
    const svgFiles = files.filter(file => file.endsWith('.svg'));
    
    // Process each file
    for (const file of svgFiles) {
      if (file === 'aws-generic.svg') continue; // Skip generic icon
      
      // Find the service name for this icon
      const serviceName = Object.entries(ICON_MAPPING).find(([_, iconFile]) => iconFile === file)?.[0];
      
      if (serviceName) {
        // Create new filename
        const newFileName = `${serviceName.replace(/\s+/g, '-')}.svg`;
        const oldPath = path.join(iconsDir, file);
        const newPath = path.join(iconsDir, newFileName);
        const backupPath = path.join(backupDir, file);
        
        // Backup original file
        await fs.promises.copyFile(oldPath, backupPath);
        
        // Rename file
        await rename(oldPath, newPath);
        console.log(`Renamed: ${file} -> ${newFileName}`);
      } else {
        console.log(`No mapping found for: ${file}`);
      }
    }
    
    console.log('\nIcon renaming complete!');
    console.log('Original files have been backed up to:', backupDir);
    
  } catch (error) {
    console.error('Error renaming icons:', error);
  }
}

renameIcons(); 