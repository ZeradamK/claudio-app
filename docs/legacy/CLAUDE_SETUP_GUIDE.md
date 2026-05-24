# 🔑 Claude API Setup Guide

## Quick Setup

Your `.env.local` file has been created! Now you need to add your actual Claude API key.

### Step 1: Get Your Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-`)

### Step 2: Update .env.local

Open the `.env.local` file in your project root and replace:

```bash
ANTHROPIC_API_KEY=your_claude_api_key_here
```

With your actual API key:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

### Step 3: Restart Development Server

```bash
npm run dev
```

Your app will now run on **http://localhost:3000** (changed from port 9002 to avoid conflicts)

## ✅ Test Your Integration

1. Open any architecture diagram in your app at **http://localhost:3000**
2. Use the Jarvis chat panel on the right
3. Try these example prompts:

```
"Add a Lambda function connected to API Gateway"
"Replace EC2 with serverless architecture"  
"Add a caching layer with ElastiCache Redis"
"Connect the database to a backup service"
"Add auto-scaling to the application tier"
```

## 🔧 Optional: Add Fallback APIs

For enhanced functionality, you can also add:

```bash
# Optional fallback APIs
COHERE_API_KEY=your_cohere_key_here
OPENAI_API_KEY=your_openai_key_here
```

## 🚨 Troubleshooting

### API Key Issues
- Make sure your API key starts with `sk-ant-`
- Check that you have credits in your Anthropic account
- Verify the key is correctly pasted (no extra spaces)

### Configuration Check
Visit: **http://localhost:3000/api/check-config** to verify your setup.

### Chat Not Working
1. Check browser console for errors
2. Verify the API key in `.env.local`
3. Restart the development server
4. Check that port 3000 is not blocked

### Port Issues
If port 3000 is busy, you can use alternative ports:
```bash
npm run dev:8080    # Runs on port 8080
npm run dev:9002    # Runs on port 9002 (original)
npm run dev:no-turbo # Runs without Turbopack on port 3000
```

## 🎯 Features Available

With Claude integration, you can:

- **Modify Architecture**: Add, remove, connect, replace services
- **Real-time Updates**: See changes instantly in the diagram
- **AWS Best Practices**: Get recommendations following AWS guidelines
- **Icon Resolution**: Automatic AWS service icon assignment
- **Natural Language**: Use conversational prompts for complex changes

## 📚 Example Conversations

### Adding Services
```
You: "Add a Multi-AZ Aurora RDS cluster"
Claude: ✅ I'll add an Aurora cluster with Multi-AZ deployment...
[Diagram updates with RDS cluster and proper connections]
```

### Architecture Transformation
```
You: "Convert this to a serverless architecture"
Claude: ✅ I'll transform your architecture to use serverless components...
[Complete restructure with API Gateway, Lambda, DynamoDB]
```

### Security Enhancements
```
You: "Add security controls for this setup"
Claude: ✅ I'll implement security best practices...
[Adds WAF, Shield, proper IAM roles, encryption]
```

## 🔧 Fixed Issues

✅ **Port Conflict**: Changed default port from 9002 to 3000  
✅ **Turbopack Warning**: Updated Next.js config for proper Turbopack support  
✅ **Font Loading**: Fixed Google Fonts connection issues  
✅ **Favicon Error**: Resolved favicon 500 errors  

---

**🚀 Your Claude-powered architecture chat is ready!** 