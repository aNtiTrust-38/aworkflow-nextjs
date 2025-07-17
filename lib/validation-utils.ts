/**
 * Validation Utilities for Phase 2B Error Handling Standardization
 * 
 * Provides centralized validation functions with consistent error formatting
 */

import { createErrorResponse } from './error-utils'
import type { NextApiRequest, NextApiResponse } from 'next'

export interface ValidationResult {
  valid: boolean
  error?: ValidationError
}

export interface ValidationError {
  field: string
  message: string
  code: string
  suggestion?: string
  minLength?: number
  maxLength?: number
  actualLength?: number
  minValue?: number
  maxValue?: number
  actualValue?: any
  expectedType?: string
  actualType?: string
  allowedValues?: any[]
  supportedTypes?: string[]
  retryable?: boolean
  expectedFormat?: string
  maxSize?: number
  actualSize?: number
  value?: any
}

export interface MultiValidationResult {
  valid: boolean
  error?: string
  code?: string
  errors?: ValidationError[]
  validationErrors?: ValidationError[]
}

// String Validation Utilities
export function validateRequired(value: any, fieldName: string): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} is required`,
        code: 'FIELD_REQUIRED',
        suggestion: `Please provide a value for ${fieldName}`
      }
    }
  }
  return { valid: true }
}

export function validateStringLength(
  value: string, 
  fieldName: string, 
  options: { min?: number; max?: number }
): ValidationResult {
  const actualLength = value?.length || 0
  
  if (options.min && actualLength < options.min) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be at least ${options.min} characters long`,
        code: 'FIELD_TOO_SHORT',
        minLength: options.min,
        actualLength,
        suggestion: `Please provide a more detailed ${fieldName.toLowerCase()}`
      }
    }
  }
  
  if (options.max && actualLength > options.max) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be no more than ${options.max} characters long`,
        code: 'FIELD_TOO_LONG',
        maxLength: options.max,
        actualLength,
        suggestion: `Please provide a shorter ${fieldName.toLowerCase()}`
      }
    }
  }
  
  return { valid: true }
}

export function validateStringFormat(
  value: string,
  fieldName: string,
  format: 'email' | 'anthropic-key' | 'openai-key'
): ValidationResult {
  let isValid = false
  let suggestion = ''
  
  switch (format) {
    case 'email':
      isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      suggestion = 'Please provide a valid email address (e.g., user@example.com)'
      break
    case 'anthropic-key':
      isValid = /^sk-ant-/.test(value)
      suggestion = 'API key should start with "sk-ant-"'
      break
    case 'openai-key':
      isValid = /^sk-/.test(value)
      suggestion = 'API key should start with "sk-"'
      break
  }
  
  if (!isValid) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be a valid ${format === 'anthropic-key' ? 'Anthropic API key' : format === 'openai-key' ? 'OpenAI API key' : format}`,
        code: 'FIELD_INVALID_FORMAT',
        expectedFormat: format,
        suggestion
      }
    }
  }
  
  return { valid: true }
}

// Number Validation Utilities
export function validateNumber(
  value: any,
  fieldName: string,
  options?: { min?: number; max?: number }
): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be a number`,
        code: 'FIELD_INVALID_TYPE',
        expectedType: 'number',
        actualType: typeof value
      }
    }
  }
  
  if (options?.min !== undefined && value < options.min) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be at least ${options.min}`,
        code: 'FIELD_OUT_OF_RANGE',
        minValue: options.min,
        actualValue: value,
        suggestion: 'Please provide a positive number'
      }
    }
  }
  
  if (options?.max !== undefined && value > options.max) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be no more than ${options.max}`,
        code: 'FIELD_OUT_OF_RANGE',
        maxValue: options.max,
        actualValue: value,
        suggestion: fieldName === 'temperature' ? 'Temperature should be between 0 and 2' : `Please provide a value no more than ${options.max}`
      }
    }
  }
  
  return { valid: true }
}

export function validatePositiveInteger(value: any, fieldName: string): ValidationResult {
  if (typeof value !== 'number') {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be a number`,
        code: 'FIELD_INVALID_TYPE',
        expectedType: 'number',
        actualType: typeof value
      }
    }
  }
  
  if (!Number.isInteger(value)) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be an integer`,
        code: 'FIELD_INVALID_TYPE',
        expectedType: 'integer',
        suggestion: 'Please provide a whole number'
      }
    }
  }
  
  if (value <= 0) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be a positive integer`,
        code: 'FIELD_INVALID_RANGE',
        suggestion: 'Please provide a number greater than 0'
      }
    }
  }
  
  return { valid: true }
}

// Enum Validation Utilities
export function validateEnum(
  value: any,
  fieldName: string,
  allowedValues: any[]
): ValidationResult {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        code: 'FIELD_INVALID_ENUM',
        allowedValues,
        actualValue: value,
        suggestion: 'Please choose from the available options'
      }
    }
  }
  
  return { valid: true }
}

export function validateOutlineType(value: any): ValidationResult {
  const validTypes = ['academic', 'research', 'essay', 'report', 'thesis']
  if (!validTypes.includes(value)) {
    return {
      valid: false,
      error: {
        field: 'outlineType',
        message: `outlineType must be one of: ${validTypes.join(', ')}`,
        code: 'FIELD_INVALID_ENUM',
        allowedValues: validTypes,
        suggestion: 'Please select a valid outline type'
      }
    }
  }
  return { valid: true }
}

// Array Validation Utilities
export function validateArray(
  value: any,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number }
): ValidationResult {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be an array`,
        code: 'FIELD_INVALID_TYPE',
        expectedType: 'array',
        actualType: typeof value
      }
    }
  }
  
  if (options?.minLength !== undefined && value.length < options.minLength) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must contain at least ${options.minLength} item${options.minLength === 1 ? '' : 's'}`,
        code: 'FIELD_TOO_SHORT',
        minLength: options.minLength,
        actualLength: value.length,
        suggestion: fieldName === 'citations' ? 'Please provide at least one citation' : `Please provide at least ${options.minLength} item${options.minLength === 1 ? '' : 's'}`
      }
    }
  }
  
  if (options?.maxLength !== undefined && value.length > options.maxLength) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must contain no more than ${options.maxLength} items`,
        code: 'FIELD_TOO_LONG',
        maxLength: options.maxLength,
        actualLength: value.length,
        suggestion: fieldName === 'citations' ? 'Please limit the number of citations' : `Please limit to ${options.maxLength} items`
      }
    }
  }
  
  return { valid: true }
}

// File Validation Utilities
export function validateFileType(fileType: string, supportedTypes: string[]): ValidationResult {
  if (!supportedTypes.includes(fileType)) {
    return {
      valid: false,
      error: {
        field: 'fileType',
        message: `fileType must be one of: ${supportedTypes.join(', ')}`,
        code: 'FIELD_UNSUPPORTED_TYPE',
        supportedTypes,
        actualType: fileType,
        suggestion: 'Please upload a supported file type'
      }
    }
  }
  return { valid: true }
}

export function validateFileSize(
  fileSize: number,
  options: { maxSize: number }
): ValidationResult {
  if (fileSize > options.maxSize) {
    const maxSizeMB = Math.round(options.maxSize / (1024 * 1024))
    return {
      valid: false,
      error: {
        field: 'fileSize',
        message: `File size must be no more than ${maxSizeMB} MB`,
        code: 'FIELD_TOO_LARGE',
        maxSize: options.maxSize,
        actualSize: fileSize,
        suggestion: 'Please upload a smaller file'
      }
    }
  }
  return { valid: true }
}

// Citation Validation Utilities
export function validateCitation(citation: any): MultiValidationResult {
  const errors: ValidationError[] = []
  
  // Validate title
  if (!citation.title || citation.title.trim() === '') {
    errors.push({
      field: 'citation.title',
      message: 'Title is required',
      code: 'FIELD_REQUIRED'
    })
  }
  
  // Validate authors
  if (!Array.isArray(citation.authors) || citation.authors.length === 0) {
    errors.push({
      field: 'citation.authors',
      message: 'At least one author is required',
      code: 'FIELD_TOO_SHORT',
      minLength: 1
    })
  }
  
  // Validate year
  if (citation.year !== undefined && typeof citation.year !== 'number') {
    errors.push({
      field: 'citation.year',
      message: 'Year must be a number',
      code: 'FIELD_INVALID_TYPE',
      expectedType: 'number'
    })
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      errors
    }
  }
  
  return { valid: true }
}

// Validation Error Collection
export class ValidationErrorCollector {
  private errors: ValidationError[] = []
  
  addError(error: ValidationError): void {
    this.errors.push(error)
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0
  }
  
  getErrors(): ValidationError[] {
    return this.errors
  }
  
  getErrorsForField(fieldName: string): ValidationError[] {
    return this.errors.filter(error => error.field === fieldName)
  }
  
  getValidationErrorResponse(): MultiValidationResult {
    return {
      valid: false,
      error: 'Multiple validation errors occurred',
      code: 'VALIDATION_ERROR',
      validationErrors: this.errors
    }
  }
}

// Integration with StandardErrorResponse
export function createValidationErrorResponse(
  res: NextApiResponse,
  validationErrors: ValidationError[],
  req: NextApiRequest
) {
  return createErrorResponse(
    res,
    400,
    'VALIDATION_ERROR',
    'Validation failed',
    req,
    { validationErrors }
  )
}