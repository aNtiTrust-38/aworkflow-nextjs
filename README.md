# 🎓 Academic Workflow Assistant

A comprehensive, ADHD-friendly academic paper writing automation application designed to assist students in the research and writing process while maintaining academic integrity.

## ✨ Features

### 📝 **6-Step Academic Workflow**
- **PROMPT**: Define your assignment and research question
- **GOALS**: Set ADHD-friendly goals and generate structure outlines
- **RESEARCH**: AI-powered research assistant with source management
- **GENERATE**: Content generation with academic integrity safeguards
- **REFINE**: Content analysis and refinement tools
- **EXPORT**: Professional PDF/Word export with citations

### 🎨 **Enhanced UI/UX (Recently Updated)**
- **Loading States**: Comprehensive progress indicators and estimated time
- **Error Handling**: User-friendly error messages with recovery options
- **Accessibility**: WCAG 2.1 AA compliant with full keyboard navigation
- **Responsive Design**: Mobile-first design that works on all devices
- **ADHD-Friendly**: Cognitive load reduction with clear visual hierarchy

### ♿ **Accessibility Features**
- Full keyboard navigation (Arrow keys, Tab, Alt+N/P/R shortcuts)
- Screen reader support with live announcements
- High contrast mode and reduced motion support
- Touch-friendly interface (44px minimum touch targets)
- Semantic HTML structure with proper ARIA labels

### 📱 **Cross-Device Support**
- **Mobile**: Optimized stepper with dropdown navigation
- **Tablet**: Adapted layouts with touch-friendly interactions  
- **Desktop**: Full-featured interface with hover states
- **Responsive Typography**: Scales appropriately across screen sizes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun package manager
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aworkflow-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API keys:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npx vitest run                           # Run all tests
npx vitest run __tests__/loading-states  # Run specific test suite
npx vitest run --coverage               # Run tests with coverage
npx vitest --ui                         # Run tests with UI interface

# Database
npx prisma studio    # Open Prisma Studio
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes
```

### Project Structure

```
aworkflow-nextjs/
├── src/app/                    # Next.js App Router pages
│   ├── WorkflowUI.tsx         # Main workflow component (enhanced)
│   ├── ADHDFriendlyGoals.tsx  # ADHD-specific features
│   ├── ResearchAssistant.tsx  # Research functionality
│   ├── ContentAnalysis.tsx    # Content analysis tools
│   ├── CitationManager.tsx    # Citation management
│   └── globals.css           # Global styles + responsive design
├── pages/api/                 # API endpoints
│   ├── citations.ts          # Citation management API
│   ├── content-analysis.ts   # File analysis API
│   ├── generate.ts           # Content generation API
│   ├── research.ts           # Research API
│   └── structure-guidance.ts # Outline generation API
├── __tests__/                # Comprehensive test suite
│   ├── ui-loading-states.test.tsx    # Loading state tests (7/7 ✅)
│   ├── error-handling.test.tsx       # Error handling tests
│   ├── accessibility.test.tsx        # Accessibility tests
│   ├── responsive-design.test.tsx    # Responsive design tests
│   └── workflow-ui.test.tsx         # Main workflow tests
├── prisma/                   # Database schema and migrations
├── public/                   # Static assets
└── vitest.config.ts         # Test configuration
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
         - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
         - NEXTAUTH_URL=http://localhost:3000
       volumes:
         - ./prisma:/app/prisma
   ```

2. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   
   # Install dependencies
   COPY package.json package-lock.json* ./
   RUN npm ci --only=production
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   # Generate Prisma client
   RUN npx prisma generate
   
   # Build Next.js
   RUN npm run build
   
   # Production image
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   
   USER nextjs
   
   EXPOSE 3000
   
   ENV PORT 3000
   
   CMD ["node", "server.js"]
   ```

3. **Build and run**
   ```bash
   docker-compose up --build
   ```

### Manual Docker Build

```bash
# Build the image
docker build -t academic-workflow .

# Run the container
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your_key_here \
  -e NEXTAUTH_SECRET=your_secret_here \
  -e NEXTAUTH_URL=http://localhost:3000 \
  academic-workflow
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Claude API key for AI features | Yes |
| `NEXTAUTH_SECRET` | NextAuth.js secret for authentication | Yes |
| `NEXTAUTH_URL` | Base URL for NextAuth.js | Yes |
| `DATABASE_URL` | Database connection string | No (SQLite default) |

### Database Configuration

The application uses SQLite by default for development. For production, update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // or "mysql"
  url      = env("DATABASE_URL")
}
```

## 🧪 Testing

### Test Suites

The application includes comprehensive test coverage:

```bash
# Run specific test categories
npx vitest run __tests__/ui-loading-states.test.tsx    # 7/7 tests ✅
npx vitest run __tests__/error-handling.test.tsx       # Error handling
npx vitest run __tests__/accessibility.test.tsx        # Accessibility
npx vitest run __tests__/responsive-design.test.tsx    # Responsive design
npx vitest run __tests__/workflow-ui.test.tsx         # Core workflow

# Run with coverage
npx vitest run --coverage

# Watch mode for development
npx vitest --ui
```

### Test Coverage Goals
- **Loading States**: 100% coverage ✅
- **Error Handling**: Core functionality working ✅
- **Accessibility**: WCAG 2.1 AA compliance ✅
- **Responsive Design**: Cross-device compatibility ✅

## 🐛 Troubleshooting

### Common Issues

#### **Build Errors**

**Issue**: TypeScript compilation errors
```bash
Error: Type 'string' is not assignable to type 'number'
```
**Solution**: 
```bash
npm run lint          # Check for linting issues
npx tsc --noEmit      # Check TypeScript without building
```

**Issue**: Missing dependencies
```bash
Error: Cannot find module '@anthropic-ai/sdk'
```
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### **Runtime Errors**

**Issue**: API calls failing
```bash
Error: fetch failed
```
**Solution**:
1. Check environment variables are set correctly
2. Verify API keys are valid and have proper permissions
3. Check network connectivity
4. Review API endpoint URLs in `/pages/api/`

**Issue**: Database connection errors
```bash
Error: Environment variable not found: DATABASE_URL
```
**Solution**:
```bash
npx prisma generate
npx prisma db push
```

#### **UI/UX Issues**

**Issue**: Loading states not appearing
**Solution**: Check browser console for JavaScript errors and verify test mode flags

**Issue**: Accessibility features not working
**Solution**: 
1. Test with keyboard navigation (Tab, Arrow keys)
2. Use browser accessibility tools
3. Verify ARIA attributes in browser inspector

**Issue**: Responsive design problems
**Solution**:
1. Check CSS classes in `globals.css`
2. Test across different viewport sizes
3. Verify Tailwind CSS is properly configured

#### **Performance Issues**

**Issue**: Slow loading times
**Solution**:
1. Enable production build: `npm run build && npm start`
2. Check network tab in browser dev tools
3. Verify API response times
4. Consider implementing caching

**Issue**: Memory leaks in development
**Solution**:
1. Restart development server: `npm run dev`
2. Clear browser cache and localStorage
3. Check for unclosed event listeners

### Getting Help

1. **Check the logs**: Browser console and terminal output
2. **Review test results**: `npx vitest run` for validation
3. **Verify configuration**: Environment variables and database setup
4. **Test accessibility**: Use browser accessibility tools
5. **Check responsive design**: Test across different device sizes

### Development Tips

```bash
# Useful development commands
npm run dev -- --turbo          # Enable Turbopack for faster builds
npm run build -- --debug        # Build with debug information
npx vitest run -- --reporter=verbose  # Detailed test output

# Debugging
console.log("Debug:", { state, props });  # Add debugging output
// Temporary debugging - remove before commit
```

## 🎯 Academic Integrity

### Core Principles
- **Learning Assistance**: Tool assists research and organization, doesn't replace learning
- **Student Ownership**: Students maintain control over their work and ideas
- **Transparency**: Clear about AI assistance in academic work
- **Skill Development**: Helps develop research and writing skills

### Usage Guidelines
- Use for research organization and outline generation
- Always verify and cite sources independently  
- Review and understand all generated content
- Maintain original thinking and analysis
- Follow your institution's AI usage policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Follow TDD methodology: Write tests first, then implementation
4. Commit changes: `git commit -m 'feat: add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Standards
- **TDD Required**: All new features must include tests
- **Accessibility First**: WCAG 2.1 AA compliance mandatory
- **ADHD-Friendly**: Consider cognitive load in all UI decisions
- **TypeScript Strict**: No type errors allowed
- **ESLint Clean**: All linting rules must pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the excellent framework
- **Anthropic** for Claude AI capabilities  
- **Tailwind CSS** for the utility-first CSS framework
- **Vitest Team** for the fast testing framework
- **ADHD Community** for accessibility guidance and feedback

---

**Built with ❤️ for students who need structured support in their academic journey**