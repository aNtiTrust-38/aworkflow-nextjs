import { vi } from 'vitest';
import { configure } from '@testing-library/react';
import { configure as configureDom } from '@testing-library/dom';

// Configure Testing Library for jsdom limitations
configure({
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: false
});

configureDom({
  computedStyleSupportsPseudoElements: false,
  asyncUtilTimeout: 5000
});

console.log('RTL config setup loaded');