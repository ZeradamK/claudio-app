# 🎯 LLM AWS Icon Reference Guide
## Complete Icon Mapping for Architecture Generation

This guide provides the LLM with all 309 available AWS service icons and their exact naming conventions for seamless architecture diagram generation.

## 📋 **Quick Reference for Common Services**

### 🖥️ **Compute Services**
```
ec2                 → EC2 Virtual Servers
lambda              → Lambda Serverless Functions  
ecs                 → Elastic Container Service
eks                 → Elastic Kubernetes Service
fargate             → Fargate Serverless Containers
batch               → Batch Computing
elastic-beanstalk   → Elastic Beanstalk
lightsail           → Lightsail VPS
app-runner          → App Runner
```

### 🗄️ **Database Services**
```
rds                 → Relational Database Service
dynamodb            → DynamoDB NoSQL
aurora              → Aurora Database
elasticache         → ElastiCache Redis/Memcached
neptune             → Neptune Graph Database
documentdb          → DocumentDB MongoDB
redshift            → Redshift Data Warehouse
timestream          → Timestream Time Series
```

### 💾 **Storage Services**
```
s3                  → S3 Object Storage
ebs                 → EBS Block Storage
efs                 → EFS File System
fsx                 → FSx High Performance
glacier             → S3 Glacier Archive
backup              → AWS Backup
storage-gateway     → Storage Gateway
```

### 🌐 **Networking Services**
```
vpc                 → Virtual Private Cloud
cloudfront          → CloudFront CDN
route53             → Route 53 DNS
api-gateway         → API Gateway
elb                 → Elastic Load Balancer
alb                 → Application Load Balancer
nlb                 → Network Load Balancer
direct-connect      → Direct Connect
transit-gateway     → Transit Gateway
```

### 🔒 **Security Services**
```
iam                 → Identity & Access Management
cognito             → Cognito User Management
waf                 → Web Application Firewall
shield              → DDoS Protection
guardduty           → GuardDuty Threat Detection
kms                 → Key Management Service
secrets-manager     → Secrets Manager
```

### 📊 **Analytics Services**
```
athena              → Athena Query Service
emr                 → EMR Big Data
kinesis             → Kinesis Streaming
glue                → Glue ETL
quicksight          → QuickSight BI
opensearch          → OpenSearch
```

### 🤖 **AI/ML Services**
```
sagemaker           → SageMaker ML Platform
comprehend          → Comprehend NLP
rekognition         → Rekognition Computer Vision
textract            → Textract Document Analysis
translate           → Translate
transcribe          → Transcribe Speech-to-Text
polly               → Polly Text-to-Speech
lex                 → Lex Chatbots
```

### 🔗 **Integration Services**
```
sqs                 → Simple Queue Service
sns                 → Simple Notification Service
eventbridge         → EventBridge
step-functions      → Step Functions
appsync             → AppSync GraphQL
mq                  → Amazon MQ
```

### 📈 **Management Services**
```
cloudwatch          → CloudWatch Monitoring
cloudtrail          → CloudTrail Logging
config              → Config Compliance
systems-manager     → Systems Manager
cloudformation      → CloudFormation IaC
organizations       → Organizations
control-tower       → Control Tower
```

## 🎨 **Icon Naming Conventions**

### **Simple Names (Preferred)**
Use these short, memorable names:
- `ec2` instead of `elastic-compute-cloud`
- `s3` instead of `simple-storage-service`
- `rds` instead of `relational-database-service`
- `iam` instead of `identity-and-access-management`

### **Service Variations Supported**
The system handles multiple naming patterns:
- `lambda` = `aws-lambda` = `lambda-function`
- `dynamodb` = `dynamo-db` = `amazon-dynamodb`
- `elasticsearch` = `opensearch` = `opensearch-service`

### **Fuzzy Matching**
Generic terms automatically map to appropriate services:
- `database` → RDS
- `storage` → S3
- `compute` → EC2
- `network` → VPC
- `security` → IAM
- `monitoring` → CloudWatch

## 📁 **Complete Icon List (309 Services)**

### **A-C Services**
```
activate, alexa-for-business, amplify, apache-mxnet-on-aws, api-gateway,
appconfig, appflow, application-auto-scaling, application-composer,
application-cost-profiler, application-discovery-service, 
application-migration-service, app-mesh, app-runner, appstream, appsync,
artifact, athena, audit-manager, augmented-ai-a2i, aurora, auto-scaling,
aws-generic, backint-agent, backup, batch, billing-conductor, bottlerocket,
braket, budgets, certificate-manager, chatbot, chime, chime-sdk,
chime-voice-connector, clean-rooms, client-vpn, cloud9, cloud-control-api,
cloud-development-kit, cloud-directory, cloudformation, cloudfront,
cloudhsm, cloud-map, cloudsearch, cloudshell, cloudtrail, cloud-wan,
cloudwatch, codeartifact, codebuild, codecatalyst, codecommit, codedeploy,
codeguru, codepipeline, codestar, codewhisperer, cognito,
command-line-interface, comprehend, comprehend-medical, compute,
compute-optimizer, config, connect, console-mobile-application,
control-tower, corretto, cost-and-usage-report, cost-explorer
```

### **D-G Services**
```
database-migration-service, data-exchange, data-pipeline, datasync,
datazone, deepcomposer, deep-learning-amis, deep-learning-containers,
deeplens, deepracer, detective, device-farm, devops-guru, direct-connect,
directory-service, distro-for-opentelemetry, documentdb, dynamodb, ec2,
ec2-auto-scaling, ec2-image-builder, ecs, efs, eks, eks-cloud, eks-distro,
elasticache, elastic-beanstalk, elastic-block-store,
elastic-container-registry, elastic-container-service,
elastic-disaster-recovery, elastic-fabric-adapter, elastic-inference,
elastic-kubernetes-service, elastic-load-balancing, elastic-transcoder,
elemental-appliances-&-software, elemental-conductor, elemental-delta,
elemental-link, elemental-live, elemental-mediaconnect,
elemental-mediaconvert, elemental-medialive, elemental-mediapackage,
elemental-mediastore, elemental-mediatailor, elemental-server, emr,
eventbridge, express-workflows, fargate, fault-injection-simulator,
file-cache, finspace, firewall-manager, forecast, fraud-detector, freertos,
fsx, fsx-for-lustre, fsx-for-netapp-ontap, fsx-for-openzfs, fsx-for-wfs,
gamekit, gamelift, gamesparks, genomics-cli, global-accelerator, glue,
glue-databrew, glue-elastic-views, ground-station, guardduty
```

### **H-O Services**
```
healthlake, honeycode, iam-identity-center, identity-and-access-management,
inspector, interactive-video-service, iot-1-click, iot-analytics,
iot-button, iot-core, iot-device-defender, iot-device-management,
iot-edukit, iot-events, iot-expresslink, iot-fleetwise, iot-greengrass,
iot-roborunner, iot-sitewise, iot-things-graph, iot-twinmaker, iq, kendra,
key-management-service, keyspaces, kinesis, kinesis-data-analytics,
kinesis-data-streams, kinesis-firehose, kinesis-video-streams,
lake-formation, lambda, launch-wizard, lex, license-manager, lightsail,
local-zones, location-service, lookout-for-equipment, lookout-for-metrics,
lookout-for-vision, lumberyard, macie, mainframe-modernization,
managed-blockchain, managed-grafana, managed-service-for-prometheus,
managed-services, managed-streaming-for-apache-kafka,
managed-workflows-for-apache-airflow, management-console,
marketplace_dark, marketplace_light, memorydb-for-redis,
migration-evaluator, migration-hub, monitron, mq, neptune,
network-firewall, neuron, nice-dcv, nice-enginframe, nimble-studio,
nitro-enclaves, omics, open-3d-engine, opensearch-service, opsworks,
organizations, outposts-family, outposts-rack, outposts-servers
```

### **P-Z Services**
```
panorama, parallelcluster, personal-health-dashboard, personalize,
pinpoint, pinpoint-apis, polly, private-5g, private-certificate-authority,
privatelink, professional-services, proton, quantum-ledger-database,
quicksight, rds, rds-on-vmware, red-hat-openshift-service-on-aws,
redshift, rekognition, repost, reserved-instance-reporting,
resilience-hub, resource-access-manager, resource-explorer, robomaker,
route-53, s3-on-outposts, sagemaker, sagemaker-ground-truth,
sagemaker-studio-lab, savings-plans, secrets-manager, security-hub,
security-lake, serverless-application-repository, server-migration-service,
service-catalog, service-management-connector, shield, signer,
simple-email-service, simple-notification-service, simple-queue-service,
simple-storage-service, simple-storage-service-glacier, simspace-weaver,
site-to-site-vpn, snowball, snowball-edge, snowcone, snowmobile,
step-functions, storage-gateway, sumerian, supply-chain, support,
systems-manager, tensorflow-on-aws, textract, thinkbox-deadline,
thinkbox-frost, thinkbox-krakatoa, thinkbox-sequoia, thinkbox-stoke,
thinkbox-xmesh, timestream, tools-and-sdks, torchserve,
training-certification, transcribe, transfer-family, transit-gateway,
translate, trusted-advisor, verified-access, verified-permissions,
virtual-private-cloud, vmware-cloud-on-aws, vpc-lattice, waf, wavelength,
well-architected-tool, wickr, workdocs, workdocs-sdk, worklink, workmail,
workspaces-family, x-ray
```

## 🏗️ **Architecture Layer Guidelines**

### **Proper AWS Architecture Hierarchy**
```
1. User Layer          → Users, Clients, Mobile Apps
2. Internet & Edge     → CloudFront, Route 53, Global Accelerator
3. VPC Network         → VPC, NAT Gateway, Direct Connect
4. Public Subnet       → Load Balancers, Bastion Hosts
5. Compute Layer       → EC2, Lambda, ECS, API Gateway
6. Private Subnet      → Private resources
7. Database Layer      → RDS, DynamoDB, ElastiCache
8. Storage Layer       → S3, EBS, EFS
9. Security Layer      → IAM, Cognito, WAF
10. Management Layer   → CloudWatch, CloudTrail
```

## 💡 **LLM Usage Tips**

### **When Generating Architectures:**
1. **Use simple names**: `ec2`, `lambda`, `s3`, `rds`
2. **Don't worry about exact spelling**: The system handles variations
3. **Include layer information**: Specify which AWS layer each service belongs to
4. **Use common abbreviations**: `alb`, `nlb`, `eks`, `ecs`

### **Example Architecture Generation:**
```json
{
  "nodes": [
    {"service": "cloudfront", "layer": "internet"},
    {"service": "alb", "layer": "public-subnet"},
    {"service": "ec2", "layer": "compute"},
    {"service": "rds", "layer": "database"},
    {"service": "s3", "layer": "storage"}
  ]
}
```

### **Fallback Behavior:**
- Unknown services → `aws-generic` icon
- Partial matches work (e.g., `dyn` → `dynamodb`)
- Generic terms map intelligently (e.g., `database` → `rds`)

## 🎯 **Best Practices for LLM**

1. **Prefer AWS service names** over generic terms
2. **Use lowercase with hyphens** for multi-word services
3. **Include proper layer assignments** for better diagram layout
4. **Don't include "AWS" or "Amazon" prefixes** - they're automatically handled
5. **Use abbreviations when available** (e.g., `iam`, `kms`, `waf`)

This comprehensive mapping ensures that any AWS service name you generate will automatically resolve to the correct icon, creating professional and accurate architecture diagrams! 🚀 