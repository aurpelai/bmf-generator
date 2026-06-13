import { useStore } from '@/store'
import { HomeScreen } from '@/features/home/HomeScreen'
import { EditorScreen } from '@/features/editor/EditorScreen'
import { Toaster } from '@/components/Toaster'

function App() {
  const view = useStore((s) => s.view)

  return (
    <>
      {view === 'editor' ? <EditorScreen /> : <HomeScreen />}
      <Toaster />
    </>
  )
}

export default App
