import { readFileSync, existsSync } from 'fs'
import * as yaml from 'yaml'

export interface WorkflowValidation {
  isValid: boolean
  jobs: string[]
  triggers: string[]
  branches: string[]
  errors: string[]
  warnings: string[]
  jobDependencies?: Record<string, string[]>
  securityFeatures?: string[]
  securityWarnings?: string[]
  environments?: string[]
  conditionalDeployments?: boolean
}

export interface PipelineStep {
  name: string
  action?: string
  run?: string
  with?: Record<string, any>
}

export interface StepValidation {
  isValid: boolean
  essentialSteps: {
    checkout: boolean
    setupNode: boolean
    installDependencies: boolean
    lint: boolean
    test: boolean
    build: boolean
    securityScan: boolean
  }
  missingSteps: string[]
  warnings: string[]
  optimizations: string[]
  parallelJobs?: string[]
  jobDependencies?: Record<string, string[]>
}

export interface PipelineConfig {
  [jobName: string]: {
    steps: string[]
    timeout?: number
    needs?: string[]
    environment?: Record<string, string>
    requiredSecrets?: string[]
    matrix?: Record<string, string[]>
  }
}

export interface JobResult {
  success: boolean
  duration: number
  output?: string
  error?: string
}

export interface PipelineTestResult {
  success: boolean
  jobs: Record<string, JobResult>
  totalDuration: number
  matrixResults?: Record<string, JobResult[]>
  validationResults?: Record<string, {
    requiredSecrets: string[]
    environmentVariables: Record<string, string>
  }>
  metrics?: {
    totalJobs: number
    successfulJobs: number
    failedJobs: number
    totalDuration: number
    averageJobDuration: number
    parallelEfficiency: number
  }
}

export function validateWorkflowFile(workflowPath: string): WorkflowValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const securityFeatures: string[] = []
  const securityWarnings: string[] = []

  if (!existsSync(workflowPath)) {
    return {
      isValid: false,
      jobs: [],
      triggers: [],
      branches: [],
      errors: ['Workflow file not found'],
      warnings
    }
  }

  try {
    const content = readFileSync(workflowPath, 'utf8')
    let workflow: any

    // Parse YAML
    try {
      workflow = yaml.parse(content)
    } catch (parseError) {
      return {
        isValid: false,
        jobs: [],
        triggers: [],
        branches: [],
        errors: [`Invalid YAML: ${(parseError as Error).message}`],
        warnings
      }
    }

    // Extract basic information
    const jobs = Object.keys(workflow.jobs || {})
    const triggers = Array.isArray(workflow.on) ? workflow.on : Object.keys(workflow.on || {})
    
    let branches: string[] = []
    if (workflow.on?.push?.branches) {
      branches = branches.concat(workflow.on.push.branches)
    }
    if (workflow.on?.pull_request?.branches) {
      branches = branches.concat(workflow.on.pull_request.branches)
    }

    // Validate required jobs
    const recommendedJobs = ['test', 'build', 'security-scan']
    recommendedJobs.forEach(job => {
      if (!jobs.includes(job)) {
        warnings.push(`Missing recommended job: ${job}`)
      }
    })

    // Extract job dependencies
    const jobDependencies: Record<string, string[]> = {}
    Object.entries(workflow.jobs || {}).forEach(([jobName, jobConfig]: [string, any]) => {
      if (jobConfig.needs) {
        jobDependencies[jobName] = Array.isArray(jobConfig.needs) 
          ? jobConfig.needs 
          : [jobConfig.needs]
      } else {
        jobDependencies[jobName] = []
      }
    })

    // Security analysis
    Object.entries(workflow.jobs || {}).forEach(([jobName, jobConfig]: [string, any]) => {
      // Check for explicit permissions
      if (jobConfig.permissions) {
        securityFeatures.push('Explicit permissions defined')
      } else {
        securityWarnings.push('No explicit permissions defined')
      }

      // Check for security scanning
      const steps = jobConfig.steps || []
      const hasSecurityScan = steps.some((step: any) => 
        step.name?.toLowerCase().includes('security') ||
        step.uses?.includes('security') ||
        step.run?.includes('audit')
      )
      
      if (hasSecurityScan) {
        securityFeatures.push('Security scanning included')
      }

      // Check for dependency auditing
      const hasDependencyAudit = steps.some((step: any) =>
        step.run?.includes('npm audit') || 
        step.run?.includes('yarn audit')
      )
      
      if (hasDependencyAudit) {
        securityFeatures.push('Dependency audit included')
      }

      // Check for secret exposure
      steps.forEach((step: any) => {
        if (step.run && step.run.includes('${{ secrets.') && 
            (step.run.includes('echo') || step.run.includes('print'))) {
          securityWarnings.push('Secret potentially exposed in logs')
        }
      })
    })

    // Check for environment-specific deployments
    const environments: string[] = []
    let conditionalDeployments = false

    Object.entries(workflow.jobs || {}).forEach(([jobName, jobConfig]: [string, any]) => {
      if (jobConfig.environment) {
        environments.push(jobConfig.environment)
      }
      
      if (jobConfig.if && jobConfig.if.includes('github.ref')) {
        conditionalDeployments = true
      }
    })

    const isValid = errors.length === 0

    return {
      isValid,
      jobs,
      triggers,
      branches: [...new Set(branches)],
      errors,
      warnings,
      jobDependencies,
      securityFeatures: [...new Set(securityFeatures)],
      securityWarnings: [...new Set(securityWarnings)],
      environments: [...new Set(environments)],
      conditionalDeployments
    }

  } catch (error) {
    return {
      isValid: false,
      jobs: [],
      triggers: [],
      branches: [],
      errors: [`Failed to parse workflow: ${(error as Error).message}`],
      warnings
    }
  }
}

export function validatePipelineSteps(
  steps: PipelineStep[], 
  options: { jobs?: Record<string, any> } = {}
): StepValidation {
  const warnings: string[] = []
  const optimizations: string[] = []
  const missingSteps: string[] = []

  // Check for essential steps
  const essentialSteps = {
    checkout: steps.some(step => 
      step.action?.includes('checkout') || 
      step.run?.includes('checkout')
    ),
    setupNode: steps.some(step => 
      step.action?.includes('setup-node') ||
      step.run?.includes('node')
    ),
    installDependencies: steps.some(step => 
      step.run?.includes('npm ci') || 
      step.run?.includes('yarn install') ||
      step.run?.includes('npm install')
    ),
    lint: steps.some(step => 
      step.run?.includes('lint') ||
      step.run?.includes('eslint')
    ),
    test: steps.some(step => 
      step.run?.includes('test') ||
      step.run?.includes('jest') ||
      step.run?.includes('vitest')
    ),
    build: steps.some(step => 
      step.run?.includes('build') ||
      step.run?.includes('compile')
    ),
    securityScan: steps.some(step => 
      step.run?.includes('audit') ||
      step.action?.includes('security')
    )
  }

  // Identify missing essential steps
  Object.entries(essentialSteps).forEach(([stepName, present]) => {
    if (!present) {
      missingSteps.push(stepName.replace(/([A-Z])/g, '-$1').toLowerCase())
    }
  })

  // Check action versions
  steps.forEach(step => {
    if (step.action) {
      if (step.action.includes('checkout@v3')) {
        warnings.push('actions/checkout@v3 - consider upgrading to v4')
      }
      if (step.action.includes('setup-node@v2')) {
        warnings.push('actions/setup-node@v2 - consider upgrading to v4')
      }
    }
  })

  // Check for caching optimizations
  const hasNodeCache = steps.some(step => 
    step.with?.cache === 'npm' || 
    step.with?.cache === 'yarn'
  )
  
  if (hasNodeCache) {
    optimizations.push('NPM cache configured')
  }

  const hasCustomCache = steps.some(step => 
    step.action?.includes('cache') ||
    step.name?.toLowerCase().includes('cache')
  )
  
  if (hasCustomCache) {
    optimizations.push('Custom dependency cache configured')
  }

  // Analyze parallel jobs structure
  let parallelJobs: string[] = []
  let jobDependencies: Record<string, string[]> = {}

  if (options.jobs) {
    Object.entries(options.jobs).forEach(([jobName, jobConfig]: [string, any]) => {
      if (!jobConfig.needs || jobConfig.needs.length === 0) {
        parallelJobs.push(jobName)
      }
      
      jobDependencies[jobName] = jobConfig.needs || []
    })
  }

  const isValid = missingSteps.length === 0

  return {
    isValid,
    essentialSteps,
    missingSteps,
    warnings,
    optimizations,
    parallelJobs: parallelJobs.length > 0 ? parallelJobs : undefined,
    jobDependencies: Object.keys(jobDependencies).length > 0 ? jobDependencies : undefined
  }
}

export async function testPipelineJobs(
  jobs: PipelineConfig,
  options: {
    runner?: (jobName: string, config: PipelineConfig[string]) => Promise<JobResult>
    validateSecrets?: boolean
    collectMetrics?: boolean
  } = {}
): Promise<PipelineTestResult> {
  const startTime = Date.now()
  const jobResults: Record<string, JobResult> = {}
  const matrixResults: Record<string, JobResult[]> = {}
  const validationResults: Record<string, any> = {}

  // Default job runner
  const defaultRunner = async (jobName: string, config: PipelineConfig[string]): Promise<JobResult> => {
    const jobStartTime = Date.now()
    
    try {
      // Simulate job execution
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
      
      return {
        success: true,
        duration: Date.now() - jobStartTime,
        output: `${jobName} completed successfully`
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - jobStartTime,
        error: (error as Error).message
      }
    }
  }

  const runner = options.runner || defaultRunner

  // Execute jobs respecting dependencies
  const executedJobs = new Set<string>()
  const jobQueue = [...Object.keys(jobs)]

  while (jobQueue.length > 0) {
    const readyJobs = jobQueue.filter(jobName => {
      const jobConfig = jobs[jobName]
      const dependencies = jobConfig.needs || []
      return dependencies.every(dep => executedJobs.has(dep))
    })

    if (readyJobs.length === 0) {
      throw new Error('Circular dependency detected in jobs')
    }

    // Execute ready jobs in parallel
    await Promise.all(readyJobs.map(async jobName => {
      const jobConfig = jobs[jobName]

      // Handle matrix builds
      if (jobConfig.matrix) {
        const matrixCombinations = generateMatrixCombinations(jobConfig.matrix)
        const matrixJobResults = await Promise.all(
          matrixCombinations.map(combination => 
            runner(`${jobName}-${JSON.stringify(combination)}`, jobConfig)
          )
        )
        matrixResults[jobName] = matrixJobResults
        
        // Use first result for overall job status
        jobResults[jobName] = matrixJobResults[0]
      } else {
        // Handle timeout
        let jobPromise = runner(jobName, jobConfig)
        
        if (jobConfig.timeout) {
          const timeoutPromise = new Promise<JobResult>((_, reject) => {
            setTimeout(() => reject(new Error(`Job ${jobName} timed out after ${jobConfig.timeout}ms`)), jobConfig.timeout)
          })
          
          try {
            jobResults[jobName] = await Promise.race([jobPromise, timeoutPromise])
          } catch (error) {
            jobResults[jobName] = {
              success: false,
              duration: jobConfig.timeout || 0,
              error: (error as Error).message
            }
          }
        } else {
          jobResults[jobName] = await jobPromise
        }
      }

      // Validate secrets and environment if requested
      if (options.validateSecrets) {
        validationResults[jobName] = {
          requiredSecrets: jobConfig.requiredSecrets || [],
          environmentVariables: jobConfig.environment || {}
        }
      }

      executedJobs.add(jobName)
    }))

    // Remove executed jobs from queue
    readyJobs.forEach(jobName => {
      const index = jobQueue.indexOf(jobName)
      if (index > -1) {
        jobQueue.splice(index, 1)
      }
    })
  }

  const totalDuration = Date.now() - startTime
  const success = Object.values(jobResults).every(result => result.success)

  const result: PipelineTestResult = {
    success,
    jobs: jobResults,
    totalDuration
  }

  if (Object.keys(matrixResults).length > 0) {
    result.matrixResults = matrixResults
  }

  if (Object.keys(validationResults).length > 0) {
    result.validationResults = validationResults
  }

  if (options.collectMetrics) {
    const totalJobs = Object.keys(jobResults).length
    const successfulJobs = Object.values(jobResults).filter(r => r.success).length
    const failedJobs = totalJobs - successfulJobs
    const averageJobDuration = Object.values(jobResults).reduce((sum, r) => sum + r.duration, 0) / totalJobs
    const parallelEfficiency = averageJobDuration > 0 ? (totalDuration / averageJobDuration) : 0

    result.metrics = {
      totalJobs,
      successfulJobs,
      failedJobs,
      totalDuration,
      averageJobDuration,
      parallelEfficiency
    }
  }

  return result
}

function generateMatrixCombinations(matrix: Record<string, string[]>): Record<string, string>[] {
  const keys = Object.keys(matrix)
  const combinations: Record<string, string>[] = []

  function generateCombos(index: number, current: Record<string, string>) {
    if (index === keys.length) {
      combinations.push({ ...current })
      return
    }

    const key = keys[index]
    matrix[key].forEach(value => {
      current[key] = value
      generateCombos(index + 1, current)
    })
  }

  generateCombos(0, {})
  return combinations
}

// Note: yaml import would need to be added to package.json
// For now, we'll use a simple YAML parser or assume it's available
const yaml = {
  parse: (content: string) => {
    // Simple YAML parsing - in production, use a proper YAML library
    try {
      return JSON.parse(content)
    } catch {
      throw new Error('YAML parsing not implemented - use js-yaml library')
    }
  }
}