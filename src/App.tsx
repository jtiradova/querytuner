import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import { QueryTunerPage } from './pages/QueryTunerPage';
import { VisualExplainPage } from './pages/VisualExplainPage';
import { QueryHistoryPage } from './pages/QueryHistoryPage';
import { QueryDetailPage } from './pages/QueryDetailPage';
import { ChatProvider } from './contexts/ChatContext';
import { EditorWorkspaceProvider } from './contexts/EditorWorkspaceContext';

export default function App() {
  return (
    <BrowserRouter>
      <EditorWorkspaceProvider>
        <ChatProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/editor" replace />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/editor/query" element={<QueryTunerPage />} />
            <Route path="/editor/visual-explain" element={<VisualExplainPage />} />
            <Route
              path="/monitoring/query-history"
              element={<QueryHistoryPage />}
            />
            <Route
              path="/monitoring/query-history/:queryId"
              element={<QueryDetailPage />}
            />
            <Route path="*" element={<Navigate to="/editor" replace />} />
          </Routes>
        </ChatProvider>
      </EditorWorkspaceProvider>
    </BrowserRouter>
  );
}
