/**
 * AWS Icon Catalog
 * 
 * This file contains a comprehensive mapping of all AWS service icons
 * organized by category with multiple name variations for better LLM matching
 */

export interface IconEntry {
  path: string;
  category: string;
  serviceName: string;
  aliases: string[];
  keywords: string[];
}

// Comprehensive icon catalog with all AWS icons from the public folder
export const AWS_ICON_CATALOG: Record<string, IconEntry> = {
  // Compute Services
  'ec2': {
    path: '/icons/aws-icons/Compute/EC2.svg',
    category: 'Compute',
    serviceName: 'EC2',
    aliases: ['EC2', 'Elastic Compute Cloud', 'EC2 Instance', 'Virtual Machine', 'VM', 'Server'],
    keywords: ['compute', 'instance', 'server', 'virtual', 'machine', 'vm']
  },
  'lambda': {
    path: '/icons/aws-icons/Compute/Lambda.svg',
    category: 'Compute',
    serviceName: 'Lambda',
    aliases: ['Lambda', 'Lambda Function', 'AWS Lambda', 'Serverless Function', 'Function'],
    keywords: ['serverless', 'function', 'compute', 'faas']
  },
  'fargate': {
    path: '/icons/aws-icons/Compute/Fargate.svg',
    category: 'Compute',
    serviceName: 'Fargate',
    aliases: ['Fargate', 'AWS Fargate', 'Serverless Container'],
    keywords: ['container', 'serverless', 'compute', 'ecs', 'eks']
  },
  'batch': {
    path: '/icons/aws-icons/Compute/Batch.svg',
    category: 'Compute',
    serviceName: 'Batch',
    aliases: ['Batch', 'AWS Batch', 'Batch Processing'],
    keywords: ['batch', 'processing', 'compute', 'job']
  },
  'lightsail': {
    path: '/icons/aws-icons/Compute/Lightsail.svg',
    category: 'Compute',
    serviceName: 'Lightsail',
    aliases: ['Lightsail', 'AWS Lightsail', 'Simple VPS'],
    keywords: ['vps', 'simple', 'compute', 'server']
  },
  'app-runner': {
    path: '/icons/aws-icons/Compute/App-Runner.svg',
    category: 'Compute',
    serviceName: 'App Runner',
    aliases: ['App Runner', 'AWS App Runner', 'Container Service'],
    keywords: ['container', 'app', 'runner', 'compute']
  },
  'elastic-beanstalk': {
    path: '/icons/aws-icons/Compute/Elastic-Beanstalk.svg',
    category: 'Compute',
    serviceName: 'Elastic Beanstalk',
    aliases: ['Elastic Beanstalk', 'Beanstalk', 'EB', 'PaaS'],
    keywords: ['paas', 'platform', 'deployment', 'compute']
  },
  'compute-optimizer': {
    path: '/icons/aws-icons/Compute/Compute-Optimizer.svg',
    category: 'Compute',
    serviceName: 'Compute Optimizer',
    aliases: ['Compute Optimizer', 'Optimizer'],
    keywords: ['optimize', 'compute', 'cost', 'performance']
  },
  
  // Database Services
  'dynamodb': {
    path: '/icons/aws-icons/Database/DynamoDB.svg',
    category: 'Database',
    serviceName: 'DynamoDB',
    aliases: ['DynamoDB', 'DynamoDB Table', 'NoSQL', 'Dynamo'],
    keywords: ['database', 'nosql', 'table', 'key-value']
  },
  'rds': {
    path: '/icons/aws-icons/Database/RDS.svg',
    category: 'Database',
    serviceName: 'RDS',
    aliases: ['RDS', 'Relational Database Service', 'RDS Database', 'SQL Database'],
    keywords: ['database', 'sql', 'relational', 'mysql', 'postgres']
  },
  'aurora': {
    path: '/icons/aws-icons/Database/Aurora.svg',
    category: 'Database',
    serviceName: 'Aurora',
    aliases: ['Aurora', 'Amazon Aurora', 'Aurora DB', 'Aurora MySQL', 'Aurora PostgreSQL'],
    keywords: ['database', 'sql', 'mysql', 'postgres', 'serverless']
  },
  'elasticache': {
    path: '/icons/aws-icons/Database/ElastiCache.svg',
    category: 'Database',
    serviceName: 'ElastiCache',
    aliases: ['ElastiCache', 'Cache', 'Redis', 'Memcached', 'In-Memory Cache'],
    keywords: ['cache', 'redis', 'memcached', 'memory', 'database']
  },
  'neptune': {
    path: '/icons/aws-icons/Database/Neptune.svg',
    category: 'Database',
    serviceName: 'Neptune',
    aliases: ['Neptune', 'Graph Database', 'Graph DB'],
    keywords: ['graph', 'database', 'relationships']
  },
  'documentdb': {
    path: '/icons/aws-icons/Database/DocumentDB.svg',
    category: 'Database',
    serviceName: 'DocumentDB',
    aliases: ['DocumentDB', 'Document Database', 'MongoDB Compatible'],
    keywords: ['document', 'database', 'mongodb', 'nosql']
  },
  'timestream': {
    path: '/icons/aws-icons/Database/Timestream.svg',
    category: 'Database',
    serviceName: 'Timestream',
    aliases: ['Timestream', 'Time Series Database', 'TSDB'],
    keywords: ['timeseries', 'database', 'iot', 'metrics']
  },
  'keyspaces': {
    path: '/icons/aws-icons/Database/Keyspaces.svg',
    category: 'Database',
    serviceName: 'Keyspaces',
    aliases: ['Keyspaces', 'Cassandra', 'Managed Cassandra'],
    keywords: ['cassandra', 'database', 'nosql', 'wide-column']
  },
  'memorydb': {
    path: '/icons/aws-icons/Database/MemoryDB-for-Redis.svg',
    category: 'Database',
    serviceName: 'MemoryDB',
    aliases: ['MemoryDB', 'MemoryDB for Redis', 'In-Memory Database'],
    keywords: ['memory', 'redis', 'database', 'cache']
  },
  'dms': {
    path: '/icons/aws-icons/Database/Database-Migration-Service.svg',
    category: 'Database',
    serviceName: 'DMS',
    aliases: ['DMS', 'Database Migration Service', 'Migration'],
    keywords: ['migration', 'database', 'transfer']
  },
  
  // Storage Services
  's3': {
    path: '/icons/aws-icons/Storage/Simple-Storage-Service.svg',
    category: 'Storage',
    serviceName: 'S3',
    aliases: ['S3', 'Simple Storage Service', 'S3 Bucket', 'Object Storage', 'Bucket'],
    keywords: ['storage', 'bucket', 'object', 'file', 's3']
  },
  's3-glacier': {
    path: '/icons/aws-icons/Storage/Simple-Storage-Service-Glacier.svg',
    category: 'Storage',
    serviceName: 'S3 Glacier',
    aliases: ['S3 Glacier', 'Glacier', 'Archive Storage', 'Cold Storage'],
    keywords: ['storage', 'archive', 'glacier', 'cold', 'backup']
  },
  'ebs': {
    path: '/icons/aws-icons/Storage/Elastic-Block-Store.svg',
    category: 'Storage',
    serviceName: 'EBS',
    aliases: ['EBS', 'Elastic Block Store', 'Block Storage', 'Volume'],
    keywords: ['storage', 'block', 'volume', 'disk']
  },
  'efs': {
    path: '/icons/aws-icons/Storage/EFS.svg',
    category: 'Storage',
    serviceName: 'EFS',
    aliases: ['EFS', 'Elastic File System', 'File Storage', 'NFS'],
    keywords: ['storage', 'file', 'nfs', 'shared']
  },
  'fsx': {
    path: '/icons/aws-icons/Storage/FSx.svg',
    category: 'Storage',
    serviceName: 'FSx',
    aliases: ['FSx', 'File System', 'Windows File Server', 'Lustre'],
    keywords: ['storage', 'file', 'windows', 'lustre', 'hpc']
  },
  'backup': {
    path: '/icons/aws-icons/Storage/Backup.svg',
    category: 'Storage',
    serviceName: 'Backup',
    aliases: ['Backup', 'AWS Backup', 'Backup Service'],
    keywords: ['backup', 'storage', 'recovery', 'protection']
  },
  'storage-gateway': {
    path: '/icons/aws-icons/Storage/Storage-Gateway.svg',
    category: 'Storage',
    serviceName: 'Storage Gateway',
    aliases: ['Storage Gateway', 'Hybrid Storage', 'Gateway'],
    keywords: ['storage', 'gateway', 'hybrid', 'on-premise']
  },
  
  // Networking & Content Delivery
  'vpc': {
    path: '/icons/aws-icons/Networking-Content-Delivery/VPC.svg',
    category: 'Networking',
    serviceName: 'VPC',
    aliases: ['VPC', 'Virtual Private Cloud', 'Network', 'Virtual Network'],
    keywords: ['network', 'vpc', 'subnet', 'private']
  },
  'cloudfront': {
    path: '/icons/aws-icons/Networking-Content-Delivery/CloudFront.svg',
    category: 'Networking',
    serviceName: 'CloudFront',
    aliases: ['CloudFront', 'CDN', 'Content Delivery Network', 'Distribution'],
    keywords: ['cdn', 'content', 'delivery', 'cache', 'distribution']
  },
  'route53': {
    path: '/icons/aws-icons/Networking-Content-Delivery/Route-53.svg',
    category: 'Networking',
    serviceName: 'Route 53',
    aliases: ['Route 53', 'Route53', 'DNS', 'Domain Name System'],
    keywords: ['dns', 'domain', 'routing', 'network']
  },
  'api-gateway': {
    path: '/icons/aws-icons/Networking-Content-Delivery/API-Gateway.svg',
    category: 'Networking',
    serviceName: 'API Gateway',
    aliases: ['API Gateway', 'REST API', 'HTTP API', 'WebSocket API', 'Gateway'],
    keywords: ['api', 'gateway', 'rest', 'http', 'websocket']
  },
  'elb': {
    path: '/icons/aws-icons/Networking-Content-Delivery/Elastic-Load-Balancing.svg',
    category: 'Networking',
    serviceName: 'ELB',
    aliases: ['ELB', 'Elastic Load Balancer', 'Load Balancer', 'ALB', 'NLB', 'CLB'],
    keywords: ['load', 'balancer', 'elb', 'alb', 'nlb']
  },
  'direct-connect': {
    path: '/icons/aws-icons/Networking-Content-Delivery/Direct-Connect.svg',
    category: 'Networking',
    serviceName: 'Direct Connect',
    aliases: ['Direct Connect', 'DX', 'Dedicated Connection'],
    keywords: ['direct', 'connect', 'dedicated', 'network']
  },
  'global-accelerator': {
    path: '/icons/aws-icons/Networking-Content-Delivery/Global-Accelerator.svg',
    category: 'Networking',
    serviceName: 'Global Accelerator',
    aliases: ['Global Accelerator', 'Accelerator'],
    keywords: ['global', 'accelerator', 'network', 'performance']
  },
  
  // Security, Identity & Compliance
  'iam': {
    path: '/icons/aws-icons/Security-Identity-Compliance/IAM.svg',
    category: 'Security',
    serviceName: 'IAM',
    aliases: ['IAM', 'Identity and Access Management', 'Identity', 'Access Control'],
    keywords: ['security', 'identity', 'access', 'iam', 'role', 'policy']
  },
  'cognito': {
    path: '/icons/aws-icons/Security-Identity-Compliance/Cognito.svg',
    category: 'Security',
    serviceName: 'Cognito',
    aliases: ['Cognito', 'User Pool', 'Identity Pool', 'Authentication', 'Auth'],
    keywords: ['auth', 'authentication', 'identity', 'user', 'cognito']
  },
  'waf': {
    path: '/icons/aws-icons/Security-Identity-Compliance/WAF.svg',
    category: 'Security',
    serviceName: 'WAF',
    aliases: ['WAF', 'Web Application Firewall', 'Firewall'],
    keywords: ['waf', 'firewall', 'security', 'web', 'protection']
  },
  'shield': {
    path: '/icons/aws-icons/Security-Identity-Compliance/Shield.svg',
    category: 'Security',
    serviceName: 'Shield',
    aliases: ['Shield', 'DDoS Protection', 'AWS Shield'],
    keywords: ['shield', 'ddos', 'protection', 'security']
  },
  'kms': {
    path: '/icons/aws-icons/Security-Identity-Compliance/Key-Management-Service.svg',
    category: 'Security',
    serviceName: 'KMS',
    aliases: ['KMS', 'Key Management Service', 'Encryption Keys', 'Keys'],
    keywords: ['kms', 'key', 'encryption', 'security', 'crypto']
  },
  'secrets-manager': {
    path: '/icons/aws-icons/Security-Identity-Compliance/Secrets-Manager.svg',
    category: 'Security',
    serviceName: 'Secrets Manager',
    aliases: ['Secrets Manager', 'Secrets', 'Credentials'],
    keywords: ['secrets', 'credentials', 'security', 'password']
  },
  'certificate-manager': {
    path: '/icons/aws-icons/Security-Identity-Compliance/Certificate-Manager.svg',
    category: 'Security',
    serviceName: 'Certificate Manager',
    aliases: ['Certificate Manager', 'ACM', 'SSL Certificate', 'TLS Certificate'],
    keywords: ['certificate', 'ssl', 'tls', 'security', 'https']
  },
  
  // Application Integration
  'sqs': {
    path: '/icons/aws-icons/App-Integration/Simple-Queue-Service.svg',
    category: 'Integration',
    serviceName: 'SQS',
    aliases: ['SQS', 'Simple Queue Service', 'Queue', 'Message Queue'],
    keywords: ['queue', 'message', 'sqs', 'integration', 'async']
  },
  'sns': {
    path: '/icons/aws-icons/App-Integration/Simple-Notification-Service.svg',
    category: 'Integration',
    serviceName: 'SNS',
    aliases: ['SNS', 'Simple Notification Service', 'Topic', 'Notification', 'Pub/Sub'],
    keywords: ['notification', 'topic', 'sns', 'pubsub', 'message']
  },
  'eventbridge': {
    path: '/icons/aws-icons/App-Integration/EventBridge.svg',
    category: 'Integration',
    serviceName: 'EventBridge',
    aliases: ['EventBridge', 'Event Bus', 'Events', 'CloudWatch Events'],
    keywords: ['event', 'bus', 'integration', 'eventbridge']
  },
  'step-functions': {
    path: '/icons/aws-icons/App-Integration/Step-Functions.svg',
    category: 'Integration',
    serviceName: 'Step Functions',
    aliases: ['Step Functions', 'State Machine', 'Workflow', 'Orchestration'],
    keywords: ['step', 'function', 'workflow', 'state', 'machine']
  },
  'appsync': {
    path: '/icons/aws-icons/App-Integration/AppSync.svg',
    category: 'Integration',
    serviceName: 'AppSync',
    aliases: ['AppSync', 'GraphQL', 'GraphQL API'],
    keywords: ['graphql', 'api', 'appsync', 'integration']
  },
  'mq': {
    path: '/icons/aws-icons/App-Integration/MQ.svg',
    category: 'Integration',
    serviceName: 'MQ',
    aliases: ['MQ', 'Amazon MQ', 'Message Broker', 'RabbitMQ', 'ActiveMQ'],
    keywords: ['mq', 'broker', 'rabbitmq', 'activemq', 'message']
  },
  
  // Analytics
  'kinesis': {
    path: '/icons/aws-icons/Analytics/Kinesis.svg',
    category: 'Analytics',
    serviceName: 'Kinesis',
    aliases: ['Kinesis', 'Data Stream', 'Streaming', 'Real-time Data'],
    keywords: ['kinesis', 'stream', 'data', 'real-time', 'analytics']
  },
  'athena': {
    path: '/icons/aws-icons/Analytics/Athena.svg',
    category: 'Analytics',
    serviceName: 'Athena',
    aliases: ['Athena', 'Query Service', 'SQL Query', 'Data Query'],
    keywords: ['athena', 'query', 'sql', 'analytics', 's3']
  },
  'glue': {
    path: '/icons/aws-icons/Analytics/Glue.svg',
    category: 'Analytics',
    serviceName: 'Glue',
    aliases: ['Glue', 'ETL', 'Data Catalog', 'Data Integration'],
    keywords: ['glue', 'etl', 'data', 'catalog', 'integration']
  },
  'redshift': {
    path: '/icons/aws-icons/Analytics/Redshift.svg',
    category: 'Analytics',
    serviceName: 'Redshift',
    aliases: ['Redshift', 'Data Warehouse', 'Analytics Database'],
    keywords: ['redshift', 'warehouse', 'analytics', 'database']
  },
  'quicksight': {
    path: '/icons/aws-icons/Analytics/QuickSight.svg',
    category: 'Analytics',
    serviceName: 'QuickSight',
    aliases: ['QuickSight', 'BI', 'Business Intelligence', 'Dashboard'],
    keywords: ['quicksight', 'bi', 'dashboard', 'visualization']
  },
  'emr': {
    path: '/icons/aws-icons/Analytics/EMR.svg',
    category: 'Analytics',
    serviceName: 'EMR',
    aliases: ['EMR', 'Elastic MapReduce', 'Hadoop', 'Spark', 'Big Data'],
    keywords: ['emr', 'hadoop', 'spark', 'bigdata', 'analytics']
  },
  
  // Machine Learning
  'sagemaker': {
    path: '/icons/aws-icons/Machine-Learning/SageMaker.svg',
    category: 'ML',
    serviceName: 'SageMaker',
    aliases: ['SageMaker', 'ML', 'Machine Learning', 'AI Platform'],
    keywords: ['sagemaker', 'ml', 'machine', 'learning', 'ai']
  },
  'bedrock': {
    path: '/icons/aws-icons/Machine-Learning/Bedrock.svg',
    category: 'ML',
    serviceName: 'Bedrock',
    aliases: ['Bedrock', 'Foundation Models', 'Generative AI', 'LLM'],
    keywords: ['bedrock', 'ai', 'llm', 'generative', 'foundation']
  },
  'comprehend': {
    path: '/icons/aws-icons/Machine-Learning/Comprehend.svg',
    category: 'ML',
    serviceName: 'Comprehend',
    aliases: ['Comprehend', 'NLP', 'Natural Language Processing', 'Text Analysis'],
    keywords: ['comprehend', 'nlp', 'text', 'language', 'analysis']
  },
  'rekognition': {
    path: '/icons/aws-icons/Machine-Learning/Rekognition.svg',
    category: 'ML',
    serviceName: 'Rekognition',
    aliases: ['Rekognition', 'Image Recognition', 'Computer Vision', 'Video Analysis'],
    keywords: ['rekognition', 'image', 'video', 'vision', 'recognition']
  },
  'polly': {
    path: '/icons/aws-icons/Machine-Learning/Polly.svg',
    category: 'ML',
    serviceName: 'Polly',
    aliases: ['Polly', 'Text to Speech', 'TTS', 'Voice'],
    keywords: ['polly', 'tts', 'text', 'speech', 'voice']
  },
  'transcribe': {
    path: '/icons/aws-icons/Machine-Learning/Transcribe.svg',
    category: 'ML',
    serviceName: 'Transcribe',
    aliases: ['Transcribe', 'Speech to Text', 'STT', 'Transcription'],
    keywords: ['transcribe', 'stt', 'speech', 'text', 'transcription']
  },
  
  // Management & Governance
  'cloudwatch': {
    path: '/icons/aws-icons/Management-Governance/CloudWatch.svg',
    category: 'Management',
    serviceName: 'CloudWatch',
    aliases: ['CloudWatch', 'Monitoring', 'Logs', 'Metrics', 'Alarms'],
    keywords: ['cloudwatch', 'monitoring', 'logs', 'metrics', 'alarm']
  },
  'cloudtrail': {
    path: '/icons/aws-icons/Management-Governance/CloudTrail.svg',
    category: 'Management',
    serviceName: 'CloudTrail',
    aliases: ['CloudTrail', 'Audit', 'Logging', 'Compliance'],
    keywords: ['cloudtrail', 'audit', 'logging', 'compliance', 'trail']
  },
  'cloudformation': {
    path: '/icons/aws-icons/Management-Governance/CloudFormation.svg',
    category: 'Management',
    serviceName: 'CloudFormation',
    aliases: ['CloudFormation', 'IaC', 'Infrastructure as Code', 'Stack', 'Template'],
    keywords: ['cloudformation', 'iac', 'infrastructure', 'stack', 'template']
  },
  'systems-manager': {
    path: '/icons/aws-icons/Management-Governance/Systems-Manager.svg',
    category: 'Management',
    serviceName: 'Systems Manager',
    aliases: ['Systems Manager', 'SSM', 'Parameter Store', 'Session Manager'],
    keywords: ['systems', 'manager', 'ssm', 'parameter', 'session']
  },
  'config': {
    path: '/icons/aws-icons/Management-Governance/Config.svg',
    category: 'Management',
    serviceName: 'Config',
    aliases: ['Config', 'AWS Config', 'Configuration', 'Compliance'],
    keywords: ['config', 'configuration', 'compliance', 'rules']
  },
  
  // Containers
  'ecs': {
    path: '/icons/aws-icons/Containers/ECS.svg',
    category: 'Containers',
    serviceName: 'ECS',
    aliases: ['ECS', 'Elastic Container Service', 'Container', 'Docker'],
    keywords: ['ecs', 'container', 'docker', 'elastic']
  },
  'eks': {
    path: '/icons/aws-icons/Containers/EKS.svg',
    category: 'Containers',
    serviceName: 'EKS',
    aliases: ['EKS', 'Elastic Kubernetes Service', 'Kubernetes', 'K8s'],
    keywords: ['eks', 'kubernetes', 'k8s', 'container']
  },
  'ecr': {
    path: '/icons/aws-icons/Containers/ECR.svg',
    category: 'Containers',
    serviceName: 'ECR',
    aliases: ['ECR', 'Elastic Container Registry', 'Container Registry', 'Docker Registry'],
    keywords: ['ecr', 'registry', 'container', 'docker', 'image']
  },
  
  // Developer Tools
  'codecommit': {
    path: '/icons/aws-icons/Developer-Tools/CodeCommit.svg',
    category: 'DevTools',
    serviceName: 'CodeCommit',
    aliases: ['CodeCommit', 'Git Repository', 'Source Control', 'Version Control'],
    keywords: ['codecommit', 'git', 'repository', 'source', 'version']
  },
  'codebuild': {
    path: '/icons/aws-icons/Developer-Tools/CodeBuild.svg',
    category: 'DevTools',
    serviceName: 'CodeBuild',
    aliases: ['CodeBuild', 'Build Service', 'CI', 'Continuous Integration'],
    keywords: ['codebuild', 'build', 'ci', 'continuous', 'integration']
  },
  'codedeploy': {
    path: '/icons/aws-icons/Developer-Tools/CodeDeploy.svg',
    category: 'DevTools',
    serviceName: 'CodeDeploy',
    aliases: ['CodeDeploy', 'Deployment', 'CD', 'Continuous Deployment'],
    keywords: ['codedeploy', 'deploy', 'cd', 'continuous', 'deployment']
  },
  'codepipeline': {
    path: '/icons/aws-icons/Developer-Tools/CodePipeline.svg',
    category: 'DevTools',
    serviceName: 'CodePipeline',
    aliases: ['CodePipeline', 'Pipeline', 'CI/CD', 'DevOps'],
    keywords: ['codepipeline', 'pipeline', 'cicd', 'devops']
  },
  
  // Front-End Web & Mobile
  'amplify': {
    path: '/icons/aws-icons/Front-End-Web-Mobile/Amplify.svg',
    category: 'Frontend',
    serviceName: 'Amplify',
    aliases: ['Amplify', 'AWS Amplify', 'Frontend', 'Mobile', 'Web App'],
    keywords: ['amplify', 'frontend', 'mobile', 'web', 'app']
  },
  'pinpoint': {
    path: '/icons/aws-icons/Front-End-Web-Mobile/Pinpoint.svg',
    category: 'Frontend',
    serviceName: 'Pinpoint',
    aliases: ['Pinpoint', 'Marketing', 'Engagement', 'Push Notifications'],
    keywords: ['pinpoint', 'marketing', 'engagement', 'push', 'notification']
  },
  
  // IoT
  'iot-core': {
    path: '/icons/aws-icons/Internet-of-Things/IoT-Core.svg',
    category: 'IoT',
    serviceName: 'IoT Core',
    aliases: ['IoT Core', 'IoT', 'Internet of Things', 'Device Management'],
    keywords: ['iot', 'core', 'device', 'thing', 'mqtt']
  },
  'iot-greengrass': {
    path: '/icons/aws-icons/Internet-of-Things/IoT-Greengrass.svg',
    category: 'IoT',
    serviceName: 'IoT Greengrass',
    aliases: ['Greengrass', 'Edge Computing', 'IoT Edge'],
    keywords: ['greengrass', 'edge', 'iot', 'local']
  },
  
  // Media Services
  'elemental-mediaconvert': {
    path: '/icons/aws-icons/Media-Services/Elemental-MediaConvert.svg',
    category: 'Media',
    serviceName: 'MediaConvert',
    aliases: ['MediaConvert', 'Video Transcoding', 'Media Processing'],
    keywords: ['media', 'convert', 'video', 'transcoding']
  },
  'elemental-medialive': {
    path: '/icons/aws-icons/Media-Services/Elemental-MediaLive.svg',
    category: 'Media',
    serviceName: 'MediaLive',
    aliases: ['MediaLive', 'Live Streaming', 'Broadcast'],
    keywords: ['media', 'live', 'streaming', 'broadcast']
  },
  
  // Migration & Transfer
  'datasync': {
    path: '/icons/aws-icons/Migration-Transfer/DataSync.svg',
    category: 'Migration',
    serviceName: 'DataSync',
    aliases: ['DataSync', 'Data Transfer', 'File Transfer'],
    keywords: ['datasync', 'transfer', 'migration', 'sync']
  },
  'transfer-family': {
    path: '/icons/aws-icons/Migration-Transfer/Transfer-Family.svg',
    category: 'Migration',
    serviceName: 'Transfer Family',
    aliases: ['Transfer Family', 'SFTP', 'FTP', 'File Transfer'],
    keywords: ['transfer', 'sftp', 'ftp', 'file']
  },
  
  // Blockchain
  'managed-blockchain': {
    path: '/icons/aws-icons/Blockchain/Managed-Blockchain.svg',
    category: 'Blockchain',
    serviceName: 'Managed Blockchain',
    aliases: ['Managed Blockchain', 'Blockchain', 'Hyperledger', 'Ethereum'],
    keywords: ['blockchain', 'hyperledger', 'ethereum', 'distributed']
  },
  'qldb': {
    path: '/icons/aws-icons/Blockchain/Quantum-Ledger-Database.svg',
    category: 'Blockchain',
    serviceName: 'QLDB',
    aliases: ['QLDB', 'Quantum Ledger Database', 'Ledger', 'Immutable Database'],
    keywords: ['qldb', 'ledger', 'quantum', 'immutable', 'blockchain']
  },
  
  // Business Applications
  'workspaces': {
    path: '/icons/aws-icons/End-User-Computing/WorkSpaces.svg',
    category: 'Business',
    serviceName: 'WorkSpaces',
    aliases: ['WorkSpaces', 'Virtual Desktop', 'VDI', 'Desktop'],
    keywords: ['workspaces', 'desktop', 'vdi', 'virtual']
  },
  'connect': {
    path: '/icons/aws-icons/Business-Applications/Connect.svg',
    category: 'Business',
    serviceName: 'Connect',
    aliases: ['Connect', 'Contact Center', 'Call Center', 'Customer Service'],
    keywords: ['connect', 'contact', 'center', 'call', 'customer']
  },
  
  // Game Tech
  'gamelift': {
    path: '/icons/aws-icons/Games/GameLift.svg',
    category: 'Games',
    serviceName: 'GameLift',
    aliases: ['GameLift', 'Game Server', 'Multiplayer', 'Game Hosting'],
    keywords: ['gamelift', 'game', 'server', 'multiplayer']
  },
  
  // Robotics
  'robomaker': {
    path: '/icons/aws-icons/Robotics/RoboMaker.svg',
    category: 'Robotics',
    serviceName: 'RoboMaker',
    aliases: ['RoboMaker', 'Robotics', 'Robot Simulation'],
    keywords: ['robomaker', 'robot', 'robotics', 'simulation']
  },
  
  // Satellite
  'ground-station': {
    path: '/icons/aws-icons/Satellite/Ground-Station.svg',
    category: 'Satellite',
    serviceName: 'Ground Station',
    aliases: ['Ground Station', 'Satellite', 'Space'],
    keywords: ['ground', 'station', 'satellite', 'space']
  },
  
  // Quantum Technologies
  'braket': {
    path: '/icons/aws-icons/Quantum-Technologies/Braket.svg',
    category: 'Quantum',
    serviceName: 'Braket',
    aliases: ['Braket', 'Quantum Computing', 'Quantum'],
    keywords: ['braket', 'quantum', 'computing', 'qubits']
  },
  
  // Generic fallback
  'generic': {
    path: '/icons/aws-icons/aws-generic.svg',
    category: 'General',
    serviceName: 'AWS Service',
    aliases: ['AWS', 'Generic', 'Service', 'Unknown'],
    keywords: ['aws', 'service', 'generic', 'default']
  }
};

/**
 * Get icon by exact ID
 */
export function getIconById(id: string): IconEntry | null {
  return AWS_ICON_CATALOG[id.toLowerCase()] || null;
}

/**
 * Search for icon by service name or alias
 */
export function findIconByName(name: string): IconEntry | null {
  const searchTerm = name.toLowerCase().trim();
  
  // First try exact ID match
  if (AWS_ICON_CATALOG[searchTerm]) {
    return AWS_ICON_CATALOG[searchTerm];
  }
  
  // Then search through all entries for matches
  for (const [id, entry] of Object.entries(AWS_ICON_CATALOG)) {
    // Check service name
    if (entry.serviceName.toLowerCase() === searchTerm) {
      return entry;
    }
    
    // Check aliases
    if (entry.aliases.some(alias => alias.toLowerCase() === searchTerm)) {
      return entry;
    }
    
    // Check partial matches in aliases
    if (entry.aliases.some(alias => alias.toLowerCase().includes(searchTerm))) {
      return entry;
    }
    
    // Check keywords
    if (entry.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))) {
      return entry;
    }
  }
  
  return null;
}

/**
 * Get all icons by category
 */
export function getIconsByCategory(category: string): Record<string, IconEntry> {
  const result: Record<string, IconEntry> = {};
  
  for (const [id, entry] of Object.entries(AWS_ICON_CATALOG)) {
    if (entry.category.toLowerCase() === category.toLowerCase()) {
      result[id] = entry;
    }
  }
  
  return result;
}

/**
 * Get icon path with fallback
 */
export function getIconPath(serviceName: string): string {
  const icon = findIconByName(serviceName);
  return icon ? icon.path : AWS_ICON_CATALOG.generic.path;
}

/**
 * Get all available categories
 */
export function getCategories(): string[] {
  const categories = new Set<string>();
  
  for (const entry of Object.values(AWS_ICON_CATALOG)) {
    categories.add(entry.category);
  }
  
  return Array.from(categories).sort();
}

/**
 * Search icons by keyword
 */
export function searchIcons(query: string): Record<string, IconEntry> {
  const searchTerm = query.toLowerCase().trim();
  const results: Record<string, IconEntry> = {};
  
  for (const [id, entry] of Object.entries(AWS_ICON_CATALOG)) {
    const matchScore = calculateMatchScore(entry, searchTerm);
    if (matchScore > 0) {
      results[id] = entry;
    }
  }
  
  return results;
}

/**
 * Calculate match score for search ranking
 */
function calculateMatchScore(entry: IconEntry, searchTerm: string): number {
  let score = 0;
  
  // Exact service name match
  if (entry.serviceName.toLowerCase() === searchTerm) {
    score += 100;
  }
  
  // Service name contains search term
  if (entry.serviceName.toLowerCase().includes(searchTerm)) {
    score += 50;
  }
  
  // Exact alias match
  if (entry.aliases.some(alias => alias.toLowerCase() === searchTerm)) {
    score += 80;
  }
  
  // Alias contains search term
  if (entry.aliases.some(alias => alias.toLowerCase().includes(searchTerm))) {
    score += 40;
  }
  
  // Keyword match
  if (entry.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))) {
    score += 20;
  }
  
  return score;
} 