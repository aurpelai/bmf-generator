import React from 'react';
import { Route, Routes } from 'react-router';

import { Toaster } from '@/components/Toaster';
import { EditorScreen } from '@/features/editor/EditorScreen';
import { HomeScreen } from '@/features/home/HomeScreen';

const App = (): React.JSX.Element => (
  <>
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/editor" element={<EditorScreen />} />
    </Routes>
    <Toaster />
  </>
);

export default App;
