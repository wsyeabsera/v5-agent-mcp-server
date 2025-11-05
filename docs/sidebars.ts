import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 * - create an ordered group of docs
 * - render a sidebar for each doc of that group
 * - provide next/previous navigation
 *
 * The sidebars can be generated from the filesystem, or explicitly defined here.
 */
const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/configuration',
        'getting-started/first-steps',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/core-components',
        'architecture/data-models',
        'architecture/request-flow',
        'architecture/mcp-integration',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      collapsed: false,
      items: [
        'features/overview',
        'features/tool-management',
        'features/agent-system',
        'features/task-execution',
        'features/memory-learning',
        'features/benchmarking',
        'features/smart-features',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'api-reference/protocol',
        'api-reference/endpoints',
        'api-reference/tools',
        'api-reference/requests-responses',
        'api-reference/error-handling',
      ],
    },
    {
      type: 'category',
      label: 'Intelligence Systems',
      collapsed: false,
      items: [
        'intelligence/overview',
        'intelligence/memory-system',
        'intelligence/history-query',
        'intelligence/benchmark-suite',
        'intelligence/smart-features',
        'intelligence/pattern-recognition',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/task-executor',
        'guides/agent-configurations',
        'guides/benchmarks',
        'guides/cost-optimization',
        'guides/pattern-extraction',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      collapsed: false,
      items: [
        'development/project-structure',
        'development/contributing',
        'development/testing',
        'development/deployment',
      ],
    },
  ],
};

export default sidebars;
