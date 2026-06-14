import React from 'react';

import { Toaster } from '@/components/Toaster';
import { EditorScreen } from '@/features/editor/EditorScreen';
import { HomeScreen } from '@/features/home/HomeScreen';
import { useStore } from '@/store';

const App = (): React.JSX.Element => {
  const view = useStore((state) => state.view);

  return (
    <>
      {view === 'editor' ? <EditorScreen /> : <HomeScreen />}
      <Toaster />
    </>
  );
};

export default App;
