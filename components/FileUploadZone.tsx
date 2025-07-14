import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadZoneProps {
  onFileUpload: (files: File[]) => void | Promise<void>;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  showProgress?: boolean;
  disabled?: boolean;
  folderId?: string | null;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileUpload,
  accept = '.pdf,.docx,.doc,.txt,.md,.jpg,.jpeg,.png,.gif',
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = false,
  showProgress = false,
  disabled = false,
  folderId = null,
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    status: 'idle',
    message: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds maximum limit of ${Math.round(maxSize / (1024 * 1024))}MB`;
    }

    // Check file size minimum
    if (file.size === 0) {
      return 'File appears to be corrupted';
    }

    // Check file name
    if (!file.name) {
      return 'File name is required';
    }

    // Check file extension
    const allowedExtensions = accept.split(',').map(ext => ext.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return 'File type not supported';
    }

    return null;
  }, [accept, maxSize]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (disabled) return;

    setValidationErrors([]);
    
    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      if (validFiles.length === 0) {
        setUploadState({
          uploading: false,
          progress: 0,
          status: 'error',
          message: 'No valid files to upload',
        });
        return;
      }
    }

    if (validFiles.length === 0) {
      setUploadState({
        uploading: false,
        progress: 0,
        status: 'error',
        message: 'No files selected',
      });
      return;
    }

    try {
      if (showProgress) {
        setUploadState({
          uploading: true,
          progress: 0,
          status: 'uploading',
          message: 'Uploading files...',
        });
      }

      // Simulate progress if showing progress
      if (showProgress) {
        const progressInterval = setInterval(() => {
          setUploadState(prev => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90),
          }));
        }, 200);

        try {
          await onFileUpload(validFiles);
          clearInterval(progressInterval);
          
          setUploadState({
            uploading: false,
            progress: 100,
            status: 'success',
            message: validFiles.length === 1 
              ? 'File uploaded successfully' 
              : `${validFiles.length} files uploaded successfully`,
          });

          if (errors.length > 0) {
            setUploadState(prev => ({
              ...prev,
              message: `${validFiles.length} file${validFiles.length > 1 ? 's' : ''} processed successfully, ${errors.length} file${errors.length > 1 ? 's' : ''} failed validation`,
            }));
          }
        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        }
      } else {
        await onFileUpload(validFiles);
        
        if (errors.length > 0) {
          setUploadState({
            uploading: false,
            progress: 0,
            status: 'success',
            message: `${validFiles.length} file${validFiles.length > 1 ? 's' : ''} processed successfully, ${errors.length} file${errors.length > 1 ? 's' : ''} failed validation`,
          });
        }
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, status: 'idle', message: '' }));
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadState({
        uploading: false,
        progress: 0,
        status: 'error',
        message: 'Upload failed',
      });
    }
  }, [onFileUpload, validateFile, showProgress, disabled]);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleFileUpload(acceptedFiles);
  }, [handleFileUpload]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: accept.split(',').reduce((acc, ext) => {
      acc[`*/${ext.replace('.', '')}`] = [ext];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    multiple,
    disabled: disabled || uploadState.uploading,
  });

  // Handle click to browse
  const handleClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input value to allow same file to be selected again
    event.target.value = '';
  }, [handleFileUpload]);

  // Dynamic classes based on state
  const getDropzoneClasses = () => {
    const baseClasses = [
      'relative',
      'border-2',
      'border-dashed',
      'rounded-lg',
      'p-8',
      'text-center',
      'transition-all',
      'duration-200',
      'cursor-pointer',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-blue-500',
      'focus:ring-offset-2',
    ];

    if (disabled || uploadState.uploading) {
      baseClasses.push('border-gray-200', 'bg-gray-50', 'cursor-not-allowed', 'text-gray-400');
    } else if (isDragReject) {
      baseClasses.push('border-red-400', 'bg-red-50', 'text-red-700');
    } else if (isDragAccept || isDragActive) {
      baseClasses.push('border-blue-400', 'bg-blue-50', 'text-blue-700');
    } else {
      baseClasses.push('border-gray-300', 'bg-gray-50', 'text-gray-700', 'hover:border-gray-400', 'hover:bg-gray-100');
    }

    return baseClasses.join(' ');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))}${sizes[i]}`;
  };

  const dropzoneId = `dropzone-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = `${dropzoneId}-description`;

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={getDropzoneClasses()}
        role="button"
        aria-label="Upload files"
        aria-describedby={descriptionId}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        data-testid="file-upload-zone"
      >
        <input {...getInputProps()} />
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload files"
          disabled={disabled || uploadState.uploading}
        />

        <div className="space-y-4">
          {/* Upload icon */}
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Text content */}
          <div id={descriptionId}>
            {uploadState.uploading ? (
              <p className="text-lg text-gray-600">Uploading files...</p>
            ) : isDragActive ? (
              <p className="text-lg text-blue-600" aria-live="polite">
                Drop files here
              </p>
            ) : (
              <>
                <p className="text-lg text-gray-600">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supported formats: {accept.replace(/\./g, '').toUpperCase()}
                </p>
                <p className="text-sm text-gray-500">
                  Maximum file size: {formatFileSize(maxSize)}
                </p>
              </>
            )}
          </div>

          {/* Progress bar */}
          {showProgress && uploadState.uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadState.progress}
                aria-label="Upload progress"
              />
            </div>
          )}

          {/* Status messages */}
          {uploadState.status !== 'idle' && uploadState.message && (
            <div
              className={`mt-4 p-3 rounded-md ${
                uploadState.status === 'success'
                  ? 'bg-green-50 text-green-700'
                  : uploadState.status === 'error'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
              }`}
              aria-live="polite"
            >
              {uploadState.message}
            </div>
          )}

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                File validation errors:
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploadZone;