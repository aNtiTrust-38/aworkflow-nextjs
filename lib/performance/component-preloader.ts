class ComponentPreloader {
  private preloadedComponents = new Set<string>();
  private stepComponentMap = {
    'PROMPT': null, // No heavy components
    'GOALS': 'ADHDFriendlyGoals',
    'RESEARCH': 'ResearchAssistant',
    'GENERATE': null, // Content generation is inline
    'REFINE': 'ContentAnalysis',
    'EXPORT': 'CitationManager'
  };

  async preloadComponent(componentName: string): Promise<void> {
    if (this.preloadedComponents.has(componentName)) {
      return; // Already preloaded
    }

    try {
      switch (componentName) {
        case 'ADHDFriendlyGoals':
          await import('../../src/app/ADHDFriendlyGoals');
          break;
        case 'ResearchAssistant':
          await import('../../src/app/ResearchAssistant');
          break;
        case 'ContentAnalysis':
          await import('../../src/app/ContentAnalysis');
          break;
        case 'CitationManager':
          await import('../../src/app/CitationManager');
          break;
        case 'CommandPalette':
          await import('../../components/CommandPalette');
          break;
        default:
          console.warn(`Unknown component: ${componentName}`);
          return;
      }
      
      this.preloadedComponents.add(componentName);
      console.log(`Preloaded component: ${componentName}`);
    } catch (error) {
      console.error(`Failed to preload component ${componentName}:`, error);
    }
  }

  async preloadForStep(currentStep: string): Promise<void> {
    const nextStepIndex = Object.keys(this.stepComponentMap).indexOf(currentStep) + 1;
    const nextStepKey = Object.keys(this.stepComponentMap)[nextStepIndex] as keyof typeof this.stepComponentMap;
    
    if (nextStepKey && this.stepComponentMap[nextStepKey]) {
      await this.preloadComponent(this.stepComponentMap[nextStepKey]!);
    }

    // Also preload command palette on first use
    if (currentStep === 'PROMPT' && !this.preloadedComponents.has('CommandPalette')) {
      await this.preloadComponent('CommandPalette');
    }
  }

  preloadCriticalComponents(): Promise<void[]> {
    // Preload components likely to be used in first few steps
    return Promise.all([
      this.preloadComponent('ADHDFriendlyGoals'),
      this.preloadComponent('ResearchAssistant'),
      this.preloadComponent('CommandPalette')
    ]);
  }

  getPreloadedComponents(): string[] {
    return Array.from(this.preloadedComponents);
  }

  clearPreloadCache(): void {
    this.preloadedComponents.clear();
  }
}

export const componentPreloader = new ComponentPreloader();