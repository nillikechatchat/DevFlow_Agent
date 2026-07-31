import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { parseA2uiContent } from '@/lib/a2ui/parser';
import { AgentTeamsDashboard } from './agent-teams-dashboard';

// ─── Shared control state ────────────────────────────────────────────────────

const h = vi.hoisted(() => {
  let activeSection = 'spec';
  const listeners = new Set<() => void>();
  const getSnapshot = () => activeSection;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const setActiveSection = (id: string) => {
    activeSection = id;
    listeners.forEach((listener) => listener());
  };
  const a2uiRoomMessage =
    '<!--a2ui:{"version":"v0.9","createSurface":{"id":"s1","surface":{"elements":[]}}}-->';
  const emptyArray: unknown[] = [];
  const noChanges = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
  const rooms = [
    {
      roomId: '!spec:test',
      name: 'spec-flow',
      messages: [
        {
          eventId: '$1',
          sender: 'verify-worker',
          type: 'm.room.message',
          content: {
            msgtype: 'm.text',
            body: '```a2ui\n{"version":"v0.9","createSurface":{"id":"s1","surface":{"elements":[]}}}\n```',
            formatted_body: a2uiRoomMessage,
          },
          timestamp: 1786000000000,
        },
      ],
    },
  ];
  return {
    getSnapshot,
    subscribe,
    setActiveSection,
    a2uiRoomMessage,
    emptyArray,
    noChanges,
    rooms,
  };
});

// ─── Stores ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/agentteams-store', () => {
  const store = {
    isConnected: true,
    openSettings: vi.fn(),
    controllerUrl: 'http://localhost:3001',
    connectionLatency: 12,
    reconnectInterval: 5,
    checkConnection: vi.fn(),
  };
  return {
    useAgentTeamsStore: (selector?: (s: typeof store) => unknown) =>
      selector ? selector(store) : store,
  };
});

vi.mock('@/lib/matrix-store', () => ({
  useMatrixStore: () => ({
    isLoggedIn: true,
    isSyncing: false,
    rooms: h.rooms,
  }),
}));

vi.mock('@/lib/notification-store', () => ({
  useNotificationStore: () => [],
}));

vi.mock('@/lib/search-context', () => ({
  useSearch: () => ({ searchQuery: '', setSearchQuery: vi.fn() }),
}));

// ─── Data hooks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-agentteams-status', () => ({ useAgentTeamsStatus: vi.fn() }));
vi.mock('@/hooks/use-phase-watcher', () => ({ usePhaseWatcher: vi.fn() }));
vi.mock('@/hooks/use-agentteams-version', () => ({
  useVersion: () => ({ data: undefined }),
}));
vi.mock('@/hooks/use-agentteams-workers', () => ({
  useWorkers: () => ({ data: h.emptyArray }),
}));
vi.mock('@/hooks/use-agentteams-teams', () => ({ useTeams: () => ({ data: h.emptyArray }) }));
vi.mock('@/hooks/use-agentteams-managers', () => ({
  useManagers: () => ({ data: h.emptyArray }),
}));
vi.mock('@/hooks/use-agentteams-humans', () => ({ useHumans: () => ({ data: h.emptyArray }) }));
vi.mock('@/hooks/use-deployment-mode', () => ({
  useDeploymentMode: () => ({ mode: 'embedded', isLoading: false }),
}));

vi.mock('@/hooks/use-issuespec-changes', () => ({
  useChanges: () => h.noChanges,
}));
vi.mock('@/hooks/use-issuespec-change-detail', () => ({
  useChangeDetail: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/use-issuespec-tasks', () => ({
  useTasks: () => ({
    data: h.emptyArray,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// ─── Dashboard internals (stubbed) ───────────────────────────────────────────

vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({ children, ...rest }: Record<string, unknown>) => {
        const { initial, animate, exit, transition, ...htmlProps } = rest;
        return React.createElement('div', htmlProps, children);
      },
    },
  };
});

vi.mock('./use-active-section', () => {
  const React = require('react');
  return {
    useActiveSection: () => ({
      activeSection: React.useSyncExternalStore(h.subscribe, h.getSnapshot),
      setActiveSection: h.setActiveSection,
    }),
  };
});

vi.mock('./connection-banner', () => ({ ConnectionBanner: () => null }));
vi.mock('./settings-dialog', () => ({ SettingsDialog: () => null }));
vi.mock('./section-skeleton', () => ({ SectionSkeleton: () => null }));
vi.mock('./mobile-sidebar', () => ({ MobileSidebar: () => null }));
vi.mock('./header', () => ({ DashboardHeader: () => null }));
vi.mock('./footer', () => ({ DashboardFooter: () => null }));
vi.mock('./section-error-boundary', () => ({
  SectionErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./sidebar', () => {
  const sidebarNavItems = [
    { id: 'overview', label: '总览' },
    { id: 'workers', label: 'Workers' },
    { id: 'teams', label: '团队' },
    { id: 'managers', label: 'Managers' },
    { id: 'humans', label: 'Humans' },
    { id: 'chat', label: 'Matrix 聊天' },
    { id: 'spec', label: 'Spec 工作流' },
    { id: 'tasks', label: '变更看板' },
    { id: 'docs', label: '文档' },
  ];
  return {
    Sidebar: ({
      activeSection,
      onNavClick,
    }: {
      activeSection: string;
      onNavClick: (id: string) => void;
    }) => (
      <aside>
        {sidebarNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`nav-${item.id}`}
            aria-current={activeSection === item.id ? 'page' : undefined}
            onClick={() => onNavClick(item.id)}
          >
            {item.label}
          </button>
        ))}
      </aside>
    ),
  };
});

// ─── Other sections stubbed; chat keeps an A2UI parsing probe ────────────────

vi.mock('./sections/overview-section', () => ({ OverviewSection: () => null }));
vi.mock('./sections/workers-section', () => ({ WorkersSection: () => null }));
vi.mock('./sections/teams-section', () => ({ TeamsSection: () => null }));
vi.mock('./sections/managers-section', () => ({ ManagersSection: () => null }));
vi.mock('./sections/humans-section', () => ({ HumansSection: () => null }));
vi.mock('./sections/docs-section', () => ({ DocsSection: () => null }));

vi.mock('./sections/chat-section', () => ({
  ChatSection: () => {
    const rooms: { messages: { content?: { formatted_body?: string } }[] }[] = h.rooms;
    const a2uiCount = rooms.reduce(
      (acc: number, room) =>
        acc +
        room.messages.filter((m) => m.content?.formatted_body?.includes('a2ui')).length,
      0
    );
    return <div>A2UI 消息数: {a2uiCount}</div>;
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AgentTeamsDashboard />
    </QueryClientProvider>
  );
}

describe('AgentTeamsDashboard 导航与 Spec 集成', () => {
  afterEach(() => {
    cleanup();
    if (h.getSnapshot() !== 'spec') {
      h.setActiveSection('spec');
    }
  });

  it('导航集成：Spec 工作流与变更看板导航项已挂载', () => {
    renderDashboard();
    expect(screen.getByTestId('nav-spec')).toHaveTextContent('Spec 工作流');
    expect(screen.getByTestId('nav-tasks')).toHaveTextContent('变更看板');
  });

  it('spec section 懒加载渲染：无变更时展示阶段空态', async () => {
    renderDashboard();
    expect(await screen.findByText('该阶段暂无变更')).toBeInTheDocument();
    expect(screen.getByTestId('nav-spec')).toHaveAttribute('aria-current', 'page');
  });

  it('切换 tasks：变更看板渲染且与 chat A2UI 富文本解析共存', async () => {
    renderDashboard();
    expect(await screen.findByText('该阶段暂无变更')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-tasks'));
    expect(await screen.findByText('请选择一个变更查看其任务')).toBeInTheDocument();
    expect(screen.getByTestId('nav-tasks')).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByTestId('nav-chat'));
    expect(await screen.findByText('A2UI 消息数: 1')).toBeInTheDocument();
    const parsed = parseA2uiContent(h.a2uiRoomMessage);
    expect(parsed.blocks.length).toBeGreaterThan(0);
  });
});

