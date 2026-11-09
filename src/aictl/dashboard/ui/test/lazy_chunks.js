// Test setup — load every lazily imported chunk before a test file is collected.
// The app imports these modules on demand (Drawer tabs, the settings workspace). In a
// test, the first such import made vite transform the module inside a test's time
// budget, so a test that opened a tab could time out on a busy machine. Loaded here,
// the import in the app resolves from the module cache. board_lazy.test.js checks that
// every import() in src/ has its module in this list.
import '../src/components/board/Drawer.js';
import '../src/components/board/agent/OverviewExtras.js';
import '../src/components/board/agent/TranscriptTab.js';
import '../src/components/board/agent/FlowTab.js';
import '../src/components/board/agent/TimelineTab.js';
import '../src/components/board/agent/ArtifactsTab.js';
import '../src/components/board/agent/CommitsTab.js';
import '../src/components/board/agent/EventsTab.js';
import '../src/components/board/agent/TeamTab.js';
import '../src/components/board/agent/ProcessesTab.js';
import '../src/components/board/agent/IntegrationsTab.js';
import '../src/components/settings/SettingsWorkspace.js';
import '../src/components/settings/model.js';
import '../src/components/ui/TextView.js';
