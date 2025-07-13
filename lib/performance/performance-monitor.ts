interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  propsSize: number;
  timestamp: number;
}

interface BundleMetric {
  chunkName: string;
  loadTime: number;
  size: number;
  cached: boolean;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private renderMetrics: ComponentRenderMetric[] = [];
  private bundleMetrics: BundleMetric[] = [];
  private maxMetrics = 1000;

  // Core Web Vitals monitoring
  measureLCP(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric('LCP', lastEntry.startTime, {
          element: (lastEntry as any).element?.tagName,
          url: (lastEntry as any).url
        });
      });
      
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    }
  }

  measureFID(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
        
        this.recordMetric('FID', (firstInput as any).processingStart - firstInput.startTime, {
          eventType: firstInput.name,
          target: (firstInput as any).target?.tagName
        });
      });
      
      observer.observe({ type: 'first-input', buffered: true });
    }
  }

  measureCLS(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        
        this.recordMetric('CLS', clsValue);
      });
      
      observer.observe({ type: 'layout-shift', buffered: true });
    }
  }

  // Component performance monitoring
  measureComponentRender<T>(
    componentName: string,
    renderFn: () => T,
    props?: any
  ): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    this.recordRenderMetric(componentName, endTime - startTime, props);
    return result;
  }

  // Bundle loading performance
  measureBundleLoad(chunkName: string, loadPromise: Promise<any>): Promise<any> {
    const startTime = performance.now();
    
    return loadPromise.then(
      (result) => {
        const loadTime = performance.now() - startTime;
        this.recordBundleMetric(chunkName, loadTime, this.estimateSize(result), false);
        return result;
      },
      (error) => {
        const loadTime = performance.now() - startTime;
        this.recordBundleMetric(chunkName, loadTime, 0, false, error);
        throw error;
      }
    );
  }

  // AI response performance
  measureAIResponse(provider: string, operation: string, responsePromise: Promise<any>): Promise<any> {
    const startTime = performance.now();
    
    return responsePromise.then(
      (result) => {
        const responseTime = performance.now() - startTime;
        this.recordMetric(`AI_${provider}_${operation}`, responseTime, {
          provider,
          operation,
          success: true,
          tokens: result.usage?.total_tokens || 0
        });
        return result;
      },
      (error) => {
        const responseTime = performance.now() - startTime;
        this.recordMetric(`AI_${provider}_${operation}`, responseTime, {
          provider,
          operation,
          success: false,
          error: error.message
        });
        throw error;
      }
    );
  }

  // Memory usage monitoring
  measureMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('MEMORY_USED', memory.usedJSHeapSize, {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      });
    }
  }

  // User interaction monitoring
  measureUserInteraction(action: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.recordMetric(`USER_${action}`, duration, {
      action,
      timestamp: Date.now()
    });
  }

  private recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata
    });
    
    this.maintainMetricsSize();
  }

  private recordRenderMetric(componentName: string, renderTime: number, props?: any): void {
    this.renderMetrics.push({
      componentName,
      renderTime,
      propsSize: props ? JSON.stringify(props).length : 0,
      timestamp: Date.now()
    });
    
    if (this.renderMetrics.length > this.maxMetrics) {
      this.renderMetrics.shift();
    }
  }

  private recordBundleMetric(
    chunkName: string,
    loadTime: number,
    size: number,
    cached: boolean,
    error?: Error
  ): void {
    this.bundleMetrics.push({
      chunkName,
      loadTime,
      size,
      cached,
      timestamp: Date.now()
    });
    
    if (this.bundleMetrics.length > this.maxMetrics) {
      this.bundleMetrics.shift();
    }
  }

  private maintainMetricsSize(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  private estimateSize(obj: any): number {
    return JSON.stringify(obj).length * 2; // Rough estimate
  }

  // Analytics and reporting
  getMetricsSummary() {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 5 * 60 * 1000); // Last 5 minutes
    
    const summary = {
      totalMetrics: this.metrics.length,
      recentMetrics: recentMetrics.length,
      coreWebVitals: this.getCoreWebVitals(),
      componentPerformance: this.getComponentPerformance(),
      bundlePerformance: this.getBundlePerformance(),
      aiPerformance: this.getAIPerformance(),
      memoryUsage: this.getMemoryStats()
    };
    
    return summary;
  }

  private getCoreWebVitals() {
    const lcp = this.metrics.filter(m => m.name === 'LCP').slice(-1)[0];
    const fid = this.metrics.filter(m => m.name === 'FID').slice(-1)[0];
    const cls = this.metrics.filter(m => m.name === 'CLS').slice(-1)[0];
    
    return {
      LCP: lcp ? { value: lcp.value, grade: lcp.value < 2500 ? 'good' : lcp.value < 4000 ? 'needs-improvement' : 'poor' } : null,
      FID: fid ? { value: fid.value, grade: fid.value < 100 ? 'good' : fid.value < 300 ? 'needs-improvement' : 'poor' } : null,
      CLS: cls ? { value: cls.value, grade: cls.value < 0.1 ? 'good' : cls.value < 0.25 ? 'needs-improvement' : 'poor' } : null
    };
  }

  private getComponentPerformance() {
    const components = new Map<string, number[]>();
    
    this.renderMetrics.forEach(metric => {
      if (!components.has(metric.componentName)) {
        components.set(metric.componentName, []);
      }
      components.get(metric.componentName)!.push(metric.renderTime);
    });
    
    const performance = new Map<string, any>();
    components.forEach((times, name) => {
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const max = Math.max(...times);
      performance.set(name, { avg, max, count: times.length });
    });
    
    return Object.fromEntries(performance);
  }

  private getBundlePerformance() {
    const bundles = new Map<string, BundleMetric[]>();
    
    this.bundleMetrics.forEach(metric => {
      if (!bundles.has(metric.chunkName)) {
        bundles.set(metric.chunkName, []);
      }
      bundles.get(metric.chunkName)!.push(metric);
    });
    
    const performance = new Map<string, any>();
    bundles.forEach((metrics, name) => {
      const loadTimes = metrics.map(m => m.loadTime);
      const avg = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const totalSize = metrics.reduce((sum, m) => sum + m.size, 0);
      
      performance.set(name, { avgLoadTime: avg, totalSize, loads: metrics.length });
    });
    
    return Object.fromEntries(performance);
  }

  private getAIPerformance() {
    const aiMetrics = this.metrics.filter(m => m.name.startsWith('AI_'));
    const providers = new Map<string, { total: number; success: number; avgTime: number; totalTokens: number }>();
    
    aiMetrics.forEach(metric => {
      const provider = metric.metadata?.provider || 'unknown';
      if (!providers.has(provider)) {
        providers.set(provider, { total: 0, success: 0, avgTime: 0, totalTokens: 0 });
      }
      
      const stats = providers.get(provider)!;
      stats.total++;
      if (metric.metadata?.success) stats.success++;
      stats.avgTime = (stats.avgTime * (stats.total - 1) + metric.value) / stats.total;
      stats.totalTokens += metric.metadata?.tokens || 0;
    });
    
    return Object.fromEntries(providers);
  }

  private getMemoryStats() {
    const memoryMetrics = this.metrics.filter(m => m.name === 'MEMORY_USED');
    if (memoryMetrics.length === 0) return null;
    
    const latest = memoryMetrics[memoryMetrics.length - 1];
    return {
      current: latest.value,
      total: latest.metadata?.total,
      limit: latest.metadata?.limit,
      usage: latest.metadata?.total ? (latest.value / latest.metadata.total) * 100 : 0
    };
  }

  // Performance optimization suggestions
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const summary = this.getMetricsSummary();
    
    // Core Web Vitals suggestions
    if (summary.coreWebVitals.LCP?.grade === 'poor') {
      suggestions.push('LCP is poor - consider optimizing largest content element, improving server response times, or preloading critical resources');
    }
    
    if (summary.coreWebVitals.FID?.grade === 'poor') {
      suggestions.push('FID is poor - consider reducing JavaScript execution time, breaking up long tasks, or using web workers');
    }
    
    if (summary.coreWebVitals.CLS?.grade === 'poor') {
      suggestions.push('CLS is poor - ensure images have dimensions, avoid inserting content above existing content, or use CSS aspect-ratio');
    }
    
    // Component performance suggestions
    Object.entries(summary.componentPerformance).forEach(([component, stats]) => {
      if ((stats as any).avg > 16.67) { // 60fps threshold
        suggestions.push(`${component} renders slowly (${(stats as any).avg.toFixed(2)}ms) - consider memoization or optimization`);
      }
    });
    
    // Memory suggestions
    if (summary.memoryUsage && summary.memoryUsage.usage > 80) {
      suggestions.push('High memory usage detected - consider implementing cleanup, reducing cache sizes, or lazy loading');
    }
    
    // AI performance suggestions
    Object.entries(summary.aiPerformance).forEach(([provider, stats]) => {
      if ((stats as any).avgTime > 5000) {
        suggestions.push(`${provider} responses are slow (${((stats as any).avgTime / 1000).toFixed(2)}s) - consider caching or using faster models`);
      }
    });
    
    return suggestions;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Initialize monitoring if in browser
if (typeof window !== 'undefined') {
  performanceMonitor.measureLCP();
  performanceMonitor.measureFID();
  performanceMonitor.measureCLS();
  
  // Measure memory usage every 30 seconds
  setInterval(() => {
    performanceMonitor.measureMemoryUsage();
  }, 30000);
}