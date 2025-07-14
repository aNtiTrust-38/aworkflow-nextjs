# 💻 Installation Guide - Academic Workflow Assistant

**Complete step-by-step installation instructions for Windows, macOS, and Docker environments**

This guide is designed for non-technical users who want to install the Academic Workflow Assistant on their computer. No programming experience required!

## 🎯 Before You Begin

You'll need:
- A computer with internet access
- About 30 minutes of time
- An email address for creating accounts

## 🪟 Windows Installation

### Prerequisites

1. **Install Node.js**
   - Visit [nodejs.org](https://nodejs.org/)
   - Download the "LTS" version (recommended for most users)
   - Run the installer and follow the prompts
   - Accept all default settings
   - **Test installation**: Open Command Prompt and type `node --version`

2. **Install Git**
   - Visit [git-scm.com](https://git-scm.com/download/win)
   - Download the Windows installer
   - Run the installer with default settings
   - **Test installation**: Open Command Prompt and type `git --version`

### Step-by-Step Installation

#### Step 1: Download the Application
1. Open Command Prompt (Press `Windows Key + R`, type `cmd`, press Enter)
2. Navigate to your desired folder (e.g., `cd C:\Users\YourName\Documents`)
3. Copy and paste this command:
   ```cmd
   git clone https://github.com/your-repo/aworkflow-nextjs.git
   ```
4. Navigate to the project folder:
   ```cmd
   cd aworkflow-nextjs
   ```

#### Step 2: Install Dependencies
1. In the same Command Prompt window, type:
   ```cmd
   npm install
   ```
2. Wait for installation to complete (this may take 5-10 minutes)

#### Step 3: Set Up the Database
1. Generate the database:
   ```cmd
   npx prisma generate
   ```
2. Create the database:
   ```cmd
   npx prisma db push
   ```

#### Step 4: Get Your API Keys
You need at least one AI service. We recommend getting both:

**For Claude (Anthropic):**
1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up for an account
3. Click "API Keys" in the left sidebar
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Save it in a secure place

**For OpenAI:**
1. Visit [platform.openai.com](https://platform.openai.com/)
2. Sign up for an account
3. Click "API keys" in the left sidebar
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. Save it in a secure place

#### Step 5: Start the Application
1. In Command Prompt, type:
   ```cmd
   npm run dev
   ```
2. Wait for the message "Ready - started server on 0.0.0.0:3000"
3. Open your web browser and go to: `http://localhost:3000`

#### Step 6: Complete Setup
1. You'll see a Setup Wizard
2. Enter your API keys from Step 4
3. Choose your preferences (citation style, etc.)
4. Click "Complete Setup"

### 🎉 You're Done!
The application is now running on your Windows computer. To use it again:
1. Open Command Prompt
2. Navigate to the project folder: `cd C:\Users\YourName\Documents\aworkflow-nextjs`
3. Type: `npm run dev`
4. Open your browser to `http://localhost:3000`

---

## 🍎 macOS Installation

### Prerequisites

1. **Install Homebrew (Package Manager)**
   - Open Terminal (Press `Cmd + Space`, type "Terminal")
   - Copy and paste this command:
     ```bash
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
     ```
   - Follow the prompts and enter your password when requested

2. **Install Node.js**
   - In Terminal, type:
     ```bash
     brew install node
     ```
   - **Test installation**: Type `node --version`

3. **Install Git**
   - In Terminal, type:
     ```bash
     brew install git
     ```
   - **Test installation**: Type `git --version`

### Step-by-Step Installation

#### Step 1: Download the Application
1. Open Terminal
2. Navigate to your desired folder:
   ```bash
   cd ~/Documents
   ```
3. Download the application:
   ```bash
   git clone https://github.com/your-repo/aworkflow-nextjs.git
   ```
4. Navigate to the project folder:
   ```bash
   cd aworkflow-nextjs
   ```

#### Step 2: Install Dependencies
1. In Terminal, type:
   ```bash
   npm install
   ```
2. Wait for installation to complete (5-10 minutes)

#### Step 3: Set Up the Database
1. Generate the database:
   ```bash
   npx prisma generate
   ```
2. Create the database:
   ```bash
   npx prisma db push
   ```

#### Step 4: Get Your API Keys
**For Claude (Anthropic):**
1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up for an account
3. Click "API Keys" in the left sidebar
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Save it in a secure place

**For OpenAI:**
1. Visit [platform.openai.com](https://platform.openai.com/)
2. Sign up for an account
3. Click "API keys" in the left sidebar
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. Save it in a secure place

#### Step 5: Start the Application
1. In Terminal, type:
   ```bash
   npm run dev
   ```
2. Wait for the message "Ready - started server on 0.0.0.0:3000"
3. Open your web browser and go to: `http://localhost:3000`

#### Step 6: Complete Setup
1. You'll see a Setup Wizard
2. Enter your API keys from Step 4
3. Choose your preferences (citation style, etc.)
4. Click "Complete Setup"

### 🎉 You're Done!
The application is now running on your Mac. To use it again:
1. Open Terminal
2. Navigate to the project folder: `cd ~/Documents/aworkflow-nextjs`
3. Type: `npm run dev`
4. Open your browser to `http://localhost:3000`

---

## 🐳 Docker Installation

Docker provides an easy way to run the application without installing Node.js or other dependencies.

### Prerequisites

1. **Install Docker Desktop**
   - **Windows**: Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - **macOS**: Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - **Linux**: Follow instructions at [docs.docker.com/engine/install](https://docs.docker.com/engine/install/)

2. **Verify Docker Installation**
   - Open Terminal/Command Prompt
   - Type: `docker --version`
   - You should see version information

### Option 1: Using Docker Compose (Recommended)

#### Step 1: Download the Application
1. Open Terminal/Command Prompt
2. Navigate to your desired folder
3. Download the application:
   ```bash
   git clone https://github.com/your-repo/aworkflow-nextjs.git
   cd aworkflow-nextjs
   ```

#### Step 2: Get Your API Keys
**For Claude (Anthropic):**
1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up and create an API key
3. Copy the key (starts with `sk-ant-`)

**For OpenAI:**
1. Visit [platform.openai.com](https://platform.openai.com/)
2. Sign up and create an API key
3. Copy the key (starts with `sk-`)

#### Step 3: Create Environment File
1. Create a file named `.env` in the project folder
2. Add your API keys:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_key_here
   OPENAI_API_KEY=your_openai_key_here
   AI_MONTHLY_BUDGET=100
   NEXTAUTH_SECRET=your_secret_here_make_it_long_and_random
   NEXTAUTH_URL=http://localhost:3000
   ```

#### Step 4: Run with Docker Compose
1. In Terminal/Command Prompt, type:
   ```bash
   docker-compose up --build
   ```
2. Wait for the build to complete
3. Open your browser to `http://localhost:3000`

### Option 2: Manual Docker Build

#### Step 1: Download and Build
1. Download the application (same as Option 1, Step 1)
2. Build the Docker image:
   ```bash
   docker build -t academic-workflow .
   ```

#### Step 2: Run the Container
1. Run with your API keys:
   ```bash
   docker run -p 3000:3000 \
     -e ANTHROPIC_API_KEY=your_anthropic_key_here \
     -e OPENAI_API_KEY=your_openai_key_here \
     -e AI_MONTHLY_BUDGET=100 \
     -e NEXTAUTH_SECRET=your_secret_here \
     -e NEXTAUTH_URL=http://localhost:3000 \
     academic-workflow
   ```

### 🎉 You're Done!
The application is now running in Docker. To use it again:
- **Option 1**: `docker-compose up`
- **Option 2**: Re-run the `docker run` command

---

## 🔧 After Installation

### Complete the Setup Wizard

1. Open your browser to `http://localhost:3000`
2. You'll see the Setup Wizard
3. Enter your API keys
4. Choose your preferences:
   - Citation style (APA, MLA, Chicago, etc.)
   - Language preference
   - Enable ADHD mode if desired
5. Click "Complete Setup"

### Test Your Installation

1. Click "Start New Paper"
2. Enter a simple prompt: "Write a short essay about renewable energy"
3. Follow the workflow through each step
4. If you can export a paper, everything is working correctly!

---

## 🆘 Troubleshooting

### Common Issues

#### "Node.js not found" or "npm not found"
- **Solution**: Restart your Terminal/Command Prompt after installing Node.js
- **Windows**: You may need to add Node.js to your PATH environment variable

#### "Permission denied" errors (macOS/Linux)
- **Solution**: Try prefixing commands with `sudo` (e.g., `sudo npm install`)
- **Better solution**: Fix npm permissions following [npm docs](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)

#### "Port 3000 already in use"
- **Solution**: Kill the process using port 3000 or use a different port:
  ```bash
  npm run dev -- --port 3001
  ```

#### API Keys not working
- **Double-check**: Make sure you copied the complete key
- **Verify**: Test your keys in the original provider's playground
- **Refresh**: Try regenerating the API keys

#### Docker issues
- **Docker not starting**: Make sure Docker Desktop is running
- **Build fails**: Try `docker system prune` to clean up old containers

### Getting Help

1. **Check the logs**: Look for error messages in Terminal/Command Prompt
2. **Verify requirements**: Make sure all prerequisites are installed
3. **Try a different browser**: Sometimes browser extensions interfere
4. **Clear cache**: Clear your browser cache and cookies
5. **Restart services**: Restart Docker Desktop or your computer

### Performance Tips

- **For faster builds**: Use `npm run dev -- --turbo` on supported systems
- **For Docker**: Increase Docker Desktop memory allocation in settings
- **For slow internet**: The initial `npm install` may take longer

---

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Internet**: Broadband connection required

### Recommended Requirements
- **OS**: Windows 11, macOS 12+, or recent Linux distribution
- **RAM**: 8GB or more
- **Storage**: 5GB free space
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

---

## 🎯 What's Next?

After successful installation:

1. **Read the [User Guide](USER_GUIDE.md)** - Learn how to use all features
2. **Try the [Quick Start](QUICKSTART.md)** - Write your first paper in 5 minutes
3. **Explore Settings** - Customize the app to your preferences
4. **Join the Community** - Connect with other academic users

**Ready to transform your academic writing experience! 🚀**

---

*Last updated: 2025-07-14*
*Version: 1.0.0*