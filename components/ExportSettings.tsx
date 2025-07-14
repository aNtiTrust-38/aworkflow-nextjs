import React, { useState, useEffect, useCallback } from 'react';

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  description: string;
  mimeType: string;
}

interface ExportSettings {
  defaultFormat: string;
  defaultPath: string;
  includeReferences: boolean;
  includeImages: boolean;
  includeMetadata: boolean;
  autoDownload: boolean;
  compressionLevel: number;
  fontSize: number;
  pageMargin: number;
  lineSpacing: number;
  customTemplate: string;
}

interface ExportSettingsProps {
  onSettingsChange?: (settings: ExportSettings) => void;
  onExport?: (format: string, settings: ExportSettings) => void;
  initialSettings?: Partial<ExportSettings>;
  disabled?: boolean;
  showPreview?: boolean;
}

interface PathSelectorDialog {
  open: boolean;
  currentPath: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'pdf',
    name: 'PDF Document',
    extension: 'pdf',
    description: 'Portable Document Format with formatting preserved',
    mimeType: 'application/pdf',
  },
  {
    id: 'docx',
    name: 'Word Document',
    extension: 'docx',
    description: 'Microsoft Word format with full formatting support',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: 'markdown',
    name: 'Markdown',
    extension: 'md',
    description: 'Plain text format with markdown syntax',
    mimeType: 'text/markdown',
  },
  {
    id: 'html',
    name: 'HTML Document',
    extension: 'html',
    description: 'Web page format with CSS styling',
    mimeType: 'text/html',
  },
  {
    id: 'txt',
    name: 'Plain Text',
    extension: 'txt',
    description: 'Simple text format without formatting',
    mimeType: 'text/plain',
  },
];

const DEFAULT_SETTINGS: ExportSettings = {
  defaultFormat: 'pdf',
  defaultPath: '',
  includeReferences: true,
  includeImages: true,
  includeMetadata: true,
  autoDownload: false,
  compressionLevel: 80,
  fontSize: 12,
  pageMargin: 1,
  lineSpacing: 1.5,
  customTemplate: '',
};

const ExportSettings: React.FC<ExportSettingsProps> = ({
  onSettingsChange,
  onExport,
  initialSettings = {},
  disabled = false,
  showPreview = false,
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathDialog, setPathDialog] = useState<PathSelectorDialog>({
    open: false,
    currentPath: settings.defaultPath,
  });
  const [selectedFormat, setSelectedFormat] = useState<string>(settings.defaultFormat);

  // Update settings when initialSettings change
  useEffect(() => {
    setSettings(prev => ({ ...prev, ...initialSettings }));
  }, [initialSettings]);

  // Notify parent component of settings changes
  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  // Load user's default export path
  const loadDefaultPath = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/export');
      if (response.ok) {
        const data = await response.json();
        if (data.defaultPath) {
          setSettings(prev => ({ ...prev, defaultPath: data.defaultPath }));
        }
      }
    } catch (error) {
      console.warn('Failed to load default export path:', error);
    }
  }, []);

  // Load default path on mount
  useEffect(() => {
    loadDefaultPath();
  }, [loadDefaultPath]);

  // Update setting
  const updateSetting = useCallback(<K extends keyof ExportSettings>(
    key: K,
    value: ExportSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle path selection
  const handlePathSelect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use file system API if available, otherwise show dialog
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const path = dirHandle.name;
        updateSetting('defaultPath', path);
        setPathDialog({ open: false, currentPath: path });
      } else {
        // Fallback: show path input dialog
        setPathDialog({ open: true, currentPath: settings.defaultPath });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setError('Failed to select directory');
      }
    } finally {
      setLoading(false);
    }
  }, [settings.defaultPath, updateSetting]);

  // Save export path as default
  const saveDefaultPath = useCallback(async (path: string) => {
    try {
      await fetch('/api/settings/export', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPath: path }),
      });
    } catch (error) {
      console.warn('Failed to save default export path:', error);
    }
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!onExport) return;

    try {
      setLoading(true);
      setError(null);
      await onExport(selectedFormat, settings);
    } catch (error: any) {
      setError(error.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  }, [onExport, selectedFormat, settings]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setSelectedFormat(DEFAULT_SETTINGS.defaultFormat);
  }, []);

  // Get format details
  const getFormatDetails = useCallback((formatId: string): ExportFormat | undefined => {
    return EXPORT_FORMATS.find(format => format.id === formatId);
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Export Settings</h2>
        <p className="text-gray-600">Configure how your documents are exported</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 text-sm underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Export Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXPORT_FORMATS.map(format => (
              <div
                key={format.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedFormat === format.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedFormat(format.id);
                  updateSetting('defaultFormat', format.id);
                }}
                data-testid={`format-${format.id}`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={selectedFormat === format.id}
                    onChange={() => {
                      setSelectedFormat(format.id);
                      updateSetting('defaultFormat', format.id);
                    }}
                    className="mr-3"
                    disabled={disabled}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{format.name}</h3>
                    <p className="text-sm text-gray-600">{format.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Path */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Export Location
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={settings.defaultPath}
              onChange={(e) => updateSetting('defaultPath', e.target.value)}
              placeholder="Select folder or enter path..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled}
              data-testid="path-input"
            />
            <button
              onClick={handlePathSelect}
              disabled={disabled || loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              Browse
            </button>
          </div>
        </div>

        {/* Content Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Content Options
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.includeReferences}
                onChange={(e) => updateSetting('includeReferences', e.target.checked)}
                className="mr-3"
                disabled={disabled}
                data-testid="include-references"
              />
              <span className="text-gray-700">Include references and citations</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.includeImages}
                onChange={(e) => updateSetting('includeImages', e.target.checked)}
                className="mr-3"
                disabled={disabled}
                data-testid="include-images"
              />
              <span className="text-gray-700">Include images and figures</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.includeMetadata}
                onChange={(e) => updateSetting('includeMetadata', e.target.checked)}
                className="mr-3"
                disabled={disabled}
                data-testid="include-metadata"
              />
              <span className="text-gray-700">Include document metadata</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoDownload}
                onChange={(e) => updateSetting('autoDownload', e.target.checked)}
                className="mr-3"
                disabled={disabled}
                data-testid="auto-download"
              />
              <span className="text-gray-700">Automatically download after export</span>
            </label>
          </div>
        </div>

        {/* PDF/Document Formatting (only for PDF and DOCX) */}
        {(selectedFormat === 'pdf' || selectedFormat === 'docx') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Document Formatting
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Font Size</label>
                <select
                  value={settings.fontSize}
                  onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={disabled}
                  data-testid="font-size"
                >
                  <option value={10}>10pt</option>
                  <option value={11}>11pt</option>
                  <option value={12}>12pt</option>
                  <option value={14}>14pt</option>
                  <option value={16}>16pt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Line Spacing</label>
                <select
                  value={settings.lineSpacing}
                  onChange={(e) => updateSetting('lineSpacing', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={disabled}
                  data-testid="line-spacing"
                >
                  <option value={1}>Single</option>
                  <option value={1.15}>1.15</option>
                  <option value={1.5}>1.5</option>
                  <option value={2}>Double</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Page Margin (inches)</label>
                <input
                  type="number"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.pageMargin}
                  onChange={(e) => updateSetting('pageMargin', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={disabled}
                  data-testid="page-margin"
                />
              </div>
              {selectedFormat === 'pdf' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Compression (%)</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={settings.compressionLevel}
                    onChange={(e) => updateSetting('compressionLevel', parseInt(e.target.value))}
                    className="w-full"
                    disabled={disabled}
                    data-testid="compression-level"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {settings.compressionLevel}% quality
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Template */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Template (Optional)
          </label>
          <textarea
            value={settings.customTemplate}
            onChange={(e) => updateSetting('customTemplate', e.target.value)}
            placeholder="Enter custom template or styling instructions..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
            data-testid="custom-template"
          />
          <p className="text-sm text-gray-500 mt-1">
            Optional custom formatting instructions or template content
          </p>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Export Preview</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Format: {getFormatDetails(selectedFormat)?.name}</p>
              <p>Location: {settings.defaultPath || 'Downloads folder'}</p>
              <p>References: {settings.includeReferences ? 'Included' : 'Excluded'}</p>
              <p>Images: {settings.includeImages ? 'Included' : 'Excluded'}</p>
              {(selectedFormat === 'pdf' || selectedFormat === 'docx') && (
                <>
                  <p>Font: {settings.fontSize}pt, {settings.lineSpacing}x spacing</p>
                  <p>Margins: {settings.pageMargin} inches</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            onClick={resetToDefaults}
            disabled={disabled || loading}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          <div className="space-x-3">
            <button
              onClick={() => saveDefaultPath(settings.defaultPath)}
              disabled={disabled || loading || !settings.defaultPath}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              Save as Default
            </button>
            {onExport && (
              <button
                onClick={handleExport}
                disabled={disabled || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                data-testid="export-button"
              >
                {loading ? 'Exporting...' : 'Export'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Path Selection Dialog */}
      {pathDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Set Export Path</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Directory
              </label>
              <input
                type="text"
                value={pathDialog.currentPath}
                onChange={(e) => setPathDialog(prev => ({ ...prev, currentPath: e.target.value }))}
                placeholder="Enter full path to export directory"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setPathDialog({ open: false, currentPath: settings.defaultPath })}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateSetting('defaultPath', pathDialog.currentPath);
                  setPathDialog({ open: false, currentPath: pathDialog.currentPath });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Set Path
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportSettings;