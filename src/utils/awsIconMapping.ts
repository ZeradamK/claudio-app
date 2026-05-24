// Comprehensive AWS Icon Mapping for LLM Integration
// Based on 309 available icons in /public/icons/aws-icons/

export interface IconMapping {
  [key: string]: string;
}

// Smart icon retrieval function
export const getSmartIconPath = (serviceName: string): string => {
  const cleanName = serviceName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  const iconMappings: IconMapping = {
    // === COMPUTE ===
    'ec2': 'EC2',
    'lambda': 'Lambda',
    'ecs': 'ECS',
    'eks': 'EKS',
    'fargate': 'Fargate',
    'batch': 'Batch',
    'beanstalk': 'Elastic-Beanstalk',
    'lightsail': 'Lightsail',
    
    // === DATABASE ===
    'rds': 'RDS',
    'dynamodb': 'DynamoDB',
    'aurora': 'Aurora',
    'elasticache': 'ElastiCache',
    'neptune': 'Neptune',
    'documentdb': 'DocumentDB',
    'redshift': 'Redshift',
    'timestream': 'Timestream',
    'quantum-ledger-database': 'QLDB',
    
    // === STORAGE ===
    's3': 'Simple-Storage-Service',
    'ebs': 'EBS',
    'efs': 'EFS',
    'fsx': 'FSx',
    'glacier': 'S3-Glacier',
    'backup': 'Backup',
    
    // === NETWORKING ===
    'vpc': 'Virtual-Private-Cloud',
    'cloudfront': 'CloudFront',
    'route53': 'Route-53',
    'api-gateway': 'API-Gateway',
    'elb': 'Elastic-Load-Balancing',
    'alb': 'Application-Load-Balancer',
    'nlb': 'Network-Load-Balancer',
    'direct-connect': 'Direct-Connect',
    'transit-gateway': 'Transit-Gateway',
    
    // === SECURITY ===
    'iam': 'Identity-and-Access-Management',
    'cognito': 'Cognito',
    'waf': 'WAF',
    'shield': 'Shield',
    'guardduty': 'GuardDuty',
    'kms': 'Key-Management-Service',
    'secrets-manager': 'Secrets-Manager',
    
    // === ANALYTICS ===
    'athena': 'Athena',
    'emr': 'EMR',
    'kinesis': 'Kinesis',
    'glue': 'Glue',
    'quicksight': 'QuickSight',
    'opensearch': 'OpenSearch',
    
    // === MACHINE LEARNING ===
    'sagemaker': 'SageMaker',
    'rekognition': 'Rekognition',
    'comprehend': 'Comprehend',
    'polly': 'Polly',
    'translate': 'Translate',
    'lex': 'Lex',
    'personalize': 'Personalize',
    'forecast': 'Forecast',
    'textract': 'Textract',
    'braket': 'Braket',
    
    // === MIGRATION & TRANSFER ===
    'migration-hub': 'Migration-Hub',
    'application-discovery-service': 'Application-Discovery-Service',
    'application-migration-service': 'Application-Migration-Service',
    'server-migration-service': 'Server-Migration-Service',
    'datasync': 'DataSync',
    'transfer-family': 'Transfer-Family',
    'migration-evaluator': 'Migration-Evaluator',
    'mainframe-modernization': 'Mainframe-Modernization',
    'database-migration-service': 'Database-Migration-Service',
    
    // === CONTAINERS ===
    'elastic-container-registry': 'Elastic-Container-Registry',
    'ecr': 'Elastic-Container-Registry',
    'red-hat-openshift': 'Red-Hat-OpenShift-Service-on-AWS',
    'copilot': 'ECS',
    
    // === SERVERLESS ===
    'serverless-application-repository': 'Serverless-Application-Repository',
    'sar': 'Serverless-Application-Repository',
    
    // === HPC ===
    'parallelcluster': 'ParallelCluster',
    'elastic-fabric-adapter': 'Elastic-Fabric-Adapter',
    
    // === ADDITIONAL SERVICES ===
    'marketplace': 'Marketplace_Light',
    'activate': 'Activate',
    'iq': 'IQ',
    'professional-services': 'Professional-Services',
    'training-certification': 'Training-Certification',
    'repost': 'rePost',
    'console-mobile-application': 'Console-Mobile-Application',
    'management-console': 'Management-Console',
    'genomics-cli': 'Genomics-CLI',
    'distro-opentelemetry': 'Distro-for-OpenTelemetry',
    'corretto': 'Corretto',
    'bottlerocket': 'Bottlerocket',
    'chatbot': 'Chatbot',
    'devops-guru': 'DevOps-Guru',
    'appconfig': 'AppConfig',
    'appflow': 'AppFlow',
    'ec2-image-builder': 'EC2-Image-Builder',
    'elastic-inference': 'Elastic-Inference',
    'panorama': 'Panorama',
    'backint-agent': 'Backint-Agent',
    'simspace-weaver': 'SimSpace-Weaver',
    
    // === THINKBOX PRODUCTS ===
    'thinkbox-deadline': 'Thinkbox-Deadline',
    'thinkbox-frost': 'Thinkbox-Frost',
    'thinkbox-krakatoa': 'Thinkbox-Krakatoa',
    'thinkbox-sequoia': 'Thinkbox-Sequoia',
    'thinkbox-stoke': 'Thinkbox-Stoke',
    'thinkbox-xmesh': 'Thinkbox-XMesh',
    
    // === VMWARE ===
    'vmware-cloud': 'VMware-Cloud-on-AWS',
    'rds-vmware': 'RDS-on-VMware',
    
    // === MANAGED SERVICES ===
    'managed-grafana': 'Managed-Grafana',
    'managed-prometheus': 'Managed-Service-for-Prometheus',
    
    // === FALLBACK ===
    'aws': 'aws-generic',
    'default': 'aws-generic'
  };
  
  // Try exact match first
  if (iconMappings[cleanName]) {
    return `/icons/aws-icons/${iconMappings[cleanName]}.svg`;
  }
  
  // Try partial matches (first 3+ characters)
  for (const [key, value] of Object.entries(iconMappings)) {
    if (cleanName.length >= 3 && key.length >= 3) {
      if (cleanName.startsWith(key.substring(0, 3)) || key.startsWith(cleanName.substring(0, 3))) {
        return `/icons/aws-icons/${value}.svg`;
      }
    }
  }
  
  // Try fuzzy matching for common variations
  const fuzzyMatches: { [key: string]: string } = {
    'database': 'RDS',
    'storage': 'Simple-Storage-Service',
    'compute': 'EC2',
    'network': 'Virtual-Private-Cloud',
    'security': 'Identity-and-Access-Management',
    'monitoring': 'CloudWatch',
    'container': 'ECS',
    'serverless': 'Lambda',
    'api': 'API-Gateway',
    'load-balancer': 'Elastic-Load-Balancing',
    'cdn': 'CloudFront',
    'dns': 'Route-53'
  };
  
  for (const [pattern, icon] of Object.entries(fuzzyMatches)) {
    if (cleanName.includes(pattern)) {
      return `/icons/aws-icons/${icon}.svg`;
    }
  }
  
  // Fallback to AWS generic icon
  return '/icons/aws-icons/aws-generic.svg';
};

// LLM-friendly service name mappings for easy reference
export const LLM_SERVICE_MAPPINGS = {
  // Most commonly used services with simple names
  COMPUTE: {
    'ec2': 'EC2 Virtual Servers',
    'lambda': 'Lambda Serverless Functions',
    'ecs': 'Elastic Container Service',
    'eks': 'Elastic Kubernetes Service',
    'fargate': 'Fargate Serverless Containers',
    'batch': 'Batch Computing',
    'beanstalk': 'Elastic Beanstalk',
    'lightsail': 'Lightsail VPS'
  },
  
  DATABASE: {
    'rds': 'Relational Database Service',
    'dynamodb': 'DynamoDB NoSQL',
    'aurora': 'Aurora Database',
    'elasticache': 'ElastiCache Redis/Memcached',
    'neptune': 'Neptune Graph Database',
    'documentdb': 'DocumentDB MongoDB',
    'redshift': 'Redshift Data Warehouse',
    'timestream': 'Timestream Time Series'
  },
  
  STORAGE: {
    's3': 'S3 Object Storage',
    'ebs': 'EBS Block Storage',
    'efs': 'EFS File System',
    'fsx': 'FSx High Performance',
    'glacier': 'S3 Glacier Archive',
    'backup': 'AWS Backup'
  },
  
  NETWORKING: {
    'vpc': 'Virtual Private Cloud',
    'cloudfront': 'CloudFront CDN',
    'route53': 'Route 53 DNS',
    'api-gateway': 'API Gateway',
    'elb': 'Elastic Load Balancer',
    'alb': 'Application Load Balancer',
    'nlb': 'Network Load Balancer',
    'direct-connect': 'Direct Connect',
    'transit-gateway': 'Transit Gateway'
  },
  
  SECURITY: {
    'iam': 'Identity & Access Management',
    'cognito': 'Cognito User Management',
    'waf': 'Web Application Firewall',
    'shield': 'DDoS Protection',
    'guardduty': 'GuardDuty Threat Detection',
    'kms': 'Key Management Service',
    'secrets-manager': 'Secrets Manager'
  },
  
  ANALYTICS: {
    'athena': 'Athena Query Service',
    'emr': 'EMR Big Data',
    'kinesis': 'Kinesis Streaming',
    'glue': 'Glue ETL',
    'quicksight': 'QuickSight BI',
    'opensearch': 'OpenSearch'
  },
  
  AI_ML: {
    'sagemaker': 'SageMaker ML Platform',
    'comprehend': 'Comprehend NLP',
    'rekognition': 'Rekognition Computer Vision',
    'textract': 'Textract Document Analysis',
    'translate': 'Translate',
    'transcribe': 'Transcribe Speech-to-Text',
    'polly': 'Polly Text-to-Speech',
    'lex': 'Lex Chatbots'
  },
  
  INTEGRATION: {
    'sqs': 'Simple Queue Service',
    'sns': 'Simple Notification Service',
    'eventbridge': 'EventBridge',
    'step-functions': 'Step Functions',
    'appsync': 'AppSync GraphQL',
    'mq': 'Amazon MQ'
  },
  
  MANAGEMENT: {
    'cloudwatch': 'CloudWatch Monitoring',
    'cloudtrail': 'CloudTrail Logging',
    'config': 'Config Compliance',
    'systems-manager': 'Systems Manager',
    'cloudformation': 'CloudFormation IaC',
    'organizations': 'Organizations',
    'control-tower': 'Control Tower'
  }
};

// Export the complete list of available icons for reference
export const AVAILABLE_ICONS = [
  'Activate', 'Alexa-For-Business', 'Amplify', 'Apache-MXNet-on-AWS', 'API-Gateway',
  'AppConfig', 'AppFlow', 'Application-Auto-Scaling', 'Application-Composer',
  'Application-Cost-Profiler', 'Application-Discovery-Service', 'Application-Migration-Service',
  'App-Mesh', 'App-Runner', 'AppStream', 'AppSync', 'Artifact', 'Athena', 'Audit-Manager',
  'Augmented-AI-A2I', 'Aurora', 'Auto-Scaling', 'aws-generic', 'Backint-Agent', 'Backup',
  'Batch', 'Billing-Conductor', 'Bottlerocket', 'Braket', 'Budgets', 'Certificate-Manager',
  'Chatbot', 'Chime', 'Chime-SDK', 'Chime-Voice-Connector', 'Clean-Rooms', 'Client-VPN',
  'Cloud9', 'Cloud-Control-API', 'Cloud-Development-Kit', 'Cloud-Directory', 'CloudFormation',
  'CloudFront', 'CloudHSM', 'Cloud-Map', 'CloudSearch', 'CloudShell', 'CloudTrail',
  'Cloud-WAN', 'CloudWatch', 'CodeArtifact', 'CodeBuild', 'CodeCatalyst', 'CodeCommit',
  'CodeDeploy', 'CodeGuru', 'CodePipeline', 'CodeStar', 'CodeWhisperer', 'Cognito',
  'Command-Line-Interface', 'Comprehend', 'Comprehend-Medical', 'Compute', 'Compute-Optimizer',
  'Config', 'Connect', 'Console-Mobile-Application', 'Control-Tower', 'Corretto',
  'Cost-and-Usage-Report', 'Cost-Explorer', 'Database-Migration-Service', 'Data-Exchange',
  'Data-Pipeline', 'DataSync', 'DataZone', 'DeepComposer', 'Deep-Learning-AMIs',
  'Deep-Learning-Containers', 'DeepLens', 'DeepRacer', 'Detective', 'Device-Farm',
  'DevOps-Guru', 'Direct-Connect', 'Directory-Service', 'Distro-for-OpenTelemetry',
  'DocumentDB', 'DynamoDB', 'EC2', 'EC2-Auto-Scaling', 'EC2-Image-Builder', 'ECS', 'EFS',
  'EKS', 'EKS-Cloud', 'EKS-Distro', 'ElastiCache', 'Elastic-Beanstalk', 'Elastic-Block-Store',
  'Elastic-Container-Registry', 'Elastic-Container-Service', 'Elastic-Disaster-Recovery',
  'Elastic-Fabric-Adapter', 'Elastic-Inference', 'Elastic-Kubernetes-Service',
  'Elastic-Load-Balancing', 'Elastic-Transcoder', 'Elemental-Appliances-&-Software',
  'Elemental-Conductor', 'Elemental-Delta', 'Elemental-Link', 'Elemental-Live',
  'Elemental-MediaConnect', 'Elemental-MediaConvert', 'Elemental-MediaLive',
  'Elemental-MediaPackage', 'Elemental-MediaStore', 'Elemental-MediaTailor',
  'Elemental-Server', 'EMR', 'EventBridge', 'Express-Workflows', 'Fargate',
  'Fault-Injection-Simulator', 'File-Cache', 'FinSpace', 'Firewall-Manager', 'Forecast',
  'Fraud-Detector', 'FreeRTOS', 'FSx', 'FSx-for-Lustre', 'FSx-for-NetApp-ONTAP',
  'FSx-for-OpenZFS', 'FSx-for-WFS', 'GameKit', 'GameLift', 'GameSparks', 'Genomics-CLI',
  'Global-Accelerator', 'Glue', 'Glue-DataBrew', 'Glue-Elastic-Views', 'Ground-Station',
  'GuardDuty', 'HealthLake', 'Honeycode', 'IAM-Identity-Center', 'Identity-and-Access-Management',
  'Inspector', 'Interactive-Video-Service', 'IoT-1-Click', 'IoT-Analytics', 'IoT-Button',
  'IoT-Core', 'IoT-Device-Defender', 'IoT-Device-Management', 'IoT-EduKit', 'IoT-Events',
  'IoT-ExpressLink', 'IoT-FleetWise', 'IoT-Greengrass', 'IoT-RoboRunner', 'IoT-SiteWise',
  'IoT-Things-Graph', 'IoT-TwinMaker', 'IQ', 'Kendra', 'Key-Management-Service', 'Keyspaces',
  'Kinesis', 'Kinesis-Data-Analytics', 'Kinesis-Data-Streams', 'Kinesis-Firehose',
  'Kinesis-Video-Streams', 'Lake-Formation', 'Lambda', 'Launch-Wizard', 'Lex',
  'License-Manager', 'Lightsail', 'Local-Zones', 'Location-Service', 'Lookout-for-Equipment',
  'Lookout-for-Metrics', 'Lookout-for-Vision', 'Lumberyard', 'Macie', 'Mainframe-Modernization',
  'Managed-Blockchain', 'Managed-Grafana', 'Managed-Service-for-Prometheus', 'Managed-Services',
  'Managed-Streaming-for-Apache-Kafka', 'Managed-Workflows-for-Apache-Airflow',
  'Management-Console', 'Marketplace_Dark', 'Marketplace_Light', 'MemoryDB-for-Redis',
  'Migration-Evaluator', 'Migration-Hub', 'Monitron', 'MQ', 'Neptune', 'Network-Firewall',
  'Neuron', 'NICE-DCV', 'NICE-EnginFrame', 'Nimble-Studio', 'Nitro-Enclaves', 'Omics',
  'Open-3D-Engine', 'OpenSearch-Service', 'OpsWorks', 'Organizations', 'Outposts-family',
  'Outposts-rack', 'Outposts-servers', 'Panorama', 'ParallelCluster', 'Personal-Health-Dashboard',
  'Personalize', 'Pinpoint', 'Pinpoint-APIs', 'Polly', 'Private-5G', 'Private-Certificate-Authority',
  'PrivateLink', 'Professional-Services', 'Proton', 'Quantum-Ledger-Database', 'QuickSight',
  'RDS', 'RDS-on-VMware', 'Red-Hat-OpenShift-Service-on-AWS', 'Redshift', 'Rekognition',
  'rePost', 'Reserved-Instance-Reporting', 'Resilience-Hub', 'Resource-Access-Manager',
  'Resource-Explorer', 'RoboMaker', 'Route-53', 'S3-on-Outposts', 'SageMaker',
  'SageMaker-Ground-Truth', 'SageMaker-Studio-Lab', 'Savings-Plans', 'Secrets-Manager',
  'Security-Hub', 'Security-Lake', 'Serverless-Application-Repository', 'Server-Migration-Service',
  'Service-Catalog', 'Service-Management-Connector', 'Shield', 'Signer', 'Simple-Email-Service',
  'Simple-Notification-Service', 'Simple-Queue-Service', 'Simple-Storage-Service',
  'Simple-Storage-Service-Glacier', 'SimSpace-Weaver', 'Site-to-Site-VPN', 'Snowball',
  'Snowball-Edge', 'Snowcone', 'Snowmobile', 'Step-Functions', 'Storage-Gateway', 'Sumerian',
  'Supply-Chain', 'Support', 'Systems-Manager', 'TensorFlow-on-AWS', 'Textract',
  'Thinkbox-Deadline', 'Thinkbox-Frost', 'Thinkbox-Krakatoa', 'Thinkbox-Sequoia',
  'Thinkbox-Stoke', 'Thinkbox-XMesh', 'Timestream', 'Tools-and-SDKs', 'TorchServe',
  'Training-Certification', 'Transcribe', 'Transfer-Family', 'Transit-Gateway', 'Translate',
  'Trusted-Advisor', 'Verified-Access', 'Verified-Permissions', 'Virtual-Private-Cloud',
  'VMware-Cloud-on-AWS', 'VPC-Lattice', 'WAF', 'Wavelength', 'Well-Architected-Tool',
  'Wickr', 'WorkDocs', 'WorkDocs-SDK', 'WorkLink', 'WorkMail', 'WorkSpaces-Family', 'X-Ray'
];

export default getSmartIconPath; 