import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export interface DockerfileValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  stages?: string[]
  optimizations?: string[]
  securityChecks?: string[]
  environmentVariables?: string[]
  dockerignoreExists?: boolean
  dockerignoreEntries?: string[]
}

export interface DockerBuildConfig {
  imageName: string
  tag: string
  context?: string
  dockerfile?: string
  buildArgs?: Record<string, string>
  validateSize?: boolean
  maxSize?: string
}

export interface DockerBuildResult {
  success: boolean
  imageId?: string
  imageName?: string
  buildTime?: number
  imageSize?: string
  warnings?: string[]
  error?: string
}

export interface ContainerHealthCheck {
  url: string
  expectedStatus: number
  timeout: number
}

export interface ContainerTestResult {
  success: boolean
  containerId?: string
  status?: string
  isRunning?: boolean
  warnings?: string[]
  healthCheck?: {
    url: string
    status: number
    response: any
    responseTime: number
  }
  environment?: Record<string, string>
  resources?: {
    cpuUsage: string
    memoryUsage: string
  }
  ports?: Record<number, string>
  error?: string
}

export function validateDockerfile(dockerfilePath: string = 'Dockerfile'): DockerfileValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const optimizations: string[] = []
  const securityChecks: string[] = []
  const environmentVariables: string[] = []

  // Check if Dockerfile exists
  if (!existsSync(dockerfilePath)) {
    return {
      isValid: false,
      errors: ['Dockerfile not found'],
      warnings,
      optimizations,
      securityChecks,
      environmentVariables
    }
  }

  const dockerfileContent = readFileSync(dockerfilePath, 'utf8')
  const lines = dockerfileContent.split('\n').map(line => line.trim())

  // Extract stages for multi-stage builds
  const stages: string[] = []
  const fromLines = lines.filter(line => line.toUpperCase().startsWith('FROM'))
  
  fromLines.forEach(line => {
    const match = line.match(/FROM\s+\S+\s+AS\s+(\S+)/i)
    if (match) {
      stages.push(match[1])
    }
  })

  if (stages.length > 1) {
    optimizations.push('Multi-stage build detected')
  }

  // Security checks
  const hasNonRootUser = lines.some(line => 
    line.toUpperCase().startsWith('USER') && !line.includes('root')
  )
  
  if (hasNonRootUser) {
    securityChecks.push('Non-root user configured')
  } else {
    warnings.push('Running as root user - consider creating non-root user')
  }

  const hasChownFlag = lines.some(line => 
    line.toUpperCase().includes('--CHOWN')
  )
  
  if (hasChownFlag) {
    securityChecks.push('Proper file ownership set')
  }

  // Base image checks
  const firstFromLine = fromLines[0]
  if (firstFromLine && !firstFromLine.includes('alpine')) {
    warnings.push('Using non-Alpine base image - consider node:18-alpine for smaller size')
  }

  // Package installation checks
  const hasNpmInstall = lines.some(line => 
    line.toUpperCase().includes('NPM INSTALL') && !line.includes('npm ci')
  )
  
  if (hasNpmInstall) {
    warnings.push('Using npm install instead of npm ci')
  }

  // Environment variable extraction
  lines.forEach(line => {
    if (line.toUpperCase().startsWith('ENV')) {
      const envMatch = line.match(/ENV\s+(\w+)/i)
      if (envMatch) {
        environmentVariables.push(envMatch[1])
      }
    }
  })

  // Check for .dockerignore
  const dockerignorePath = join(process.cwd(), '.dockerignore')
  const dockerignoreExists = existsSync(dockerignorePath)
  let dockerignoreEntries: string[] = []

  if (dockerignoreExists) {
    const dockerignoreContent = readFileSync(dockerignorePath, 'utf8')
    dockerignoreEntries = dockerignoreContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
  }

  const isValid = errors.length === 0

  return {
    isValid,
    errors,
    warnings,
    stages: stages.length > 0 ? stages : undefined,
    optimizations,
    securityChecks,
    environmentVariables,
    dockerignoreExists,
    dockerignoreEntries
  }
}

export async function buildDockerImage(config: DockerBuildConfig): Promise<DockerBuildResult> {
  const startTime = Date.now()
  
  try {
    let buildCommand = `docker build -t ${config.imageName}:${config.tag}`
    
    // Add build arguments
    if (config.buildArgs) {
      Object.entries(config.buildArgs).forEach(([key, value]) => {
        buildCommand += ` --build-arg ${key}=${value}`
      })
    }
    
    // Add dockerfile path
    if (config.dockerfile) {
      buildCommand += ` -f ${config.dockerfile}`
    }
    
    // Add context
    buildCommand += ` ${config.context || '.'}`
    
    const output = execSync(buildCommand, { 
      encoding: 'utf8',
      stdio: 'pipe'
    })
    
    const buildTime = Date.now() - startTime
    
    // Extract image ID from output
    const imageIdMatch = output.match(/Successfully built (\w+)/)
    const imageId = imageIdMatch ? imageIdMatch[1] : undefined
    
    const result: DockerBuildResult = {
      success: true,
      imageId,
      imageName: `${config.imageName}:${config.tag}`,
      buildTime
    }
    
    // Validate image size if requested
    if (config.validateSize) {
      try {
        const sizeOutput = execSync(
          `docker images ${config.imageName}:${config.tag} --format "table {{.Repository}}:{{.Tag}}\\t{{.Size}}"`,
          { encoding: 'utf8' }
        )
        
        const sizeMatch = sizeOutput.match(/\t(\S+)$/)
        if (sizeMatch) {
          result.imageSize = sizeMatch[1]
          
          // Check against max size
          if (config.maxSize) {
            const maxSizeMB = parseImageSize(config.maxSize)
            const actualSizeMB = parseImageSize(result.imageSize)
            
            if (actualSizeMB > maxSizeMB) {
              result.warnings = result.warnings || []
              result.warnings.push(
                `Image size (${result.imageSize}) exceeds recommended maximum (${config.maxSize})`
              )
            }
          }
        }
      } catch (sizeError) {
        // Size check failed, but build succeeded
        result.warnings = result.warnings || []
        result.warnings.push('Could not determine image size')
      }
    }
    
    return result
    
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      buildTime: Date.now() - startTime
    }
  }
}

export async function testDockerContainer(
  imageName: string,
  options: {
    healthCheck?: ContainerHealthCheck
    environment?: Record<string, string>
    validateEnvironment?: boolean
    checkResources?: boolean
    checkPorts?: number[]
    cleanup?: boolean
  } = {}
): Promise<ContainerTestResult> {
  let containerId: string | undefined
  
  try {
    // Build run command
    let runCommand = `docker run -d`
    
    // Add environment variables
    if (options.environment) {
      Object.entries(options.environment).forEach(([key, value]) => {
        runCommand += ` -e ${key}="${value}"`
      })
    }
    
    // Add port mappings
    if (options.checkPorts) {
      options.checkPorts.forEach(port => {
        runCommand += ` -p ${port}:${port}`
      })
    }
    
    runCommand += ` ${imageName}`
    
    // Start container
    containerId = execSync(runCommand, { encoding: 'utf8' }).trim()
    
    // Wait a moment for container to start
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check container status
    const inspectOutput = execSync(
      `docker inspect ${containerId} --format "{{json .State}}"`,
      { encoding: 'utf8' }
    )
    
    const state = JSON.parse(inspectOutput)
    
    const result: ContainerTestResult = {
      success: true,
      containerId,
      status: state.Health?.Status || (state.Running ? 'healthy' : 'unhealthy'),
      isRunning: state.Running
    }
    
    // Perform health check
    if (options.healthCheck && state.Running) {
      try {
        const startTime = Date.now()
        const response = await fetch(options.healthCheck.url, {
          signal: AbortSignal.timeout(options.healthCheck.timeout)
        })
        
        const responseTime = Date.now() - startTime
        const responseData = await response.json()
        
        result.healthCheck = {
          url: options.healthCheck.url,
          status: response.status,
          response: responseData,
          responseTime
        }
      } catch (healthError) {
        result.success = false
        result.error = `Health check failed: ${(healthError as Error).message}`
      }
    }
    
    // Validate environment variables
    if (options.validateEnvironment && options.environment) {
      try {
        const envOutput = execSync(
          `docker exec ${containerId} env`,
          { encoding: 'utf8' }
        )
        
        const containerEnv: Record<string, string> = {}
        envOutput.split('\n').forEach(line => {
          const [key, value] = line.split('=', 2)
          if (key && value) {
            containerEnv[key] = value
          }
        })
        
        result.environment = containerEnv
      } catch (envError) {
        result.warnings = result.warnings || []
        result.warnings.push('Could not validate environment variables')
      }
    }
    
    // Check resource usage
    if (options.checkResources) {
      try {
        const statsOutput = execSync(
          `docker stats ${containerId} --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"`,
          { encoding: 'utf8' }
        )
        
        const statsMatch = statsOutput.match(/\t(\S+%)\t(\S+)$/)
        if (statsMatch) {
          result.resources = {
            cpuUsage: statsMatch[1],
            memoryUsage: statsMatch[2]
          }
        }
      } catch (statsError) {
        result.warnings = result.warnings || []
        result.warnings.push('Could not check resource usage')
      }
    }
    
    // Check port mappings
    if (options.checkPorts) {
      try {
        const portsOutput = execSync(
          `docker port ${containerId}`,
          { encoding: 'utf8' }
        )
        
        const ports: Record<number, string> = {}
        portsOutput.split('\n').forEach(line => {
          const match = line.match(/(\d+)\/tcp -> (.+)/)
          if (match) {
            ports[parseInt(match[1], 10)] = match[2]
          }
        })
        
        result.ports = ports
      } catch (portsError) {
        result.warnings = result.warnings || []
        result.warnings.push('Could not check port mappings')
      }
    }
    
    return result
    
  } catch (error) {
    return {
      success: false,
      containerId,
      error: (error as Error).message
    }
  } finally {
    // Cleanup container if requested
    if (options.cleanup && containerId) {
      try {
        execSync(`docker stop ${containerId}`, { stdio: 'ignore' })
        execSync(`docker rm ${containerId}`, { stdio: 'ignore' })
      } catch {
        // Cleanup failed, but don't throw
      }
    }
  }
}

function parseImageSize(sizeStr: string): number {
  const match = sizeStr.match(/([\d.]+)(\w+)/)
  if (!match) return 0
  
  const [, value, unit] = match
  const numValue = parseFloat(value)
  
  switch (unit.toUpperCase()) {
    case 'GB':
    case 'G':
      return numValue * 1024
    case 'MB':
    case 'M':
      return numValue
    case 'KB':
    case 'K':
      return numValue / 1024
    default:
      return numValue
  }
}